const express = require('express');
const router = express.Router();
const subscriptionService = require('../services/subscriptionService');

const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// GET /api/subscriptions/me - Get current subscription status
router.get('/me', authenticate, async (req, res) => {
    try {
        const sub = await subscriptionService.getSubscription(req.userId);
        if (!sub) return res.json({ plan: 'none', status: 'none' });
        res.json(sub);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// POST /api/subscriptions/start-trial - Start free trial
router.post('/start-trial', authenticate, async (req, res) => {
    try {
        const existing = await subscriptionService.getSubscription(req.userId);
        if (existing && existing.status === 'active') {
            return res.json({ message: 'Already have an active subscription', subscription: existing });
        }

        const sub = await subscriptionService.createTrialSubscription(req.userId);
        res.status(201).json({ message: 'Free trial started', ...sub });
    } catch (err) {
        res.status(500).json({ error: 'Failed to start trial' });
    }
});

// POST /api/subscriptions/upgrade - Upgrade to paid plan
router.post('/upgrade', authenticate, (_req, res) => {
    res.status(503).json({ error: 'Payment verification is not configured' });
});

// POST /api/subscriptions/cancel - Cancel subscription
router.post('/cancel', authenticate, async (req, res) => {
    try {
        await subscriptionService.cancelSubscription(req.userId);
        res.json({ message: 'Subscription cancelled' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// POST /api/subscriptions/webhook - Payment provider webhook
router.post('/webhook', (_req, res) => {
    res.status(503).json({ error: 'Payment webhook verification is not configured' });
});

// GET /api/subscriptions/usage - Get current usage vs limits
router.get('/usage', authenticate, async (req, res) => {
    try {
        const chatUsage = await subscriptionService.checkUsage(req.userId, 'lobster_chat');
        const introUsage = await subscriptionService.checkUsage(req.userId, 'introduction');

        res.json({
            lobsterChats: chatUsage,
            introductions: introUsage
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch usage' });
    }
});

// GET /api/subscriptions/plans - Get available plan details
router.get('/plans', (req, res) => {
    res.json({
        plans: [
            {
                type: 'free_trial',
                name: '免费试用',
                price: 0,
                duration: '7天',
                maxChatsPerDay: 10,
                maxIntrosPerMonth: 3,
                features: ['基础龙虾匹配', '有限对话次数', '3次介绍机会']
            },
            {
                type: 'monthly',
                name: '月度会员',
                price: 29,
                duration: '30天',
                maxChatsPerDay: 30,
                maxIntrosPerMonth: 5,
                features: ['优先匹配', '30次对话/天', '5次介绍/月', '完整个性定制']
            },
            {
                type: 'quarterly',
                name: '季度会员',
                price: 69,
                duration: '90天',
                maxChatsPerDay: 50,
                maxIntrosPerMonth: 10,
                features: ['优先匹配', '50次对话/天', '10次介绍/月', '完整个性定制', 'OpenClaw偏好收集']
            },
            {
                type: 'annual',
                name: '年度会员',
                price: 199,
                duration: '365天',
                maxChatsPerDay: 999,
                maxIntrosPerMonth: 20,
                features: ['无限对话', '20次介绍/月', '无限OpenClaw收集', '专属龙虾顾问']
            }
        ]
    });
});

module.exports = router;
