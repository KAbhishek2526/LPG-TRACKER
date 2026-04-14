const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const cylinderRoutes = require('./routes/cylinderRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// 1. Add global request logger BEFORE all middleware
app.use((req, res, next) => {
    console.log("➡️ Incoming request:", req.method, req.url);
    next();
});

// Set Trust Proxy to allow express-rate-limit to correctly identify client IPs behind proxies/lbs
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 3. Temporarily disable all route handlers (Commented out for Railway 502 debugging)
// app.use('/auth', authRoutes);
// app.use('/api', cylinderRoutes);

// Basic health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'LPG Tracking System API is running' });
});

// 2. Add logging inside root route
app.get('/', (req, res) => {
    console.log("✅ Root route hit");
    res.send("LPG Tracker Backend is Live 🚀");
});

// Testing pathway
app.get('/api/test', (req, res) => {
    res.json({ message: 'API working' });
});

// Centralized Error Handling Protocol
app.use((err, req, res, next) => {
    console.error(err.stack); // Core Trace

    const message = err.message || 'Something went wrong!';

    // Routing standard fraud logic cleanly
    if (message.includes('No active assignment') || message.includes('Access denied')) {
        return res.status(403).json({ error: message, type: 'ROLE_OR_OWNERSHIP_FAILURE' });
    }

    if (message.includes('Invalid credentials') || message.includes('Session') || message.includes('JWT') || message.includes('Authentication rejected')) {
        return res.status(401).json({ error: message, type: 'AUTH_FAILURE' });
    }

    if (message.includes('SYSTEM GUARD') || message.includes('Maximum daily limit') || message.includes('Flagged for review')) {
        const code = message.includes('limit') ? 429 : 403;
        return res.status(code).json({ error: message, type: 'FRAUD_BLOCK' });
    }

    // Duplicate Event catching handles safely via 200/201 locally in service usually, but fallback cleanly
    if (err.code === '23505') {
        return res.status(200).json({ message: 'Duplicate event cleanly ignored natively via DB limits.' });
    }

    res.status(500).json({ error: message });
});

// 7. Verify server port (Must use ONLY process.env.PORT)
const PORT = process.env.PORT;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
