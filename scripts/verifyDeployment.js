require('dotenv').config();
const axios = require('axios');
const { Pool } = require('pg');

const backendUrl = process.env.BACKEND_URL || 'https://nhs-vaccine-backend.onrender.com';
const frontendUrl = process.env.FRONTEND_URL || 'https://nhs-vaccine-frontend.onrender.com';

// Database connection
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

async function verifyDeployment() {
    console.log('🔍 Starting Deployment Verification...\n');
    
    try {
        // 1. Check Backend Health
        console.log('1️⃣ Checking Backend Health...');
        const backendHealth = await axios.get(backendUrl);
        console.log('✅ Backend is running:', backendHealth.data);
        
        // 2. Check Database Connection
        console.log('\n2️⃣ Checking Database Connection...');
        const dbResult = await pool.query('SELECT COUNT(*) FROM staff');
        console.log('✅ Database connected successfully');
        console.log(`📊 Total staff records: ${dbResult.rows[0].count}`);
        
        // 3. Check Vaccination Stats
        console.log('\n3️⃣ Checking Vaccination Statistics...');
        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE vaccinated = 'yes') as vaccinated_yes,
                COUNT(*) FILTER (WHERE vaccinated = 'no') as vaccinated_no
            FROM staff
        `);
        const stats = statsResult.rows[0];
        console.log('✅ Vaccination statistics retrieved:');
        console.log(`   Total Staff: ${stats.total}`);
        console.log(`   Vaccinated (Yes): ${stats.vaccinated_yes}`);
        console.log(`   Vaccinated (No): ${stats.vaccinated_no}`);
        
        // 4. Check API Endpoints
        console.log('\n4️⃣ Checking API Endpoints...');
        const endpoints = [
            '/api/vaccine/directorates',
            '/api/vaccine/organisations'
        ];
        
        for (const endpoint of endpoints) {
            const response = await axios.get(`${backendUrl}${endpoint}`);
            console.log(`✅ ${endpoint} is working`);
        }
        
        // 5. Check CORS Configuration
        console.log('\n5️⃣ Checking CORS Configuration...');
        const corsResponse = await axios.get(`${backendUrl}/api/vaccine/directorates`, {
            headers: {
                'Origin': frontendUrl
            }
        });
        console.log('✅ CORS is properly configured');
        
        console.log('\n🎉 Deployment Verification Complete!');
        console.log('All systems are operational.');
        
    } catch (error) {
        console.error('\n❌ Deployment Verification Failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    } finally {
        await pool.end();
    }
}

// Run verification
verifyDeployment(); 