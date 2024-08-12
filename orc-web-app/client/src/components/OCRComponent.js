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
      let allText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;

        // Define region of interest (ROI) for docket number
        const roiCanvas = document.createElement('canvas');
        const roiContext = roiCanvas.getContext('2d');
        const roiX = 1500; // X coordinate of ROI (Adjust as needed)
        const roiY = 300;  // Y coordinate of ROI (Adjust as needed)
        const roiWidth = 300; // Width of ROI (Adjust as needed)
        const roiHeight = 100; // Height of ROI (Adjust as needed)

        roiCanvas.width = roiWidth;
        roiCanvas.height = roiHeight;

        roiContext.drawImage(canvas, roiX, roiY, roiWidth, roiHeight, 0, 0, roiWidth, roiHeight);

        const text = await Tesseract.recognize(
          roiCanvas,
          'eng',
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                setProgress((pageNum - 1) / pdf.numPages + m.progress / pdf.numPages);
              }
            },
            tessedit_char_whitelist: '0123456789' // Restrict OCR to digits only
          }
        ).then(({ data: { text } }) => text);

        allText += text + '\n\n';
      }

      setOcrText(allText.trim());
    } else {
      Tesseract.recognize(
        file,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setProgress(m.progress);
            }
          },
          tessedit_char_whitelist: '0123456789' // Restrict OCR to digits only
        }
      ).then(({ data: { text } }) => {
        setOcrText(text.trim());
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
