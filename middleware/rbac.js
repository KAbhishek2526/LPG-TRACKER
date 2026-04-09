module.exports = (allowedRoles) => {
    return (req, res, next) => {
        // req.user is guaranteed to exist and be truthy based on previous auth.js middleware execution
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Access denied: Role authorization blocked' });
        }
        next();
    };
};
