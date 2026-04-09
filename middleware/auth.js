const jwt = require('jsonwebtoken');
const db = require('../config/db');

module.exports = async (req, res, next) => {
    // Both JWT and Session Token must be provided (Authorization format: Bearer <jwt>; x-session-token: <session_token>)
    const authHeader = req.headers['authorization'];
    const sessionToken = req.headers['x-session-token'];
    const clientFingerprint = req.headers['x-device-fingerprint'];

    if (!authHeader || !authHeader.startsWith('Bearer ') || !sessionToken || !clientFingerprint) {
        return res.status(401).json({ error: 'Missing required authentication headers.' });
    }

    const jwtToken = authHeader.split(' ')[1];

    try {
        // 1. Verify JWT Signature
        const decoded = jwt.verify(jwtToken, process.env.JWT_SECRET);
        const jwtUserId = decoded.id; // JWT is pure identity hint, not reality

        // 2. Fetch Session from DB 
        const sessionRes = await db.query(
            `SELECT * FROM sessions WHERE session_token = $1 AND user_id = $2`,
            [sessionToken, jwtUserId]
        );

        if (sessionRes.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid session' });
        }

        const session = sessionRes.rows[0];

        // 3. Check Session Active & Expiry
        if (!session.is_active) {
            await db.query(`INSERT INTO auth_logs (user_id, ip_address, device_fingerprint, event_type, description) VALUES ($1, $2, $3, 'AUTH_FAILED', 'Attempt to use an invalidated session.')`, [jwtUserId, req.ip, clientFingerprint]);
            return res.status(401).json({ error: 'Session has been invalidated.' });
        }
        
        if (new Date() > new Date(session.expires_at)) {
            await db.query(`UPDATE sessions SET is_active = false WHERE id = $1`, [session.id]);
            await db.query(`INSERT INTO auth_logs (user_id, ip_address, device_fingerprint, event_type, description) VALUES ($1, $2, $3, 'SESSION_EXPIRED', 'Session automatically expired.')`, [jwtUserId, req.ip, clientFingerprint]);
            return res.status(401).json({ error: 'Session expired. Please log in again.' });
        }

        // 4. Validate Device Fingerprint Match (NON-DESTRUCTIVE BLOCK)
        if (session.device_fingerprint !== clientFingerprint) {
            await db.query(`INSERT INTO auth_logs (user_id, ip_address, device_fingerprint, event_type, description) VALUES ($1, $2, $3, 'DEVICE_MISMATCH', 'Target session UUID correct, but hardware fingerprint failed.')`, [jwtUserId, req.ip, clientFingerprint]);
            return res.status(403).json({ error: 'Authentication rejected: Device binding mismatch.' });
        }

        // 5. Fetch User from DB (The Sole Truth)
        const userRes = await db.query('SELECT id, role, fraud_score FROM users WHERE id = $1', [jwtUserId]);
        if (userRes.rows.length === 0) {
            return res.status(401).json({ error: 'User does not exist.' });
        }

        const userTruth = userRes.rows[0];

        // 6. Attach absolute truth to request
        req.user = {
            id: userTruth.id,
            role: userTruth.role,
            fraud_score: userTruth.fraud_score,
            session_id: session.id
        };

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid or expired JWT.' });
        }
        next(err);
    }
};
