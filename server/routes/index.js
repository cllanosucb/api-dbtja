const express = require('express');
const app = express();

app.use('/semestre', require('./semestre'));
app.use('/materia', require('./materia'));

module.exports = app;