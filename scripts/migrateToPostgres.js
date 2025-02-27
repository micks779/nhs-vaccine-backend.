require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

console.log('Starting migration process...');

// Progress tracking file
const PROGRESS_FILE = path.join(__dirname, 'migration_progress.json');

// SQLite connection
const sqliteDb = new sqlite3.Database(path.join(__dirname, '../data/staff.db'), (err) => {
    if (err) {
        console.error('Error connecting to SQLite:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// PostgreSQL connection with adjusted timeouts
const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT || 5432,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 20000,
    idleTimeoutMillis: 20000,
    max: 3
});

// Load progress from file
function loadProgress() {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = fs.readFileSync(PROGRESS_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading progress file:', error);
    }
    return { lastProcessedId: 0, successCount: 0, errorCount: 0 };
}

// Save progress to file
function saveProgress(progress) {
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
    } catch (error) {
        console.error('Error saving progress:', error);
    }
}

async function migrate() {
    try {
        console.log('Testing PostgreSQL connection...');
        await pool.connect();
        console.log('Successfully connected to PostgreSQL');

        // Load previous progress
        const progress = loadProgress();
        console.log('Resuming from progress:', progress);

        // Get remaining data from SQLite
        console.log('Reading data from SQLite...');
        const data = await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM staff WHERE id > ? ORDER BY id', [progress.lastProcessedId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        console.log(`Found ${data.length} remaining records to migrate`);

        // Process in batches
        const BATCH_SIZE = 25;
        let successCount = progress.successCount || 0;
        let errorCount = progress.errorCount || 0;
        let totalRecords = data.length;
        
        for (let i = 0; i < data.length; i += BATCH_SIZE) {
            const batch = data.slice(i, i + BATCH_SIZE);
            let retryCount = 0;
            let success = false;

            while (!success && retryCount < 8) {
                try {
                    const client = await pool.connect();
                    try {
                        await client.query('BEGIN');
                        
                        for (const row of batch) {
                            await client.query(`
                                INSERT INTO staff (
                                    employee_number,
                                    directorate,
                                    organisation,
                                    employee_first_name,
                                    employee_last_name,
                                    email,
                                    vaccinated,
                                    created_at
                                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                                ON CONFLICT (employee_number) DO UPDATE SET
                                    directorate = EXCLUDED.directorate,
                                    organisation = EXCLUDED.organisation,
                                    employee_first_name = EXCLUDED.employee_first_name,
                                    employee_last_name = EXCLUDED.employee_last_name,
                                    email = EXCLUDED.email,
                                    vaccinated = EXCLUDED.vaccinated
                            `, [
                                row.employee_number,
                                row.directorate,
                                row.organisation,
                                row.employee_first_name,
                                row.employee_last_name,
                                row.email,
                                row.vaccinated,
                                row.created_at
                            ]);
                            
                            // Small delay between individual records
                            await new Promise(resolve => setTimeout(resolve, 100));
                        }
                        
                        await client.query('COMMIT');
                        successCount += batch.length;
                        
                        // Save progress after each successful batch
                        saveProgress({
                            lastProcessedId: batch[batch.length - 1].id,
                            successCount,
                            errorCount
                        });
                        
                        const overallProgress = ((successCount / 11593) * 100).toFixed(2);
                        const batchProgress = ((successCount / totalRecords) * 100).toFixed(2);
                        console.log(`Migrated ${successCount}/${totalRecords} records (Total Progress: ${overallProgress}%)`);
                        success = true;
                        
                    } catch (err) {
                        await client.query('ROLLBACK');
                        throw err;
                    } finally {
                        client.release();
                    }
                    
                } catch (error) {
                    console.error(`Batch error (attempt ${retryCount + 1}):`, error.message);
                    retryCount++;
                    
                    if (retryCount >= 8) {
                        console.error('Max retries reached for batch, skipping...');
                        errorCount += batch.length;
                        saveProgress({
                            lastProcessedId: batch[batch.length - 1].id,
                            successCount,
                            errorCount
                        });
                    } else {
                        // Wait before retrying
                        const delay = retryCount * 8000; // 8 seconds * retry count
                        console.log(`Waiting ${delay/1000} seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            // Delay between batches
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('\nMigration Summary:');
        console.log('------------------');
        console.log(`Total records processed: ${successCount + errorCount}`);
        console.log(`Successfully migrated: ${successCount}`);
        console.log(`Failed to migrate: ${errorCount}`);
        console.log(`Overall completion: ${((successCount / 11593) * 100).toFixed(2)}%`);
        console.log('\nMigration completed!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await pool.end();
        sqliteDb.close();
        console.log('Database connections closed');
    }
}

// Run migration
console.log('Environment:', process.env.NODE_ENV);
console.log('PostgreSQL Host:', process.env.PGHOST);
console.log('PostgreSQL Database:', process.env.PGDATABASE);
migrate(); 