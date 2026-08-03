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

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'nexussupport-dev-secret-change-in-prod';

// ── MIDDLEWARE ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(morgan('dev'));
app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

// Raw body for Twilio webhooks (must come before express.json)
app.use('/api/voice/inbound', express.urlencoded({ extended: false }));
app.use('/api/voice/gather', express.urlencoded({ extended: false }));
app.use('/api/voice/recording-complete', express.urlencoded({ extended: false }));
app.use('/api/whatsapp/inbound', express.urlencoded({ extended: false }));
app.use(express.json({ limit: '10mb' }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── SEED DATA ──────────────────────────────────────────────────
const TENANTS = [
  { id: 'tenant_a', name: 'ShopNow E-Commerce', industry: 'E-Commerce', plan: 'Enterprise', primaryColor: '#3b82f6', logoEmoji: '🛒', createdAt: '2023-03-15', settings: { aiModel: 'claude-sonnet-4-6', autoEscalate: true, voiceEnabled: true, ragEnabled: true, csatEnabled: true, outreachEnabled: true } },
  { id: 'tenant_b', name: 'CloudStack SaaS',    industry: 'SaaS',       plan: 'Pro',        primaryColor: '#22c55e', logoEmoji: '💻', createdAt: '2023-06-01', settings: { aiModel: 'claude-sonnet-4-6', autoEscalate: true, voiceEnabled: false, ragEnabled: true, csatEnabled: false } },
  { id: 'tenant_c', name: 'MedCare Health',     industry: 'Healthcare', plan: 'Enterprise', primaryColor: '#ec4899', logoEmoji: '🏥', createdAt: '2023-09-10', settings: { aiModel: 'claude-sonnet-4-6', autoEscalate: true, voiceEnabled: true, ragEnabled: true, csatEnabled: true } },
];

const USERS = [
  { id: 'u1', tenantId: 'tenant_a', email: 'admin@shopnow.com',            name: 'Alice Johnson', role: 'admin',      passwordHash: bcrypt.hashSync('demo1234',  10) },
  { id: 'u2', tenantId: 'tenant_a', email: 'agent@shopnow.com',            name: 'Bob Smith',     role: 'agent',      passwordHash: bcrypt.hashSync('demo1234',  10) },
  { id: 'u3', tenantId: 'tenant_b', email: 'admin@cloudstack.com',         name: 'Clara Davis',   role: 'admin',      passwordHash: bcrypt.hashSync('demo1234',  10) },
  { id: 'u4', tenantId: 'tenant_b', email: 'agent@cloudstack.com',         name: 'Dan Lee',       role: 'agent',      passwordHash: bcrypt.hashSync('demo1234',  10) },
  { id: 'u5', tenantId: 'tenant_c', email: 'admin@medcare.com',            name: 'Eva Patel',     role: 'admin',      passwordHash: bcrypt.hashSync('demo1234',  10) },
  { id: 'u6', tenantId: null,       email: 'superadmin@nexussupport.com',  name: 'Super Admin',   role: 'superadmin', passwordHash: bcrypt.hashSync('admin1234', 10) },
];

// In-memory conversations store
const CONVERSATIONS = new Map();
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

function getTenant(id) { return TENANTS.find(t => t.id === id); }

// ── AUTH ROUTES ─────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash))
    return res.status(401).json({ error: 'Invalid credentials' });
  const tenant = user.tenantId ? getTenant(user.tenantId) : null;
  const token = jwt.sign({ userId: user.id, tenantId: user.tenantId, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId }, tenant });
});

app.get('/api/auth/me', auth, (req, res) => {
  const user = USERS.find(u => u.id === req.user.userId);
  const tenant = user?.tenantId ? getTenant(user.tenantId) : null;
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role, tenantId: user.tenantId }, tenant });
});

// ── TENANT ROUTES ───────────────────────────────────────────────
app.get('/api/tenants', auth, (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Superadmin only' });
  res.json(TENANTS);
});

app.get('/api/tenants/:tenantId', auth, tenantGuard, (req, res) => {
  const t = getTenant(req.params.tenantId);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json(t);
});

app.put('/api/tenants/:tenantId/settings', auth, tenantGuard, (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ error: 'Admins only' });
  const t = getTenant(req.params.tenantId);
  if (!t) return res.status(404).json({ error: 'Not found' });
  t.settings = { ...t.settings, ...req.body };
  res.json(t);
});

// ── DASHBOARD ───────────────────────────────────────────────────
app.get('/api/tenants/:tenantId/dashboard', auth, tenantGuard, (req, res) => {
  const tid = req.params.tenantId;
  const convos = [...CONVERSATIONS.values()].filter(c => c.tenantId === tid);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayC = convos.filter(c => new Date(c.createdAt) >= today);
  const resolved = convos.filter(c => c.status === 'resolved');
  const aiResolved = convos.filter(c => c.aiResolved && c.status === 'resolved');
  const csats = convos.filter(c => c.csatScore).map(c => c.csatScore);
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i)); d.setHours(0, 0, 0, 0);
    const label = d.toLocaleDateString('en', { weekday: 'short' });
    const count = convos.filter(c => { const cd = new Date(c.createdAt); cd.setHours(0,0,0,0); return cd.getTime() === d.getTime(); }).length;
    return { label, count };
  });
  res.json({
    totalConversations: convos.length,
    activeToday: todayC.filter(c => ['open','pending'].includes(c.status)).length,
    resolvedToday: todayC.filter(c => c.status === 'resolved').length,
    aiResolutionRate: resolved.length ? Math.round((aiResolved.length / resolved.length) * 100) : 0,
    avgCsat: csats.length ? (csats.reduce((a,b)=>a+b,0)/csats.length).toFixed(1) : '0',
    byChannel: convos.reduce((acc, c) => { acc[c.channel] = (acc[c.channel]||0)+1; return acc; }, {}),
    last7Days: last7,
    sentimentBreakdown: { positive: convos.filter(c=>c.sentiment==='positive').length, neutral: convos.filter(c=>c.sentiment==='neutral').length, negative: convos.filter(c=>c.sentiment==='negative').length },
  });
});

// ── CONVERSATIONS ───────────────────────────────────────────────
app.get('/api/tenants/:tenantId/conversations', auth, tenantGuard, (req, res) => {
  const { status, channel, search, page = 1, limit = 20 } = req.query;
  let list = [...CONVERSATIONS.values()].filter(c => c.tenantId === req.params.tenantId);
  if (status && status !== 'all')   list = list.filter(c => c.status  === status);
  if (channel && channel !== 'all') list = list.filter(c => c.channel === channel);
  if (search) { const q = search.toLowerCase(); list = list.filter(c => c.customer.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q)); }
  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  const total = list.length;
  res.json({ conversations: list.slice((page-1)*limit, page*limit), total, page: +page, pages: Math.ceil(total/limit) || 1 });
});

app.get('/api/tenants/:tenantId/conversations/:convId', auth, tenantGuard, (req, res) => {
  const conv = CONVERSATIONS.get(req.params.convId);
  if (!conv || conv.tenantId !== req.params.tenantId) return res.status(404).json({ error: 'Not found' });
  res.json(conv);
});

// ── REAL AI CHAT ────────────────────────────────────────────────
app.post('/api/tenants/:tenantId/conversations', auth, tenantGuard, async (req, res) => {
  const tenant = getTenant(req.params.tenantId);
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

  CONVERSATIONS.set(convId, conv);
  res.status(201).json(conv);
});

// Send message in existing conversation
app.post('/api/tenants/:tenantId/conversations/:convId/messages', auth, tenantGuard, async (req, res) => {
  const tenant = getTenant(req.params.tenantId);
  const conv = CONVERSATIONS.get(req.params.convId);
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

    CONVERSATIONS.set(conv.id, conv);
    return res.json({ userMessage: conv.messages.at(-3), aiMessage: aiMsg, shouldEscalate: aiResult.shouldEscalate });
  }

  CONVERSATIONS.set(conv.id, conv);
  res.json({ message: conv.messages.at(-1) });
});

// ── KNOWLEDGE BASE (RAG) ────────────────────────────────────────
app.get('/api/tenants/:tenantId/knowledge', auth, tenantGuard, (req, res) => {
  const docs = [...DOCUMENTS.values()].filter(d => d.tenantId === req.params.tenantId);
  res.json(docs);
});

app.post('/api/tenants/:tenantId/knowledge/upload', auth, tenantGuard, upload.single('file'), async (req, res) => {
  const tenant = getTenant(req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  if (!req.file && !req.body.content) return res.status(400).json({ error: 'File or content required' });

  const docId = `doc_${Date.now()}`;
  const content = req.file ? req.file.buffer.toString('utf-8') : req.body.content;
  const name = req.file?.originalname || req.body.name || 'Untitled Document';

  const doc = { id: docId, tenantId: tenant.id, name, status: 'processing', chunks: 0, createdAt: new Date().toISOString() };
  DOCUMENTS.set(docId, doc);

  // Index in background
  indexDocument({ tenantId: tenant.id, docId, content, metadata: { name } })
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
  const tenant = getTenant(req.params.tenantId);
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
  const tenant = getTenant(tenantId);
  const twiml = handleInboundCall({ tenantGreeting: `Thank you for calling ${tenant?.name || 'Support'}. How can I help you?` });
  res.set('Content-Type', 'text/xml');
  res.send(twiml);
});

// Twilio recording complete webhook
app.post('/api/voice/recording-complete', async (req, res) => {
  const { RecordingUrl, CallSid } = req.body;
  const tenantId = req.query.tenantId || 'tenant_a';
  const tenant = getTenant(tenantId);

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
  const tenant = getTenant(tenantId);

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
app.get('/api/tenants/:tenantId/agents', auth, tenantGuard, (req, res) => {
  const agents = [
    { id: 'ag1', tenantId: req.params.tenantId, name: 'Triage Agent',     type: 'triage',     status: 'online', resolvedToday: 847, activeChats: 12, accuracy: 98 },
    { id: 'ag2', tenantId: req.params.tenantId, name: 'Resolution Agent', type: 'resolution', status: 'online', resolvedToday: 623, activeChats: 8,  accuracy: 87 },
    { id: 'ag3', tenantId: req.params.tenantId, name: 'Voice Agent',      type: 'voice',      status: 'online', resolvedToday: 48,  activeChats: 3,  accuracy: 91 },
    { id: 'ag4', tenantId: req.params.tenantId, name: 'Escalation Agent', type: 'escalation', status: 'busy',   resolvedToday: 31,  activeChats: 2,  accuracy: 93 },
  ];
  res.json(agents);
});

// ── ANALYTICS ───────────────────────────────────────────────────
app.get('/api/tenants/:tenantId/analytics', auth, tenantGuard, (req, res) => {
  const convos = [...CONVERSATIONS.values()].filter(c => c.tenantId === req.params.tenantId);
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
    const mc = convos.filter(c => { const cd = new Date(c.createdAt); return cd.getMonth()===d.getMonth() && cd.getFullYear()===d.getFullYear(); });
    return { label: d.toLocaleDateString('en',{month:'short',year:'2-digit'}), total: mc.length, resolved: mc.filter(c=>c.status==='resolved').length };
  });
  res.json({
    monthly,
    topIssues: [
      { label: 'Billing & Payments', count: Math.max(1, Math.floor(convos.length*.28)) },
      { label: 'Order Tracking',     count: Math.max(1, Math.floor(convos.length*.22)) },
      { label: 'Account Access',     count: Math.max(1, Math.floor(convos.length*.18)) },
      { label: 'Refunds',            count: Math.max(1, Math.floor(convos.length*.15)) },
      { label: 'Technical Issues',   count: Math.max(1, Math.floor(convos.length*.12)) },
    ],
    avgResolutionTimeHours: 1.4,
    firstContactResolution: 73,
  });
});

// ── HEALTH ──────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), services: { pinecone: !!process.env.PINECONE_API_KEY, openai: !!process.env.OPENAI_API_KEY, deepgram: !!process.env.DEEPGRAM_API_KEY, elevenlabs: !!process.env.ELEVENLABS_API_KEY, anthropic: !!process.env.ANTHROPIC_API_KEY, twilio: !!process.env.TWILIO_ACCOUNT_SID } }));

// ── START ───────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅  NexusSupport API → http://localhost:${PORT}`);
  console.log('🔌 Initialising Pinecone index...');
  await initIndex().catch(err => console.warn('Pinecone init skipped:', err.message));
  console.log('🚀 All services ready');
});
