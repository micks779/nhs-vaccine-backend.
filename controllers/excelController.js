const { updateVaccinationStatus, getStaffByEmployeeNumber } = require('../services/dbService');

async function saveResponseToExcel(employee_number, response) {
    try {
        // Check if staff exists
        const staff = await getStaffByEmployeeNumber(employee_number);
        
        if (!staff) {
            throw new Error('Staff member not found');
        }
        
        // Update vaccination status
        await updateVaccinationStatus(employee_number, response);
        
        console.log('Successfully updated vaccination status');
        return { success: true };
    } catch (error) {
        console.error('Error updating vaccination status:', error.message);
        throw error;
    }
}

module.exports = { saveResponseToExcel };
