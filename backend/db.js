const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

const TENANTS_TABLE = process.env.TENANTS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const AGENTS_TABLE = process.env.AGENTS_TABLE;
const CONVERSATIONS_TABLE = process.env.CONVERSATIONS_TABLE;

async function getUserByEmail(email) {
  const { Items } = await client.send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email.toLowerCase() },
  }));
  return Items?.[0] || null;
}

async function getUserById(id) {
  const { Item } = await client.send(new GetCommand({ TableName: USERS_TABLE, Key: { id } }));
  return Item || null;
}

async function getAllTenants() {
  const { Items } = await client.send(new ScanCommand({ TableName: TENANTS_TABLE }));
  return Items || [];
}

async function getTenant(id) {
  const { Item } = await client.send(new GetCommand({ TableName: TENANTS_TABLE, Key: { id } }));
  return Item || null;
}

async function updateTenantSettings(id, settings) {
  await client.send(new UpdateCommand({
    TableName: TENANTS_TABLE,
    Key: { id },
    UpdateExpression: 'SET settings = :settings',
    ExpressionAttributeValues: { ':settings': settings },
  }));
  return getTenant(id);
}

async function getAgentsByTenant(tenantId) {
  const { Items } = await client.send(new QueryCommand({
    TableName: AGENTS_TABLE,
    IndexName: 'tenantId-index',
    KeyConditionExpression: 'tenantId = :tenantId',
    ExpressionAttributeValues: { ':tenantId': tenantId },
  }));
  return Items || [];
}

async function getConversationsByTenant(tenantId) {
  const { Items } = await client.send(new QueryCommand({
    TableName: CONVERSATIONS_TABLE,
    IndexName: 'tenantId-index',
    KeyConditionExpression: 'tenantId = :tenantId',
    ExpressionAttributeValues: { ':tenantId': tenantId },
  }));
  return Items || [];
}

async function getConversation(id) {
  const { Item } = await client.send(new GetCommand({ TableName: CONVERSATIONS_TABLE, Key: { id } }));
  return Item || null;
}

async function putTenant(tenant) {
  await client.send(new PutCommand({ TableName: TENANTS_TABLE, Item: tenant }));
}

async function putUser(user) {
  await client.send(new PutCommand({ TableName: USERS_TABLE, Item: user }));
}

async function putAgent(agent) {
  await client.send(new PutCommand({ TableName: AGENTS_TABLE, Item: agent }));
}

async function putConversation(conversation) {
  await client.send(new PutCommand({ TableName: CONVERSATIONS_TABLE, Item: conversation }));
}

module.exports = {
  getUserByEmail, getUserById, getAllTenants, getTenant, updateTenantSettings,
  getAgentsByTenant, getConversationsByTenant, getConversation,
  putTenant, putUser, putAgent, putConversation,
};
