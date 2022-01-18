require('dotenv').config();
const oracledb = require('../db/oracle_db');
const postgresdb = require('../db/postgres_db');
const moment = require('moment');
const fetch = (...args) =>
    import ('node-fetch').then(({ default: fetch }) => fetch(...args));

// Lista de paralelos por semestre
listaParalelos = async(num_sec_semestre) => {
        const sql = `SELECT SEMESTRES.DESCRIPCION AS SEMESTRES_DESCRIPCION, SEMESTRES.FECHA_INICIO AS SEMESTRES_FECHA_INICIO, SEMESTRES.FECHA_FIN AS SEMESTRES_FECHA_FIN, SEMESTRES.RESUMIDO AS SEMESTRES_RESUMIDO, PARALELOS.NUM_SEC_SEMESTRE AS NUM_SEC_SEMESTRE, PARALELOS.NUM_SEC AS PARALELOS_NUM_SEC, PARALELOS.NUM_CREDITOS AS PARALELOS_NUM_CREDITOS, PARALELOS.NUMERO_PARALELO AS NUMERO_PARALELO, 
    MATERIAS.NUM_SEC AS MATERIAS_NUM_SEC, MATERIAS.SIGLA AS MATERIAS_SIGLA, MATERIAS.NOMBRE AS MATERIAS_NOMBRE, 
    CARRERAS.NUM_SEC AS CARRERAS_NUM_SEC, CARRERAS.NOMBRE AS CARRERAS_NOMBRE, PARALELOS.NUM_SEC_DOCENTE AS NUM_SEC_DOCENTE, PERSONAS.AP_PATERNO AS AP_PATERNO, 
    PERSONAS.AP_MATERNO AS AP_MATERNO, PERSONAS.NOMBRES AS NOMBRES, PERSONAS.DOC_IDENTIDAD AS DOC_IDENTIDAD, PERSONAS.SEXO AS SEXO, PERSONAS.FECHA_NACIMIENTO AS FECHA_NACIMIENTO, 
    PERSONAS_DATOS_ADICIONALES.CELULAR AS CELULAR, PERSONAS_DATOS_ADICIONALES.EMAIL_UCB AS EMAIL_UCB, CARRERAS.INTERNA, 
    PARALELOS.NUM_ALUMNOS_INSCRITOS AS NUM_ALUMNOS_INSCRITOS, DOMINIOS.DESCRIPCION AS DESCRIPCION
    FROM DOMINIOS INNER JOIN (((((PARALELOS INNER JOIN MATERIAS ON PARALELOS.NUM_SEC_MATERIA = MATERIAS.NUM_SEC) 
    INNER JOIN CARRERAS ON PARALELOS.NUM_SEC_CARRERA = CARRERAS.NUM_SEC) 
    INNER JOIN PERSONAS ON PARALELOS.NUM_SEC_DOCENTE = PERSONAS.NUM_SEC)
    INNER JOIN SEMESTRES ON PARALELOS.NUM_SEC_SEMESTRE = SEMESTRES.NUM_SEC) 
    LEFT JOIN PERSONAS_DATOS_ADICIONALES ON PERSONAS.NUM_SEC = PERSONAS_DATOS_ADICIONALES.NUM_SEC_PERSONA) 
    ON DOMINIOS.VALOR = PARALELOS.TIPO
    WHERE (((PARALELOS.NUM_SEC_SEMESTRE)=:num_sec_semestre) AND ((DOMINIOS.DOMINIO)='TIPO_PARALELO'))
    GROUP BY SEMESTRES.DESCRIPCION, SEMESTRES.FECHA_INICIO, SEMESTRES.FECHA_FIN, SEMESTRES.RESUMIDO, PARALELOS.NUM_SEC_SEMESTRE, PARALELOS.NUM_SEC, 
    PARALELOS.NUM_CREDITOS, PARALELOS.NUMERO_PARALELO, MATERIAS.NUM_SEC, MATERIAS.SIGLA, 
    MATERIAS.NOMBRE, CARRERAS.NUM_SEC, CARRERAS.NOMBRE, PARALELOS.NUM_SEC_DOCENTE, 
    PERSONAS.AP_PATERNO, PERSONAS.AP_MATERNO, PERSONAS.NOMBRES, PERSONAS.DOC_IDENTIDAD, 
    PERSONAS.SEXO, PERSONAS.FECHA_NACIMIENTO, PERSONAS_DATOS_ADICIONALES.CELULAR, PERSONAS_DATOS_ADICIONALES.EMAIL_UCB, 
    CARRERAS.INTERNA, PARALELOS.NUM_ALUMNOS_INSCRITOS, DOMINIOS.DESCRIPCION
    HAVING (((CARRERAS.INTERNA)<>4))`;
        const binds = [num_sec_semestre];
        const result = await oracledb.query(sql, binds, true);
        if (result.status) {
            return {
                status: true,
                data: result.result.rows
            }
        } else {
            return {
                status: false,
                error: result.err
            }
        }
    }
    // Registrar y actualizar paralelos en DB auxiliar postgres
registrarParalelos = async(lista) => {
    const sqlParalelo = "SELECT * FROM paralelos_ucb WHERE paralelos_num_sec = $1"
    let contInsert = 0;
    let contUpdate = 0;
    let contErrorInsert = 0;
    let contErrorUpdate = 0;
    for (let i = 0; i < lista.length; i++) {
        const result = await postgresdb.query(sqlParalelo, [lista[i].PARALELOS_NUM_SEC]);
        if (result.status ? result.data.rows.length : 0 > 0) {
            const ucbp = result.data.rows[0];
            let cambio_docente = lista[i].NUM_SEC_DOCENTE != ucbp.num_sec_docente;
            // console.log("mayor a cero", lista[i].PARALELOS_NUM_SEC + " - " + ucbp.paralelos_num_sec + " " + lista[i].NUM_SEC_DOCENTE + " - " + ucbp.num_sec_docente + " - " + cambio_docente);
            if (cambio_docente) {
                const resultUpdate = await updateParaleloDocente(lista[i], cambio_docente);
                if (resultUpdate.status) {
                    contUpdate = contUpdate + 1;
                } else {
                    contErrorUpdate = contErrorUpdate + 1;
                }
            }
        } else {
            console.log("menor a cero");
            const resultInsert = await insertParalelo(lista[i]);
            console.log("resultInsert", resultInsert);
            if (resultInsert.status) {
                contInsert = contInsert + 1;
            } else {
                contErrorInsert = contErrorInsert + 1;
            }
        }
    }
    return {
        status: true,
        contInsert,
        contUpdate,
        contErrorInsert,
        contErrorUpdate
    }
}

insertParalelo = async(p) => {
    const sqlInsert = `INSERT INTO paralelos_ucb(
        semestres_descripcion, semestres_fecha_inicio, semestres_fecha_fin, semestres_resumido, num_sec_semestre, paralelos_num_sec, paralelos_num_creditos, numero_paralelo, materias_num_sec, materias_sigla, materias_nombre, carreras_num_sec, carreras_nombre, num_sec_docente, ap_paterno, ap_materno, nombres, doc_identidad, sexo, fecha_nacimiento, celular, email_ucb, interna, num_alumnos_inscritos, descripcion)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25);`;
    const values = [p.SEMESTRES_DESCRIPCION, p.SEMESTRES_FECHA_INICIO, p.SEMESTRES_FECHA_FIN, p.SEMESTRES_RESUMIDO, p.NUM_SEC_SEMESTRE, p.PARALELOS_NUM_SEC, p.PARALELOS_NUM_CREDITOS, p.NUMERO_PARALELO, p.MATERIAS_NUM_SEC, p.MATERIAS_SIGLA, p.MATERIAS_NOMBRE, p.CARRERAS_NUM_SEC, p.CARRERAS_NOMBRE, p.NUM_SEC_DOCENTE, p.AP_PATERNO, p.AP_MATERNO, p.NOMBRES, p.DOC_IDENTIDAD, p.SEXO, p.FECHA_NACIMIENTO, p.CELULAR, p.EMAIL_UCB, p.INTERNA, p.NUM_ALUMNOS_INSCRITOS, p.DESCRIPCION];
    const result = await postgresdb.query(sqlInsert, values);
    return result;
}

updateParaleloDocente = async(p, cambio_docente) => {
    const sqlUpdate = `UPDATE paralelos_ucb
	SET num_sec_docente=$1, ap_paterno=$2, ap_materno=$3, nombres=$4, doc_identidad=$5, sexo=$6, fecha_nacimiento=$7, celular=$8, email_ucb=$9, interna=$10, num_alumnos_inscritos=$11, descripcion=$12, cambio_docente=$13
	WHERE PARALELOS_NUM_SEC = $14;`;
    const values = [p.NUM_SEC_DOCENTE, p.AP_PATERNO, p.AP_MATERNO, p.NOMBRES, p.DOC_IDENTIDAD, p.SEXO, p.FECHA_NACIMIENTO, p.CELULAR, p.EMAIL_UCB, p.INTERNA, p.NUM_ALUMNOS_INSCRITOS, p.DESCRIPCION, cambio_docente, p.PARALELOS_NUM_SEC];
    const result = await postgresdb.query(sqlUpdate, values);
    return result;
}

//lista de paralelos de DB auxiliar
listaParalelosDBAux = async(num_sec_semestre) => {
    const sqlParalelos = `SELECT *
    FROM paralelos_ucb
    WHERE num_sec_semestre = $1 AND asignatura_nueva = true OR cambio_docente = true`;
    const values = [num_sec_semestre];
    const result = await postgresdb.query(sqlParalelos, values);
    if (result.status) {
        return {
            status: true,
            data: result.data.rows
        }
    } else {
        return {
            status: false,
            error: result.error
        }
    }
}

//
registrarPlantilla = (lista) => {
    for (let i = 0; i < lista.length; i++) {
        if (lista[i].asignatura_nueva) {
            console.log("asignatura_nueva", lista[i].paralelos_num_sec + " - " + lista[i].asignatura_nueva);
            const plantilla = generarDatosNeo(lista[i], true);
            const paralelo = generarDatosNeo(lista[i], false);
            plantilla.lms_id = 1;
            console.log("plantilla", plantilla);
            console.log("paralelo", paralelo);
        }
        if (lista[i].cambio_docente) {
            console.log("cambio_docente", lista[i].paralelos_num_sec + " - " + lista[i].cambio_docente + " - " + lista[i].num_sec_docente);
        }
    }
}

generarDatosNeo = (p, plantilla) => {
    console.log(moment(p.semestres_fecha_inicio).format('DD/MM/YYYY'));
    console.log(moment(p.semestres_fecha_fin).format('DD/MM/YYYY'));
    if (plantilla) {
        const plantilla = {
            num_sec_persona: p.num_sec_docente,
            lms_id: null,
            nombre: `Plantilla: ${p.materias_sigla} ${p.materias_nombre}`,
            fecha_inicio: moment(p.semestres_fecha_inicio).format('DD/MM/YYYY'),
            fecha_fin: moment(p.semestres_fecha_fin).format('DD/MM/YYYY'),
            creditos: p.paralelos_num_creditos,
            semestre: p.semestres_resumido,
            curse_code: `${process.env.CODIGO_REGIONAL}.${p.materias_num_sec}.${p.num_sec_docente}`,
            idioma: process.env.IDIOMA,
            zona_horaria: process.env.ZONA_HORARIA,
            mostrar_catalogo: true,
            categoria_catalogo: p.carreras_nombre,
            plantilla: true,
            inscribirse: false,
            dar_baja: false,
            desactivados: false,
            organizacion: process.env.ORGANIZACION
        };
        return plantilla;
    } else {
        const paralelo = {
            num_sec_plantilla: null,
            lms_id: null,
            nombre: `${p.materias_sigla} ${p.materias_nombre} [Par.${p.numero_paralelo}]`,
            fecha_inicio: moment(p.semestres_fecha_inicio).format('DD/MM/YYYY'),
            fecha_fin: moment(p.semestres_fecha_fin).format('DD/MM/YYYY'),
            creditos: p.paralelos_num_creditos,
            semestre: p.semestres_resumido,
            curse_code: `${process.env.CODIGO_REGIONAL}.${p.paralelos_num_sec}`,
            idioma: process.env.IDIOMA,
            zona_horaria: process.env.ZONA_HORARIA,
            mostrar_catalogo: true,
            categoria_catalogo: p.carreras_nombre,
            plantilla: false,
            asignatura_matriz: null,
            inscribirse: false,
            dar_baja: false,
            desactivados: false,
            organizacion: process.env.ORGANIZACION,
            num_sec_paralelo: p.paralelos_num_sec
        };
        return paralelo;
    }
}

generarAtributosUrl = (d, plantilla) => {
    if (plantilla) {
        return `&name=${d.nombre}&start=${d.fecha_inicio}&finish=${d.fecha_fin}&credits=${d.creditos}&semester=${d.semestre}&course_code=${d.curse_code}&language=${d.idioma}&time_zone=${d.zona_horaria}&display_in_catalog=${d.mostrar_catalogo}&catalog_category=${d.categoria_catalogo}&template=${d.plantilla}&organization=${d.organizacion}`;
    } else {
        return `&name=${d.nombre}&start=${d.fecha_inicio}&finish=${d.fecha_fin}&credits=${d.creditos}&semester=${d.semestre}&course_code=${d.curse_code}&language=${d.idioma}&time_zone=${d.zona_horaria}&display_in_catalog=${d.mostrar_catalogo}&catalog_category=${d.categoria_catalogo}&template=${d.plantilla}&organization=${d.organizacion}`;
    }
}

/* try {
    const response = await fetch(`${process.env.URL}/update_user?api_key=${process.env.API_KEY}&id=${lms_id_usuario}&email=${email_institucional}&num_sec_persona=${num_sec_persona}`);
    const respPeticion = await fetch(`${process.env.URL_GETVERPAGOSFECHA}/${fecha_inicio}/${fecha_fin}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            'Token': process.env.TOKEN_GETVERPAGOSFECHA,
        },
    });
    if (respPeticion.ok) {
        const lista = await respPeticion.json();
        return lista;
    } else {
        return []
    }
} catch (err) {
    return []
} */

module.exports = {
    listaParalelos,
    registrarParalelos,
    listaParalelosDBAux,
    registrarPlantilla
}