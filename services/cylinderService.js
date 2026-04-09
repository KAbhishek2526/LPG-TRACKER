const db = require('../config/db');
const crypto = require('crypto');

function generateOTP() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Log a failure incident to the append-only events table asynchronously.
 * Done independently of the main transaction to ensure it is saved even if the main transaction rolls back.
 */
async function logFailureEvent({ cylinder_id, user_id, action, location_lat, location_lng }) {
    try {
        await db.query(
            `INSERT INTO events (cylinder_id, user_id, action, location_lat, location_lng) VALUES ($1, $2, $3, $4, $5)`,
            [cylinder_id, user_id, action, location_lat, location_lng]
        );
    } catch (err) {
        if (err.code !== '23505') { // Ignore unique constraint violation (duplicate spam)
            console.error('Failed to log audit event:', err);
        }
    }
}

// Wrapper for main event insertions to catch spam index errors safely
async function safeInsertEvent(client, queryText, queryParams) {
    try {
        const result = await client.query(queryText, queryParams);
        return result;
    } catch (err) {
        if (err.code === '23505') {
            // PostgreSQL Error 23505: unique_violation (our idx_no_rapid_spam hit)
            return { duplicate_ignored: true, rows: [{ action: queryParams[2] }] };
        }
        throw err;
    }
}

// Haversine formula for rough distance estimation (in km)
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);  
    const dLon = (lon2 - lon1) * (Math.PI / 180); 
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    return R * c; // Distance in km
}

exports.assignCylinder = async ({ cylinder_id, agent_id, assigned_by, location_lat, location_lng }) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // FOR UPDATE lock prevents race condition if two agents try assigning concurrently
        const cylCheck = await client.query('SELECT status FROM cylinders WHERE id = $1 FOR UPDATE', [cylinder_id]);
        if (cylCheck.rows.length === 0) {
            throw new Error('Cylinder does not exist. Must be created first.');
        }

        const cylinderStatus = cylCheck.rows[0].status;

        if (cylinderStatus === 'ASSIGNED') {
             throw new Error('Cylinder is already ASSIGNED and cannot be assigned right now.');
        }

        const otpCode = generateOTP();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 

        // Dynamic Audit Probability based on Agent's Fraud Score
        const agentStatus = await client.query('SELECT fraud_score FROM users WHERE id = $1', [agent_id]);
        const agentFraudScore = agentStatus.rows.length ? agentStatus.rows[0].fraud_score : 0;
        
        // Base 5% + 1% per fraud score point (max 100%)
        const auditProbability = Math.min(0.05 + (agentFraudScore / 100), 1.0);
        const needsAudit = Math.random() < auditProbability;

        await client.query(
            `INSERT INTO assignments (cylinder_id, agent_id, assigned_by, customer_id, status, otp_code, otp_expires_at, needs_audit) VALUES ($1, $2, $3, 1, 'ACTIVE', $4, $5, $6)`,
            [cylinder_id, agent_id, assigned_by, otpCode, expiresAt, needsAudit]
        );

        // Transaction sync: UPDATE cylinders and INSERT event happen atomically
        await client.query(
            `UPDATE cylinders SET status = 'ASSIGNED' WHERE id = $1`,
            [cylinder_id]
        );

        const result = await safeInsertEvent(client,
            `INSERT INTO events (cylinder_id, user_id, action, location_lat, location_lng)
            VALUES ($1, $2, 'ASSIGNED', $3, $4) RETURNING *`, 
            [cylinder_id, assigned_by, location_lat, location_lng]
        );

        await client.query('COMMIT');
        return { ...result.rows[0], generated_otp: otpCode, audit_flagged: needsAudit };
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

exports.scanCylinder = async ({ cylinder_id, user_id, location_lat, location_lng }) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const cylCheck = await client.query('SELECT status FROM cylinders WHERE id = $1 FOR UPDATE', [cylinder_id]);
        if (cylCheck.rows.length === 0) throw new Error('Cylinder does not exist');
        
        const cylinderStatus = cylCheck.rows[0].status;
        
        // Ensure accurate state sequence
        if (cylinderStatus !== 'ASSIGNED' && cylinderStatus !== 'SCANNED') {
            await logFailureEvent({ cylinder_id, user_id, action: 'INVALID_SEQUENCE', location_lat, location_lng });
            throw new Error(`Sequence violation: Cannot be scanned. Current status is ${cylinderStatus}.`);
        }

        // Lock Active Assignment Row
        const assignmentCheck = await client.query(
            `SELECT id FROM assignments WHERE cylinder_id = $1 AND agent_id = $2 AND status = 'ACTIVE' FOR UPDATE`, 
            [cylinder_id, user_id]
        );
        if (assignmentCheck.rows.length === 0) {
            await logFailureEvent({ cylinder_id, user_id, action: 'UNAUTHORIZED_AGENT', location_lat, location_lng });
            throw new Error('Unauthorized or no active assignment found.');
        }

        await client.query(`UPDATE cylinders SET status = 'SCANNED' WHERE id = $1`, [cylinder_id]);

        const result = await safeInsertEvent(client,
            `INSERT INTO events (cylinder_id, user_id, action, location_lat, location_lng)
            VALUES ($1, $2, 'SCANNED', $3, $4) RETURNING *`, 
            [cylinder_id, user_id, location_lat, location_lng]
        );

        await client.query('COMMIT');
        
        if (result.duplicate_ignored) {
            return { message: "Duplicate scan blocked natively. State remains consistent.", data: result.rows[0] };
        }
        return result.rows[0];
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
};

exports.deliverCylinder = async ({ cylinder_id, user_id, location_lat, location_lng, otp_provided }) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        // 1. Lock cylinder and verify sequence 
        const cylCheck = await client.query('SELECT status FROM cylinders WHERE id = $1 FOR UPDATE', [cylinder_id]);
        if (cylCheck.rows.length === 0) throw new Error('Cylinder does not exist');
        
        if (cylCheck.rows[0].status !== 'SCANNED') {
             await logFailureEvent({ cylinder_id, user_id, action: 'INVALID_SEQUENCE', location_lat, location_lng });
             throw new Error(`Sequence violation: Cylinder MUST be SCANNED prior to delivery.`);
        }

        // 2. Lock assignment check
        const assignmentRes = await client.query(
            `SELECT id, assigned_at, otp_code, otp_expires_at, otp_attempts, agent_id 
             FROM assignments 
             WHERE cylinder_id = $1 AND status = 'ACTIVE' AND agent_id = $2 FOR UPDATE`,
            [cylinder_id, user_id]
        );
        
        if (assignmentRes.rows.length === 0) {
             await logFailureEvent({ cylinder_id, user_id, action: 'UNAUTHORIZED_AGENT', location_lat, location_lng });
             throw new Error('Access Denied: No active assignment for this agent.');
        }

        const assignment = assignmentRes.rows[0];

        // 3. Brute Force Protection
        if (assignment.otp_attempts >= 3) {
            await logFailureEvent({ cylinder_id, user_id, action: 'FAILED_OTP', location_lat, location_lng });
            throw new Error('Delivery blocked. Maximum OTP attempts exceeded.');
        }

        if (assignment.otp_expires_at < new Date()) {
             throw new Error('OTP has expired.');
        }

        if (assignment.otp_code !== otp_provided) {
             // Increment attempt and commit immediately in this block so attempts persist across failures
             await client.query(`UPDATE assignments SET otp_attempts = otp_attempts + 1 WHERE id = $1`, [assignment.id]);
             await client.query('COMMIT'); // Commit the increment
             await logFailureEvent({ cylinder_id, user_id, action: 'FAILED_OTP', location_lat, location_lng });
             throw new Error('Invalid OTP provided. Fraud prevention check failed.');
        }

        // 4. Time Check: Deliveries can't happen in under 2 minutes (120000ms) of assignment
        const timeDiffMs = new Date() - new Date(assignment.assigned_at);
        if (timeDiffMs < 120000) {
             await logFailureEvent({ cylinder_id, user_id, action: 'ANOMALY_FLAGGED', location_lat, location_lng });
             throw new Error('Suspicious activity: Delivery registered too quickly. Flagged for review.');
        }

        // 5. GPS Distance check - grab the ASSIGNED event location to compare vs Delivery location
        const assignEvent = await client.query(
            `SELECT location_lat, location_lng FROM events WHERE cylinder_id = $1 AND action = 'ASSIGNED' ORDER BY timestamp DESC LIMIT 1`,
            [cylinder_id]
        );
        if (assignEvent.rows.length) {
            const elat = assignEvent.rows[0].location_lat;
            const elng = assignEvent.rows[0].location_lng;
            const dist = calculateDistance(elat, elng, location_lat, location_lng);
            if (dist > 50) { // e.g., > 50km
                 await logFailureEvent({ cylinder_id, user_id, action: 'ANOMALY_FLAGGED', location_lat, location_lng });
                 throw new Error('Suspicious activity: GPS distance is unnatural relative to origin. Flagged for review.');
            }
        }

        // --- SUCCESS RESOLVER ---

        await client.query(`UPDATE assignments SET status = 'COMPLETED' WHERE id = $1`, [assignment.id]);
        await client.query(`UPDATE cylinders SET status = 'DELIVERED' WHERE id = $1`, [cylinder_id]);

        const result = await safeInsertEvent(client,
            `INSERT INTO events (cylinder_id, user_id, action, location_lat, location_lng, otp_verified)
            VALUES ($1, $2, 'DELIVERED', $3, $4, true) RETURNING *`, 
            [cylinder_id, user_id, location_lat, location_lng]
        );

        await client.query('COMMIT');
        
        if (result.duplicate_ignored) return { message: "Duplicate delivery request ignored." };
        return result.rows[0];
    } catch (e) {
        // Rollback only if connection is still actively inside a transaction (i.e. we didn't manually commit on an OTP failure)
        try { await client.query('ROLLBACK'); } catch(err){}
        throw e;
    } finally {
        client.release();
    }
};

exports.getCylinderHistory = async (cylinder_id) => {
    const res = await db.query(
        'SELECT * FROM events WHERE cylinder_id = $1 ORDER BY timestamp ASC',
        [cylinder_id]
    );
    return res.rows;
};
