require("dotenv").config();  // Load environment variables
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || "https://your-frontend-url.com",
  methods: "GET,POST,PUT,DELETE",
  credentials: true
};

// Middleware
app.use(cors(corsOptions));  // Allows requests from frontend with specific options
app.use(bodyParser.json());  // Parses incoming JSON requests

// Test route to check if server is running
app.get("/", (req, res) => {
  res.send("NHS Vaccine Add-in API is running 🚀");
});

// Import routes
const vaccineRoutes = require("./routes/vaccine");
app.use("/api/vaccine", vaccineRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`🔒 CORS enabled for: ${corsOptions.origin}`);
});
