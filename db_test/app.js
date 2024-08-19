const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');

const app = express();
const port = 5000;

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Hacker99',
    database: 'studentdb'
})


//Connecting to MySQL db

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL database: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL database');

});

//Middelware

app.use(bodyParser.json());

//------- My Routes ---------//


//Creating a student

app.post('/students', (req, res) => {
    const { name, age, grade } = req. body;
    const sql = 'INSERT INTO students (name, age, grade) VALUES (?, ?, ?)';
    db.query(sql, [name, age, grade], (err, result) => {
    if (err) {
    console.error('Error creating student: ' + err.stack);
    res.status(500).send('Error creating student');
      return;
    }
     console.log('Student created successfully');
     res.status(201).send('Student created successfully');
    }) ;
});

//Reading all students

app.get('/students', (req, res) => {
    const sql = 'SELECT * FROM students' ;
    db. query (sql, (err, results) => {
    if (err) {
           console.error('Error retrieving students: ' + err.stack);
           res.status(500).send('Error retrieving students');
           return;
    }
     res. json (results) ;
    }) ;
}) ;

//Updating a student

app.put('/students/:id', (req, res) => {
    const id = req. params. id;
    const { name, age, grade } = req. body;
    const sql = 'UPDATE students SET name=?, age=?, grade=? WHERE id=?';
    db.query(sql, [name, age, grade, id], (err, result) => {
    if (err) {
    console.error('Error updating student: ' + err.stack);
    res. status (500).send('Error updating student');
    return;
    }
    console. log( 'Student updated successfully');
    res. send( 'Student updated successfully'); 
   });
}) ;

// Deleting a student

app.put('/students/:id', (req, res) => {
    const id = req.params. id;
    const sql = 'DELETE FROM students WHERE id=?';
    db. query (sql, [id], (err, result) => {
    if (err) {
        console.error('Error updating student: ' + err.stack);
        res.status(500).send('Error deleting student');
        return;
    }
      console. log( 'Student  deleted successfully');
      res.send('Student  deleted successfully'); 
   });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
})