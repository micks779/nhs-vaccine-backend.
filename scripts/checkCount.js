require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT || 5432,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkCounts() {
    try {
        const result = await pool.query('SELECT COUNT(*) as count FROM staff');
        console.log('\nPostgreSQL Record Count:');
        console.log('----------------------');
        console.log(`Total records: ${result.rows[0].count}`);

        // Get a sample of records
        const sample = await pool.query('SELECT * FROM staff LIMIT 5');
        console.log('\nSample Records:');
        console.log('---------------');
        sample.rows.forEach(row => {
            console.log(`${row.employee_first_name} ${row.employee_last_name} (${row.employee_number})`);
        });

    } catch (error) {
        console.error('Error checking counts:', error);
    } finally {
        await pool.end();
    }
}

checkCounts(); 