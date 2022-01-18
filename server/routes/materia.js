const express = require('express');
const {
    listaParalelos,
    registrarParalelos,
    listaParalelosDBAux,
    registrarPlantilla
} = require('../controllers/materias.controller');
const app = express();

app.get('/lista/:num_sec_semestre', async(req, res) => {
    const num_sec_semestre = req.params.num_sec_semestre;
    const paralelos = await listaParalelos(num_sec_semestre); //7931
    const resultRegistro = await registrarParalelos(paralelos.status ? paralelos.data : []);
    const auxParalelos = await listaParalelosDBAux(num_sec_semestre);
    const registroPlantillas = await registrarPlantilla(auxParalelos.status ? auxParalelos.data : []);
    res.json({
        msg: "materias",
        status: paralelos.status ? true : false,
        materias: paralelos.status ? paralelos.data : paralelos.error,
        registros: paralelos.status ? resultRegistro : {},
        paralelosAux: auxParalelos.status ? auxParalelos.data : auxParalelos.error
    });
})

module.exports = app;