const express = require('express');
const router = express.Router();
const cylinderController = require('../controllers/cylinderController');

// Middlewares
const auth = require('../middleware/auth');
const rbac = require('../middleware/rbac');
const guard = require('../middleware/guard');
const { deliveryLimiter, otpLimiter } = require('../middleware/rateLimiter');

// 1. Assign cylinder to agent: Admin or Distributor
router.post('/assign-cylinder', auth, rbac(['ADMIN', 'DISTRIBUTOR']), guard, cylinderController.assignCylinder);

// 2. Record SCANNED event: Admin, Distributor, Agent, or Inspector 
router.post('/scan-cylinder', auth, rbac(['ADMIN', 'DISTRIBUTOR', 'AGENT', 'INSPECTOR']), guard, cylinderController.scanCylinder);

// 3. Record DELIVERED event: Agent only (Highest fraud risk -> heavy limits applied)
router.post('/deliver-cylinder', deliveryLimiter, auth, rbac(['AGENT']), guard, cylinderController.deliverCylinder);

// 4. Get Cylinder History: Admin or Inspector
router.get('/cylinder-history/:id', auth, rbac(['ADMIN', 'INSPECTOR']), cylinderController.getCylinderHistory);

module.exports = router;
