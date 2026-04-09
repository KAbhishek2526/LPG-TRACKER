const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');

exports.loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, 
    // Compound Limit: Block IP + Attempted Phone combination
    keyGenerator: (req) => `${req.ip}_${req.body.phone || 'unknown'}`,
    message: { error: 'Too many login attempts, please try again after 15 minutes' }
});

// Protect delivery endpoint against spam
exports.deliveryLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 2, 
    // Compound Limit: Block highly specific targeted API bursts based on the JWT user if decoded
    keyGenerator: (req) => {
        const finger = req.headers['x-device-fingerprint'] || 'unknown';
        return `${req.ip}_${finger}`;
    },
    message: { error: 'Slow down. Too many delivery events registered at once.' }
});

exports.login = async (req, res, next) => {
    try {
        const { phone, password, device_fingerprint } = req.body;

        if (!phone || !password || !device_fingerprint) {
            return res.status(400).json({ error: 'Phone, password, and device_fingerprint are required.' });
        }

        // 1. Fetch user by phone
        const userRes = await db.query('SELECT * FROM users WHERE phone = $1', [phone]);
        if (userRes.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = userRes.rows[0];

        // 2. Validate password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // 3. Generate secure tokens
        const sessionId = uuidv4();
        const sessionTokenRaw = crypto.randomBytes(32).toString('hex');
        
        // We embed ONLY the user_id in the JWT as an identity hint per Phase 2 requirements
        const jwtToken = jwt.sign(
            { id: user.id }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // 4. Invalidate old sessions (One user = one active session MVP rule)
        await db.query(`UPDATE sessions SET is_active = false WHERE user_id = $1`, [user.id]);

        // 5. Create new session tied explicitly to the device_fingerprint
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hr expiration
        
        await db.query(
            `INSERT INTO sessions (id, user_id, session_token, device_fingerprint, is_active, expires_at) 
             VALUES ($1, $2, $3, $4, true, $5)`,
            [sessionId, user.id, sessionTokenRaw, device_fingerprint, expiresAt]
        );

        res.status(200).json({
            message: 'Login successful',
            jwt: jwtToken,
            session_token: sessionTokenRaw,
            user: {
                id: user.id,
                name: user.name,
                role: user.role
            }
        });

    } catch (err) {
        next(err);
    }
};

exports.logout = async (req, res, next) => {
    try {
        const sessionToken = req.headers['x-session-token'];
        if (!sessionToken) {
            return res.status(400).json({ error: 'Session token required for logout.' });
        }
        
        await db.query(`UPDATE sessions SET is_active = false WHERE session_token = $1`, [sessionToken]);
        res.status(200).json({ message: 'Logout successful. Session revoked.' });
    } catch (err) {
        next(err);
    }
};
