const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const mysql = require('mysql2');
const express = require('express');
const bodyParser = require('body-parser');
const Tesseract = require('tesseract.js');
const { createCanvas } = require('canvas');
const { pathToFileURL } = require('url');

//----- Initializing Express App -----//
const app = express();
app.use(bodyParser.json()); //-- Parse JSON bodies --//

// Define Directories
const sourceDir = path.join(__dirname, 'source');
const finalDir = path.join(__dirname, 'final');

if (!fs.existsSync(finalDir)) {
  fs.mkdirSync(finalDir);
}

// ------- Serve static files from the final directory ---------//
app.use('/final', express.static(finalDir));


const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Hacker99',
  database: 'ocr_db'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

//----------- Helper function to extract docket number using OCR -------- //
async function extractDocketNumber(filePath) {
  try {
    const fileType = path.extname(filePath);
    let text = '';

    if (fileType === '.pdf') {
      const pdfjsLib = await import(pathToFileURL(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href);
      pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs')).href;

      const pdf = await pdfjsLib.getDocument(filePath).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });

      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      text = await Tesseract.recognize(canvas.toBuffer(), 'eng').then(({ data: { text } }) => text);
    } else {
      text = await Tesseract.recognize(filePath, 'eng').then(({ data: { text } }) => text);
    }

    const docketNumberMatch = text.match(/\b\d{7,8}\b(?!-)/);
    return docketNumberMatch ? docketNumberMatch[0] : null;
  } catch (error) {
    console.error('Error during OCR processing:', error);
    return null;
  }
}

//---- OCR Magic funtion ----//
async function processFile(filePath) {
  const docketNumber = await extractDocketNumber(filePath);

  if (!docketNumber) {
    console.log(`Docket number not found in file: ${filePath}. Deleting file.`);
    fs.unlinkSync(filePath);
    return;
  }

  db.query('SELECT COUNT(*) AS count FROM files WHERE docketNumber = ?', [docketNumber], (err, result) => {
    if (err) {
      console.error('Error checking for duplicate docket number:', err);
      return;
    }

    if (result[0].count > 0) {
      console.log(`Duplicate docket number found (${docketNumber}) in file: ${filePath}. Deleting file.`);
      fs.unlinkSync(filePath);
      return;
    }

    const newFileName = `CON_${docketNumber}.pdf`;
    const newFilePath = path.join(finalDir, newFileName);

    fs.rename(filePath, newFilePath, (err) => {
      if (err) {
        console.error('Error renaming/moving file:', err);
        return;
      }

      db.query('INSERT INTO files (filePath, uploadedAt, docketNumber) VALUES (?, NOW(), ?)', [newFilePath, docketNumber], (err) => {
        if (err) {
          console.error('Error inserting file details into database:', err);
          return;
        }
        console.log(`File processed and saved in DB: ${newFilePath}`);
      });
    });
  });
}

// Watcher to monitor the source directory
const watcher = chokidar.watch(sourceDir, { persistent: true });

watcher.on('add', (filePath) => {
  console.log(`New file detected: ${filePath}`);
  processFile(filePath);
});

console.log(`Watching ${sourceDir} for new files...`);

// ------ RESTful API Endpoint ------ //

// -- Search Endpoint to search for a file by docket number ---//


app.get('/api/files/:docketNumber', (req, res) => {
  const docketNumber = req.params.docketNumber;

  db.query('SELECT filePath FROM files WHERE docketNumber = ?', [docketNumber], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    const filePath = result[0].filePath;
    res.json({ filePath });
  });
});

// new
app.get('/api/files/list', (req, res) => {
  fs.readdir(finalDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read final directory' });
    }

   
    const docketNumbers = files
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
       
        const match = file.match(/^CON_(\d{7,8})\.pdf$/);
        return match ? match[1] : null;
      })
      .filter(Boolean); 

    res.json({ docketNumbers });
  });
});



const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
