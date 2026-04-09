const cylinderService = require('../services/cylinderService');

exports.assignCylinder = async (req, res, next) => {
    try {
        const { cylinder_id, agent_id, assigned_by, location_lat, location_lng } = req.body;
        
        if (!cylinder_id || !agent_id || !assigned_by) {
            return res.status(400).json({ error: 'cylinder_id, agent_id, and assigned_by are required.' });
        }

        const result = await cylinderService.assignCylinder({
            cylinder_id, agent_id, assigned_by, location_lat, location_lng
        });
        
        res.status(201).json({ message: 'Cylinder assigned successfully', data: result });
    } catch (error) {
        if (error.message.includes('already ASSIGNED') || error.message.includes('NOT IN_STOCK')) {
             return res.status(400).json({ error: error.message });
        }
        next(error);
    }
};

exports.scanCylinder = async (req, res, next) => {
    try {
        const { cylinder_id, user_id, location_lat, location_lng } = req.body;
        
        if (!cylinder_id || !user_id) {
            return res.status(400).json({ error: 'cylinder_id and user_id are required.' });
        }

        const result = await cylinderService.scanCylinder({
            cylinder_id, user_id, location_lat, location_lng
        });

        res.status(201).json({ message: 'Cylinder scanned successfully', data: result });
    } catch (error) {
         if (error.message.includes('cannot be scanned')) {
             return res.status(400).json({ error: error.message });
         }
        next(error);
    }
};

exports.deliverCylinder = async (req, res, next) => {
    try {
        const { cylinder_id, user_id, location_lat, location_lng, otp_provided } = req.body;
        
        if (!cylinder_id || !user_id || !otp_provided) {
            return res.status(400).json({ error: 'cylinder_id, user_id, and otp_provided are required.' });
        }

        const result = await cylinderService.deliverCylinder({
            cylinder_id, user_id, location_lat, location_lng, otp_provided
        });

        res.status(201).json({ message: 'Cylinder delivered successfully', data: result });
    } catch (error) {
         if (error.message.includes('cannot be delivered')) {
             return res.status(400).json({ error: error.message });
         }
        next(error);
    }
};

exports.getCylinderHistory = async (req, res, next) => {
    try {
        const { id } = req.params;
        const history = await cylinderService.getCylinderHistory(id);
        
        // Let's assume an empty array means cylinder not tracked yet or not found
        res.status(200).json({ data: history });
    } catch (error) {
        next(error);
    }
};
