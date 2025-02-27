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

async function runDataQualityChecks() {
    try {
        console.log('\nRunning Data Quality Checks...');
        console.log('============================\n');

        // 1. Check for null or empty values in important fields
        const nullChecks = await pool.query(`
            SELECT
                COUNT(*) as total_records,
                COUNT(*) FILTER (WHERE employee_number IS NULL OR employee_number = '') as missing_employee_numbers,
                COUNT(*) FILTER (WHERE employee_first_name IS NULL OR employee_first_name = '') as missing_first_names,
                COUNT(*) FILTER (WHERE employee_last_name IS NULL OR employee_last_name = '') as missing_last_names,
                COUNT(*) FILTER (WHERE email IS NULL OR email = '') as missing_emails
            FROM staff
        `);

        console.log('Missing Data Analysis:');
        console.log('--------------------');
        console.log(`Total Records: ${nullChecks.rows[0].total_records}`);
        console.log(`Missing Employee Numbers: ${nullChecks.rows[0].missing_employee_numbers}`);
        console.log(`Missing First Names: ${nullChecks.rows[0].missing_first_names}`);
        console.log(`Missing Last Names: ${nullChecks.rows[0].missing_last_names}`);
        console.log(`Missing Emails: ${nullChecks.rows[0].missing_emails}\n`);

        // 2. Check for duplicate employee numbers
        const duplicateCheck = await pool.query(`
            SELECT employee_number, COUNT(*) as count
            FROM staff
            GROUP BY employee_number
            HAVING COUNT(*) > 1
        `);

        console.log('Duplicate Employee Numbers:');
        console.log('-------------------------');
        if (duplicateCheck.rows.length === 0) {
            console.log('No duplicate employee numbers found.\n');
        } else {
            console.log(`Found ${duplicateCheck.rows.length} duplicate employee numbers:`);
            duplicateCheck.rows.forEach(row => {
                console.log(`Employee Number ${row.employee_number} appears ${row.count} times`);
            });
            console.log();
        }

        // 3. Directorate and Organisation distribution
        const directorateCount = await pool.query(`
            SELECT directorate, COUNT(*) as count
            FROM staff
            WHERE directorate IS NOT NULL AND directorate != ''
            GROUP BY directorate
            ORDER BY count DESC
        `);

        console.log('Directorate Distribution:');
        console.log('-----------------------');
        directorateCount.rows.forEach(row => {
            console.log(`${row.directorate}: ${row.count} staff`);
        });
        console.log();

        const orgCount = await pool.query(`
            SELECT organisation, COUNT(*) as count
            FROM staff
            WHERE organisation IS NOT NULL AND organisation != ''
            GROUP BY organisation
            ORDER BY count DESC
        `);

        console.log('Organisation Distribution:');
        console.log('------------------------');
        orgCount.rows.forEach(row => {
            console.log(`${row.organisation}: ${row.count} staff`);
        });
        console.log();

        // 4. Vaccination status distribution
        const vaccinationStatus = await pool.query(`
            SELECT 
                vaccinated,
                COUNT(*) as count,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
            FROM staff
            GROUP BY vaccinated
            ORDER BY count DESC
        `);

        console.log('Vaccination Status Distribution:');
        console.log('-----------------------------');
        vaccinationStatus.rows.forEach(row => {
            console.log(`${row.vaccinated || 'Not recorded'}: ${row.count} staff (${row.percentage}%)`);
        });
        console.log();

        // 5. Email format validation
        const invalidEmails = await pool.query(`
            SELECT email
            FROM staff
            WHERE 
                email IS NOT NULL 
                AND email != ''
                AND email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'
            LIMIT 5
        `);

        console.log('Email Format Check:');
        console.log('-----------------');
        if (invalidEmails.rows.length === 0) {
            console.log('All email addresses appear to be properly formatted.\n');
        } else {
            console.log(`Found ${invalidEmails.rows.length} potentially invalid email formats. Sample:`);
            invalidEmails.rows.forEach(row => {
                console.log(`Invalid email format: ${row.email}`);
            });
            console.log();
        }

        // 6. Recent updates check
        const recentUpdates = await pool.query(`
            SELECT 
                employee_number,
                employee_first_name,
                employee_last_name,
                vaccinated,
                created_at
            FROM staff
            ORDER BY created_at DESC
            LIMIT 5
        `);

        console.log('Most Recent Records:');
        console.log('------------------');
        recentUpdates.rows.forEach(row => {
            console.log(`${row.employee_first_name} ${row.employee_last_name} (${row.employee_number})`);
            console.log(`Status: ${row.vaccinated || 'Not recorded'}`);
            console.log(`Created: ${row.created_at}`);
            console.log('---');
        });

    } catch (error) {
        console.error('Error running data quality checks:', error);
    } finally {
        await pool.end();
    }
}

runDataQualityChecks(); 