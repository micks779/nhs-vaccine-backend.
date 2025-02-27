require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');

// SQLite connection
const sqliteDb = new sqlite3.Database(path.join(__dirname, '../data/staff.db'), (err) => {
    if (err) {
        console.error('Error connecting to SQLite:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// PostgreSQL connection
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

async function compareVaccinationStatus() {
    try {
        // Get SQLite vaccination stats
        const sqliteStats = await new Promise((resolve, reject) => {
            sqliteDb.all(`
                SELECT 
                    vaccinated,
                    COUNT(*) as count
                FROM staff 
                GROUP BY vaccinated
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Get PostgreSQL vaccination stats
        const pgStats = await pool.query(`
            SELECT 
                vaccinated,
                COUNT(*) as count
            FROM staff 
            GROUP BY vaccinated
        `);

        console.log('\nVaccination Status Comparison:');
        console.log('============================\n');

        console.log('SQLite Database:');
        console.log('--------------');
        sqliteStats.forEach(row => {
            console.log(`Status "${row.vaccinated || 'NULL/blank'}": ${row.count} records`);
        });

        console.log('\nPostgreSQL Database:');
        console.log('------------------');
        pgStats.rows.forEach(row => {
            console.log(`Status "${row.vaccinated || 'NULL/blank'}": ${row.count} records`);
        });

        // Get sample of mismatched records
        console.log('\nChecking for mismatches...');
        const sqliteSample = await new Promise((resolve, reject) => {
            sqliteDb.all(`
                SELECT 
                    employee_number,
                    employee_first_name,
                    employee_last_name,
                    vaccinated
                FROM staff 
                WHERE vaccinated = 'yes'
                LIMIT 5
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log('\nSample of "yes" records from SQLite:');
        console.log('--------------------------------');
        for (const record of sqliteSample) {
            const pgRecord = await pool.query(`
                SELECT vaccinated 
                FROM staff 
                WHERE employee_number = $1
            `, [record.employee_number]);

            console.log(`Employee ${record.employee_first_name} ${record.employee_last_name} (${record.employee_number}):`);
            console.log(`  SQLite: ${record.vaccinated}`);
            console.log(`  PostgreSQL: ${pgRecord.rows[0]?.vaccinated || 'NULL'}`);
            console.log('---');
        }

    } catch (error) {
        console.error('Error comparing databases:', error);
    } finally {
        sqliteDb.close();
        await pool.end();
    }
}

compareVaccinationStatus(); 