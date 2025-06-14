const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
        return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "No token provided." } });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error("JWT verification error:", err.message);
            // Differentiate between expired token and invalid token
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: { code: "TOKEN_EXPIRED", message: "Token has expired." } });
            }
            return res.status(403).json({ error: { code: "FORBIDDEN", message: "Token is not valid." } });
        }
        req.user = user; // Add payload to request object
        next(); // Pass the execution to the next middleware or route handler
    });
}

module.exports = authenticateToken;
