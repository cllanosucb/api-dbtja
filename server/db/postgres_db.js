const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'neoDBAux',
    password: 'postgres',
    port: 5432,
});

const query = async(query, values) => {
    try {
        const result = await pool.query(query, values);
        return {
            status: true,
            data: result
        }
    } catch (error) {
        return {
            status: false,
            error: error
        }
    }
}


module.exports = { query }