import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DocumentListPage = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    // Fetch the list of uploaded files from the backend
    axios.get('http://localhost:3001/files')
      .then(response => {
        setFiles(response.data);
      })
      .catch(error => {
        console.error('Error fetching files:', error);
      });
  }, []);

  return (
    <div>
      <h1>Uploaded Documents</h1>
      <ul>
        {files.map((file, index) => (
          <li key={index}>
            <a href={`http://localhost:3001/uploads/${file}`} target="_blank" rel="noopener noreferrer">
              {file}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DocumentListPage;
