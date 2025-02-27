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

async function setupTable() {
    try {
        console.log('Creating staff table in PostgreSQL...');
        
        // Create the staff table with the same structure as SQLite
        await pool.query(`
            CREATE TABLE IF NOT EXISTS staff (
                id SERIAL PRIMARY KEY,
                employee_number TEXT UNIQUE,
                directorate TEXT,
                organisation TEXT,
                employee_first_name TEXT,
                employee_last_name TEXT,
                email TEXT,
                vaccinated TEXT DEFAULT 'no',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes for frequently accessed columns
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_employee_number ON staff(employee_number);
            CREATE INDEX IF NOT EXISTS idx_email ON staff(email);
            CREATE INDEX IF NOT EXISTS idx_directorate ON staff(directorate);
            CREATE INDEX IF NOT EXISTS idx_organisation ON staff(organisation);
        `);

        console.log('Table and indexes created successfully!');

        // Verify table structure
        const tableInfo = await pool.query(`
            SELECT 
                column_name, 
                data_type, 
                column_default,
                is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'staff'
            ORDER BY ordinal_position;
        `);

        console.log('\nTable Structure:');
        console.log('---------------');
        tableInfo.rows.forEach(column => {
            console.log(`${column.column_name}:`);
            console.log(`  Type: ${column.data_type}`);
            console.log(`  Default: ${column.column_default || 'none'}`);
            console.log(`  Nullable: ${column.is_nullable}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error setting up table:', error);
    } finally {
        await pool.end();
    }
}

setupTable(); 