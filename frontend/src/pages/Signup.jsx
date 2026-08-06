import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../hooks/useApi';

const INDUSTRIES = ['E-Commerce','SaaS','Healthcare','Restaurant','Real Estate','Finance','Education','Retail','Travel','Other'];
const PLANS = [
  { id:'starter', name:'Starter', price:'$99', desc:'Perfect for small businesses', features:['Chat widget','1,000 conversations/mo','5 KB documents','Email support'] },
  { id:'pro', name:'Pro', price:'$299', desc:'For growing businesses', features:['Chat + Email + WhatsApp','Unlimited conversations','Unlimited KB documents','Priority support','Custom AI model'], popular:true },
  { id:'enterprise', name:'Enterprise', price:'$999', desc:'For large organizations', features:['All channels + Voice AI','Unlimited everything','Multi-tenant support','White-label option','Dedicated account manager'] },
];

export default function Signup() {
  const [step, setStep] = useState(1);
  const [plan, setPlan] = useState('pro');
  const [form, setForm] = useState({ businessName:'', industry:'E-Commerce', ownerName:'', ownerEmail:'', password:'', confirm:'' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setBusy(true);
    try {
      const d = await apiFetch('/auth/signup', { method:'POST', body:{ ...form, plan } });
      login(d.token, d.user, d.tenant);
      navigate('/onboarding');
    } catch(err) { setError(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div style={s.root}>
      <div style={s.orb1}/><div style={s.orb2}/>

      {/* Header */}
      <div style={s.header}>
        <Link to="/" style={s.brand}>💬 <span style={s.brandText}>Nexus<span style={{color:'#818cf8'}}>Support</span></span></Link>
        <div style={s.steps}>
          {['Choose Plan','Account Details'].map((label,i)=>(
            <div key={i} style={s.stepItem}>
              <div style={{...s.stepDot, background: step>i+1?'#10b981':step===i+1?'#6366f1':'#1e2340', border:`2px solid ${step>=i+1?step>i+1?'#10b981':'#6366f1':'#1e2340'}`}}>
                {step>i+1?'✓':i+1}
              </div>
              <span style={{fontSize:12,color:step===i+1?'#f0f0f8':'#454a6b'}}>{label}</span>
              {i<1 && <div style={{width:40,height:1,background:step>1?'#6366f1':'#1e2340',margin:'0 8px'}}/>}
            </div>
          ))}
        </div>
        <Link to="/login" style={s.signinLink}>Already have an account? Sign in →</Link>
      </div>

      <div style={s.content}>
        {step === 1 && (
          <div style={s.planSection}>
            <div style={{textAlign:'center',marginBottom:40}}>
              <h1 style={s.title}>Choose your plan</h1>
              <p style={s.sub}>Start with a 14-day free trial. No credit card required.</p>
            </div>
            <div style={s.planGrid}>
              {PLANS.map(p=>(
                <div key={p.id} onClick={()=>setPlan(p.id)} style={{...s.planCard, borderColor: plan===p.id?'#6366f1':'rgba(255,255,255,0.07)', background: plan===p.id?'rgba(99,102,241,0.07)':'#0d0f1c', position:'relative'}}>
                  {p.popular && <div style={s.popularBadge}>Most Popular</div>}
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                    <div style={{fontFamily:'Syne,sans-serif',fontSize:16,fontWeight:700,color:'#f0f0f8'}}>{p.name}</div>
                    <div style={{...s.radioOuter, borderColor: plan===p.id?'#6366f1':'#454a6b'}}>
                      {plan===p.id && <div style={s.radioInner}/>}
                    </div>
                  </div>
                  <div style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:800,color:'#f0f0f8',marginBottom:4}}>{p.price}<span style={{fontSize:14,fontWeight:400,color:'#454a6b'}}>/mo</span></div>
                  <div style={{fontSize:13,color:'#8b90b8',marginBottom:20}}>{p.desc}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {p.features.map(f=>(
                      <div key={f} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'#8b90b8'}}>
                        <span style={{color:'#10b981',fontSize:12,fontWeight:700}}>✓</span>{f}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{textAlign:'center',marginTop:32}}>
              <button onClick={()=>setStep(2)} style={s.nextBtn}>Continue with {PLANS.find(p=>p.id===plan)?.name} →</button>
              <p style={{fontSize:12,color:'#454a6b',marginTop:12}}>14-day free trial · Cancel anytime · No credit card required</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={s.formSection}>
            <div style={{textAlign:'center',marginBottom:32}}>
              <h1 style={s.title}>Create your account</h1>
              <p style={s.sub}>Get started with the <strong style={{color:'#818cf8'}}>{PLANS.find(p=>p.id===plan)?.name}</strong> plan</p>
            </div>

            {error && <div style={s.errorBox}>⚠ {error}</div>}

            <div style={s.formGrid}>
              <div style={s.field}>
                <label style={s.label}>Business Name *</label>
                <input value={form.businessName} onChange={e=>set('businessName',e.target.value)} placeholder="Mario's Restaurant" style={s.input}/>
              </div>
              <div style={s.field}>
                <label style={s.label}>Industry *</label>
                <select value={form.industry} onChange={e=>set('industry',e.target.value)} style={s.input}>
                  {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
                </select>
              </div>
              <div style={s.field}>
                <label style={s.label}>Your Full Name *</label>
                <input value={form.ownerName} onChange={e=>set('ownerName',e.target.value)} placeholder="Mario Rossi" style={s.input}/>
              </div>
              <div style={s.field}>
                <label style={s.label}>Work Email *</label>
                <input type="email" value={form.ownerEmail} onChange={e=>set('ownerEmail',e.target.value)} placeholder="mario@restaurant.com" style={s.input}/>
              </div>
              <div style={s.field}>
                <label style={s.label}>Password *</label>
                <input type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Min 8 characters" style={s.input}/>
              </div>
              <div style={s.field}>
                <label style={s.label}>Confirm Password *</label>
                <input type="password" value={form.confirm} onChange={e=>set('confirm',e.target.value)} placeholder="Repeat password" style={s.input}/>
              </div>
            </div>

            <div style={{display:'flex',gap:12,marginTop:28}}>
              <button onClick={()=>setStep(1)} style={s.backBtn}>← Back</button>
              <button onClick={submit} disabled={busy||!form.businessName||!form.ownerEmail||!form.password} style={{...s.nextBtn,flex:1,opacity:busy||!form.businessName||!form.ownerEmail||!form.password?.5:1}}>
                {busy?'Creating account…':'Create Account →'}
              </button>
            </div>
            <p style={{fontSize:12,color:'#454a6b',textAlign:'center',marginTop:16}}>By creating an account you agree to our <a href="#" style={{color:'#818cf8'}}>Terms of Service</a></p>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  root:{minHeight:'100vh',background:'#070810',position:'relative',overflow:'hidden'},
  orb1:{position:'fixed',top:'-20%',left:'-10%',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)',pointerEvents:'none'},
  orb2:{position:'fixed',bottom:'-20%',right:'-5%',width:500,height:500,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)',pointerEvents:'none'},
  header:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'20px 40px',borderBottom:'1px solid rgba(255,255,255,0.06)',position:'relative',zIndex:1},
  brand:{display:'flex',alignItems:'center',gap:8,textDecoration:'none',fontSize:18},
  brandText:{fontFamily:'Syne,sans-serif',fontWeight:800,color:'#f0f0f8'},
  steps:{display:'flex',alignItems:'center',gap:4},
  stepItem:{display:'flex',alignItems:'center',gap:8},
  stepDot:{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'#fff',transition:'all .3s'},
  signinLink:{fontSize:13,color:'#8b90b8',textDecoration:'none'},
  content:{maxWidth:1000,margin:'0 auto',padding:'48px 24px',position:'relative',zIndex:1},
  title:{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:800,color:'#f0f0f8',letterSpacing:'-0.5px',marginBottom:12},
  sub:{fontSize:15,color:'#8b90b8',fontWeight:300},
  planSection:{},
  planGrid:{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20},
  planCard:{padding:28,borderRadius:16,border:'1px solid',cursor:'pointer',transition:'all .2s'},
  popularBadge:{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',background:'#6366f1',color:'#fff',fontSize:11,fontWeight:700,padding:'4px 14px',borderRadius:99,whiteSpace:'nowrap'},
  radioOuter:{width:20,height:20,borderRadius:'50%',border:'2px solid',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},
  radioInner:{width:10,height:10,borderRadius:'50%',background:'#6366f1'},
  nextBtn:{padding:'14px 32px',background:'#6366f1',border:'none',borderRadius:10,color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',transition:'all .2s'},
  formSection:{maxWidth:560,margin:'0 auto'},
  formGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16},
  field:{display:'flex',flexDirection:'column',gap:8},
  label:{fontSize:12,fontWeight:600,color:'#8b90b8',textTransform:'uppercase',letterSpacing:'.5px'},
  input:{padding:'11px 14px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,color:'#f0f0f8',fontSize:14,outline:'none'},
  errorBox:{padding:'12px 16px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:10,color:'#fca5a5',fontSize:13,marginBottom:20},
  backBtn:{padding:'14px 20px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,color:'#8b90b8',fontSize:14,cursor:'pointer'},
};
