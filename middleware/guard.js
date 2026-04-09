const db = require('../config/db');

module.exports = async (req, res, next) => {
    try {
        const { fraud_score, id: userId } = req.user;
        const isOfflineRequest = req.body.is_offline === true; // Extract offline designation

        // 1. TIERED FRAUD SCORE CHECKS
        if (fraud_score >= 15) {
            return res.status(403).json({
                error: 'RESTRICTED_ACCOUNT',
                reason: 'Account blocked due to critical risk score (15+)',
                next_action: 'Contact distributor or wait for review to lift suspension'
            });
        }

        if (fraud_score >= 10 && fraud_score <= 14) {
            if (isOfflineRequest) {
                return res.status(403).json({
                    error: 'RESTRICTED_ACCOUNT',
                    reason: 'Offline actions restricted due to high risk score (10-14)',
                    next_action: 'Ensure steady internet connection to process deliveries via synchronous checks'
                });
            }
        }

        if (fraud_score >= 6 && fraud_score <= 9) {
            // Technically allowed, but logic later in telemetry/logging could specifically mark this.
            // A passive warning could be sent down the wire or attached to `req`.
            req.warning_flag = true;
        }


        // 2. OFFLINE LIMIT ENFORCEMENT
        // If the agent is trying to deliver offline, ensure they haven't passed the daily limit (e.g., 2).
        if (isOfflineRequest) {
            const result = await db.query(
                `SELECT COUNT(*) FROM events 
                 WHERE user_id = $1 AND is_offline = true 
                 AND timestamp > NOW() - INTERVAL '1 day'`, 
                [userId]
            );

            const offlineCount = parseInt(result.rows[0].count, 10);
            if (offlineCount >= 2) {
                return res.status(429).json({ error: 'SYSTEM GUARD: Maximum daily limit for offline actions exceeded.' });
            }
        }

        // 3. (Optional) Could integrate IP comparisons from session table if we tracked last_ip.

        next();
    } catch (err) {
        next(err);
    }
};
