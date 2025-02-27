const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Get search term from command line argument
const searchTerm = process.argv[2];

if (!searchTerm) {
    console.error('Please provide a search term (email, name, or employee number)');
    process.exit(1);
}

// Connect to database
const db = new sqlite3.Database(path.join(__dirname, '../data/staff.db'), (err) => {
    if (err) {
        console.error('Error connecting to database:', err);
        process.exit(1);
    }
    console.log('Connected to SQLite database');
});

// Query to search for entries
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
    WHERE 
        email LIKE ? OR
        employee_number LIKE ? OR
        employee_first_name LIKE ? OR
        employee_last_name LIKE ?
    ORDER BY id DESC
`;

const searchPattern = `%${searchTerm}%`;

// Execute query
db.all(query, [searchPattern, searchPattern, searchPattern, searchPattern], (err, rows) => {
    if (err) {
        console.error('Error querying database:', err);
        process.exit(1);
    }
    
    if (rows.length === 0) {
        console.log(`\nNo entries found matching '${searchTerm}'`);
    } else {
        console.log(`\nFound ${rows.length} entries matching '${searchTerm}':`);
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
    }
    
    // Close the database connection
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
            process.exit(1);
        }
        console.log('Database connection closed');
    });
}); 