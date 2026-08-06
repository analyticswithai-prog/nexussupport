const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const PLANS = {
  starter: {
    name: 'Starter',
    price: 99,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    limits: { conversations: 1000, documents: 5, channels: ['chat'] },
  },
  pro: {
    name: 'Pro',
    price: 299,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    limits: { conversations: -1, documents: -1, channels: ['chat','email','whatsapp'] },
  },
  enterprise: {
    name: 'Enterprise',
    price: 999,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
    limits: { conversations: -1, documents: -1, channels: ['chat','email','whatsapp','voice'] },
  },
};

// Create Stripe customer
async function createCustomer({ email, name, tenantId }) {
  return stripe.customers.create({
    email, name,
    metadata: { tenantId },
  });
}

// Create checkout session
async function createCheckoutSession({ customerId, planId, tenantId, successUrl, cancelUrl }) {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);

  return stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: plan.priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId, planId },
    subscription_data: { metadata: { tenantId, planId } },
  });
}

// Create billing portal session
async function createPortalSession({ customerId, returnUrl }) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// Get subscription details
async function getSubscription(subscriptionId) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Handle webhook events
async function handleWebhook(payload, signature) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      return { type: 'subscription_created', tenantId: session.metadata.tenantId, planId: session.metadata.planId, subscriptionId: session.subscription, customerId: session.customer };
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      return { type: 'subscription_updated', subscriptionId: sub.id, status: sub.status, planId: sub.metadata.planId };
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      return { type: 'subscription_cancelled', subscriptionId: sub.id, tenantId: sub.metadata.tenantId };
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object;
      return { type: 'payment_failed', customerId: inv.customer, subscriptionId: inv.subscription };
    }
    default:
      return { type: 'unhandled', eventType: event.type };
  }
}

// Cancel subscription
async function cancelSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

module.exports = { PLANS, createCustomer, createCheckoutSession, createPortalSession, getSubscription, handleWebhook, cancelSubscription };
