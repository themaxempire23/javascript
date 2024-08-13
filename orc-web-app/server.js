const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Use CORS to allow requests from your React frontend
app.use(cors());

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads')); // Save files to 'uploads' directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Ensure unique filenames
  }
});

const upload = multer({ storage });

// Endpoint to handle file uploads
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }
  res.status(200).json({ message: 'File uploaded successfully', filePath: `/uploads/${req.file.filename}` });
});

// Serve the uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Endpoint to list uploaded files
app.get('/files', (req, res) => {
  const directoryPath = path.join(__dirname, 'uploads');
  fs.readdir(directoryPath, (err, files) => {
    if (err) {
      return res.status(500).send('Unable to scan files');
    }
    res.send(files);
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
