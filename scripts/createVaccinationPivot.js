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

async function createVaccinationPivot() {
    try {
        // First, drop existing view if it exists
        await pool.query(`
            DROP MATERIALIZED VIEW IF EXISTS vaccination_pivot;
        `);

        // Create materialized view matching Excel structure
        await pool.query(`
            CREATE MATERIALIZED VIEW vaccination_pivot AS
            WITH directorate_stats AS (
                SELECT 
                    directorate,
                    COUNT(*) as total_staff,
                    COUNT(*) FILTER (WHERE vaccinated = 'yes') as yes_count,
                    COUNT(*) FILTER (WHERE vaccinated = 'no') as no_count,
                    COUNT(*) FILTER (WHERE vaccinated IS NULL OR vaccinated = '') as not_recorded
                FROM staff
                WHERE directorate IS NOT NULL 
                    AND directorate != ''
                    AND directorate NOT ILIKE '%vaccination%'  -- Exclude vaccination team for regular stats
                GROUP BY directorate
            ),
            vaccination_team AS (
                SELECT 
                    directorate,
                    COUNT(*) as total_staff,
                    COUNT(*) FILTER (WHERE vaccinated = 'yes') as yes_count,
                    COUNT(*) FILTER (WHERE vaccinated = 'no') as no_count
                FROM staff
                WHERE directorate ILIKE '%vaccination%'
                GROUP BY directorate
            ),
            combined_stats AS (
                SELECT 
                    directorate as category,
                    total_staff,
                    yes_count,
                    no_count,
                    total_staff - (yes_count + no_count) as remaining_to_vaccinate,
                    ROUND(100.0 * yes_count / NULLIF(total_staff, 0), 2) as vaccinated_percentage,
                    ROUND(100.0 * (yes_count + no_count) / NULLIF(total_staff, 0), 2) as including_deadline_percentage
                FROM directorate_stats
                UNION ALL
                SELECT 
                    directorate as category,
                    total_staff,
                    yes_count,
                    no_count,
                    total_staff - (yes_count + no_count) as remaining_to_vaccinate,
                    ROUND(100.0 * yes_count / NULLIF(total_staff, 0), 2) as vaccinated_percentage,
                    ROUND(100.0 * (yes_count + no_count) / NULLIF(total_staff, 0), 2) as including_deadline_percentage
                FROM vaccination_team
                UNION ALL
                SELECT 
                    'Grand Total' as category,
                    SUM(total_staff) as total_staff,
                    SUM(yes_count) as yes_count,
                    SUM(no_count) as no_count,
                    SUM(total_staff - (yes_count + no_count)) as remaining_to_vaccinate,
                    ROUND(100.0 * SUM(yes_count) / NULLIF(SUM(total_staff), 0), 2) as vaccinated_percentage,
                    ROUND(100.0 * (SUM(yes_count) + SUM(no_count)) / NULLIF(SUM(total_staff), 0), 2) as including_deadline_percentage
                FROM directorate_stats
            )
            SELECT 
                category,
                yes_count as "Yes",
                no_count as "No",
                yes_count + no_count as "Total (Yes & No)",
                total_staff as "Total Staff",
                vaccinated_percentage as "% Vaccinated",
                including_deadline_percentage as "% including deadline",
                remaining_to_vaccinate as "Remaining staff to be vaccinated"
            FROM combined_stats
            ORDER BY 
                CASE 
                    WHEN category = 'Grand Total' THEN 1
                    WHEN category ILIKE '%vaccination%' THEN 3
                    ELSE 2
                END,
                category;
        `);

        // Create index for faster querying
        await pool.query(`
            CREATE UNIQUE INDEX ON vaccination_pivot (category);
        `);

        // Query the view to show results
        const result = await pool.query('SELECT * FROM vaccination_pivot');
        
        console.log('\nVaccination Status Report:');
        console.log('========================\n');
        
        // Format and display results in a table-like format
        const formatNumber = num => num?.toString().padStart(6, ' ') || '   N/A';
        const formatPercent = num => (num?.toFixed(2) + '%').padStart(7, ' ') || '   N/A';
        
        console.log('Directorate'.padEnd(40) + ' | Yes  |  No   | Total | Staff | Vacc% | Inc.% | Remaining');
        console.log('-'.repeat(100));
        
        result.rows.forEach(row => {
            console.log(
                row.category.padEnd(40) + ' | ' +
                formatNumber(row['Yes']) + ' | ' +
                formatNumber(row['No']) + ' | ' +
                formatNumber(row['Total (Yes & No)']) + ' | ' +
                formatNumber(row['Total Staff']) + ' | ' +
                formatPercent(row['% Vaccinated']) + ' | ' +
                formatPercent(row['% including deadline']) + ' | ' +
                formatNumber(row['Remaining staff to be vaccinated'])
            );
        });

    } catch (error) {
        console.error('Error creating vaccination pivot:', error);
    } finally {
        await pool.end();
    }
}

// Create the pivot view
createVaccinationPivot(); 