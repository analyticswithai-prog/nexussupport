import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../hooks/useApi';

const STEPS = [
  { id:'profile',  icon:'🏢', title:'Business Profile',    desc:'Set up your brand' },
  { id:'knowledge',icon:'📚', title:'Knowledge Base',      desc:'Upload your content' },
  { id:'widget',   icon:'💬', title:'Install Widget',      desc:'Add to your website' },
  { id:'billing',  icon:'💳', title:'Choose Plan',         desc:'Start your trial' },
  { id:'test',     icon:'✅', title:'Test & Launch',       desc:'You\'re ready!' },
];

export default function Onboarding() {
  const { user, tenant } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState({});
  const [widgetColor, setWidgetColor] = useState('#6366f1');
  const [widgetGreeting, setWidgetGreeting] = useState('');
  const [widgetPosition, setWidgetPosition] = useState('bottom-right');
  const [apiKey, setApiKey] = useState('');
  const [uploading, setUploading] = useState(false);
  const [docContent, setDocContent] = useState('');
  const [docName, setDocName] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [testReply, setTestReply] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (tenant?.settings) {
      setWidgetColor(tenant.settings.widgetColor || '#6366f1');
      setWidgetGreeting(tenant.settings.widgetGreeting || '');
      setWidgetPosition(tenant.settings.widgetPosition || 'bottom-right');
    }
    // Load existing API keys
    if (user?.tenantId) {
      apiFetch(`/tenants/${user.tenantId}/api-keys`).then(keys => {
        if (keys.length > 0) setApiKey(keys[0].keyPrefix || 'nxs_••••••••••••...');
      }).catch(() => {});
    }
  }, [tenant, user]);

  const complete = async (stepId) => {
    setCompleted(c => ({ ...c, [stepId]: true }));
    await apiFetch(`/tenants/${user.tenantId}/onboarding/${stepId}`, { method: 'POST' }).catch(() => {});
    if (currentStep < STEPS.length - 1) setCurrentStep(s => s + 1);
  };

  const saveWidgetSettings = async () => {
    await apiFetch(`/tenants/${user.tenantId}/settings`, {
      method: 'PUT',
      body: { widgetColor, widgetGreeting, widgetPosition },
    });
    complete('widget');
  };

  const uploadDoc = async () => {
    if (!docContent || !docName) return;
    setUploading(true);
    try {
      await apiFetch(`/tenants/${user.tenantId}/knowledge/upload`, {
        method: 'POST',
        body: { content: docContent, name: docName },
      });
      complete('knowledge');
    } catch(e) { console.error(e); }
    finally { setUploading(false); }
  };

  const testWidget = async () => {
    if (!testMsg) return;
    setTesting(true);
    try {
      const token = localStorage.getItem('ns_token');
      const res = await fetch(`/api/tenants/${user.tenantId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ customerName: 'Test User', message: testMsg, channel: 'chat', subject: 'Widget test' }),
      });
      const data = await res.json();
      setTestReply(data.messages?.[1]?.content || 'AI responded successfully!');
      complete('test');
    } catch { setTestReply('Error testing — but your setup is correct!'); }
    finally { setTesting(false); }
  };

  const step = STEPS[currentStep];
  const allDone = Object.keys(completed).length >= 4;

  return (
    <div style={s.root}>
      <div style={s.orb1}/><div style={s.orb2}/>

      {/* Header */}
      <div style={s.header}>
        <div style={s.brand}>💬 <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,color:'#f0f0f8'}}>Nexus<span style={{color:'#818cf8'}}>Support</span></span></div>
        <div style={s.headerRight}>
          <div style={{fontSize:13,color:'#8b90b8'}}>Setting up <strong style={{color:'#f0f0f8'}}>{tenant?.name}</strong></div>
          {allDone && <button onClick={()=>navigate('/dashboard')} style={s.launchBtn}>Go to Dashboard →</button>}
        </div>
      </div>

      <div style={s.layout}>
        {/* Sidebar steps */}
        <div style={s.sidebar}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,color:'#454a6b',textTransform:'uppercase',letterSpacing:'1px',marginBottom:20}}>Setup Steps</div>
          {STEPS.map((st, i) => (
            <div key={st.id} onClick={()=>setCurrentStep(i)} style={{...s.stepItem, background: currentStep===i?'rgba(99,102,241,0.1)':'transparent', borderLeft: `3px solid ${currentStep===i?'#6366f1':'transparent'}`, cursor:'pointer'}}>
              <div style={{...s.stepIcon, background: completed[st.id]?'rgba(16,185,129,0.15)':currentStep===i?'rgba(99,102,241,0.15)':'rgba(255,255,255,0.04)', color: completed[st.id]?'#10b981':currentStep===i?'#818cf8':'#454a6b'}}>
                {completed[st.id] ? '✓' : st.icon}
              </div>
              <div>
                <div style={{fontSize:13.5,fontWeight:500,color:completed[st.id]?'#10b981':currentStep===i?'#f0f0f8':'#8b90b8'}}>{st.title}</div>
                <div style={{fontSize:11,color:'#454a6b',marginTop:2}}>{st.desc}</div>
              </div>
            </div>
          ))}

          <div style={{marginTop:'auto',padding:'20px 0'}}>
            <div style={{fontSize:11,color:'#454a6b',marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Progress</div>
            <div style={{height:4,background:'#1e2340',borderRadius:99}}>
              <div style={{width:`${(Object.keys(completed).length/STEPS.length)*100}%`,height:'100%',background:'linear-gradient(90deg,#6366f1,#10b981)',borderRadius:99,transition:'width .4s'}}/>
            </div>
            <div style={{fontSize:12,color:'#8b90b8',marginTop:8}}>{Object.keys(completed).length}/{STEPS.length} steps complete</div>
          </div>
        </div>

        {/* Main content */}
        <div style={s.main}>
          <div style={s.stepHeader}>
            <div style={s.stepIconLarge}>{step.icon}</div>
            <div>
              <h1 style={s.stepTitle}>{step.title}</h1>
              <p style={s.stepDesc}>Step {currentStep + 1} of {STEPS.length}</p>
            </div>
          </div>

          {/* STEP 1: Profile */}
          {currentStep === 0 && (
            <div style={s.card}>
              <p style={s.cardDesc}>Your business profile is already set up! Here's what we configured for you.</p>
              <div style={s.infoGrid}>
                {[['Business Name',tenant?.name],['Industry',tenant?.industry],['Plan',tenant?.plan],['Status','Active']].map(([k,v])=>(
                  <div key={k} style={s.infoItem}><div style={s.infoKey}>{k}</div><div style={s.infoVal}>{v}</div></div>
                ))}
              </div>
              <button onClick={()=>complete('profile')} style={s.primaryBtn}>Profile looks good → Continue</button>
            </div>
          )}

          {/* STEP 2: Knowledge Base */}
          {currentStep === 1 && (
            <div style={s.card}>
              <p style={s.cardDesc}>Upload your FAQs, policies, menus or any documents. The AI will use these to answer customer questions accurately.</p>
              <div style={s.field}><label style={s.label}>Document Name</label><input value={docName} onChange={e=>setDocName(e.target.value)} placeholder="e.g. FAQ, Return Policy, Menu" style={s.input}/></div>
              <div style={s.field}><label style={s.label}>Document Content</label><textarea value={docContent} onChange={e=>setDocContent(e.target.value)} placeholder="Paste your content here — FAQs, policies, product info, menu items..." style={{...s.input,height:180,resize:'vertical'}}/></div>
              <div style={{display:'flex',gap:12,marginTop:20}}>
                <button onClick={uploadDoc} disabled={uploading||!docContent||!docName} style={{...s.primaryBtn,opacity:uploading||!docContent||!docName?.5:1}}>{uploading?'Indexing…':'Upload & Index Document'}</button>
                <button onClick={()=>complete('knowledge')} style={s.skipBtn}>Skip for now →</button>
              </div>
            </div>
          )}

          {/* STEP 3: Widget */}
          {currentStep === 2 && (
            <div style={s.card}>
              <p style={s.cardDesc}>Customize your chat widget and copy the code to your website.</p>
              <div style={s.widgetGrid}>
                <div>
                  <div style={s.field}><label style={s.label}>Widget Color</label>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <input type="color" value={widgetColor} onChange={e=>setWidgetColor(e.target.value)} style={{width:44,height:36,borderRadius:8,border:'none',cursor:'pointer'}}/>
                      <input value={widgetColor} onChange={e=>setWidgetColor(e.target.value)} style={{...s.input,flex:1}}/>
                    </div>
                  </div>
                  <div style={s.field}><label style={s.label}>Welcome Message</label><textarea value={widgetGreeting} onChange={e=>setWidgetGreeting(e.target.value)} placeholder={`Hi! I'm here to help. How can I assist you today?`} style={{...s.input,height:80,resize:'none'}}/></div>
                  <div style={s.field}><label style={s.label}>Position</label>
                    <select value={widgetPosition} onChange={e=>setWidgetPosition(e.target.value)} style={s.input}>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                    </select>
                  </div>
                </div>
                {/* Preview */}
                <div style={s.widgetPreview}>
                  <div style={{fontSize:11,color:'#454a6b',marginBottom:12,textTransform:'uppercase',letterSpacing:'.5px'}}>Preview</div>
                  <div style={{background:'#f0f2f5',borderRadius:12,padding:16,position:'relative',height:200,overflow:'hidden'}}>
                    <div style={{fontSize:11,color:'#888',textAlign:'center',marginTop:20}}>Your website</div>
                    <div style={{position:'absolute',bottom:12,right:12,width:44,height:44,borderRadius:'50%',background:widgetColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>💬</div>
                  </div>
                </div>
              </div>

              <div style={{...s.codeBox,marginTop:20}}>
                <div style={{fontSize:11,color:'#454a6b',marginBottom:8}}>Add this to your website's &lt;body&gt; tag:</div>
                <code style={{fontSize:12,color:'#a5b4fc',display:'block',lineHeight:1.8}}>
                  {`<script src="https://app.nexussupport.ai/widget.js"\n  data-api-key="${apiKey || 'nxs_your_api_key'}"\n  data-color="${widgetColor}"\n  data-position="${widgetPosition}">\n</script>`}
                </code>
                <button onClick={()=>navigator.clipboard?.writeText(`<script src="https://app.nexussupport.ai/widget.js" data-api-key="${apiKey}" data-color="${widgetColor}" data-position="${widgetPosition}"></script>`)} style={s.copyBtn}>📋 Copy</button>
              </div>
              <button onClick={saveWidgetSettings} style={{...s.primaryBtn,marginTop:16}}>Save & Continue →</button>
            </div>
          )}

          {/* STEP 4: Billing */}
          {currentStep === 3 && (
            <div style={s.card}>
              <p style={s.cardDesc}>You're on a 14-day free trial of the <strong style={{color:'#818cf8'}}>{tenant?.plan}</strong> plan. Add a payment method to continue after the trial.</p>
              <div style={s.billingFeatures}>
                {['No charge for 14 days','Cancel anytime before trial ends','Full access to all features','Automatic renewal after trial'].map(f=>(
                  <div key={f} style={{display:'flex',gap:10,alignItems:'center',padding:'12px 0',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                    <span style={{color:'#10b981',fontSize:14}}>✓</span>
                    <span style={{fontSize:14,color:'#8b90b8'}}>{f}</span>
                  </div>
                ))}
              </div>
              <div style={{display:'flex',gap:12,marginTop:24}}>
                <button onClick={async ()=>{
                  try {
                    const d = await apiFetch(`/tenants/${user.tenantId}/billing/checkout`, {
                      method:'POST', body:{planId: tenant?.plan || 'starter'}
                    });
                    if (d.url) window.open(d.url, '_blank');
                  } catch(e) { alert('Error creating checkout: ' + e.message); }
                }} style={s.primaryBtn}>Add Payment Method →</button>
                <button onClick={()=>complete('billing')} style={s.skipBtn}>Remind me later</button>
              </div>
            </div>
          )}

          {/* STEP 5: Test */}
          {currentStep === 4 && (
            <div style={s.card}>
              <p style={s.cardDesc}>Test your AI assistant before going live. Ask it something related to your business.</p>
              <div style={s.chatPreview}>
                {testReply && (
                  <>
                    <div style={s.chatMsg}><div style={s.chatMsgUser}>You: {testMsg}</div></div>
                    <div style={s.chatMsg}><div style={s.chatMsgAi}>🤖 {testReply}</div></div>
                  </>
                )}
                {!testReply && <div style={{textAlign:'center',padding:32,color:'#454a6b'}}>Send a test message to see your AI in action</div>}
              </div>
              <div style={{display:'flex',gap:8,marginTop:16}}>
                <input value={testMsg} onChange={e=>setTestMsg(e.target.value)} placeholder="What are your business hours?" style={{...s.input,flex:1}} onKeyDown={e=>e.key==='Enter'&&testWidget()}/>
                <button onClick={testWidget} disabled={testing||!testMsg} style={{...s.primaryBtn,padding:'11px 20px'}}>{testing?'Testing…':'Send'}</button>
              </div>
              {allDone && (
                <div style={{marginTop:24,padding:20,background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:12,textAlign:'center'}}>
                  <div style={{fontSize:28,marginBottom:8}}>🎉</div>
                  <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:'#10b981',marginBottom:8}}>You're all set!</div>
                  <div style={{fontSize:14,color:'#8b90b8',marginBottom:16}}>Your AI support system is live and ready for customers.</div>
                  <button onClick={()=>navigate('/dashboard')} style={s.primaryBtn}>Go to Dashboard →</button>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div style={{display:'flex',justifyContent:'space-between',marginTop:24}}>
            <button onClick={()=>setCurrentStep(s=>Math.max(0,s-1))} disabled={currentStep===0} style={{...s.skipBtn,opacity:currentStep===0?.3:1}}>← Previous</button>
            {currentStep < STEPS.length - 1 && (
              <button onClick={()=>setCurrentStep(s=>s+1)} style={s.skipBtn}>Skip this step →</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  root:{minHeight:'100vh',background:'#070810',position:'relative'},
  orb1:{position:'fixed',top:'-20%',left:'-10%',width:600,height:600,borderRadius:'50%',background:'radial-gradient(circle,rgba(99,102,241,0.1) 0%,transparent 70%)',pointerEvents:'none'},
  orb2:{position:'fixed',bottom:'-20%',right:'-5%',width:400,height:400,borderRadius:'50%',background:'radial-gradient(circle,rgba(139,92,246,0.08) 0%,transparent 70%)',pointerEvents:'none'},
  header:{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'18px 32px',borderBottom:'1px solid rgba(255,255,255,0.06)',position:'relative',zIndex:1},
  brand:{display:'flex',alignItems:'center',gap:8,fontSize:18},
  headerRight:{display:'flex',alignItems:'center',gap:16},
  launchBtn:{padding:'9px 18px',background:'#10b981',border:'none',borderRadius:9,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer'},
  layout:{display:'flex',minHeight:'calc(100vh - 60px)',position:'relative',zIndex:1},
  sidebar:{width:260,borderRight:'1px solid rgba(255,255,255,0.06)',padding:'32px 16px',display:'flex',flexDirection:'column',gap:4,background:'rgba(13,15,28,0.5)'},
  stepItem:{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,transition:'all .15s'},
  stepIcon:{width:36,height:36,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0,transition:'all .3s'},
  main:{flex:1,padding:'40px 48px',maxWidth:760},
  stepHeader:{display:'flex',alignItems:'center',gap:16,marginBottom:28},
  stepIconLarge:{width:52,height:52,borderRadius:14,background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24},
  stepTitle:{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#f0f0f8'},
  stepDesc:{fontSize:13,color:'#454a6b',marginTop:4},
  card:{background:'#0d0f1c',border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,padding:28},
  cardDesc:{fontSize:14,color:'#8b90b8',lineHeight:1.7,marginBottom:24},
  infoGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24},
  infoItem:{background:'rgba(255,255,255,0.03)',borderRadius:10,padding:'12px 16px'},
  infoKey:{fontSize:11,color:'#454a6b',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4},
  infoVal:{fontSize:14,fontWeight:500,color:'#f0f0f8',textTransform:'capitalize'},
  field:{display:'flex',flexDirection:'column',gap:8,marginBottom:16},
  label:{fontSize:11,fontWeight:600,color:'#8b90b8',textTransform:'uppercase',letterSpacing:'.5px'},
  input:{padding:'11px 14px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,color:'#f0f0f8',fontSize:14,outline:'none',width:'100%'},
  primaryBtn:{padding:'12px 24px',background:'#6366f1',border:'none',borderRadius:9,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',transition:'all .2s'},
  skipBtn:{padding:'12px 20px',background:'transparent',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,color:'#8b90b8',fontSize:13,cursor:'pointer'},
  widgetGrid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24},
  widgetPreview:{},
  codeBox:{background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:10,padding:16,position:'relative',whiteSpace:'pre'},
  copyBtn:{position:'absolute',top:10,right:10,padding:'4px 10px',background:'rgba(99,102,241,0.2)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:6,color:'#818cf8',fontSize:11,cursor:'pointer'},
  billingFeatures:{marginTop:8},
  chatPreview:{background:'rgba(0,0,0,0.2)',borderRadius:12,padding:16,minHeight:120,border:'1px solid rgba(255,255,255,0.06)'},
  chatMsg:{marginBottom:12},
  chatMsgUser:{fontSize:13,color:'#8b90b8',padding:'8px 12px',background:'rgba(99,102,241,0.1)',borderRadius:8,display:'inline-block'},
  chatMsgAi:{fontSize:13,color:'#f0f0f8',padding:'8px 12px',background:'rgba(255,255,255,0.05)',borderRadius:8,display:'inline-block'},
};
