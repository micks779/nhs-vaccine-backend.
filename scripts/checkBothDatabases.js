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

async function checkCounts() {
    try {
        // Get SQLite count
        const sqliteCount = await new Promise((resolve, reject) => {
            sqliteDb.get('SELECT COUNT(*) as count FROM staff', [], (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });

        // Get PostgreSQL count
        const pgResult = await pool.query('SELECT COUNT(*) as count FROM staff');
        const pgCount = parseInt(pgResult.rows[0].count);

        console.log('\nDatabase Record Counts:');
        console.log('----------------------');
        console.log(`SQLite total records: ${sqliteCount}`);
        console.log(`PostgreSQL migrated records: ${pgCount}`);
        console.log(`Remaining to migrate: ${sqliteCount - pgCount}`);
        console.log(`Migration progress: ${((pgCount / sqliteCount) * 100).toFixed(2)}%`);

    } catch (error) {
        console.error('Error checking counts:', error);
    } finally {
        sqliteDb.close();
        await pool.end();
    }
}

checkCounts(); 