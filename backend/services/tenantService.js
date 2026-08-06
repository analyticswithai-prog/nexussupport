const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

// ── API KEY GENERATION ─────────────────────────────────────────
function generateApiKey(prefix = 'nxs') {
  const random = crypto.randomBytes(32).toString('hex');
  return `${prefix}_${random}`;
}

function generateTenantId(businessName) {
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30);
  const suffix = crypto.randomBytes(4).toString('hex');
  return `${slug}-${suffix}`;
}

// ── TENANT SIGNUP ──────────────────────────────────────────────
async function createTenant({ businessName, industry, ownerName, ownerEmail, password, plan = 'starter', logoEmoji = '🏢' }) {
  const tenantId = generateTenantId(businessName);
  const userId = `user_${crypto.randomBytes(8).toString('hex')}`;
  const apiKey = generateApiKey('nxs');
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  // Create tenant record
  const tenant = {
    id: tenantId,
    name: businessName,
    industry,
    plan,
    logoEmoji,
    primaryColor: '#6366f1',
    createdAt: now,
    status: 'active',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    settings: {
      aiModel: 'claude-sonnet-4-6',
      autoEscalate: true,
      voiceEnabled: plan === 'enterprise',
      ragEnabled: true,
      csatEnabled: true,
      outreachEnabled: false,
      widgetColor: '#6366f1',
      widgetPosition: 'bottom-right',
      widgetGreeting: `Hi! I'm the AI assistant for ${businessName}. How can I help you today?`,
      widgetName: businessName,
    },
    usage: { conversations: 0, documents: 0, apiCalls: 0 },
    limits: {
      starter: { conversations: 1000, documents: 5 },
      pro: { conversations: -1, documents: -1 },
      enterprise: { conversations: -1, documents: -1 },
    }[plan] || { conversations: 1000, documents: 5 },
  };

  // Create owner user
  const user = {
    id: userId,
    tenantId,
    name: ownerName,
    email: ownerEmail.toLowerCase(),
    role: 'admin',
    passwordHash,
    createdAt: now,
    lastLogin: null,
    status: 'active',
  };

  // Create API key record
  const apiKeyRecord = {
    id: `key_${crypto.randomBytes(8).toString('hex')}`,
    tenantId,
    keyHash: apiKeyHash,
    keyPrefix: apiKey.slice(0, 12) + '...',
    name: 'Default API Key',
    createdAt: now,
    lastUsed: null,
    status: 'active',
    permissions: ['chat', 'knowledge', 'conversations'],
  };

  // Save to DynamoDB
  await Promise.all([
    db.send(new PutCommand({ TableName: 'nexussupport-tenants', Item: tenant })),
    db.send(new PutCommand({ TableName: 'nexussupport-users', Item: user })),
    db.send(new PutCommand({ TableName: 'nexussupport-api-keys', Item: apiKeyRecord })),
  ]);

  return { tenant, user: { ...user, passwordHash: undefined }, apiKey, apiKeyRecord };
}

// ── API KEY VALIDATION ─────────────────────────────────────────
async function validateApiKey(rawKey) {
  if (!rawKey || !rawKey.startsWith('nxs_')) return null;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  // Scan API keys table for matching hash
  const result = await db.send(new QueryCommand({
    TableName: 'nexussupport-api-keys',
    IndexName: 'keyHash-index',
    KeyConditionExpression: 'keyHash = :h',
    ExpressionAttributeValues: { ':h': keyHash },
    Limit: 1,
  })).catch(() => null);

  const keyRecord = result?.Items?.[0];
  if (!keyRecord || keyRecord.status !== 'active') return null;

  // Update last used
  db.send(new UpdateCommand({
    TableName: 'nexussupport-api-keys',
    Key: { id: keyRecord.id },
    UpdateExpression: 'SET lastUsed = :t',
    ExpressionAttributeValues: { ':t': new Date().toISOString() },
  })).catch(() => {});

  // Get tenant
  const tenantResult = await db.send(new GetCommand({ TableName: 'nexussupport-tenants', Key: { id: keyRecord.tenantId } }));
  return { keyRecord, tenant: tenantResult.Item };
}

// ── API KEY MANAGEMENT ─────────────────────────────────────────
async function createApiKey({ tenantId, name, permissions = ['chat', 'knowledge'] }) {
  const rawKey = generateApiKey('nxs');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const now = new Date().toISOString();

  const record = {
    id: `key_${crypto.randomBytes(8).toString('hex')}`,
    tenantId,
    keyHash,
    keyPrefix: rawKey.slice(0, 12) + '...',
    name,
    createdAt: now,
    lastUsed: null,
    status: 'active',
    permissions,
  };

  await db.send(new PutCommand({ TableName: 'nexussupport-api-keys', Item: record }));
  return { record, rawKey };
}

async function revokeApiKey(keyId, tenantId) {
  await db.send(new UpdateCommand({
    TableName: 'nexussupport-api-keys',
    Key: { id: keyId },
    UpdateExpression: 'SET #s = :s',
    ExpressionAttributeNames: { '#s': 'status' },
    ExpressionAttributeValues: { ':s': 'revoked' },
    ConditionExpression: 'tenantId = :tid',
    ExpressionAttributeValues: { ':s': 'revoked', ':tid': tenantId },
  }));
}

async function listApiKeys(tenantId) {
  const result = await db.send(new QueryCommand({
    TableName: 'nexussupport-api-keys',
    IndexName: 'tenantId-index',
    KeyConditionExpression: 'tenantId = :tid',
    ExpressionAttributeValues: { ':tid': tenantId },
  })).catch(() => ({ Items: [] }));

  return (result.Items || []).map(k => ({ ...k, keyHash: undefined }));
}

// ── ONBOARDING STEPS TRACKER ───────────────────────────────────
async function updateOnboarding(tenantId, step) {
  const steps = ['profile', 'knowledge', 'widget', 'billing', 'test'];
  await db.send(new UpdateCommand({
    TableName: 'nexussupport-tenants',
    Key: { id: tenantId },
    UpdateExpression: 'SET onboarding.#step = :done, onboarding.completedAt = :t',
    ExpressionAttributeNames: { '#step': step },
    ExpressionAttributeValues: { ':done': true, ':t': new Date().toISOString() },
  })).catch(() => {});
}

async function getOnboardingStatus(tenantId) {
  const result = await db.send(new GetCommand({ TableName: 'nexussupport-tenants', Key: { id: tenantId } }));
  const onboarding = result.Item?.onboarding || {};
  const steps = ['profile', 'knowledge', 'widget', 'billing', 'test'];
  return { steps: steps.map(s => ({ id: s, done: !!onboarding[s] })), completed: steps.every(s => onboarding[s]) };
}

module.exports = { createTenant, validateApiKey, createApiKey, revokeApiKey, listApiKeys, updateOnboarding, getOnboardingStatus, generateApiKey };
