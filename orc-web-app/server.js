const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const mysql = require('mysql2');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const { createCanvas } = require('canvas'); // Use canvas for node environment
const { pathToFileURL } = require('url');

const app = express();
const PORT = process.env.PORT || 3001;

// Use CORS to allow requests from your React frontend
app.use(cors());

// Set up MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',  // Replace with your MySQL username
  password: 'Hacker99',  // Replace with your MySQL password
  database: 'ocr_db'  // Replace with your MySQL database name
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL database');
});

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads')); // Save files to 'uploads' directory
  },
  filename: (req, file, cb) => {
    const originalName = file.originalname;
    cb(null, Date.now() + '-' + originalName); // Ensure unique filenames initially
  }
});

const upload = multer({ storage });

// Helper function to dynamically import pdfjs-dist and extract docket number
async function extractDocketNumber(filePath) {
  try {
    const fileType = path.extname(filePath);
    let text = '';

    // Convert absolute path to file URL for dynamic import
    const pdfjsLib = await import(pathToFileURL(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.mjs')).href);
    pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(__dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs')).href;

    if (fileType === '.pdf') {
      const pdf = await pdfjsLib.getDocument(filePath).promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });

      // Create a canvas for rendering
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      // Use Tesseract.js to recognize text from the rendered image
      text = await Tesseract.recognize(canvas.toBuffer(), 'eng').then(({ data: { text } }) => text);
    } else {
      // Handle non-PDF files (e.g., image files)
      text = await Tesseract.recognize(filePath, 'eng').then(({ data: { text } }) => text);
    }

    // Extract the docket number using regex
    const docketNumberMatch = text.match(/\b\d{7,8}\b(?!-)/); // Matches 7 or 8 digit numbers without hyphens
    return docketNumberMatch ? docketNumberMatch[0] : null;
  } catch (error) {
    console.error('Error during OCR processing:', error);
    return null;
  }
}

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const originalFilePath = path.join(__dirname, 'uploads', req.file.filename);
  const docketNumber = await extractDocketNumber(originalFilePath);

  if (!docketNumber) {
    fs.unlinkSync(originalFilePath); // Remove the uploaded file if docket number not found
    return res.status(400).json({ message: 'Docket number not found, file not saved' });
  }

  // Check for duplicate docket number in the database
  const queryCheck = 'SELECT COUNT(*) AS count FROM files WHERE docketNumber = ?';
  db.query(queryCheck, [docketNumber], (err, result) => {
    if (err) {
      console.error('Error checking for duplicate docket number:', err);
      return res.status(500).json({ message: 'Database error during duplicate check' });
    }

    if (result[0].count > 0) {
      fs.unlinkSync(originalFilePath); // Remove the uploaded file if duplicate found
      return res.status(400).json({ message: 'Duplicate docket number found, file not saved' });
    }

    // Rename the file with docket number
    const newFileName = `CON_${docketNumber}.pdf`;
    const newFilePath = path.join(__dirname, 'uploads', newFileName);

    fs.rename(originalFilePath, newFilePath, (err) => {
      if (err) {
        console.error('Error renaming file:', err);
        return res.status(500).json({ message: 'Error renaming file' });
      }

      // Insert file details into the database
      const uploadTime = new Date();
      const queryInsert = 'INSERT INTO files (filePath, uploadedAt, docketNumber) VALUES (?, ?, ?)';
      db.query(queryInsert, [newFilePath, uploadTime, docketNumber], (err, result) => {
        if (err) {
          console.error('Error inserting file details into database:', err);
          return res.status(500).json({ message: 'Error saving file details to database' });
        }
        res.status(200).json({ message: 'File uploaded and saved successfully', filePath: newFilePath });
      });
    });
  });
});

// Serve the uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint to list uploaded files
app.get('/files', (req, res) => {
  const query = 'SELECT * FROM files';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error retrieving files from database:', err);
      return res.status(500).json({ message: 'Error retrieving files' });
    }
    res.json(results);
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
