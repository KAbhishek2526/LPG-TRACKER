const db = require('../../config/db');
const axios = require('axios');
const crypto = require('crypto');
const { uploadToCloudinary } = require('../../utils/upload');
const nodemailer = require('nodemailer');

// Initialize Nodemailer with Gmail SMTP
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.initiateDelivery = async (req, res, next) => {
    const { assignmentId, agentLat, agentLng } = req.body;
    const agentId = req.user.id;

    try {
        // 1. Fetch assignment and customer data
        const query = `
            SELECT a.id, a.cylinder_id, c.phone, c.location_lat, c.location_lng 
            FROM assignments a
            JOIN customers c ON a.customer_id = c.id
            WHERE a.id = $1 AND a.agent_id = $2 AND a.status = 'ACTIVE'
        `;
        const result = await db.query(query, [assignmentId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid assignment or state.' });
        }
        const delivery = result.rows[0];

        // 2. PostGIS Distance Calculation (4326 is the WGS 84 spatial reference system)
        const distanceQuery = `
            SELECT ST_DistanceSphere(
                ST_SetSRID(ST_MakePoint($1, $2), 4326),
                ST_SetSRID(ST_MakePoint($3, $4), 4326)
            ) AS distance_in_meters;
        `;
        const distanceResult = await db.query(distanceQuery, [
            agentLng, agentLat, 
            delivery.location_lng, delivery.location_lat
        ]);
        
        const distance = distanceResult.rows[0].distance_in_meters;

        // 3. Enforce 150-meter Geofence
        if (distance > 150) {
            await db.query(
                `INSERT INTO events (action, user_id, cylinder_id, description, severity, location_lat, location_lng) 
                 VALUES ('GEOLOCATION_MISMATCH', $1, $2, $3, 'HIGH', $4, $5)`,
                [agentId, delivery.cylinder_id, `Delivery attempt failed. Agent was ${Math.round(distance)}m away.`, agentLat, agentLng]
            );
            return res.status(403).json({ error: 'Proximity alert: You are outside the authorized delivery zone.' });
        }

        // 4. Generate Production OTP & Fast2SMS Dispatch
        const otp = crypto.randomInt(100000, 999999).toString();
        
        // Store OTP in DB with an expiry (5 mins from now)
        const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
        await db.query(
            `UPDATE assignments SET otp_code = $1, otp_expires_at = $2 WHERE id = $3`,
            [otp, otpExpiresAt, assignmentId]
        );
        
        // Dispatch OTP via Nodemailer instead of Fast2SMS
        const testEmail = process.env.TEST_CUSTOMER_EMAIL;
        if (testEmail && transporter) {
            try {
                const info = await transporter.sendMail({
                    from: '"LPG Tracker System" <no-reply@lpgtracker.local>',
                    to: testEmail,
                    subject: 'LPG Tracker - Delivery Verification Code',
                    text: `Your LPG Delivery OTP is ${otp}. Valid for 5 minutes. (Original Customer Phone: ${delivery.phone})`,
                });
                console.log("OTP Email Sent! Preview URL: %s", nodemailer.getTestMessageUrl(info));
            } catch (err) {
                console.error("Failed to send OTP email", err);
            }
        }

        res.status(200).json({ message: 'Location verified. OTP dispatched.' });

    } catch (error) {
        next(error);
    }
};

exports.completeDelivery = async (req, res, next) => {
    try {
        const { assignmentId, otp_provided, agentLat, agentLng } = req.body;
        const agentId = req.user.id;

        // Validate OTP and Assignment
        const query = `
            SELECT a.id, a.cylinder_id, a.otp_code, a.otp_expires_at, a.otp_attempts 
            FROM assignments a
            WHERE a.id = $1 AND a.agent_id = $2 AND a.status = 'ACTIVE'
        `;
        const result = await db.query(query, [assignmentId, agentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Invalid assignment.' });
        }
        
        const assignment = result.rows[0];

        // Ensure OTP has not expired
        if (new Date() > new Date(assignment.otp_expires_at)) {
            return res.status(400).json({ error: 'OTP has expired.' });
        }

        // Check OTP Match
        if (assignment.otp_code !== otp_provided) {
            await db.query(`UPDATE assignments SET otp_attempts = otp_attempts + 1 WHERE id = $1`, [assignmentId]);
            await db.query(
                `INSERT INTO events (action, user_id, cylinder_id, description, severity) VALUES ('FAILED_OTP', $1, $2, 'Incorrect OTP entered', 'LOW')`,
                [agentId, assignment.cylinder_id]
            );
            return res.status(400).json({ error: 'Incorrect OTP.' });
        }

        // Handle File Uploads (Proof image and signature image)
        let proofUrl = null;
        let signatureUrl = null;

        if (req.files && req.files['proof_image']) {
            proofUrl = await uploadToCloudinary(req.files['proof_image'][0].buffer, 'proofs');
        }

        if (req.files && req.files['signature_image']) {
            signatureUrl = await uploadToCloudinary(req.files['signature_image'][0].buffer, 'signatures');
        }

        // Update Assignment to COMPLETED
        await db.query(`UPDATE assignments SET status = 'COMPLETED' WHERE id = $1`, [assignmentId]);
        
        // Update Cylinder to DELIVERED
        await db.query(`UPDATE cylinders SET status = 'DELIVERED' WHERE id = $1`, [assignment.cylinder_id]);

        // Insert Final Event with Media Links
        await db.query(
            `INSERT INTO events (action, user_id, cylinder_id, location_lat, location_lng, otp_verified, description) 
             VALUES ('DELIVERED', $1, $2, $3, $4, true, $5)`,
            [agentId, assignment.cylinder_id, agentLat, agentLng, `Proof: ${proofUrl || 'none'}, Signature: ${signatureUrl || 'none'}`]
        );

        res.status(200).json({ message: 'Delivery completed successfully.', proofUrl, signatureUrl });

    } catch (error) {
        next(error);
    }
};
