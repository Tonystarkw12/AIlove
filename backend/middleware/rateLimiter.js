const rateLimitMap = new Map();

/**
 * Simple in-memory rate limiter
 * @param {number} maxRequests - Max requests allowed in the window
 * @param {number} windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 */
function rateLimiter(maxRequests = 60, windowMs = 60000) {
    return (req, res, next) => {
        const key = `${req.ip || req.connection.remoteAddress}:${req.path}`;
        const now = Date.now();

        if (!rateLimitMap.has(key)) {
            rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
        } else {
            const entry = rateLimitMap.get(key);

            // Reset window if expired
            if (now > entry.resetAt) {
                entry.count = 1;
                entry.resetAt = now + windowMs;
            } else {
                entry.count++;
                if (entry.count > maxRequests) {
                    res.set('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
                    return res.status(429).json({
                        error: 'Too many requests, please try again later'
                    });
                }
            }
        }

        // Clean up old entries periodically
        if (rateLimitMap.size > 10000) {
            const cutoff = Date.now();
            for (const [k, v] of rateLimitMap.entries()) {
                if (v.resetAt < cutoff) rateLimitMap.delete(k);
            }
        }

        next();
    };
}

module.exports = rateLimiter;
