const express = require("express");
const router = express.Router();
const { saveResponseToExcel } = require("../controllers/excelController");
const { 
  saveStaffDetails, 
  getAllStaff, 
  getStaffByEmail,
  getDirectorates,
  getOrganisations 
} = require("../services/dbService");
const db = require("../services/dbService");

// Route to get directorates
router.get("/directorates", async (req, res) => {
  try {
    const directorates = await getDirectorates();
    console.log('Route received directorates:', directorates);
    res.status(200).json(directorates);
  } catch (error) {
    console.error("Error getting directorates:", error);
    res.status(500).json({ error: "Failed to get directorates" });
  }
});

// Route to get organisations
router.get("/organisations", async (req, res) => {
  try {
    const organisations = await getOrganisations();
    console.log('Route received organisations:', organisations);
    res.status(200).json(organisations);
  } catch (error) {
    console.error("Error getting organisations:", error);
    res.status(500).json({ error: "Failed to get organisations" });
  }
});

// Test route to check dropdown data
router.get("/test-dropdowns", async (req, res) => {
  try {
    const directorates = await getDirectorates();
    const organisations = await getOrganisations();
    res.status(200).json({
      directorates,
      organisations,
      directoratesCount: directorates.length,
      organisationsCount: organisations.length
    });
  } catch (error) {
    console.error("Error testing dropdowns:", error);
    res.status(500).json({ error: "Failed to test dropdowns" });
  }
});

// Route to handle Yes/No responses
router.post("/submit", async (req, res) => {
  try {
    const { employee_number, response } = req.body;
    await saveResponseToExcel(employee_number, response);
    res.status(200).json({ message: "Response saved successfully" });
  } catch (error) {
    console.error("Error saving response:", error);
    res.status(500).json({ error: "Failed to save response" });
  }
});

// Route to look up staff by email
router.get("/lookup/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const staff = await getStaffByEmail(email);
    
    if (staff) {
      res.status(200).json({
        found: true,
        staff: staff
      });
    } else {
      res.status(200).json({
        found: false,
        message: "Staff not found. Please provide your details."
      });
    }
  } catch (error) {
    console.error("Error looking up staff:", error);
    res.status(500).json({ error: "Failed to look up staff" });
  }
});

// Route to submit staff details
router.post("/staff", async (req, res) => {
  try {
    const staffData = {
      employee_number: req.body.employee_number,
      directorate: req.body.directorate,
      organisation: req.body.organisation,
      employee_first_name: req.body.employee_first_name,
      employee_last_name: req.body.employee_last_name,
      email: req.body.email
    };
    await saveStaffDetails(staffData);
    res.status(200).json({ message: "Staff details saved successfully" });
  } catch (error) {
    console.error("Error saving staff details:", error);
    res.status(500).json({ error: "Failed to save staff details" });
  }
});

// Route to get all staff
router.get("/staff", async (req, res) => {
  try {
    const staff = await getAllStaff();
    res.status(200).json(staff);
  } catch (error) {
    console.error("Error getting staff data:", error);
    res.status(500).json({ error: "Failed to get staff data" });
  }
});

// Test route to list all unique values
router.get("/list-all-options", async (req, res) => {
  try {
    const directorates = await getDirectorates();
    const organisations = await getOrganisations();
    
    res.status(200).json({
      counts: {
        directorates: directorates.length,
        organisations: organisations.length
      },
      values: {
        directorates,
        organisations
      }
    });
  } catch (error) {
    console.error("Error in list-all-options:", error);
    res.status(500).json({ error: "Failed to get options" });
  }
});

module.exports = router;
