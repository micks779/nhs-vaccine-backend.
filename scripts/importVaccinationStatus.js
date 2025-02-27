require('dotenv').config();
const XLSX = require('xlsx');
const { Pool } = require('pg');
const path = require('path');

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

async function importVaccinationStatus(filePath) {
    try {
        console.log('Reading Excel file...');
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        console.log(`Found ${data.length} records to process`);
        
        let updated = 0;
        let skipped = 0;
        let errors = 0;

        // Create a client for transaction
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            for (const row of data) {
                // Find the employee number and vaccination status regardless of exact column name
                const employeeNumber = Object.entries(row).find(([key]) => 
                    key.trim().toLowerCase() === 'employee number')?.[1]?.toString();
                
                const vaccinationStatus = Object.entries(row).find(([key]) => 
                    key.trim().toLowerCase() === 'vaccinated')?.[1]?.toString()?.toLowerCase()?.trim();

                // Skip if required fields are missing
                if (!employeeNumber || !vaccinationStatus) {
                    console.log('Skipping row - missing required fields:', row);
                    skipped++;
                    continue;
                }

                // Validate vaccination status
                if (vaccinationStatus !== 'yes' && vaccinationStatus !== 'no') {
                    console.log(`Skipping invalid vaccination status for employee ${employeeNumber}: ${vaccinationStatus}`);
                    skipped++;
                    continue;
                }

                try {
                    const result = await client.query(`
                        UPDATE staff 
                        SET vaccinated = $1 
                        WHERE employee_number = $2
                        RETURNING employee_number, employee_first_name, employee_last_name
                    `, [vaccinationStatus, employeeNumber]);

                    if (result.rows.length > 0) {
                        console.log(`Updated: ${result.rows[0].employee_first_name} ${result.rows[0].employee_last_name} (${employeeNumber}) -> ${vaccinationStatus}`);
                        updated++;
                    } else {
                        console.log(`Employee not found: ${employeeNumber}`);
                        skipped++;
                    }
                } catch (err) {
                    console.error(`Error updating employee ${employeeNumber}:`, err.message);
                    errors++;
                }
            }

            await client.query('COMMIT');

            console.log('\nImport Summary:');
            console.log('---------------');
            console.log(`Total records processed: ${data.length}`);
            console.log(`Successfully updated: ${updated}`);
            console.log(`Skipped: ${skipped}`);
            console.log(`Errors: ${errors}`);

            // Verify the changes
            const statusCount = await client.query(`
                SELECT vaccinated, COUNT(*) 
                FROM staff 
                GROUP BY vaccinated
                ORDER BY vaccinated
            `);

            console.log('\nCurrent Vaccination Status Distribution:');
            console.log('------------------------------------');
            statusCount.rows.forEach(row => {
                console.log(`${row.vaccinated || 'Not recorded'}: ${row.count}`);
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await pool.end();
    }
}

// Get the Excel file path from command line argument
const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide the Excel file path');
    console.log('Usage: node importVaccinationStatus.js path/to/vaccination-data.xlsx');
    process.exit(1);
}

importVaccinationStatus(filePath); 