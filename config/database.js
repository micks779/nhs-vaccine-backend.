require('dotenv').config();
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;
let queryFn;

if (process.env.NODE_ENV === 'production') {
    // PostgreSQL configuration for production
    const pool = new Pool({
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGDATABASE,
        password: process.env.PGPASSWORD,
        port: process.env.PGPORT || 5432,
        ssl: {
            rejectUnauthorized: false // Required for some PostgreSQL providers
        }
    });

    // Test PostgreSQL connection
    pool.connect()
        .then(() => console.log('Connected to PostgreSQL database'))
        .catch(err => console.error('PostgreSQL connection error:', err));

    db = pool;
    queryFn = async (text, params) => {
        try {
            const result = await pool.query(text, params);
            return result;
        } catch (err) {
            console.error('Database query error:', err);
            throw err;
        }
    };
} else {
    // SQLite configuration for development
    db = new sqlite3.Database(path.join(__dirname, '../data/staff.db'), (err) => {
        if (err) {
            console.error('Error connecting to SQLite database:', err);
        } else {
            console.log('Connected to SQLite database');
            createTables();
        }
    });
    queryFn = db;
}

// Create tables function (for SQLite development)
function createTables() {
    if (process.env.NODE_ENV !== 'production') {
        db.run(`
            CREATE TABLE IF NOT EXISTS staff (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                employee_number TEXT UNIQUE,
                directorate TEXT,
                organisation TEXT,
                employee_first_name TEXT,
                employee_last_name TEXT,
                email TEXT,
                vaccinated TEXT DEFAULT 'no',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);
    }
}

module.exports = {
    db,
    query: queryFn
}; 