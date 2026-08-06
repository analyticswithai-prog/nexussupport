// ═══════════════════════════════════════════════════════════════
// NEXUSSUPPORT — NEW ROUTES MODULE
// Add these routes to server.js
// ═══════════════════════════════════════════════════════════════

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { createTenant, validateApiKey, createApiKey, revokeApiKey, listApiKeys, updateOnboarding, getOnboardingStatus } = require('./services/tenantService');
const { PLANS, createCustomer, createCheckoutSession, createPortalSession, handleWebhook, cancelSubscription } = require('./services/billing');
const { generateResponse } = require('./services/ai');
const { getTenant, updateTenantSettings } = require('./services/dynamodb');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexussupport-dev-secret';

// Widget rate limit - 60 requests per minute per IP
const widgetLimiter = rateLimit({ windowMs: 60 * 1000, max: 60, message: { error: 'Rate limit exceeded' } });

// ── API KEY MIDDLEWARE ─────────────────────────────────────────
async function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'] || req.query.apiKey;
  if (!key) return res.status(401).json({ error: 'API key required' });
  const result = await validateApiKey(key);
  if (!result) return res.status(401).json({ error: 'Invalid or expired API key' });
  req.tenant = result.tenant;
  req.apiKeyRecord = result.keyRecord;
  next();
}

// ── SIGNUP ─────────────────────────────────────────────────────
router.post('/auth/signup', async (req, res) => {
  try {
    const { businessName, industry, ownerName, ownerEmail, password, plan } = req.body;
    if (!businessName || !ownerEmail || !password || !ownerName) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const result = await createTenant({ businessName, industry: industry || 'Other', ownerName, ownerEmail, password, plan: plan || 'starter' });

    // Create Stripe customer
    let stripeCustomerId = null;
    if (process.env.STRIPE_SECRET_KEY) {
      try {
        const customer = await createCustomer({ email: ownerEmail, name: businessName, tenantId: result.tenant.id });
        stripeCustomerId = customer.id;
      } catch (e) { console.warn('Stripe customer creation failed:', e.message); }
    }

    // Issue JWT
    const token = jwt.sign({
      userId: result.user.id,
      tenantId: result.tenant.id,
      role: 'admin',
      name: ownerName,
      email: ownerEmail,
    }, JWT_SECRET, { expiresIn: '8h' });

    res.status(201).json({
      token,
      user: result.user,
      tenant: result.tenant,
      apiKey: result.apiKey,
      message: 'Account created successfully',
    });
  } catch (err) {
    if (err.message?.includes('already exists') || err.code === 'ConditionalCheckFailedException') {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }
    console.error('Signup error:', err);
    res.status(500).json({ error: err.message || "Failed to create account", stack: err.stack?.split("\n")[0] });
  }
});

// ── API KEY MANAGEMENT ─────────────────────────────────────────
router.get('/tenants/:tenantId/api-keys', async (req, res) => {
  const keys = await listApiKeys(req.params.tenantId);
  res.json(keys);
});

router.post('/tenants/:tenantId/api-keys', async (req, res) => {
  const { name, permissions } = req.body;
  if (!name) return res.status(400).json({ error: 'Key name required' });
  const result = await createApiKey({ tenantId: req.params.tenantId, name, permissions });
  res.status(201).json(result);
});

router.delete('/tenants/:tenantId/api-keys/:keyId', async (req, res) => {
  await revokeApiKey(req.params.keyId, req.params.tenantId);
  res.json({ revoked: true });
});

// ── BILLING / STRIPE ───────────────────────────────────────────
router.get('/plans', (req, res) => {
  res.json(Object.entries(PLANS).map(([id, plan]) => ({ id, ...plan, priceId: undefined })));
});

router.post('/tenants/:tenantId/billing/checkout', async (req, res) => {
  const { planId } = req.body;
  const tenant = await getTenant(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  try {
    const session = await createCheckoutSession({
      customerId: tenant.stripeCustomerId,
      planId,
      tenantId: tenant.id,
      successUrl: `${process.env.APP_URL || 'https://app.nexussupport.ai'}/onboarding?step=test&success=true`,
      cancelUrl: `${process.env.APP_URL || 'https://app.nexussupport.ai'}/onboarding?step=billing`,
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/tenants/:tenantId/billing/portal', async (req, res) => {
  const tenant = await getTenant(req.params.tenantId);
  if (!tenant?.stripeCustomerId) return res.status(400).json({ error: 'No billing account found' });

  const session = await createPortalSession({
    customerId: tenant.stripeCustomerId,
    returnUrl: `${process.env.APP_URL || 'https://app.nexussupport.ai'}/settings`,
  });
  res.json({ url: session.url });
});

// Stripe webhook
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  try {
    const event = await handleWebhook(req.body, sig);
    if (event.type === 'subscription_created') {
      await updateTenantSettings(event.tenantId, { plan: event.planId, stripeSubscriptionId: event.subscriptionId, stripeCustomerId: event.customerId, status: 'active' });
      await updateOnboarding(event.tenantId, 'billing');
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: err.message });
  }
});

// ── ONBOARDING ─────────────────────────────────────────────────
router.get('/tenants/:tenantId/onboarding', async (req, res) => {
  const status = await getOnboardingStatus(req.params.tenantId);
  res.json(status);
});

router.post('/tenants/:tenantId/onboarding/:step', async (req, res) => {
  await updateOnboarding(req.params.tenantId, req.params.step);
  res.json({ updated: true, step: req.params.step });
});

// ── PUBLIC WIDGET API ──────────────────────────────────────────
// This is called by the embeddable widget on customer websites

// Widget routes are open to all origins (handled at app level in server.js)

// Get widget config (called when widget loads)
router.get('/widget/config', widgetLimiter, apiKeyAuth, (req, res) => {
  const tenant = req.tenant;
  res.json({
    tenantId: tenant.id,
    widgetName: tenant.settings?.widgetName || tenant.name,
    widgetColor: tenant.settings?.widgetColor || '#6366f1',
    widgetPosition: tenant.settings?.widgetPosition || 'bottom-right',
    widgetGreeting: tenant.settings?.widgetGreeting || `Hi! How can I help you today?`,
    logoEmoji: tenant.logoEmoji || '💬',
    plan: tenant.plan,
  });
});

// Widget chat message
router.post('/widget/chat', widgetLimiter, apiKeyAuth, async (req, res) => {
  const { message, sessionId, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const tenant = req.tenant;

  try {
    const aiResult = await generateResponse({
      tenant,
      messages: history.map(m => ({ role: m.role, content: m.content })),
      userMessage: message,
    });

    // Save to DynamoDB in background
    const { saveConversation } = require('./services/dynamodb');
    const convId = sessionId || `widget_${Date.now()}`;
    saveConversation({
      id: convId,
      tenantId: tenant.id,
      channel: 'chat',
      status: aiResult.shouldEscalate ? 'escalated' : 'open',
      sentiment: aiResult.sentiment,
      aiResolved: !aiResult.shouldEscalate,
      source: 'widget',
      customer: { name: 'Website Visitor', email: '' },
      subject: message.slice(0, 80),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        { id: `${convId}_c0`, role: 'customer', content: message, timestamp: new Date().toISOString() },
        { id: `${convId}_a0`, role: 'ai', content: aiResult.response, timestamp: new Date().toISOString(), ragChunksUsed: aiResult.ragChunksUsed },
      ],
    }).catch(() => {});

    res.json({
      response: aiResult.response,
      sessionId: convId,
      shouldEscalate: aiResult.shouldEscalate,
      sentiment: aiResult.sentiment,
      ragChunksUsed: aiResult.ragChunksUsed,
    });
  } catch (err) {
    console.error('Widget chat error:', err);
    res.status(500).json({ error: 'AI service temporarily unavailable. Please try again.' });
  }
});

module.exports = router;
