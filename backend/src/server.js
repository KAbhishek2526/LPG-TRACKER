const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

app.use((req, res, next) => {
    console.log("➡️ Incoming request:", req.method, req.url);
    next();
});

app.set('trust proxy', 1);

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

const authRoutes = require('./modules/auth/authRoutes');
const cylinderRoutes = require('./modules/cylinders/cylinderRoutes');
const deliveryRoutes = require('./modules/deliveries/deliveryRoutes');
const syncRoutes = require('./modules/sync/syncRoutes');
require('./modules/workers/blockchainCron');

// Basic health check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'UP', message: 'LPG Tracking System API is running' });
});

app.get('/', (req, res) => {
    console.log("✅ Root route hit");
    res.send("Backend Live");
});

app.get('/api/test', (req, res) => {
    res.json({ message: 'API working' });
});

// Mount modular routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/cylinders', cylinderRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/sync', syncRoutes);

// Centralized Error Handling Protocol
app.use((err, req, res, next) => {
    console.error(err.stack); // Core Trace
    res.status(500).json({ error: err.message || 'Something went wrong!' });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
