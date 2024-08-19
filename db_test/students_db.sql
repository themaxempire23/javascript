create database studentdb;

use studentdb;

create table students (
id int auto_increment primary key,
name varchar(100) not null,
age int not null,
grade varchar(10) not null
);

select * from students;

