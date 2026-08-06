/**
 * NexusSupport Chat Widget v1.0
 * Embed on any website with:
 * <script src="https://cdn.nexussupport.ai/widget.js" data-api-key="nxs_xxx"></script>
 */
(function() {
  'use strict';

  // Get config from script tag
  const script = document.currentScript || document.querySelector('script[data-api-key]');
  const API_KEY = script?.getAttribute('data-api-key');
  const API_URL = script?.getAttribute('data-api-url') || 'https://veanixmvft.us-east-1.awsapprunner.com';
  const POSITION = script?.getAttribute('data-position') || 'bottom-right';
  const CUSTOM_COLOR = script?.getAttribute('data-color');

  if (!API_KEY) { console.warn('[NexusSupport] No API key provided'); return; }

  let config = {};
  let isOpen = false;
  let sessionId = null;
  let messages = [];
  let isTyping = false;

  // ── FETCH CONFIG ──────────────────────────────────────────────
  async function loadConfig() {
    try {
      const res = await fetch(`${API_URL}/api/widget/config`, {
        headers: { 'X-API-Key': API_KEY }
      });
      config = await res.json();
      if (CUSTOM_COLOR) config.widgetColor = CUSTOM_COLOR;
    } catch {
      config = { widgetName: 'Support', widgetColor: CUSTOM_COLOR || '#6366f1', widgetGreeting: 'Hi! How can I help you today?', logoEmoji: '💬' };
    }
    render();
  }

  // ── STYLES ────────────────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      #nxs-widget * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
      #nxs-btn { position: fixed; ${POSITION.includes('right') ? 'right: 24px' : 'left: 24px'}; bottom: 24px; width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 26px; box-shadow: 0 4px 24px rgba(0,0,0,0.2); transition: transform .2s, box-shadow .2s; z-index: 999998; }
      #nxs-btn:hover { transform: scale(1.08); box-shadow: 0 8px 32px rgba(0,0,0,0.25); }
      #nxs-btn .nxs-badge { position: absolute; top: -4px; right: -4px; background: #ef4444; color: #fff; font-size: 10px; font-weight: 700; width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #fff; display: none; }
      #nxs-window { position: fixed; ${POSITION.includes('right') ? 'right: 24px' : 'left: 24px'}; bottom: 96px; width: 370px; height: 560px; background: #ffffff; border-radius: 20px; box-shadow: 0 16px 64px rgba(0,0,0,0.18); display: flex; flex-direction: column; overflow: hidden; z-index: 999999; transition: all .3s cubic-bezier(.4,0,.2,1); transform-origin: bottom ${POSITION.includes('right') ? 'right' : 'left'}; }
      #nxs-window.nxs-hidden { opacity: 0; transform: scale(0.85) translateY(16px); pointer-events: none; }
      #nxs-header { padding: 18px 20px; display: flex; align-items: center; gap: 12px; color: #fff; flex-shrink: 0; }
      #nxs-header .nxs-avatar { width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
      #nxs-header .nxs-info { flex: 1; min-width: 0; }
      #nxs-header .nxs-name { font-weight: 700; font-size: 15px; }
      #nxs-header .nxs-status { font-size: 12px; opacity: .8; display: flex; align-items: center; gap: 5px; }
      #nxs-header .nxs-dot { width: 7px; height: 7px; border-radius: 50%; background: #4ade80; }
      #nxs-header .nxs-close { background: rgba(255,255,255,0.15); border: none; color: #fff; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; font-size: 16px; display: flex; align-items: center; justify-content: center; transition: background .2s; flex-shrink: 0; }
      #nxs-header .nxs-close:hover { background: rgba(255,255,255,0.25); }
      #nxs-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #f8f9fc; }
      #nxs-messages::-webkit-scrollbar { width: 3px; } #nxs-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 99px; }
      .nxs-msg { display: flex; gap: 8px; max-width: 85%; animation: nxsFadeIn .2s ease; }
      .nxs-msg.nxs-user { align-self: flex-end; flex-direction: row-reverse; }
      .nxs-msg .nxs-bubble { padding: 10px 14px; border-radius: 16px; font-size: 14px; line-height: 1.55; }
      .nxs-msg.nxs-ai .nxs-bubble { background: #fff; color: #1a1a2e; border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
      .nxs-msg.nxs-user .nxs-bubble { color: #fff; border-bottom-right-radius: 4px; }
      .nxs-msg .nxs-icon { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; background: #f0f0f8; }
      .nxs-typing { display: flex; align-items: center; gap: 5px; padding: 12px 14px; background: #fff; border-radius: 16px; border-bottom-left-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
      .nxs-typing span { width: 7px; height: 7px; border-radius: 50%; background: #bbb; animation: nxsBounce .8s ease infinite; }
      .nxs-typing span:nth-child(2) { animation-delay: .15s; } .nxs-typing span:nth-child(3) { animation-delay: .3s; }
      .nxs-greeting { background: #fff; border-radius: 16px; padding: 16px; border-bottom-left-radius: 4px; font-size: 14px; color: #333; line-height: 1.6; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
      .nxs-escalate { background: #fff5f5; border: 1px solid #fecaca; border-radius: 12px; padding: 12px 14px; font-size: 13px; color: #ef4444; display: flex; align-items: center; gap: 8px; }
      #nxs-input-area { padding: 12px 14px; border-top: 1px solid #f0f0f8; background: #fff; display: flex; gap: 8px; flex-shrink: 0; }
      #nxs-input { flex: 1; padding: 10px 14px; border: 1px solid #e8e8f0; border-radius: 24px; font-size: 14px; outline: none; color: #1a1a2e; background: #f8f9fc; transition: border-color .2s; resize: none; max-height: 100px; line-height: 1.4; }
      #nxs-input:focus { border-color: var(--nxs-color); background: #fff; }
      #nxs-send { width: 40px; height: 40px; border-radius: 50%; border: none; color: #fff; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; flex-shrink: 0; }
      #nxs-send:hover { filter: brightness(1.1); transform: scale(1.05); }
      #nxs-send:disabled { opacity: .5; cursor: not-allowed; }
      #nxs-powered { text-align: center; padding: 6px; font-size: 10px; color: #bbb; background: #fff; }
      #nxs-powered a { color: #bbb; text-decoration: none; } #nxs-powered a:hover { color: #999; }
      @keyframes nxsFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      @keyframes nxsBounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-5px); } }
      @media (max-width: 480px) { #nxs-window { width: calc(100vw - 24px); left: 12px; right: 12px; bottom: 80px; height: calc(100vh - 100px); } #nxs-btn { ${POSITION.includes('right') ? 'right: 16px' : 'left: 16px'}; bottom: 16px; } }
    `;
    document.head.appendChild(style);
  }

  // ── RENDER ────────────────────────────────────────────────────
  function render() {
    const color = config.widgetColor || '#6366f1';
    const container = document.createElement('div');
    container.id = 'nxs-widget';
    container.innerHTML = `
      <style>:root { --nxs-color: ${color}; }</style>
      <button id="nxs-btn" style="background:${color}" title="Chat with us">
        <span id="nxs-btn-icon">💬</span>
        <span class="nxs-badge" id="nxs-badge">1</span>
      </button>
      <div id="nxs-window" class="nxs-hidden">
        <div id="nxs-header" style="background:linear-gradient(135deg,${color},${adjustColor(color,-20)})">
          <div class="nxs-avatar">${config.logoEmoji || '💬'}</div>
          <div class="nxs-info">
            <div class="nxs-name">${config.widgetName || 'Support'}</div>
            <div class="nxs-status"><span class="nxs-dot"></span>AI-powered · Always available</div>
          </div>
          <button class="nxs-close" id="nxs-close">✕</button>
        </div>
        <div id="nxs-messages">
          <div class="nxs-msg nxs-ai">
            <div class="nxs-icon">${config.logoEmoji || '💬'}</div>
            <div class="nxs-greeting">${config.widgetGreeting || 'Hi! How can I help you today?'}</div>
          </div>
        </div>
        <div id="nxs-input-area">
          <textarea id="nxs-input" placeholder="Type your message…" rows="1"></textarea>
          <button id="nxs-send" style="background:${color}">↑</button>
        </div>
        <div id="nxs-powered">Powered by <a href="https://nexussupport.ai" target="_blank">NexusSupport AI</a></div>
      </div>
    `;
    document.body.appendChild(container);

    // Events
    document.getElementById('nxs-btn').addEventListener('click', toggleWidget);
    document.getElementById('nxs-close').addEventListener('click', toggleWidget);
    document.getElementById('nxs-send').addEventListener('click', sendMessage);
    const input = document.getElementById('nxs-input');
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 100) + 'px'; });
  }

  function toggleWidget() {
    isOpen = !isOpen;
    const win = document.getElementById('nxs-window');
    const btnIcon = document.getElementById('nxs-btn-icon');
    const badge = document.getElementById('nxs-badge');
    if (isOpen) {
      win.classList.remove('nxs-hidden');
      btnIcon.textContent = '✕';
      badge.style.display = 'none';
      document.getElementById('nxs-input').focus();
    } else {
      win.classList.add('nxs-hidden');
      btnIcon.textContent = '💬';
    }
  }

  function appendMessage(role, content, extra = {}) {
    const msgList = document.getElementById('nxs-messages');
    const msg = document.createElement('div');
    msg.className = `nxs-msg nxs-${role}`;
    const color = config.widgetColor || '#6366f1';

    if (role === 'escalate') {
      msg.innerHTML = `<div class="nxs-escalate">⚡ Connecting you to a human agent. Average wait time: 2 minutes.</div>`;
    } else {
      msg.innerHTML = `
        ${role === 'ai' ? `<div class="nxs-icon">${config.logoEmoji || '💬'}</div>` : ''}
        <div class="nxs-bubble" style="${role === 'user' ? `background:${color}` : ''}">${escapeHtml(content)}</div>
        ${role === 'user' ? `<div class="nxs-icon" style="background:${color}22;color:${color}">👤</div>` : ''}
      `;
    }
    msgList.appendChild(msg);
    msgList.scrollTop = msgList.scrollHeight;
    return msg;
  }

  function showTyping() {
    const msgList = document.getElementById('nxs-messages');
    const el = document.createElement('div');
    el.className = 'nxs-msg nxs-ai';
    el.id = 'nxs-typing';
    el.innerHTML = `<div class="nxs-icon">${config.logoEmoji || '💬'}</div><div class="nxs-typing"><span></span><span></span><span></span></div>`;
    msgList.appendChild(el);
    msgList.scrollTop = msgList.scrollHeight;
  }

  function hideTyping() {
    document.getElementById('nxs-typing')?.remove();
  }

  async function sendMessage() {
    const input = document.getElementById('nxs-input');
    const send = document.getElementById('nxs-send');
    const text = input.value.trim();
    if (!text || isTyping) return;

    input.value = '';
    input.style.height = 'auto';
    appendMessage('user', text);
    messages.push({ role: 'customer', content: text });

    isTyping = true;
    send.disabled = true;
    showTyping();

    try {
      const res = await fetch(`${API_URL}/api/widget/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
        body: JSON.stringify({ message: text, sessionId, history: messages.slice(-8) }),
      });
      const data = await res.json();
      hideTyping();

      if (data.error) {
        appendMessage('ai', 'Sorry, I encountered an error. Please try again.');
      } else {
        sessionId = data.sessionId;
        appendMessage('ai', data.response);
        messages.push({ role: 'ai', content: data.response });
        if (data.shouldEscalate) {
          setTimeout(() => appendMessage('escalate', ''), 500);
        }
      }
    } catch {
      hideTyping();
      appendMessage('ai', 'Sorry, I\'m having trouble connecting. Please try again in a moment.');
    }

    isTyping = false;
    send.disabled = false;
    document.getElementById('nxs-input').focus();
  }

  function adjustColor(hex, amount) {
    try {
      const num = parseInt(hex.slice(1), 16);
      const r = Math.max(0, Math.min(255, (num >> 16) + amount));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
      const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    } catch { return hex; }
  }

  function escapeHtml(text) {
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
  }

  // ── INIT ──────────────────────────────────────────────────────
  injectStyles();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
  } else {
    loadConfig();
  }

})();
