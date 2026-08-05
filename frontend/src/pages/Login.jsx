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
    if (attempts >= 5) { setError('Too many attempts. Please wait 15 minutes.'); return; }
    setError(''); setBusy(true);
    try {
      const d = await apiFetch('/auth/login', { method: 'POST', body: { email, password: pw } });
      login(d.token, d.user, d.tenant);
      navigate('/dashboard');
    } catch {
      setAttempts(a => a + 1);
      setError('Invalid email or password.');
      setPw('');
    } finally { setBusy(false); }
  };

  return (
    <div style={s.root}>
      <div style={s.orb1} /><div style={s.orb2} /><div style={s.orb3} />
      <div style={s.left}>
        <div style={s.brand}>
          <div style={s.brandIcon}>💬</div>
          <span style={s.brandText}>Nexus<span style={{color:'#818cf8'}}>Support</span></span>
        </div>
        <div>
          <div style={s.heroBadge}><span style={s.heroBadgeDot}/>AI-Powered · Always On</div>
          <h1 style={s.heroTitle}>Customer support<br/>that never sleeps</h1>
          <p style={s.heroSub}>Claude AI handles your support tickets, voice calls, WhatsApp and email — 24/7, across every tenant.</p>
        </div>
        <div style={s.features}>
          {[['🤖','Claude AI','claude-sonnet-4-6 backbone'],['🔍','RAG Search','Pinecone knowledge base'],['📞','Voice AI','Deepgram · ElevenLabs'],['🏢','Multi-tenant','Isolated per customer']].map(([icon,label,desc])=>(
            <div key={label} style={s.featureItem}>
              <div style={s.featureIcon}>{icon}</div>
              <div><div style={s.featureLabel}>{label}</div><div style={s.featureDesc}>{desc}</div></div>
            </div>
          ))}
        </div>
        <div style={s.statsRow}>
          {[['87%','AI Resolution'],['<1s','Response Time'],['24/7','Availability']].map(([v,l])=>(
            <div key={l} style={s.stat}><div style={s.statVal}>{v}</div><div style={s.statLabel}>{l}</div></div>
          ))}
        </div>
      </div>
      <div style={s.right}>
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div style={s.cardIcon}>💬</div>
            <div><div style={s.cardTitle}>Welcome back</div><div style={s.cardSub}>Sign in to your workspace</div></div>
          </div>
          {error && <div style={s.errorBox}>⚠ {error}</div>}
          <form onSubmit={submit} style={s.form}>
            <div style={s.fieldGroup}>
              <label style={s.label}>Work email</label>
              <div style={s.inputWrap}>
                <span style={s.inputIcon}>✉</span>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="email" style={s.input}
                  onFocus={e=>e.target.parentElement.style.borderColor='rgba(99,102,241,0.5)'}
                  onBlur={e=>e.target.parentElement.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>Password</label>
              <div style={s.inputWrap}>
                <span style={s.inputIcon}>🔒</span>
                <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="••••••••" required autoComplete="current-password" style={s.input}
                  onFocus={e=>e.target.parentElement.style.borderColor='rgba(99,102,241,0.5)'}
                  onBlur={e=>e.target.parentElement.style.borderColor='rgba(255,255,255,0.08)'}/>
              </div>
            </div>
            <button type="submit" disabled={busy||attempts>=5} style={{...s.btn,opacity:busy||attempts>=5?.6:1}}>
              {busy?'Signing in…':'Sign in →'}
            </button>
          </form>
          <div style={s.secureNote}>
            <span style={{fontSize:14}}>🔐</span>
            <span style={s.secureText}>Authorized users only. Contact <a href="mailto:kamal@nexussupport.ai" style={{color:'#818cf8'}}>kamal@nexussupport.ai</a> for access.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root:{display:'flex',minHeight:'100vh',background:'#070810',position:'relative',overflow:'hidden'},
  orb1:{position:'absolute',top:'-20%',left:'-10%',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)',pointerEvents:'none'},
  orb2:{position:'absolute',bottom:'-20%',right:'-5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.1) 0%,transparent 70%)',pointerEvents:'none'},
  orb3:{position:'absolute',top:'50%',left:'40%',width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(6,182,212,0.06) 0%,transparent 70%)',pointerEvents:'none'},
  left:{flex:1,padding:'52px 64px',display:'flex',flexDirection:'column',justifyContent:'space-between',borderRight:'1px solid rgba(255,255,255,0.05)',position:'relative',zIndex:1},
  brand:{display:'flex',alignItems:'center',gap:12},
  brandIcon:{width:38,height:38,background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18},
  brandText:{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:20,color:'#f0f0f8'},
  heroBadge:{display:'inline-flex',alignItems:'center',gap:8,padding:'5px 14px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:99,fontSize:12,color:'#818cf8',fontWeight:500,marginBottom:24},
  heroBadgeDot:{width:6,height:6,borderRadius:'50%',background:'#10b981',boxShadow:'0 0 8px #10b981',flexShrink:0,display:'inline-block'},
  heroTitle:{fontFamily:'Syne,sans-serif',fontSize:44,fontWeight:800,lineHeight:1.1,letterSpacing:'-1.5px',color:'#f0f0f8',marginBottom:20},
  heroSub:{fontSize:16,color:'#8b90b8',lineHeight:1.7,maxWidth:440,fontWeight:300},
  features:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14},
  featureItem:{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12},
  featureIcon:{fontSize:22,flexShrink:0},
  featureLabel:{fontSize:13,fontWeight:600,color:'#f0f0f8',marginBottom:2},
  featureDesc:{fontSize:11,color:'#454a6b'},
  statsRow:{display:'flex',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,overflow:'hidden'},
  stat:{flex:1,padding:'18px 20px',textAlign:'center',borderRight:'1px solid rgba(255,255,255,0.06)'},
  statVal:{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:'#818cf8',letterSpacing:'-0.5px'},
  statLabel:{fontSize:11,color:'#454a6b',marginTop:4,textTransform:'uppercase',letterSpacing:'.5px'},
  right:{width:480,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 52px',position:'relative',zIndex:1},
  card:{width:'100%',background:'rgba(13,15,28,0.9)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:20,padding:'36px'},
  cardHeader:{display:'flex',alignItems:'center',gap:14,marginBottom:32},
  cardIcon:{width:44,height:44,background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.2)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20},
  cardTitle:{fontFamily:'Syne,sans-serif',fontSize:20,fontWeight:700,color:'#f0f0f8'},
  cardSub:{fontSize:13,color:'#8b90b8',marginTop:2},
  errorBox:{display:'flex',alignItems:'center',gap:10,padding:'12px 16px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,color:'#fca5a5',fontSize:13,marginBottom:20},
  form:{display:'flex',flexDirection:'column',gap:20},
  fieldGroup:{display:'flex',flexDirection:'column',gap:8},
  label:{fontSize:12,fontWeight:600,color:'#8b90b8',textTransform:'uppercase',letterSpacing:'.6px'},
  inputWrap:{display:'flex',alignItems:'center',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,overflow:'hidden',transition:'border-color .2s'},
  inputIcon:{padding:'0 12px',fontSize:14,opacity:.5,flexShrink:0},
  input:{flex:1,padding:'13px 14px 13px 0',background:'transparent',border:'none',color:'#f0f0f8',fontSize:14,outline:'none'},
  btn:{padding:'14px',background:'#6366f1',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',transition:'all .2s',marginTop:4},
  secureNote:{display:'flex',gap:10,padding:'14px 16px',background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.12)',borderRadius:10,marginTop:24,alignItems:'flex-start'},
  secureText:{fontSize:12,color:'#8b90b8',lineHeight:1.6},
};
