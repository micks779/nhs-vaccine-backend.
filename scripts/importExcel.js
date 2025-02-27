const XLSX = require('xlsx');
const { saveStaffDetails } = require('../services/dbService');

async function importExcelData(filePath) {
    try {
        // Read the Excel file
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);
        
        let updated = 0;
        let skipped = 0;
        
        // Import each row
        for (const row of data) {
            const staffData = {
                employee_number: row['Employee Number']?.toString(),
                directorate: row['Directorate'],
                organisation: row['Organisation'],
                employee_first_name: row['Employee First Name'],
                employee_last_name: row['Employee Last Name'],
                email: row['Email'] || '', // Now including email
                vaccinated: 'no' // Default value
            };

            // Skip if no employee number
            if (!staffData.employee_number) {
                console.log('Skipping row - no employee number:', row);
                skipped++;
                continue;
            }

            try {
                await saveStaffDetails(staffData);
                console.log('Updated:', staffData.employee_number, 'with email:', staffData.email);
                updated++;
            } catch (err) {
                console.error('Error updating row:', staffData.employee_number, err.message);
                skipped++;
            }
        }
        
        console.log('\nImport completed!');
        console.log(`Updated: ${updated} records`);
        console.log(`Skipped: ${skipped} records`);
    } catch (error) {
        console.error('Import failed:', error.message);
    }
}

// Get the Excel file path from command line argument
const filePath = process.argv[2];
if (!filePath) {
    console.error('Please provide the Excel file path');
    process.exit(1);
}

importExcelData(filePath); 