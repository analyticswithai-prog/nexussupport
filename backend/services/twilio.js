const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const WHATSAPP_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

// Generate TwiML for inbound voice call
function buildVoiceTwiML({ greeting, transcribeCallbackUrl, gatherCallbackUrl }) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();

  response.say({ voice: 'Polly.Joanna', language: 'en-US' }, greeting);

  const gather = response.gather({
    input: 'speech',
    action: gatherCallbackUrl,
    method: 'POST',
    speechTimeout: 'auto',
    language: 'en-US',
  });

  gather.say({ voice: 'Polly.Joanna' }, 'How can I help you today?');
  response.redirect(gatherCallbackUrl);

  return response.toString();
}

// Handle inbound call webhook from Twilio
function handleInboundCall({ tenantGreeting = 'Thank you for calling. Please hold while I connect you.' } = {}) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.say({ voice: 'Polly.Joanna', language: 'en-US' }, tenantGreeting);
  response.record({
    action: '/api/voice/recording-complete',
    method: 'POST',
    maxLength: 30,
    playBeep: false,
    transcribe: false,
  });
  return response.toString();
}

// Stream AI response back to caller via TwiML
function buildAIResponseTwiML({ aiText, continueUrl }) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  response.say({ voice: 'Polly.Joanna', language: 'en-US' }, aiText);
  const gather = response.gather({
    input: 'speech',
    action: continueUrl,
    method: 'POST',
    speechTimeout: 'auto',
  });
  gather.say({ voice: 'Polly.Joanna' }, 'Is there anything else I can help you with?');
  return response.toString();
}

// Make an outbound call
async function makeOutboundCall({ to, from, twimlUrl }) {
  const call = await client.calls.create({ to, from, url: twimlUrl });
  return { callSid: call.sid, status: call.status };
}

// Send WhatsApp message
async function sendWhatsApp({ to, message }) {
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const msg = await client.messages.create({
    from: WHATSAPP_FROM,
    to: toFormatted,
    body: message,
  });
  return { messageSid: msg.sid, status: msg.status };
}

// Send SMS
async function sendSMS({ to, from, message }) {
  const msg = await client.messages.create({ from, to, body: message });
  return { messageSid: msg.sid, status: msg.status };
}

// End / transfer a call
async function endCall(callSid) {
  await client.calls(callSid).update({ status: 'completed' });
}

// Get call details
async function getCallDetails(callSid) {
  const call = await client.calls(callSid).fetch();
  return { sid: call.sid, status: call.status, duration: call.duration, from: call.from, to: call.to };
}

// Validate Twilio webhook signature
function validateWebhook(req) {
  const signature = req.headers['x-twilio-signature'];
  const url = `${req.protocol}://${req.hostname}${req.originalUrl}`;
  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, req.body);
}

module.exports = { buildVoiceTwiML, handleInboundCall, buildAIResponseTwiML, makeOutboundCall, sendWhatsApp, sendSMS, endCall, getCallDetails, validateWebhook };
