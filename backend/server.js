require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const multer = require('multer');

const { initIndex, indexDocument, searchKB, deleteDocument } = require('./services/rag');
const { generateResponse, triageMessage, analyzeSentiment } = require('./services/ai');
const { transcribeAudio, textToSpeech, getVoices, voicePipeline } = require('./services/voice');
const { handleInboundCall, buildAIResponseTwiML, makeOutboundCall, sendWhatsApp, sendSMS, validateWebhook } = require('./services/twilio');
const {
  getConversation, saveConversation, updateConversation, listConversations,
  getUserByEmail, getUserById,
  getTenant, listTenants, updateTenantSettings,
  listAgents,
  getDashboardStats, getAnalytics,
} = require('./services/dynamodb');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'nexussupport-dev-secret-change-in-prod';
const ALERT_EMAIL = process.env.ALERT_EMAIL || 'kamal@nexussupport.ai';

// ── MIDDLEWARE ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
// CORS — app routes restricted, widget routes open to all origins
const appCors = cors({ origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'https://app.nexussupport.ai', 'https://nexussupport.ai'], credentials: true });
const widgetCors = cors({ origin: '*' });

app.use('/api/widget', widgetCors);  // Widget must be embeddable on any website
app.use('/api/auth/signup', widgetCors); // Signup also needs to be open
app.use('/api', appCors);            // All other routes restricted
app.use(morgan('dev'));

// Global rate limit - 200 requests per 15 min per IP
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Too many requests, please slow down' } }));

// Strict rate limit on auth - 10 login attempts per 15 min per IP
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many login attempts, try again in 15 minutes' } });

// AI rate limit - 30 AI calls per hour per IP
const aiLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 30, message: { error: 'AI rate limit reached, try again in 1 hour' } });

// Upload rate limit - 10 uploads per day per IP
const uploadLimiter = rateLimit({ windowMs: 24 * 60 * 60 * 1000, max: 10, message: { error: 'Upload limit reached for today' } });

// Raw body for Twilio webhooks (must come before express.json)
app.use('/api/voice/inbound', express.urlencoded({ extended: false }));
app.use('/api/voice/gather', express.urlencoded({ extended: false }));
app.use('/api/voice/recording-complete', express.urlencoded({ extended: false }));
app.use('/api/whatsapp/inbound', express.urlencoded({ extended: false }));
app.use(express.json({ limit: '2mb' }));

// File upload - max 2MB, allowed types only
const ALLOWED_TYPES = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/csv'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only TXT, PDF, DOCX and CSV allowed.'));
    }
  }
});

// ── LOGIN MONITORING ────────────────────────────────────────────
const loginLog = [];

function logLogin(email, ip, success, role) {
  const entry = { email, ip, success, role, timestamp: new Date().toISOString() };
  loginLog.push(entry);
  // Keep last 1000 entries
  if (loginLog.length > 1000) loginLog.shift();

  // Alert on superadmin login
  if (success && role === 'superadmin') {
    console.warn(`🚨 ALERT: Superadmin login from IP ${ip} at ${entry.timestamp}`);
  }
  // Alert on failed login spike (5+ failures in 5 min from same IP)
  const recentFails = loginLog.filter(l => !l.success && l.ip === ip && Date.now() - new Date(l.timestamp) < 5 * 60 * 1000);
  if (recentFails.length >= 5) {
    console.warn(`🚨 ALERT: ${recentFails.length} failed login attempts from IP ${ip}`);
  }

  console.log(`🔐 Login ${success ? '✅' : '❌'} | ${email} | ${ip} | ${role || 'unknown'}`);
}

// ── MULTER ERROR HANDLER ────────────────────────────────────────
function handleMulterError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
}

// In-memory documents store (KB uploads tracked locally, content in Pinecone)
const DOCUMENTS = new Map();

// ── AUTH MIDDLEWARE ─────────────────────────────────────────────
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

function tenantGuard(req, res, next) {
  if (req.user.role === 'superadmin') return next();
  if (req.params.tenantId && req.params.tenantId !== req.user.tenantId)
    return res.status(403).json({ error: 'Access denied' });
  next();
}

// getTenant is now imported from dynamodb service

// ── AUTH ROUTES ─────────────────────────────────────────────────
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const user = await getUserByEmail(email.toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      logLogin(email, ip, false, null);
      // Generic error message - don't reveal if email exists
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const tenant = user.tenantId ? await getTenant(user.tenantId) : null;
    const token = jwt.sign({ userId: user.id, tenantId: user.tenantId, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
    logLogin(email, ip, true, user.role);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId }, tenant });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', auth, async (req, res) => {
  try {
    const user = await getUserById(req.user.userId);
    const tenant = user?.tenantId ? await getTenant(user.tenantId) : null;
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId }, tenant });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ── TENANT ROUTES ───────────────────────────────────────────────
app.get('/api/tenants', auth, async (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });
  const tenants = await listTenants();
  res.json(tenants);
});

app.get('/api/tenants/:tenantId', auth, tenantGuard, async (req, res) => {
  const t = await getTenant(req.params.tenantId);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

app.put('/api/tenants/:tenantId/settings', auth, tenantGuard, async (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ error: 'Admins only' });
  const t = await getTenant(req.params.tenantId);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const updated = await updateTenantSettings(req.params.tenantId, { ...t.settings, ...req.body });
  res.json(updated);
});

// ── DASHBOARD ───────────────────────────────────────────────────
app.get('/api/tenants/:tenantId/dashboard', auth, tenantGuard, async (req, res) => {
  try {
    const stats = await getDashboardStats(req.params.tenantId);
    res.json(stats);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// ── CONVERSATIONS ───────────────────────────────────────────────
app.get('/api/tenants/:tenantId/conversations', auth, tenantGuard, async (req, res) => {
  try {
    const { status, channel, search, page = 1, limit = 20 } = req.query;
    const result = await listConversations({ tenantId: req.params.tenantId, status, channel, search, page, limit });
    res.json(result);
  } catch (err) {
    console.error('List conversations error:', err);
    res.status(500).json({ error: 'Failed to list conversations' });
  }
});

app.get('/api/tenants/:tenantId/conversations/:convId', auth, tenantGuard, async (req, res) => {
  try {
    const conv = await getConversation(req.params.convId);
    if (!conv || conv.tenantId !== req.params.tenantId) return res.status(404).json({ error: 'Not found' });
    res.json(conv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

// ── REAL AI CHAT ────────────────────────────────────────────────
app.post('/api/tenants/:tenantId/conversations', auth, tenantGuard, aiLimiter, async (req, res) => {
  const tenant = await getTenant(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  const { customerName, customerEmail, subject, channel = 'chat', message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  // Triage the message
  let triage = { intent: 'general', priority: 'medium', summary: subject || message.slice(0, 80) };
  try { triage = await triageMessage({ tenant, message }); } catch (e) { console.warn('Triage failed:', e.message); }

  // Generate AI response
  const aiResult = await generateResponse({ tenant, messages: [], userMessage: message });

  const now = new Date().toISOString();
  const convId = `conv_${Date.now()}`;
  const conv = {
    id: convId,
    tenantId: tenant.id,
    customer: { name: customerName || 'Customer', email: customerEmail || '' },
    subject: subject || triage.summary,
    channel,
    status: aiResult.shouldEscalate ? 'escalated' : 'open',
    aiResolved: false,
    csatScore: null,
    sentiment: aiResult.sentiment,
    intent: triage.intent,
    priority: triage.priority,
    messageCount: 2,
    createdAt: now,
    updatedAt: now,
    messages: [
      { id: `${convId}_c0`, role: 'customer', content: message, timestamp: now, sender: customerName || 'Customer' },
      { id: `${convId}_a0`, role: 'ai', content: aiResult.response, timestamp: new Date(Date.now()+1000).toISOString(), sender: 'AI Agent', agentType: 'resolution', ragChunksUsed: aiResult.ragChunksUsed },
    ],
  };

  if (aiResult.shouldEscalate) {
    conv.messages.push({ id: `${convId}_sys`, role: 'system', content: `⬆ Auto-escalated. Frustration score: ${aiResult.frustrationScore}. Routing to human agent.`, timestamp: new Date(Date.now()+2000).toISOString(), sender: 'System' });
  }

  await saveConversation(conv);
  res.status(201).json(conv);
});

// Send message in existing conversation
app.post('/api/tenants/:tenantId/conversations/:convId/messages', auth, tenantGuard, async (req, res) => {
  const tenant = await getTenant(req.params.tenantId);
  const conv = await getConversation(req.params.convId);
  if (!conv || conv.tenantId !== req.params.tenantId) return res.status(404).json({ error: 'Not found' });

  const { message, role = 'customer' } = req.body;
  if (!message) return res.status(400).json({ error: 'Message required' });

  const now = new Date().toISOString();
  const msgId = `${conv.id}_${conv.messages.length}`;

  conv.messages.push({ id: msgId, role, content: message, timestamp: now, sender: role === 'customer' ? conv.customer.name : 'Agent' });
  conv.updatedAt = now;

  // Generate AI response for customer messages
  if (role === 'customer') {
    const aiResult = await generateResponse({ tenant, messages: conv.messages.slice(-8), userMessage: message });
    const aiMsg = { id: `${msgId}_ai`, role: 'ai', content: aiResult.response, timestamp: new Date(Date.now()+500).toISOString(), sender: 'AI Agent', agentType: 'resolution', ragChunksUsed: aiResult.ragChunksUsed };
    conv.messages.push(aiMsg);
    conv.sentiment = aiResult.sentiment;
    conv.messageCount = conv.messages.length;

    if (aiResult.shouldEscalate && conv.status !== 'escalated') {
      conv.status = 'escalated';
      conv.messages.push({ id: `${msgId}_esc`, role: 'system', content: `⬆ Escalated. Frustration: ${aiResult.frustrationScore}`, timestamp: new Date(Date.now()+1000).toISOString(), sender: 'System' });
    }

    await saveConversation(conv);
    return res.json({ userMessage: conv.messages.at(-3), aiMessage: aiMsg, shouldEscalate: aiResult.shouldEscalate });
  }

  await saveConversation(conv);
  res.json({ message: conv.messages.at(-1) });
});

// ── KNOWLEDGE BASE (RAG) ────────────────────────────────────────
app.get('/api/tenants/:tenantId/knowledge', auth, tenantGuard, (req, res) => {
  const docs = [...DOCUMENTS.values()].filter(d => d.tenantId === req.params.tenantId);
  res.json(docs);
});

app.post('/api/tenants/:tenantId/knowledge/upload', auth, tenantGuard, uploadLimiter, upload.single('file'), handleMulterError, async (req, res) => {
  const tenant = await getTenant(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  if (!req.file && !req.body.content) return res.status(400).json({ error: 'File or content required' });

  const docId = `doc_${Date.now()}`;
  const content = req.file ? req.file.buffer.toString('utf-8') : req.body.content;
  const name = req.file?.originalname || req.body.name || 'Untitled Document';
  const tenantId = tenant.id;

  const doc = { id: docId, tenantId, name, status: 'processing', chunks: 0, createdAt: new Date().toISOString() };
  DOCUMENTS.set(docId, doc);

  // Index in background
  indexDocument({ tenantId, docId, content, metadata: { name } })
    .then(({ chunksIndexed }) => {
      doc.status = 'indexed';
      doc.chunks = chunksIndexed;
      doc.updatedAt = new Date().toISOString();
      DOCUMENTS.set(docId, doc);
      console.log(`✅ Indexed ${chunksIndexed} chunks for doc ${docId}`);
    })
    .catch(err => {
      doc.status = 'error';
      doc.error = err.message;
      DOCUMENTS.set(docId, doc);
      console.error('Indexing error:', err);
    });

  res.status(202).json(doc);
});

app.post('/api/tenants/:tenantId/knowledge/search', auth, tenantGuard, async (req, res) => {
  const { query, topK = 5 } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });
  const results = await searchKB({ tenantId: req.params.tenantId, query, topK });
  res.json({ results, query });
});

app.delete('/api/tenants/:tenantId/knowledge/:docId', auth, tenantGuard, async (req, res) => {
  await deleteDocument({ tenantId: req.params.tenantId, docId: req.params.docId });
  DOCUMENTS.delete(req.params.docId);
  res.json({ deleted: true });
});

// ── VOICE ROUTES ────────────────────────────────────────────────

// Upload audio and transcribe
app.post('/api/tenants/:tenantId/voice/transcribe', auth, tenantGuard, upload.single('audio'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Audio file required' });
  const { transcript, confidence } = await transcribeAudio(req.file.buffer, req.file.mimetype);
  res.json({ transcript, confidence });
});

// Text to speech
app.post('/api/tenants/:tenantId/voice/tts', auth, tenantGuard, async (req, res) => {
  const { text, voiceId } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });
  const audio = await textToSpeech(text, voiceId);
  res.set('Content-Type', 'audio/mpeg');
  res.send(audio);
});

// Get available voices
app.get('/api/voice/voices', auth, async (req, res) => {
  const voices = await getVoices();
  res.json(voices);
});

// Full voice pipeline: audio → AI → speech
app.post('/api/tenants/:tenantId/voice/pipeline', auth, tenantGuard, upload.single('audio'), async (req, res) => {
  const tenant = await getTenant(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  if (!req.file) return res.status(400).json({ error: 'Audio file required' });

  const convId = req.body.conversationId;
  const conv = convId ? CONVERSATIONS.get(convId) : null;
  const history = conv?.messages || [];

  const result = await voicePipeline({ audioBuffer: req.file.buffer, tenant, conversationHistory: history, generateAIResponse: generateResponse });

  res.set('Content-Type', 'audio/mpeg');
  res.set('X-Transcript', encodeURIComponent(result.transcript));
  res.set('X-AI-Response', encodeURIComponent(result.aiResponse));
  res.set('X-Should-Escalate', result.shouldEscalate);
  res.set('X-Frustration-Score', result.frustrationScore);
  res.send(result.audioBuffer);
});

// Twilio inbound call webhook
app.post('/api/voice/inbound', (req, res) => {
  const tenantId = req.query.tenantId || 'tenant_a';
  const tenant = await getTenant(tenantId);
  const twiml = handleInboundCall({ tenantGreeting: `Thank you for calling ${tenant?.name || 'Support'}. How can I help you?` });
  res.set('Content-Type', 'text/xml');
  res.send(twiml);
});

// Twilio recording complete webhook
app.post('/api/voice/recording-complete', async (req, res) => {
  const { RecordingUrl, CallSid } = req.body;
  const tenantId = req.query.tenantId || 'tenant_a';
  const tenant = await getTenant(tenantId);

  try {
    const { transcribeFromUrl } = require('./services/voice');
    const transcript = await transcribeFromUrl(`${RecordingUrl}.mp3`);
    const aiResult = await generateResponse({ tenant, messages: [], userMessage: transcript });
    const twiml = buildAIResponseTwiML({ aiText: aiResult.response, continueUrl: `/api/voice/inbound?tenantId=${tenantId}` });
    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (err) {
    console.error('Recording webhook error:', err);
    res.set('Content-Type', 'text/xml');
    res.send('<Response><Say>Sorry, I encountered an error. Please try again.</Say></Response>');
  }
});

// ── WHATSAPP ────────────────────────────────────────────────────
app.post('/api/whatsapp/inbound', async (req, res) => {
  const { Body, From, ProfileName } = req.body;
  const tenantId = req.query.tenantId || 'tenant_a';
  const tenant = await getTenant(tenantId);

  try {
    const aiResult = await generateResponse({ tenant, messages: [], userMessage: Body });
    await sendWhatsApp({ to: From, message: aiResult.response });
    res.status(200).send('OK');
  } catch (err) {
    console.error('WhatsApp webhook error:', err);
    res.status(500).send('Error');
  }
});

// Send WhatsApp message
app.post('/api/tenants/:tenantId/whatsapp/send', auth, tenantGuard, async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });
  const result = await sendWhatsApp({ to, message });
  res.json(result);
});

// ── AGENTS ──────────────────────────────────────────────────────
app.get('/api/tenants/:tenantId/agents', auth, tenantGuard, async (req, res) => {
  try {
    let agents = await listAgents(req.params.tenantId);
    // fallback to defaults if DynamoDB has no agents yet
    if (!agents.length) {
      agents = [
        { id: 'ag1', tenantId: req.params.tenantId, name: 'Triage Agent',     type: 'triage',     status: 'online', resolvedToday: 847, activeChats: 12, accuracy: 98 },
        { id: 'ag2', tenantId: req.params.tenantId, name: 'Resolution Agent', type: 'resolution', status: 'online', resolvedToday: 623, activeChats: 8,  accuracy: 87 },
        { id: 'ag3', tenantId: req.params.tenantId, name: 'Voice Agent',      type: 'voice',      status: 'online', resolvedToday: 48,  activeChats: 3,  accuracy: 91 },
        { id: 'ag4', tenantId: req.params.tenantId, name: 'Escalation Agent', type: 'escalation', status: 'busy',   resolvedToday: 31,  activeChats: 2,  accuracy: 93 },
      ];
    }
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get agents' });
  }
});

// ── ANALYTICS ───────────────────────────────────────────────────
app.get('/api/tenants/:tenantId/analytics', auth, tenantGuard, async (req, res) => {
  try {
    const data = await getAnalytics(req.params.tenantId);
    res.json(data);
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// ── HEALTH ──────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), services: { pinecone: !!process.env.PINECONE_API_KEY, openai: !!process.env.OPENAI_API_KEY, deepgram: !!process.env.DEEPGRAM_API_KEY, elevenlabs: !!process.env.ELEVENLABS_API_KEY, anthropic: !!process.env.ANTHROPIC_API_KEY, twilio: !!process.env.TWILIO_ACCOUNT_SID } }));

// Login audit log - superadmin only
app.get('/api/admin/login-log', auth, (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });
  const last50 = loginLog.slice(-50).reverse();
  res.json({ total: loginLog.length, recent: last50 });
});

// Security stats - superadmin only  
app.get('/api/admin/security', auth, (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });
  const last24h = loginLog.filter(l => Date.now() - new Date(l.timestamp) < 24 * 60 * 60 * 1000);
  res.json({
    last24h: {
      totalLogins: last24h.length,
      successfulLogins: last24h.filter(l => l.success).length,
      failedLogins: last24h.filter(l => !l.success).length,
      superadminLogins: last24h.filter(l => l.role === 'superadmin').length,
      uniqueIPs: [...new Set(last24h.map(l => l.ip))].length,
    },
    recentFailures: last24h.filter(l => !l.success).slice(-10),
  });
});

// ── NEW ROUTES (signup, widget, billing, API keys, onboarding) ──
const newRoutes = require("./routes/newRoutes");
app.use("/api", newRoutes);

// ── START ───────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅  NexusSupport API → http://localhost:${PORT}`);
  console.log('🔌 Initialising Pinecone index...');
  await initIndex().catch(err => console.warn('Pinecone init skipped:', err.message));
  console.log('🚀 All services ready');
});
