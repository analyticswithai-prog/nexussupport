import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../hooks/useApi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e?.preventDefault();
    if (attempts >= 5) {
      setError('Too many failed attempts. Please wait 15 minutes.');
      return;
    }
    setError(''); setBusy(true);
    try {
      const d = await apiFetch('/auth/login', { method: 'POST', body: { email, password: pw } });
      login(d.token, d.user, d.tenant);
      navigate('/dashboard');
    } catch(err) {
      setAttempts(a => a + 1);
      setError('Invalid email or password.');
      setPw(''); // clear password on failure
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#080a10' }}>
      {/* Left */}
      <div style={{ flex:1, padding:'60px 56px', display:'flex', flexDirection:'column', justifyContent:'center', background:'linear-gradient(135deg,#0d0f1a,#0f1225)', borderRight:'1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:48 }}>
          <span style={{ fontSize:28 }}>💬</span>
          <span style={{ fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:22, color:'#eeeef5' }}>Nexus<span style={{ color:'#9d97ff' }}>Support</span></span>
        </div>
        <h1 style={{ fontFamily:'Syne,sans-serif', fontSize:40, fontWeight:800, lineHeight:1.15, letterSpacing:'-1.5px', color:'#eeeef5', marginBottom:16 }}>AI-Powered<br/>Customer Support<br/>Platform</h1>
        <p style={{ fontSize:15, color:'#8b90aa', marginBottom:40 }}>Multi-tenant · Chat · Voice · Agents · Analytics</p>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {['🤖 Claude AI backbone','📞 Voice STT→LLM→TTS','🏢 Full multi-tenancy','📊 Real-time analytics','🔒 Row-level data isolation'].map(f=>(
            <div key={f} style={{ fontSize:14, color:'#8b90aa' }}>{f}</div>
          ))}
        </div>
      </div>

      {/* Right */}
      <div style={{ width:480, display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 48px' }}>
        <div style={{ width:'100%' }}>
          <h2 style={{ fontFamily:'Syne,sans-serif', fontSize:24, fontWeight:700, color:'#eeeef5', marginBottom:6 }}>Sign in to your workspace</h2>
          <p style={{ fontSize:13, color:'#8b90aa', marginBottom:28 }}>Enter your credentials to access your tenant dashboard</p>

          {error && (
            <div style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, padding:'10px 14px', color:'#ef4444', fontSize:13, marginBottom:16 }}>
              {error}
              {attempts >= 3 && <div style={{ marginTop:6, fontSize:12 }}>Having trouble? Contact <a href="mailto:support@nexussupport.ai" style={{ color:'#9d97ff' }}>support@nexussupport.ai</a></div>}
            </div>
          )}

          <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:12, fontWeight:600, color:'#8b90aa', marginBottom:4, marginTop:12, textTransform:'uppercase', letterSpacing:'.5px' }}>Work Email</label>
            <input
              type="email"
              value={email}
              onChange={e=>setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              autoComplete="email"
              style={{ padding:'11px 14px', background:'#161923', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, color:'#eeeef5', fontSize:14, outline:'none' }}
            />

            <label style={{ fontSize:12, fontWeight:600, color:'#8b90aa', marginBottom:4, marginTop:12, textTransform:'uppercase', letterSpacing:'.5px' }}>Password</label>
            <input
              type="password"
              value={pw}
              onChange={e=>setPw(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              style={{ padding:'11px 14px', background:'#161923', border:'1px solid rgba(255,255,255,.08)', borderRadius:8, color:'#eeeef5', fontSize:14, outline:'none' }}
            />

            <button
              type="submit"
              disabled={busy || attempts >= 5}
              style={{ marginTop:20, padding:13, background: attempts >= 5 ? '#333' : '#6c63ff', border:'none', borderRadius:8, color:'#fff', fontSize:15, fontWeight:600, cursor: attempts >= 5 ? 'not-allowed' : 'pointer', opacity:busy?.7:1 }}
            >
              {busy ? 'Signing in…' : attempts >= 5 ? 'Too many attempts' : 'Sign in →'}
            </button>
          </form>

          <div style={{ marginTop:24, padding:16, background:'rgba(108,99,255,0.06)', border:'1px solid rgba(108,99,255,0.15)', borderRadius:10 }}>
            <div style={{ fontSize:12, color:'#8b90aa', lineHeight:1.7 }}>
              <div style={{ fontWeight:600, color:'#9d97ff', marginBottom:6 }}>🔒 Secure Access</div>
              <div>This platform is for authorized users only.</div>
              <div>Don't have an account? <a href="mailto:kamal@nexussupport.ai" style={{ color:'#9d97ff' }}>Contact us</a> to get started.</div>
            </div>
          </div>

          <p style={{ textAlign:'center', fontSize:12, color:'#4a506a', marginTop:20 }}>
            Need help? <a href="mailto:support@nexussupport.ai" style={{ color:'#9d97ff', textDecoration:'none' }}>support@nexussupport.ai</a>
          </p>
        </div>
      </div>
    </div>
  );
}
