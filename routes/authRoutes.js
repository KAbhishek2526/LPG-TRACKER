const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');

// 1. Login User
router.post('/login', loginLimiter, authController.login);

// 2. Logout User
router.post('/logout', authController.logout);

module.exports = router;
