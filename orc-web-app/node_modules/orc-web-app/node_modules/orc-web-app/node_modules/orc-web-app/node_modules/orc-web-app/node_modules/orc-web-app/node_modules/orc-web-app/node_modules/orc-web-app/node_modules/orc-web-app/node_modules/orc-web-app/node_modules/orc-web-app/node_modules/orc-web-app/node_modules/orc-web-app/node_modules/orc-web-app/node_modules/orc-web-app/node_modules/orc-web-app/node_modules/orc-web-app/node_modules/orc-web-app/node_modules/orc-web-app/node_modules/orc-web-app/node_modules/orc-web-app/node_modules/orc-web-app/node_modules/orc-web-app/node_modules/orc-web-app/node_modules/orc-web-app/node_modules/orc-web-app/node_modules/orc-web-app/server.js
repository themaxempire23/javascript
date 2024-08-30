
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const mysql = require('mysql2');
const Tesseract = require('tesseract.js');
const { createCanvas } = require('canvas');
const { pathToFileURL } = require('url');


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

//----- Here are the source & final directories------------//

const sourceDir = path.join(__dirname, 'source');
const finalDir = path.join(__dirname, 'final');

// Ensure final directory exists
if (!fs.existsSync(finalDir)) {
  fs.mkdirSync(finalDir);
}

//------------ OCR Magic helper function -------------//
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

//--------- How the code is processing a file -------------- //

async function processFile(filePath) {
  const docketNumber = await extractDocketNumber(filePath);

  if (!docketNumber) {
    console.log(`Docket number not found in file: ${filePath}. Deleting file.`);
    fs.unlinkSync(filePath);
    return;
  }

  //---------------- checking if docket number is already in the database-----------//

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

        //----------Here is the file name format: CON_<DocketNumber>.pdf -------//

    const newFileName = `CON_${docketNumber}.pdf`;
    const newFilePath = path.join(finalDir, newFileName);

    fs.rename(filePath, newFilePath, (err) => {
      if (err) {
        console.error('Error renaming/moving file:', err);
        return;
      }

              //------ inserting file into the database   ------------//


      db.query('INSERT INTO files (filePath, uploadedAt, docketNumber) VALUES (?, NOW(), ?)', [newFilePath, docketNumber], (err) => {
        if (err) {
          console.error('Error inserting file details into database:', err);
          return;
        }
        console.log(`File processed and saved: ${newFilePath}`);
      });
    });
  });
}


const watcher = chokidar.watch(sourceDir, { persistent: true });

watcher.on('add', (filePath) => {
  console.log(`New file detected: ${filePath}`);
  processFile(filePath);
});

console.log(`Watching ${sourceDir} for new files...`);
