import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../hooks/useApi';

export default function ApiKeys() {
  const { user } = useAuth();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { loadKeys(); }, [user]);

  const loadKeys = async () => {
    if (!user?.tenantId) return setLoading(false);
    try {
      const data = await apiFetch(`/tenants/${user.tenantId}/api-keys`);
      setKeys(data);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createKey = async () => {
    if (!newKeyName) return;
    setCreating(true);
    try {
      const data = await apiFetch(`/tenants/${user.tenantId}/api-keys`, {
        method: 'POST',
        body: { name: newKeyName, permissions: ['chat', 'knowledge', 'conversations'] },
      });
      setNewKey(data.rawKey);
      setNewKeyName('');
      loadKeys();
    } catch(e) { console.error(e); }
    finally { setCreating(false); }
  };

  const revokeKey = async (keyId) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await apiFetch(`/tenants/${user.tenantId}/api-keys/${keyId}`, { method: 'DELETE' });
      loadKeys();
    } catch(e) { console.error(e); }
  };

  const copyKey = () => {
    navigator.clipboard?.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{padding:'28px 32px',animation:'fadeUp .4s ease'}}>
      <div style={{marginBottom:28}}>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,color:'#f0f0f8'}}>API Keys</h1>
        <p style={{fontSize:13,color:'#454a6b',marginTop:5}}>Use API keys to authenticate the chat widget and API requests</p>
      </div>

      {/* New key alert */}
      {newKey && (
        <div style={{padding:20,background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.25)',borderRadius:14,marginBottom:24}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#10b981',marginBottom:8}}>✅ API Key Created — Copy it now!</div>
          <p style={{fontSize:13,color:'#8b90b8',marginBottom:14}}>This key will only be shown once. Store it securely.</p>
          <div style={{display:'flex',gap:10,alignItems:'center'}}>
            <code style={{flex:1,padding:'10px 14px',background:'rgba(0,0,0,0.3)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:8,fontSize:13,color:'#a5b4fc',fontFamily:'monospace',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{newKey}</code>
            <button onClick={copyKey} style={{padding:'10px 16px',background: copied?'rgba(16,185,129,0.15)':'rgba(99,102,241,0.15)',border:`1px solid ${copied?'rgba(16,185,129,0.3)':'rgba(99,102,241,0.3)'}`,borderRadius:8,color:copied?'#10b981':'#818cf8',fontSize:13,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
              {copied ? '✓ Copied!' : '📋 Copy Key'}
            </button>
            <button onClick={()=>setNewKey(null)} style={{padding:'10px',background:'transparent',border:'none',color:'#454a6b',cursor:'pointer',fontSize:18}}>✕</button>
          </div>
        </div>
      )}

      {/* Create new key */}
      <div style={{background:'#0d0f1c',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24,marginBottom:24}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#f0f0f8',marginBottom:16}}>Create New API Key</div>
        <div style={{display:'flex',gap:12}}>
          <input
            value={newKeyName} onChange={e=>setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Website Widget, Mobile App)"
            style={{flex:1,padding:'11px 14px',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,color:'#f0f0f8',fontSize:14,outline:'none'}}
            onKeyDown={e=>e.key==='Enter'&&createKey()}
          />
          <button onClick={createKey} disabled={creating||!newKeyName}
            style={{padding:'11px 20px',background:'#6366f1',border:'none',borderRadius:9,color:'#fff',fontSize:14,fontWeight:600,cursor:'pointer',opacity:creating||!newKeyName?.5:1}}>
            {creating?'Creating…':'+ Create Key'}
          </button>
        </div>
      </div>

      {/* Keys list */}
      <div style={{background:'#0d0f1c',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,overflow:'hidden'}}>
        <div style={{padding:'16px 24px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#f0f0f8'}}>Your API Keys</div>
          <div style={{fontSize:12,color:'#454a6b'}}>{keys.length} key{keys.length!==1?'s':''}</div>
        </div>

        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'#454a6b'}}>Loading…</div>
        ) : keys.length === 0 ? (
          <div style={{padding:48,textAlign:'center'}}>
            <div style={{fontSize:36,marginBottom:12}}>🔑</div>
            <div style={{fontSize:14,color:'#454a6b'}}>No API keys yet. Create one above to get started.</div>
          </div>
        ) : (
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr style={{borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.02)'}}>
                {['Name','Key','Permissions','Last Used','Created',''].map(h=>(
                  <th key={h} style={{padding:'10px 20px',textAlign:'left',fontSize:11,fontWeight:600,color:'#454a6b',textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k=>(
                <tr key={k.id} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <td style={{padding:'14px 20px',fontWeight:500,color:'#f0f0f8',fontSize:14}}>{k.name}</td>
                  <td style={{padding:'14px 20px'}}>
                    <code style={{fontSize:12,color:'#a5b4fc',background:'rgba(99,102,241,0.1)',padding:'4px 8px',borderRadius:6,fontFamily:'monospace'}}>{k.keyPrefix}</code>
                  </td>
                  <td style={{padding:'14px 20px'}}>
                    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                      {(k.permissions||[]).map(p=>(
                        <span key={p} style={{fontSize:11,padding:'2px 7px',borderRadius:99,background:'rgba(99,102,241,0.1)',color:'#818cf8',border:'1px solid rgba(99,102,241,0.2)'}}>{p}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{padding:'14px 20px',fontSize:13,color:'#454a6b'}}>{k.lastUsed ? new Date(k.lastUsed).toLocaleDateString() : 'Never'}</td>
                  <td style={{padding:'14px 20px',fontSize:13,color:'#454a6b'}}>{new Date(k.createdAt).toLocaleDateString()}</td>
                  <td style={{padding:'14px 20px'}}>
                    <button onClick={()=>revokeKey(k.id)} style={{padding:'6px 12px',background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:7,color:'#ef4444',fontSize:12,cursor:'pointer'}}>Revoke</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Widget embed guide */}
      <div style={{background:'#0d0f1c',border:'1px solid rgba(255,255,255,0.07)',borderRadius:14,padding:24,marginTop:24}}>
        <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:'#f0f0f8',marginBottom:12}}>📋 How to Use Your API Key</div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:'#8b90b8',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Chat Widget (website embed)</div>
            <div style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:14}}>
              <code style={{fontSize:12,color:'#a5b4fc',lineHeight:1.8,display:'block',whiteSpace:'pre'}}>{`<script src="https://app.nexussupport.ai/widget.js"\n  data-api-key="nxs_your_key_here"\n  data-color="#6366f1">\n</script>`}</code>
            </div>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:600,color:'#8b90b8',marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>REST API</div>
            <div style={{background:'rgba(0,0,0,0.3)',borderRadius:8,padding:14}}>
              <code style={{fontSize:12,color:'#a5b4fc',lineHeight:1.8,display:'block',whiteSpace:'pre'}}>{`curl -X POST https://veanixmvft.us-east-1.awsapprunner.com/api/widget/chat \\\n  -H "X-API-Key: nxs_your_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"message": "What are your hours?"}'`}</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
