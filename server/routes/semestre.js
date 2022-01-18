const express = require('express');
const oracledb = require('../db/oracle_db');
const app = express();

app.get('/lista', async(req, res) => {
    const sql = 'select * from semestres'
    const binds = [];
    const result = await oracledb.query(sql, binds, true);
    console.log(result);
    res.json({
        msg: "semestres",
        semestres: result.result.rows
    })
})

module.exports = app;