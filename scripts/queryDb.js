const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to database
const db = new sqlite3.Database(path.join(__dirname, '../data/staff.db'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Query to get the latest entries
const query = `
    SELECT 
        id,
        employee_number,
        directorate,
        organisation,
        employee_first_name,
        employee_last_name,
        email,
        vaccinated,
        datetime(created_at, 'localtime') as created_at
    FROM staff 
    ORDER BY id DESC 
    LIMIT 5
`;

// Execute query
db.all(query, [], (err, rows) => {
    if (err) {
        console.error('Error querying database:', err);
        process.exit(1);
    }
    
    console.log('\nLatest 5 entries in the database:');
    console.log('================================\n');
    
    rows.forEach(row => {
        console.log(`Entry ID: ${row.id}`);
        console.log(`Employee Number: ${row.employee_number}`);
        console.log(`Name: ${row.employee_first_name} ${row.employee_last_name}`);
        console.log(`Email: ${row.email}`);
        console.log(`Directorate: ${row.directorate}`);
        console.log(`Organisation: ${row.organisation}`);
        console.log(`Vaccination Status: ${row.vaccinated}`);
        console.log(`Created At: ${row.created_at}`);
        console.log('--------------------------------\n');
    });
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
            process.exit(1);
        }
        console.log('Database connection closed');
    });
}); 