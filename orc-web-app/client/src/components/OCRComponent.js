import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf';
import './OCRComponent.css'; // Importing the a CSS file for styling

GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.mjs`;

const OCRComponent = () => {
  const [ocrText, setOcrText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0); // New state for tracking progress

  const handleFileChange = async (event) => {
    setIsLoading(true);
    setProgress(0); // Reset progress on new file upload
    const file = event.target.files[0];
    setOcrText('');

    if (!file) {
      setIsLoading(false);
      return;
    }

    if (file.type === 'application/pdf') {
      const pdf = await getDocument(URL.createObjectURL(file)).promise;

      const page = await pdf.getPage(1); // Only process the first page
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;

      // Run OCR on the entire page
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

      // Use regex to extract the docket number, ignoring numbers with hyphens
      const docketNumberMatch = text.match(/\b\d{7,8}\b(?!-)/); // Matches 7 or 8 digit numbers that do not have hyphens
      const docketNumber = docketNumberMatch ? docketNumberMatch[0] : 'Docket number not found';

      setOcrText(`Docket Number is: ${docketNumber}`);
    } else {
      // Handle image files (e.g., PNG, JPG)
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
        // Use regex to extract the docket number, ignoring numbers with hyphens
        const docketNumberMatch = text.match(/\b\d{7,8}\b(?!-)/); // Matches 7 or 8 digit numbers that do not have hyphens
        const docketNumber = docketNumberMatch ? docketNumberMatch[0] : 'Docket number not found';
        setOcrText(`Docket Number is: ${docketNumber}`);
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="ocr-container">
      <input type="file" onChange={handleFileChange} accept="image/*,application/pdf" className="file-input"/>
      {isLoading && <div className="progress-bar" style={{ width: `${progress * 100}%` }}></div>}
      <textarea value={ocrText} readOnly className="ocr-result"></textarea>
      {isLoading && <p>Processing, please wait...</p>}
    </div>
  );
};

export default OCRComponent;
