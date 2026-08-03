const Anthropic = require('@anthropic-ai/sdk');
const { searchKB } = require('./rag');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1024;

// Build system prompt per tenant with their settings
function buildSystemPrompt(tenant, ragContext) {
  const base = `You are a helpful AI customer support agent for ${tenant.name}, a ${tenant.industry} company.

Your role:
- Answer customer questions accurately and empathetically
- Keep responses concise and actionable (2-4 sentences max for chat)
- If you cannot resolve an issue, offer to escalate to a human agent
- Never make up information — if unsure, say so and offer to check
- Always maintain a professional, friendly tone

Company: ${tenant.name}
Industry: ${tenant.industry}
Plan: ${tenant.plan}`;

  if (ragContext && ragContext.length > 0) {
    const context = ragContext.map((r, i) => `[${i+1}] ${r.text}`).join('\n\n');
    return `${base}

KNOWLEDGE BASE CONTEXT (use this to answer accurately):
${context}

Always prefer information from the knowledge base above over general knowledge.`;
  }

  return base;
}

// Detect sentiment and urgency from conversation
function analyzeSentiment(messages) {
  const negativeWords = ['angry', 'frustrated', 'terrible', 'awful', 'ridiculous', 'unacceptable', 'worst', 'horrible', 'disgusted', 'furious', 'outraged', 'scam', 'fraud', 'lawsuit'];
  const urgentWords = ['urgent', 'emergency', 'immediately', 'asap', 'critical', 'broken', 'stuck', 'cannot', "can't", 'not working'];

  const text = messages.map(m => m.content).join(' ').toLowerCase();
  const negScore = negativeWords.filter(w => text.includes(w)).length;
  const urgScore = urgentWords.filter(w => text.includes(w)).length;

  return {
    sentiment: negScore >= 2 ? 'negative' : negScore === 1 ? 'neutral' : 'positive',
    shouldEscalate: negScore >= 3 || urgScore >= 3,
    frustrationScore: Math.min((negScore * 0.2 + urgScore * 0.15), 1).toFixed(2),
  };
}

// Main AI response function
async function generateResponse({ tenant, messages, userMessage, useRAG = true }) {
  let ragContext = [];

  // Fetch RAG context if enabled
  if (useRAG && tenant.settings?.ragEnabled !== false) {
    try {
      ragContext = await searchKB({ tenantId: tenant.id, query: userMessage, topK: 4 });
      console.log(`RAG: found ${ragContext.length} relevant chunks for tenant ${tenant.id}`);
    } catch (err) {
      console.warn('RAG search failed, continuing without context:', err.message);
    }
  }

  // Build message history for Claude
  const history = messages.slice(-10).map(m => ({
    role: m.role === 'customer' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Add current message
  history.push({ role: 'user', content: userMessage });

  const systemPrompt = buildSystemPrompt(tenant, ragContext);
  const model = tenant.settings?.aiModel || DEFAULT_MODEL;

  const response = await anthropic.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: history,
  });

  const aiText = response.content[0].text;
  const analysis = analyzeSentiment([...messages, { content: userMessage }]);

  return {
    response: aiText,
    model,
    ragChunksUsed: ragContext.length,
    sentiment: analysis.sentiment,
    shouldEscalate: analysis.shouldEscalate,
    frustrationScore: analysis.frustrationScore,
    tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens,
  };
}

// Triage: classify intent and priority
async function triageMessage({ tenant, message }) {
  const response = await anthropic.messages.create({
    model: tenant.settings?.aiModel || DEFAULT_MODEL,
    max_tokens: 200,
    system: `You are a triage agent. Classify the customer message and respond with ONLY valid JSON.
Return: {"intent": "billing|technical|shipping|account|general", "priority": "high|medium|low", "summary": "one line summary"}`,
    messages: [{ role: 'user', content: message }],
  });

  try {
    return JSON.parse(response.content[0].text);
  } catch {
    return { intent: 'general', priority: 'medium', summary: message.slice(0, 100) };
  }
}

module.exports = { generateResponse, triageMessage, analyzeSentiment };
