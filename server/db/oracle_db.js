require('dotenv').config();
const oracledb = require('oracledb');

const config = {
    user: process.env.USER,
    password: process.env.PASSWORD,
    connectString: process.env.CONNECTSTRING
};

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