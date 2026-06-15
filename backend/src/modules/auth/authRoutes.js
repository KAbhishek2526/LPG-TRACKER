const express = require('express');
const router = express.Router();
const authController = require('./authController');
const { loginLimiter } = require('../../middleware/rateLimiter');
const validate = require('../../middleware/validate');
const { loginSchema } = require('../../utils/schemas');

// 1. Login User
router.post('/login', loginLimiter, validate(loginSchema), authController.login);

// 2. Logout User
router.post('/logout', authController.logout);

module.exports = router;
