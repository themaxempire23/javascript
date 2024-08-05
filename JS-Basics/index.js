 // js comment on js 1st code
 console.log('Hello Javascript');

//Declaring variables
 let personMan = 'max';
 console.log(personMan);

 // Cannot be a reversed keyword
 // Should be meaningfull e.g not x, y, z, etc
 // Cannot stat with a number (1name)
 // Cannot contain a space or hyphen
 // Are case- sensitive

 // Variables should be named on separate lines,
 //e.g

 let middleName = 'Khun';
 let lastsurnameName = 'Aguero';


 let interestRate = 0.3;
 interestRate = 1;

console.log(interestRate);


// PremitivesTypes/ValueTypes
//Strings, numbers, booleans, undefined, null

//String Literal

// let name = 'John'; // String Literal
// let age = 30;// Number Literal
// let isAproved = true;//boolean lierral
// let firstName = undefined;
// let lastName = null;
// let selectedColor= null;

// Dynamic Typing (Dynamic Language)




//Reference Types
// Object, Array and function

// object -> 

let name = 'John';
let age = 30;
let proffession = 'doctor';

let person = { //This is called the object literral syntax because of the curly/figure brackets.
    name: 'John',
    age: 45,
    proffession: 'doctor',
};


// I want to change the attributes of the object(person)

// Dot Notation
person.name = 'Angula';

// Bracket Notation a
person['name'] = 'Mary'

// Bracket Notation b
let selection = 'name'
person['selection'] = 'Mary'

console.log(person);


// Array in js -> is a data structure that we use to represent a list of items. 

let selectedColors = ['red', 'green', 'blue', 'magenta',];
selectedColors[5] = 'black';
selectedColors[6] = 'gold';
console.log(selectedColors);
// console.log(selectedColors.length);


//Functions a block of code designed to designed to perform a particular task.
// A javaScript function is executed when "somet6hing" invokes it(calls it).


// function declaration for performing a task
function greet(name, lastName) {
    console.log('Hello there!' + name + '' + lastName); // concatenate  2 strings, joining 2 strings
}

greet('Luis', 'smith');//Luis is the arguement of the function


// function declaration for calculating a value

function square(number) {
    return number * number;
}

let number = square(2);
console.log(number);

console.log(square(2));