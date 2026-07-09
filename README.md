# NexusSupport - Multi-Tenant AI Customer Support Platform

> AI-powered customer support with Chat, Voice and autonomous Agents.
> Built with React, Node.js, Claude API and AWS.

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| ShopNow Admin | admin@shopnow.com | demo1234 |
| ShopNow Agent | agent@shopnow.com | demo1234 |
| CloudStack Admin | admin@cloudstack.com | demo1234 |
| CloudStack Agent | agent@cloudstack.com | demo1234 |
| MedCare Admin | admin@medcare.com | demo1234 |
| Super Admin | superadmin@nexussupport.com | admin1234 |

## Quick Start

```bash
# 1. Backend API
cd backend && npm install && npm start
# Runs at http://localhost:4000

# 2. Frontend (new terminal)
cd frontend && npm install && npm run dev
# Runs at http://localhost:3000
```

## Project Structure

```
nexussupport/
|-- backend/
|   |-- server.js          # Express API + JWT auth + all routes
|   |-- Dockerfile
|   +-- package.json
|-- frontend/
|   |-- src/
|   |   |-- App.jsx
|   |   |-- context/AuthContext.jsx
|   |   |-- hooks/useApi.js
|   |   |-- components/Layout.jsx
|   |   +-- pages/
|   |       |-- Login.jsx
|   |       +-- Pages.jsx
|   |-- index.html
|   |-- vite.config.js
|   +-- package.json
+-- infra/
    +-- cloudformation.yml
```

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, React Router, Vite |
| Backend | Node.js, Express, JWT Auth |
| AI | Claude API (Anthropic) - claude-sonnet-4-6 |
| Voice | Twilio, Deepgram STT, ElevenLabs TTS |
| Vector DB | Pinecone (RAG knowledge search) |
| Compute | AWS ECS Fargate |
| CDN | AWS CloudFront + S3 |
| IaC | AWS CloudFormation |

## Features

- Tenant login with JWT (admin / agent / superadmin roles)
- Full conversation + support history per tenant
- AI Agents: Triage, Resolution, Voice, Escalation, Outreach, Billing
- Voice pipeline: STT to LLM to TTS with live waveform UI
- Analytics: CSAT, resolution rates, sentiment breakdown
- Multi-tenancy: isolated data and per-tenant AI config
- AWS ready: one CloudFormation command deploys everything

## AWS Deployment

```bash
aws cloudformation deploy \
  --template-file infra/cloudformation.yml \
  --stack-name nexussupport-prod \
  --parameter-overrides \
    JWTSecret=your-32-char-secret \
    AnthropicKey=sk-ant-xxxx \
  --capabilities CAPABILITY_IAM
```
