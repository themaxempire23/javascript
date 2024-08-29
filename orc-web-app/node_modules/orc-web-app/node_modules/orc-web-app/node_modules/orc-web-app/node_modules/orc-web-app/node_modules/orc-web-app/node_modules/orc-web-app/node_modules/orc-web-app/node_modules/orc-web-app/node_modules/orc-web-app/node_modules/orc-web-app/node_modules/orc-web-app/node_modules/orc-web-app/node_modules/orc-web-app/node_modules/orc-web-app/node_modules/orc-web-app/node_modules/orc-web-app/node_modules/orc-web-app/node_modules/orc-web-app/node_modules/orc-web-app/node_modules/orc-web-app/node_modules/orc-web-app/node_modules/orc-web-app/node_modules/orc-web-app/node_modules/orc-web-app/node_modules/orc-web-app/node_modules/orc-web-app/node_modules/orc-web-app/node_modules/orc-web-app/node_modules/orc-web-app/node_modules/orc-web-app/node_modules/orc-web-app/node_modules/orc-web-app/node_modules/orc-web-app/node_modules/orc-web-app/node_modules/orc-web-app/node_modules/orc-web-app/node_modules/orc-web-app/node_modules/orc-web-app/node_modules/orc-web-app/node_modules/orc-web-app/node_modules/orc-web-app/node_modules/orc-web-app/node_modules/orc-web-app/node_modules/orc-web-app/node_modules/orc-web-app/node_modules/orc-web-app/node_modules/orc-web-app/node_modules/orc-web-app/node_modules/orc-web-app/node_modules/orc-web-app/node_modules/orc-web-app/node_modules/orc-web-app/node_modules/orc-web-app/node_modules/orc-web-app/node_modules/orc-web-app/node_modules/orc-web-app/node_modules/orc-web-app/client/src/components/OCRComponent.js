import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import axios from 'axios';
import './OCRComponent.css';

GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const OCRComponent = () => {
  const [ocrText, setOcrText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedFilePath, setUploadedFilePath] = useState('');

  const handleFileChange = async (event) => {
    setIsLoading(true);
    setProgress(0);
    const file = event.target.files[0];
    setOcrText('');

    if (!file) {
      setIsLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:3001/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const filePath = response.data.filePath;
      setUploadedFilePath(filePath);

      if (file.type === 'application/pdf') {
        const pdf = await getDocument(URL.createObjectURL(file)).promise;

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        const text = await Tesseract.recognize(
          canvas,
          'eng',
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                setProgress(m.progress);
              }
            }
          }
        ).then(({ data: { text } }) => text);

        const docketNumberMatch = text.match(/\b\d{7,8}\b(?!-)/);
        const docketNumber = docketNumberMatch ? docketNumberMatch[0] : 'Docket number not found';

        setOcrText(`Docket Number is: ${docketNumber}`);
      } else {
        Tesseract.recognize(
          file,
          'eng',
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                setProgress(m.progress);
              }
            }
          }
        ).then(({ data: { text } }) => {
          const docketNumberMatch = text.match(/\b\d{7,8}\b(?!-)/);
          const docketNumber = docketNumberMatch ? docketNumberMatch[0] : 'Docket number not found';
          setOcrText(`Docket Number is: ${docketNumber}`);
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setOcrText('Error processing file');
    }

    setIsLoading(false);
  };

  const handleViewDocument = () => {
    if (uploadedFilePath) {
      // Extract just the file path relative to the 'uploads' directory
      const relativePath = uploadedFilePath.replace(/^[a-zA-Z]:\\.*\\orc-web-app\\uploads/, '/uploads');
      window.open(`http://localhost:3001${relativePath}`, '_blank'); // Open the document in a new tab
    }
  };
  

  return (
    <div className="ocr-container">
      <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="file-input" />
      {isLoading && <div className="progress-bar" style={{ width: `${progress * 100}%` }}></div>}
      <textarea value={ocrText} readOnly className="ocr-result"></textarea>
      {uploadedFilePath && (
        <button onClick={handleViewDocument}>View Document</button>
      )}
      {isLoading && <p>Processing, please wait...</p>}
    </div>
  );
};

export default OCRComponent;
