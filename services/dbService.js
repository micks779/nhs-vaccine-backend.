const { db, query } = require('../config/database');

// Save staff details
async function saveStaffDetails(staffData) {
    const { 
        employee_number, 
        directorate, 
        organisation,
        employee_first_name,
        employee_last_name,
        email
    } = staffData;

    if (process.env.NODE_ENV === 'production') {
        const text = `
            INSERT INTO staff (
                employee_number, 
                directorate, 
                organisation,
                employee_first_name,
                employee_last_name,
                email
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (employee_number) 
            DO UPDATE SET
                directorate = EXCLUDED.directorate,
                organisation = EXCLUDED.organisation,
                employee_first_name = EXCLUDED.employee_first_name,
                employee_last_name = EXCLUDED.employee_last_name,
                email = EXCLUDED.email
            RETURNING id`;
        
        const values = [
            employee_number,
            directorate,
            organisation,
            employee_first_name,
            employee_last_name,
            email
        ];

        const result = await query(text, values);
        return result.rows[0].id;
    } else {
        return new Promise((resolve, reject) => {
            db.run(
                `INSERT OR REPLACE INTO staff (
                    employee_number, 
                    directorate, 
                    organisation,
                    employee_first_name,
                    employee_last_name,
                    email
                ) VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    employee_number,
                    directorate,
                    organisation,
                    employee_first_name,
                    employee_last_name,
                    email
                ],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
    }
}

// Update vaccination status
async function updateVaccinationStatus(employee_number, status) {
    if (process.env.NODE_ENV === 'production') {
        const text = 'UPDATE staff SET vaccinated = $1 WHERE employee_number = $2';
        const result = await query(text, [status, employee_number]);
        return result.rowCount > 0;
    } else {
        return new Promise((resolve, reject) => {
            db.run(
                'UPDATE staff SET vaccinated = ? WHERE employee_number = ?',
                [status, employee_number],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.changes > 0);
                }
            );
        });
    }
}

// Get staff details by employee number
async function getStaffByEmployeeNumber(employee_number) {
    if (process.env.NODE_ENV === 'production') {
        const text = 'SELECT * FROM staff WHERE employee_number = $1';
        const result = await query(text, [employee_number]);
        return result.rows[0];
    } else {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM staff WHERE employee_number = ?', [employee_number], (err, staff) => {
                if (err) reject(err);
                else resolve(staff);
            });
        });
    }
}

// Get staff details by email
async function getStaffByEmail(email) {
    if (process.env.NODE_ENV === 'production') {
        const text = 'SELECT * FROM staff WHERE email = $1';
        const result = await query(text, [email]);
        return result.rows[0];
    } else {
        return new Promise((resolve, reject) => {
            db.get('SELECT * FROM staff WHERE email = ?', [email], (err, staff) => {
                if (err) reject(err);
                else resolve(staff);
            });
        });
    }
}

// Get all staff
async function getAllStaff() {
    if (process.env.NODE_ENV === 'production') {
        const text = 'SELECT * FROM staff ORDER BY employee_last_name, employee_first_name';
        const result = await query(text);
        return result.rows;
    } else {
        return new Promise((resolve, reject) => {
            db.all('SELECT * FROM staff ORDER BY employee_last_name, employee_first_name', [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

// Get unique directorates
async function getDirectorates() {
    if (process.env.NODE_ENV === 'production') {
        const text = `
            SELECT DISTINCT directorate 
            FROM staff 
            WHERE directorate IS NOT NULL AND directorate != ''
            ORDER BY directorate`;
        const result = await query(text);
        return result.rows.map(row => row.directorate);
    } else {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT DISTINCT directorate 
                FROM staff 
                WHERE directorate IS NOT NULL AND directorate != ''
                ORDER BY directorate`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => row.directorate));
                }
            );
        });
    }
}

// Get unique organisations
async function getOrganisations() {
    if (process.env.NODE_ENV === 'production') {
        const text = `
            SELECT DISTINCT organisation 
            FROM staff 
            WHERE organisation IS NOT NULL AND organisation != ''
            ORDER BY organisation`;
        const result = await query(text);
        return result.rows.map(row => row.organisation);
    } else {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT DISTINCT organisation 
                FROM staff 
                WHERE organisation IS NOT NULL AND organisation != ''
                ORDER BY organisation`,
                [],
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows.map(row => row.organisation));
                }
            );
        });
    }
}

module.exports = {
    saveStaffDetails,
    updateVaccinationStatus,
    getStaffByEmployeeNumber,
    getStaffByEmail,
    getAllStaff,
    getDirectorates,
    getOrganisations
}; 