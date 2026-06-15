const express = require('express');
const router = express.Router();
const { upload } = require('../../utils/upload');
const deliveryController = require('./deliveryController');

// Middlewares
const auth = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const guard = require('../../middleware/guard');
const { deliveryLimiter } = require('../../middleware/rateLimiter');

// 1. Initiate Delivery (Geospatial Check & Fast2SMS OTP)
router.post('/initiate', auth, rbac(['AGENT']), guard, deliveryController.initiateDelivery);

// 2. Complete Delivery (OTP Verification & Cloudinary Upload)
// Expecting 'proof_image' and 'signature_image' from the React Native client
router.post(
    '/complete', 
    deliveryLimiter,
    auth, 
    rbac(['AGENT']), 
    guard,
    upload.fields([{ name: 'proof_image', maxCount: 1 }, { name: 'signature_image', maxCount: 1 }]), 
    deliveryController.completeDelivery
);

module.exports = router;
