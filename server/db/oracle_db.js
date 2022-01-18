require('dotenv').config();
const oracledb = require('oracledb');

/*const config = {
    user: 'NEO_DES',
    password: 'TuCarnet.',
    connectString: '172.22.3.5:1521/UCBT'
};*/

/* const config = {
    user: 'PRUEBA-DB3',
    password: 'system',
    connectString: 'localhost:1521/xe'
}; */

const config = {
    user: process.env.USER,
    password: process.env.PASSWORD,
    connectString: process.env.CONNECTSTRING
};

/*const config = {
    user: 'NEO_DES',
    password: 'TuCarnet.',
    connectString: '172.22.3.99:1521/UCBP'
};*/

async function query(sql, binds, commit) {
    let conn

    try {
        conn = await oracledb.getConnection(config)

        const result = await conn.execute(
            sql,
            binds, { autoCommit: commit, outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return {
            status: true,
            result
        };
    } catch (err) {
        console.log(err);
        return {
            status: false,
            err
        };
    } finally {
        if (conn) { // conn assignment worked, need to close
            await conn.close()
        }
    }
}


module.exports = {
    query
}