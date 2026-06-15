const express = require('express');
const router = express.Router();
const { syncOfflinePackets } = require('./syncController');
const requireAuth = require('../../middleware/auth');

// Using requireAuth to secure sync endpoints
router.post('/offline', requireAuth, syncOfflinePackets);

module.exports = router;
