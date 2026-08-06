import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../hooks/useApi';
import { useNavigate } from 'react-router-dom';

// ── DESIGN TOKENS ──────────────────────────────────────────────
const C = {
  bg:'#070810', bg2:'#0d0f1c', bg3:'#12152a', bg4:'#181c35',
  border:'rgba(255,255,255,0.06)', border2:'rgba(255,255,255,0.10)',
  text:'#f0f0f8', text2:'#8b90b8', text3:'#454a6b',
  accent:'#6366f1', accent2:'#818cf8', accent3:'#a5b4fc',
  green:'#10b981', orange:'#f59e0b', red:'#ef4444', blue:'#3b82f6', cyan:'#06b6d4', pink:'#ec4899',
};

// Demo tenants show sample data, real tenants show only their own data
const DEMO_TENANTS = ['tenant_a', 'tenant_b', 'tenant_c'];
const isDemo = (tenantId) => DEMO_TENANTS.includes(tenantId);

// ── SHARED COMPONENTS ──────────────────────────────────────────
function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:28}}>
      <div>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:22,fontWeight:700,letterSpacing:'-0.5px',color:C.text}}>{title}</h1>
        {subtitle && <p style={{fontSize:13,color:C.text3,marginTop:5}}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function Card({ children, style, onClick }) {
  return (
    <div onClick={onClick} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:'20px 22px',transition:'all .2s',cursor:onClick?'pointer':'default',...style}}
      onMouseOver={e=>{ if(onClick) e.currentTarget.style.borderColor=C.border2; }}
      onMouseOut={e=>{ if(onClick) e.currentTarget.style.borderColor=C.border; }}>
      {children}
    </div>
  );
}

function StatCard({ icon, label, value, color, sub, trend }) {
  return (
    <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:'20px 22px',position:'relative',overflow:'hidden'}}>
      <div style={{position:'absolute',top:16,right:16,width:36,height:36,background:`${color}14`,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>{icon}</div>
      <div style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:'uppercase',letterSpacing:'.6px',marginBottom:10}}>{label}</div>
      <div style={{fontFamily:'Syne,sans-serif',fontSize:32,fontWeight:800,color,letterSpacing:'-1px',marginBottom:6}}>{value}</div>
      {sub && <div style={{fontSize:12,color:C.text3}}>{sub}</div>}
      {trend && <div style={{position:'absolute',bottom:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${color}33,${color})`}}/>}
    </div>
  );
}

function PrimaryBtn({ children, onClick, style }) {
  return (
    <button onClick={onClick} style={{padding:'9px 18px',background:C.accent,border:'none',borderRadius:9,color:'#fff',fontSize:13,fontWeight:600,cursor:'pointer',transition:'all .2s',...style}}
      onMouseOver={e=>e.currentTarget.style.background=C.accent2}
      onMouseOut={e=>e.currentTarget.style.background=C.accent}>
      {children}
    </button>
  );
}

function Badge({ children, color }) {
  return (
    <span style={{display:'inline-flex',alignItems:'center',padding:'3px 9px',borderRadius:99,fontSize:11,fontWeight:600,background:`${color}18`,color,border:`1px solid ${color}30`}}>
      {children}
    </span>
  );
}

const STATUS_COLOR = { open:C.blue, resolved:C.green, pending:C.orange, escalated:C.red };
const CHANNEL_ICON = { chat:'💬', voice:'📞', email:'📧' };
const SENTIMENT_ICON = { positive:'😊', neutral:'😐', negative:'😟' };

// ── DASHBOARD ─────────────────────────────────────────────────
export function Dashboard() {
  const { user, tenant } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.tenantId) return setLoading(false);
    apiFetch(`/tenants/${user.tenantId}/dashboard`).then(setStats).catch(console.error).finally(()=>setLoading(false));
  }, [user]);

  const maxBar = stats ? Math.max(...stats.last7Days.map(d=>d.count), 1) : 1;

  return (
    <div style={{padding:'28px 32px',animation:'fadeUp .4s ease'}}>
      <PageHeader
        title="Dashboard"
        subtitle={`Good day, ${user?.name?.split(' ')[0]} · ${tenant?.name || 'Platform'}`}
        action={<PrimaryBtn onClick={()=>navigate('/conversations')}>+ New Conversation</PrimaryBtn>}
      />

      {loading ? (
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
          {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:110,borderRadius:14}}/>)}
        </div>
      ) : stats ? (
        <div style={{display:'flex',flexDirection:'column',gap:22}}>
          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16}}>
            <StatCard icon="💬" label="Active Today" value={stats.activeToday} color={C.blue} sub={`${stats.totalConversations} total`} trend />
            <StatCard icon="✅" label="Resolved Today" value={stats.resolvedToday} color={C.green} sub="All channels" trend />
            <StatCard icon="🤖" label="AI Resolution" value={`${stats.aiResolutionRate}%`} color={C.accent2} sub="Auto-handled" trend />
            <StatCard icon="⭐" label="Avg CSAT" value={stats.avgCsat} color={C.orange} sub="Customer score" trend />
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:20}}>
            {/* Chart */}
            <Card>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:20,color:C.text}}>Last 7 Days</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:8,height:100}}>
                {stats.last7Days.map((d,i)=>(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                    <div style={{width:'100%',borderRadius:'4px 4px 0 0',background:`linear-gradient(to top,${C.accent},${C.accent2})`,opacity:.4+i*.08,height:`${Math.max((d.count/maxBar)*100,4)}%`,minHeight:4,transition:'height .6s ease'}}/>
                    <div style={{fontSize:10,color:C.text3}}>{d.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Channel breakdown */}
            <Card>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:18,color:C.text}}>Channels</div>
              <div style={{display:'flex',flexDirection:'column',gap:14}}>
                {Object.entries(stats.byChannel||{}).map(([ch,cnt])=>{
                  const total = Object.values(stats.byChannel).reduce((a,b)=>a+b,0);
                  const pct = total ? Math.round((cnt/total)*100) : 0;
                  const colors = {chat:C.blue,voice:C.orange,email:C.cyan};
                  return (
                    <div key={ch}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:13,marginBottom:7}}>
                        <span style={{color:C.text2,display:'flex',alignItems:'center',gap:6}}><span>{CHANNEL_ICON[ch]}</span>{ch.charAt(0).toUpperCase()+ch.slice(1)}</span>
                        <span style={{fontWeight:600,color:colors[ch]||C.accent}}>{pct}%</span>
                      </div>
                      <div style={{height:5,background:C.bg4,borderRadius:99,overflow:'hidden'}}>
                        <div style={{width:`${pct}%`,height:'100%',background:colors[ch]||C.accent,borderRadius:99,transition:'width .6s ease'}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
            {/* Sentiment */}
            <Card>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:18,color:C.text}}>Sentiment</div>
              <div style={{display:'flex',gap:12}}>
                {[{k:'positive',icon:'😊',color:C.green,label:'Positive'},{k:'neutral',icon:'😐',color:C.orange,label:'Neutral'},{k:'negative',icon:'😟',color:C.red,label:'Negative'}].map(s=>(
                  <div key={s.k} style={{flex:1,background:C.bg3,borderRadius:12,padding:'16px',textAlign:'center'}}>
                    <div style={{fontSize:26,marginBottom:8}}>{s.icon}</div>
                    <div style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:800,color:s.color}}>{stats.sentimentBreakdown?.[s.k]||0}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:4,textTransform:'uppercase',letterSpacing:'.5px'}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick actions */}
            <Card>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:14,color:C.text}}>Quick Actions</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[{icon:'💬',label:'All conversations',to:'/conversations'},{icon:'🤖',label:'Manage AI agents',to:'/agents'},{icon:'📈',label:'View analytics',to:'/analytics'},{icon:'📚',label:'Knowledge base',to:'/knowledge'}].map(a=>(
                  <button key={a.to} onClick={()=>navigate(a.to)} style={{display:'flex',alignItems:'center',gap:12,padding:'11px 14px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,cursor:'pointer',color:C.text2,fontSize:13.5,textAlign:'left',transition:'all .15s'}}
                    onMouseOver={e=>{e.currentTarget.style.borderColor=C.border2;e.currentTarget.style.color=C.text;}}
                    onMouseOut={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.text2;}}>
                    <span style={{fontSize:17}}>{a.icon}</span>{a.label}<span style={{marginLeft:'auto',color:C.text3,fontSize:12}}>→</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : <div style={{padding:40,textAlign:'center',color:C.text3}}>No data available.</div>}
    </div>
  );
}

// ── CONVERSATIONS ─────────────────────────────────────────────
export function Conversations() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [selected, setSelected] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filters, setFilters] = useState({ status:'all', channel:'all', search:'' });
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    if (!user?.tenantId) return setLoading(false);
    setLoading(true);
    const q = new URLSearchParams({ page, limit:20, ...filters }).toString();
    apiFetch(`/tenants/${user.tenantId}/conversations?${q}`)
      .then(d=>{ setList(d.conversations||[]); setTotal(d.total||0); setPages(d.pages||1); })
      .catch(console.error).finally(()=>setLoading(false));
  }, [user, page, filters]);

  useEffect(()=>{ load(); }, [load]);

  const openDetail = async (conv) => {
    setSelected(conv.id); setDetailLoading(true);
    try { setDetail(await apiFetch(`/tenants/${user.tenantId}/conversations/${conv.id}`)); }
    catch(e){ console.error(e); } finally { setDetailLoading(false); }
  };

  const filterBtns = ['all','open','resolved','pending','escalated'];

  return (
    <div style={{display:'flex',height:'100%',overflow:'hidden'}}>
      {/* List */}
      <div style={{width:detail?380:'100%',borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',overflow:'hidden',transition:'width .2s'}}>
        <div style={{padding:'20px 20px 0',flexShrink:0,borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
            <div>
              <h1 style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:C.text}}>Conversations</h1>
              <p style={{fontSize:12,color:C.text3,marginTop:3}}>{total} total</p>
            </div>
          </div>
          <form onSubmit={e=>{e.preventDefault();setFilters(f=>({...f,search}));setPage(1);}} style={{display:'flex',gap:8,marginBottom:12}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name or subject…"
              style={{flex:1,padding:'8px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,outline:'none'}}
              onFocus={e=>e.target.style.borderColor='rgba(99,102,241,0.4)'} onBlur={e=>e.target.style.borderColor=C.border}/>
            <button type="submit" style={{padding:'8px 14px',background:C.accent,border:'none',borderRadius:8,color:'#fff',fontSize:13,cursor:'pointer'}}>Search</button>
          </form>
          <div style={{display:'flex',gap:6,paddingBottom:14,flexWrap:'wrap'}}>
            {filterBtns.map(s=>(
              <button key={s} onClick={()=>{setFilters(f=>({...f,status:s}));setPage(1);}}
                style={{padding:'4px 12px',borderRadius:99,border:'1px solid',fontSize:12,cursor:'pointer',background:filters.status===s?C.accent:'transparent',borderColor:filters.status===s?C.accent:C.border,color:filters.status===s?'#fff':C.text3,fontWeight:filters.status===s?600:400,transition:'all .15s'}}>
                {s.charAt(0).toUpperCase()+s.slice(1)}
              </button>
            ))}
            <div style={{marginLeft:'auto',display:'flex',gap:4}}>
              {['all','chat','voice','email'].map(c=>(
                <button key={c} onClick={()=>{setFilters(f=>({...f,channel:c}));setPage(1);}}
                  style={{padding:'4px 10px',borderRadius:8,border:`1px solid ${filters.channel===c?C.border2:'transparent'}`,fontSize:11,cursor:'pointer',background:filters.channel===c?C.bg4:'transparent',color:C.text2}}>
                  {CHANNEL_ICON[c]||'•'} {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{flex:1,overflowY:'auto'}}>
          {loading ? [1,2,3,4,5].map(i=><div key={i} className="skeleton" style={{height:74,borderRadius:0,margin:'0',borderBottom:`1px solid ${C.border}`}}/>) :
            list.length===0 ? <div style={{padding:40,textAlign:'center',color:C.text3,fontSize:14}}>No conversations found</div> :
            list.map(conv=>(
              <div key={conv.id} onClick={()=>openDetail(conv)}
                style={{padding:'14px 20px',borderBottom:`1px solid ${C.border}`,cursor:'pointer',transition:'background .1s',background:selected===conv.id?'rgba(99,102,241,0.07)':'transparent',borderLeft:`3px solid ${selected===conv.id?C.accent:'transparent'}`}}
                onMouseOver={e=>{ if(selected!==conv.id) e.currentTarget.style.background='rgba(255,255,255,0.02)'; }}
                onMouseOut={e=>{ if(selected!==conv.id) e.currentTarget.style.background='transparent'; }}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontWeight:500,fontSize:13.5,color:C.text}}>{conv.customer?.name}</span>
                  <span style={{fontSize:11,color:C.text3}}>{relTime(conv.updatedAt)}</span>
                </div>
                <div style={{fontSize:12.5,color:C.text2,marginBottom:7,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{conv.subject}</div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  <Badge color={STATUS_COLOR[conv.status]||C.text3}>{conv.status}</Badge>
                  <span style={{fontSize:13}}>{CHANNEL_ICON[conv.channel]}</span>
                  <span style={{fontSize:13}}>{SENTIMENT_ICON[conv.sentiment]}</span>
                  {conv.aiResolved && <Badge color={C.accent2}>AI</Badge>}
                  {conv.csatScore && <span style={{fontSize:11,color:C.orange,marginLeft:'auto'}}>★ {conv.csatScore}</span>}
                </div>
              </div>
            ))
          }
        </div>

        {pages>1 && (
          <div style={{padding:'12px 20px',borderTop:`1px solid ${C.border}`,display:'flex',gap:8,justifyContent:'center',alignItems:'center'}}>
            <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} style={{padding:'6px 14px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text2,fontSize:12,cursor:'pointer'}}>‹ Prev</button>
            <span style={{fontSize:12,color:C.text3}}>Page {page} of {pages}</span>
            <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages} style={{padding:'6px 14px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text2,fontSize:12,cursor:'pointer'}}>Next ›</button>
          </div>
        )}
      </div>

      {/* Detail */}
      {detail && (
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',animation:'fadeIn .2s ease'}}>
          <div style={{padding:'16px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',gap:14,background:C.bg2,flexShrink:0}}>
            <button onClick={()=>{setDetail(null);setSelected(null);}} style={{background:'none',border:'none',color:C.text2,fontSize:18,cursor:'pointer',padding:4}}>←</button>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:15,fontWeight:700,color:C.text}}>{detail.customer?.name}</div>
              <div style={{fontSize:12,color:C.text2,marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{detail.subject}</div>
            </div>
            <Badge color={STATUS_COLOR[detail.status]||C.text3}>{detail.status}</Badge>
            <span style={{fontSize:16}}>{CHANNEL_ICON[detail.channel]}</span>
          </div>

          <div style={{padding:'12px 24px',borderBottom:`1px solid ${C.border}`,display:'flex',gap:24,flexWrap:'wrap',background:C.bg2,flexShrink:0}}>
            {[['Email',detail.customer?.email],['Channel',CHANNEL_ICON[detail.channel]+' '+detail.channel],['Sentiment',SENTIMENT_ICON[detail.sentiment]+' '+detail.sentiment],['CSAT',detail.csatScore?'★ '+detail.csatScore:'—'],['AI',detail.aiResolved?'✅ Yes':'👤 Human']].map(([k,v])=>(
              <div key={k}><div style={{fontSize:10,color:C.text3,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:3}}>{k}</div><div style={{fontSize:13,fontWeight:500,color:C.text}}>{v}</div></div>
            ))}
          </div>

          <div style={{flex:1,overflowY:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:14}}>
            {detailLoading ? <div style={{color:C.text3,padding:20,textAlign:'center'}}>Loading messages…</div> :
              detail.messages?.map(msg=>(
                <div key={msg.id} style={{display:'flex',gap:10,flexDirection:msg.role==='customer'?'row-reverse':'row',maxWidth:'80%',alignSelf:msg.role==='customer'?'flex-end':'flex-start'}}>
                  <div style={{width:30,height:30,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,background:msg.role==='customer'?C.accent:msg.role==='system'?C.bg4:'rgba(99,102,241,0.15)',color:msg.role==='customer'?'#fff':msg.role==='system'?C.text3:C.accent2}}>
                    {msg.role==='customer'?detail.customer?.name?.[0]:msg.role==='system'?'⚙':'🤖'}
                  </div>
                  <div>
                    {msg.role==='ai' && <div style={{fontSize:10,fontWeight:700,color:C.accent2,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>{msg.agentType||'resolution'} agent · {msg.ragChunksUsed>0?`${msg.ragChunksUsed} KB chunks`:'no RAG'}</div>}
                    {msg.role==='system' && <div style={{fontSize:10,fontWeight:700,color:C.text3,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:4}}>System</div>}
                    <div style={{padding:'10px 14px',borderRadius:12,fontSize:13.5,lineHeight:1.65,background:msg.role==='customer'?C.accent:msg.role==='system'?C.bg3:'rgba(99,102,241,0.1)',color:msg.role==='customer'?'#fff':C.text,border:msg.role!=='customer'?`1px solid ${C.border}`:'none',borderTopRightRadius:msg.role==='customer'?4:12,borderTopLeftRadius:msg.role!=='customer'?4:12}}>
                      {msg.content}
                    </div>
                    <div style={{fontSize:11,color:C.text3,marginTop:4,textAlign:msg.role==='customer'?'right':'left'}}>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── TICKETS ────────────────────────────────────────────────────
export function Tickets() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    if (!user?.tenantId) return setLoading(false);
    apiFetch(`/tenants/${user.tenantId}/conversations?limit=50`).then(d=>setList(d.conversations||[])).catch(console.error).finally(()=>setLoading(false));
  }, [user]);

  return (
    <div style={{padding:'28px 32px',animation:'fadeUp .4s ease'}}>
      <PageHeader title="Tickets" subtitle={`${list.length} tickets`} action={<PrimaryBtn>+ Create Ticket</PrimaryBtn>}/>
      <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,overflow:'hidden'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13.5}}>
          <thead>
            <tr style={{borderBottom:`1px solid ${C.border}`,background:C.bg3}}>
              {['Customer','Subject','Channel','Status','Sentiment','Created','CSAT'].map(h=>(
                <th key={h} style={{padding:'12px 18px',textAlign:'left',fontWeight:600,color:C.text3,fontSize:11,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7} style={{padding:40,textAlign:'center',color:C.text3}}>Loading…</td></tr> :
              list.map(c=>(
                <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`,transition:'background .1s',cursor:'pointer'}}
                  onMouseOver={e=>e.currentTarget.style.background=C.bg3} onMouseOut={e=>e.currentTarget.style.background=''}>
                  <td style={{padding:'12px 18px',fontWeight:500,color:C.text}}>{c.customer?.name}</td>
                  <td style={{padding:'12px 18px',color:C.text2,maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.subject}</td>
                  <td style={{padding:'12px 18px',color:C.text2}}>{CHANNEL_ICON[c.channel]} {c.channel}</td>
                  <td style={{padding:'12px 18px'}}><Badge color={STATUS_COLOR[c.status]||C.text3}>{c.status}</Badge></td>
                  <td style={{padding:'12px 18px',fontSize:16}}>{SENTIMENT_ICON[c.sentiment]}</td>
                  <td style={{padding:'12px 18px',color:C.text3,fontSize:12}}>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td style={{padding:'12px 18px',color:C.orange}}>{c.csatScore?`★ ${c.csatScore}`:'—'}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── AGENTS ─────────────────────────────────────────────────────
const AGENT_CFG = {
  triage:     {icon:'🎯',color:'#10b981',role:'Intent · Priority · Routing'},
  resolution: {icon:'🔍',color:'#3b82f6',role:'RAG · KB Search · Actions'},
  voice:      {icon:'📞',color:'#f59e0b',role:'STT → LLM → TTS'},
  escalation: {icon:'⬆️',color:'#ef4444',role:'Sentiment · Human Handoff'},
  outreach:   {icon:'📧',color:'#06b6d4',role:'Follow-ups · CSAT Surveys'},
  billing:    {icon:'💰',color:'#8b5cf6',role:'Payments · Refunds'},
};

export function Agents() {
  const { user } = useAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const demo = isDemo(user?.tenantId);

  useEffect(()=>{
    if (!user?.tenantId) return setLoading(false);
    apiFetch(`/tenants/${user.tenantId}/agents`).then(setAgents).catch(console.error).finally(()=>setLoading(false));
  }, [user]);

  return (
    <div style={{padding:'28px 32px',animation:'fadeUp .4s ease'}}>
      <PageHeader title="AI Agents" subtitle="Autonomous agents powered by Claude API" action={<PrimaryBtn>+ Deploy Agent</PrimaryBtn>}/>
      {loading ? <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>{[1,2,3].map(i=><div key={i} className="skeleton" style={{height:180,borderRadius:14}}/>)}</div> :
        agents.length===0 ? (
          <div style={{padding:60,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>🤖</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>No AI agents yet</div>
            <div style={{fontSize:14,color:C.text3,marginBottom:24}}>AI agents will be automatically configured as your tenants start receiving conversations.</div>
            <PrimaryBtn>+ Deploy Agent</PrimaryBtn>
          </div>
        ) :
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          {agents.map(a=>{
            const cfg = AGENT_CFG[a.type]||{icon:'🤖',color:C.accent2,role:a.type};
            const statusColor = a.status==='online'?C.green:a.status==='busy'?C.orange:C.text3;
            return (
              <div key={a.id} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:14,padding:22,transition:'all .2s'}}
                onMouseOver={e=>e.currentTarget.style.borderColor=C.border2} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
                  <div style={{width:46,height:46,borderRadius:13,background:`${cfg.color}14`,border:`1px solid ${cfg.color}25`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>{cfg.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:C.text}}>{a.name}</div>
                    <div style={{fontSize:12,color:C.text3,marginTop:2}}>{cfg.role}</div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:5}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:statusColor,boxShadow:`0 0 6px ${statusColor}`}}/>
                    <span style={{fontSize:10,color:statusColor,textTransform:'capitalize'}}>{a.status}</span>
                  </div>
                </div>
                <div style={{display:'flex',gap:8,marginBottom:14}}>
                  {[{v:a.activeChats,l:'Active'},{v:a.resolvedToday,l:'Today'},{v:a.accuracy+'%',l:'Accuracy'}].map(m=>(
                    <div key={m.l} style={{flex:1,background:C.bg3,borderRadius:9,padding:'10px 6px',textAlign:'center'}}>
                      <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:800,color:cfg.color}}>{m.v}</div>
                      <div style={{fontSize:10,color:C.text3,marginTop:2,textTransform:'uppercase',letterSpacing:'.4px'}}>{m.l}</div>
                    </div>
                  ))}
                </div>
                <div style={{height:3,background:C.bg4,borderRadius:99,overflow:'hidden'}}>
                  <div style={{width:`${Math.min((a.activeChats/15)*100,100)}%`,height:'100%',background:cfg.color,borderRadius:99,transition:'width .6s'}}/>
                </div>
              </div>
            );
          })}
        </div>
      }
    </div>
  );
}

// ── ANALYTICS ─────────────────────────────────────────────────
export function Analytics() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(()=>{
    if (!user?.tenantId) return setLoading(false);
    apiFetch(`/tenants/${user.tenantId}/analytics`).then(setData).catch(console.error).finally(()=>setLoading(false));
  }, [user]);
  const maxM = data ? Math.max(...data.monthly.map(m=>m.total),1) : 1;

  return (
    <div style={{padding:'28px 32px',animation:'fadeUp .4s ease'}}>
      <PageHeader title="Analytics" subtitle="Performance trends and insights"/>
      {loading ? <div className="skeleton" style={{height:400,borderRadius:14}}/> : !data ? (
        <Card>
          <div style={{padding:60,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>📈</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>No analytics yet</div>
            <div style={{fontSize:14,color:C.text3}}>Analytics will appear here once your customers start using the chat widget.</div>
          </div>
        </Card>
      ) : data.monthly.every(m=>m.total===0) ? (
        <Card>
          <div style={{padding:60,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>📈</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>No data yet</div>
            <div style={{fontSize:14,color:C.text3}}>Start conversations with customers to see analytics here.</div>
          </div>
        </Card>
      ) : data && (
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
            <StatCard icon="⏱" label="Avg Resolution Time" value={`${data.avgResolutionTimeHours}h`} color={C.cyan} sub="First response" trend/>
            <StatCard icon="🎯" label="First Contact Resolution" value={`${data.firstContactResolution}%`} color={C.green} sub="Resolved in one contact" trend/>
            <StatCard icon="🤖" label="AI vs Human" value="87%" color={C.accent2} sub="AI-handled conversations" trend/>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:20}}>
            <Card>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:20,color:C.text}}>Monthly Volume</div>
              <div style={{display:'flex',alignItems:'flex-end',gap:8,height:120}}>
                {data.monthly.map((m,i)=>(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                    <div style={{width:'100%',borderRadius:'4px 4px 0 0',background:`linear-gradient(to top,${C.accent},${C.accent2})`,opacity:.35+i*.12,height:`${Math.max((m.total/maxM)*100,4)}%`,minHeight:4,transition:'height .6s'}}/>
                    <div style={{fontSize:10,color:C.text3}}>{m.label}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:18,color:C.text}}>Top Issues</div>
              <div style={{display:'flex',flexDirection:'column',gap:13}}>
                {data.topIssues.map((t,i)=>{
                  const pct = Math.round((t.count/data.topIssues[0].count)*100);
                  return (
                    <div key={i}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:5}}>
                        <span style={{color:C.text2}}>{t.label}</span>
                        <span style={{fontWeight:600,color:C.text}}>{t.count}</span>
                      </div>
                      <div style={{height:4,background:C.bg4,borderRadius:99,overflow:'hidden'}}>
                        <div style={{width:`${pct}%`,height:'100%',background:C.accent,borderRadius:99}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ── VOICE ──────────────────────────────────────────────────────
const DEMO_CALLS = [
  {id:1,name:'James Mitchell',num:'+1 (555) 234-5678',dur:'4:32',transcript:'[AI] I understand your subscription renewal didn\'t process. Let me check your account…\n[Customer] Yes, I was charged twice.',pipeline:'Deepgram → Claude → ElevenLabs',status:'open'},
  {id:2,name:'Priya Nair',num:'+44 7700 900123',dur:'2:18',transcript:'[AI] Your return has been approved. Refund of £42.99 in 3–5 business days.\n[Customer] Perfect, thank you!',pipeline:'Deepgram → Claude → AWS Polly',status:'resolved'},
  {id:3,name:'Robert Barnes',num:'+1 (555) 876-5432',dur:'7:05',transcript:'⚠ High frustration detected (score: 0.87). Routing to Level 2 human agent.',pipeline:'Escalation Agent → Human',status:'escalated'},
];

export function Voice() {
  const { user } = useAuth();
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const demo = isDemo(user?.tenantId);

  useEffect(() => {
    if (!user?.tenantId) return setLoading(false);
    if (demo) {
      // Show demo data for demo tenants
      setCalls(DEMO_CALLS);
      setStats({ total: 48, aiResolved: 39, avgDuration: '3:42', escalations: 9 });
      setLoading(false);
      return;
    }
    apiFetch(`/tenants/${user.tenantId}/conversations?channel=voice&limit=10`)
      .then(d => {
        setCalls(d.conversations || []);
        setStats({
          total: d.total || 0,
          aiResolved: (d.conversations||[]).filter(c=>c.aiResolved).length,
          avgDuration: '—',
          escalations: (d.conversations||[]).filter(c=>c.status==='escalated').length,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return (
    <div style={{padding:'28px 32px'}}>
      <PageHeader title="Voice Calls" subtitle="Live AI voice pipeline · STT → LLM → TTS" action={<PrimaryBtn>📞 Outbound Call</PrimaryBtn>}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        {[1,2,3,4].map(i=><div key={i} className="skeleton" style={{height:180,borderRadius:14}}/>)}
      </div>
    </div>
  );

  return (
    <div style={{padding:'28px 32px',animation:'fadeUp .4s ease'}}>
      <PageHeader title="Voice Calls" subtitle="Live AI voice pipeline · STT → LLM → TTS" action={<PrimaryBtn>📞 Outbound Call</PrimaryBtn>}/>

      {calls.length === 0 ? (
        <Card>
          <div style={{padding:60,textAlign:'center'}}>
            <div style={{fontSize:48,marginBottom:16}}>📞</div>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:C.text,marginBottom:8}}>No voice calls yet</div>
            <div style={{fontSize:14,color:C.text3,marginBottom:24,maxWidth:400,margin:'0 auto 24px'}}>
              Voice calls will appear here when customers call your AI support line. Configure your Twilio number in Settings to get started.
            </div>
          </div>
        </Card>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
          {calls.map(call=>{
            const name = call.name || call.customer?.name || 'Unknown';
            const num = call.num || call.customer?.email || '';
            const dur = call.dur || '—';
            const transcript = call.transcript || call.subject || '';
            const pipeline = call.pipeline || 'Deepgram → Claude → ElevenLabs';
            const escalated = call.status === 'escalated';
            return (
              <Card key={call.id}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
                  <div style={{width:44,height:44,borderRadius:13,background:escalated?'rgba(239,68,68,.12)':'rgba(245,158,11,.12)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:15,color:escalated?C.red:C.orange}}>
                    {name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontFamily:'Syne,sans-serif',fontSize:14,fontWeight:700,color:C.text}}>{name}</div>
                    <div style={{fontSize:12,color:C.text3,marginTop:2}}>{num}</div>
                  </div>
                  <Badge color={escalated?C.red:call.status==='resolved'?C.green:C.orange}>
                    {escalated?'⚠ Escalated':call.status==='resolved'?'✅ Resolved':`🔴 ${dur}`}
                  </Badge>
                </div>
                {!escalated && (
                  <div style={{display:'flex',alignItems:'flex-end',gap:2,height:24,marginBottom:14}}>
                    {Array.from({length:12},(_,i)=>(
                      <div key={i} style={{width:3,borderRadius:99,background:C.accent,animation:`wave ${.5+i*.07}s ease-in-out infinite`,animationDelay:`${i*.05}s`}}/>
                    ))}
                  </div>
                )}
                <div style={{background:C.bg3,borderRadius:9,padding:12,fontSize:12,lineHeight:1.7,color:C.text2,marginBottom:12,whiteSpace:'pre-line',maxHeight:72,overflow:'hidden'}}>{transcript}</div>
                <div style={{fontSize:11,color:C.text3,marginBottom:12}}>Pipeline: <span style={{color:C.text2}}>{pipeline}</span></div>
                <div style={{display:'flex',gap:8}}>
                  {['🔇 Mute','↗ Transfer','✕ End'].map((b,i)=>(
                    <button key={b} style={{flex:1,padding:8,borderRadius:8,border:'1px solid',cursor:'pointer',fontSize:12,fontWeight:600,background:i===2?'rgba(239,68,68,.08)':'rgba(59,130,246,.08)',borderColor:i===2?'rgba(239,68,68,.2)':'rgba(59,130,246,.2)',color:i===2?C.red:C.blue}}>{b}</button>
                  ))}
                </div>
              </Card>
            );
          })}
          {stats && (
            <Card>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:18,color:C.text}}>
                {demo?'Today\'s Call Stats':'Call Stats'}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[{v:stats.total,l:'Total Calls',c:C.orange},{v:stats.aiResolved,l:'AI Resolved',c:C.green},{v:stats.avgDuration||'—',l:'Avg Duration',c:C.blue},{v:stats.escalations,l:'Escalations',c:C.red}].map(m=>(
                  <div key={m.l} style={{background:C.bg3,borderRadius:10,padding:'16px'}}>
                    <div style={{fontFamily:'Syne,sans-serif',fontSize:28,fontWeight:800,color:m.c,letterSpacing:'-1px'}}>{m.v}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:5,textTransform:'uppercase',letterSpacing:'.5px'}}>{m.l}</div>
                  </div>
                ))}
              </div>
              {demo && <div style={{fontSize:11,color:C.text3,marginTop:12,textAlign:'center'}}>📊 Sample data for demonstration</div>}
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ── KNOWLEDGE ──────────────────────────────────────────────────
export function Knowledge() {
  const { user } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [docName, setDocName] = useState('');
  const [docContent, setDocContent] = useState('');
  const [uploadMsg, setUploadMsg] = useState('');

  const loadDocs = () => {
    if (!user?.tenantId) return setLoading(false);
    apiFetch(`/tenants/${user.tenantId}/knowledge`)
      .then(setDocs).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { loadDocs(); }, [user]);

  const upload = async () => {
    if (!docName || !docContent) return;
    setUploading(true); setUploadMsg('');
    try {
      await apiFetch(`/tenants/${user.tenantId}/knowledge/upload`, {
        method: 'POST', body: { name: docName, content: docContent },
      });
      setUploadMsg('✅ Document uploaded and indexing started!');
      setDocName(''); setDocContent('');
      setTimeout(() => { setShowUpload(false); setUploadMsg(''); loadDocs(); }, 2000);
    } catch(e) {
      setUploadMsg('❌ Upload failed: ' + e.message);
    } finally { setUploading(false); }
  };

  const deleteDoc = async (docId) => {
    if (!confirm('Delete this document?')) return;
    await apiFetch(`/tenants/${user.tenantId}/knowledge/${docId}`, { method: 'DELETE' });
    loadDocs();
  };

  return (
    <div style={{padding:'28px 32px',animation:'fadeUp .4s ease'}}>
      <PageHeader title="Knowledge Base" subtitle="Per-tenant documents · Vector search · RAG pipeline"
        action={<PrimaryBtn onClick={()=>setShowUpload(s=>!s)}>+ Upload Document</PrimaryBtn>}/>

      {/* Upload form */}
      {showUpload && (
        <Card style={{marginBottom:20,border:`1px solid ${C.accent}33`}}>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:16,color:C.text}}>Upload New Document</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            <div>
              <label style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:6}}>Document Name</label>
              <input value={docName} onChange={e=>setDocName(e.target.value)} placeholder="e.g. FAQ, Return Policy, Menu"
                style={{width:'100%',padding:'10px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,outline:'none'}}/>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:600,color:C.text3,textTransform:'uppercase',letterSpacing:'.5px',display:'block',marginBottom:6}}>Content</label>
              <textarea value={docContent} onChange={e=>setDocContent(e.target.value)} placeholder="Paste your FAQ, policies, menu, or any content here..."
                style={{width:'100%',padding:'10px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:13,outline:'none',height:140,resize:'vertical'}}/>
            </div>
            {uploadMsg && <div style={{fontSize:13,color:uploadMsg.startsWith('✅')?C.green:C.red}}>{uploadMsg}</div>}
            <div style={{display:'flex',gap:10}}>
              <PrimaryBtn onClick={upload} style={{opacity:uploading||!docName||!docContent?.5:1}}>
                {uploading?'Uploading & Indexing…':'Upload Document'}
              </PrimaryBtn>
              <button onClick={()=>setShowUpload(false)} style={{padding:'9px 16px',background:'transparent',border:`1px solid ${C.border}`,borderRadius:9,color:C.text2,fontSize:13,cursor:'pointer'}}>Cancel</button>
            </div>
          </div>
        </Card>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1.5fr 1fr',gap:20}}>
        <Card>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:16,color:C.text}}>
            Documents ({docs.length})
          </div>
          {loading ? (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[1,2,3].map(i=><div key={i} className="skeleton" style={{height:60,borderRadius:10}}/>)}
            </div>
          ) : docs.length === 0 ? (
            <div style={{padding:40,textAlign:'center'}}>
              <div style={{fontSize:36,marginBottom:12}}>📚</div>
              <div style={{fontSize:14,color:C.text3,marginBottom:16}}>No documents yet</div>
              <div style={{fontSize:13,color:C.text3}}>Upload your FAQs, policies, or product info to power AI responses</div>
              <PrimaryBtn onClick={()=>setShowUpload(true)} style={{marginTop:16}}>Upload First Document</PrimaryBtn>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {docs.map(d=>(
                <div key={d.id} style={{display:'flex',alignItems:'center',gap:12,padding:'13px 14px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10,transition:'all .15s'}}
                  onMouseOver={e=>e.currentTarget.style.borderColor=C.border2} onMouseOut={e=>e.currentTarget.style.borderColor=C.border}>
                  <div style={{fontSize:22,flexShrink:0}}>📄</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13.5,fontWeight:500,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:2}}>
                      {d.chunks>0?`${d.chunks} chunks · `:''}
                      {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge color={d.status==='indexed'?C.accent2:d.status==='error'?C.red:C.orange}>
                    {d.status==='indexed'?'Indexed':d.status==='error'?'Error':'Processing…'}
                  </Badge>
                  <button onClick={()=>deleteDoc(d.id)} style={{background:'none',border:'none',color:C.text3,cursor:'pointer',fontSize:16,padding:4,flexShrink:0}}
                    onMouseOver={e=>e.target.style.color=C.red} onMouseOut={e=>e.target.style.color=C.text3}>✕</button>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <Card>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:16,color:C.text}}>RAG Performance</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {[{l:'Retrieval Accuracy',v:94,c:C.green},{l:'Answer Relevance',v:91,c:C.blue},{l:'Hallucination Rate',v:1,c:C.red}].map(r=>(
                <div key={r.l}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:6}}><span style={{color:C.text2}}>{r.l}</span><span style={{fontWeight:600,color:r.c}}>{r.v}%</span></div>
                  <div style={{height:5,background:C.bg4,borderRadius:99}}><div style={{width:`${r.v}%`,height:'100%',background:r.c,borderRadius:99}}/></div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:14,color:C.text}}>Configuration</div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {[['Vector DB','Pinecone'],['Embedding','text-embedding-3-small'],['Avg Latency','84ms'],['Your Docs',docs.length.toString()]].map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:`1px solid ${C.border}`}}>
                  <span style={{fontSize:12,color:C.text3}}>{k}</span>
                  <span style={{fontSize:12,fontWeight:500,color:C.text}}>{v}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── SETTINGS ───────────────────────────────────────────────────
export function Settings() {
  const { user, tenant } = useAuth();
  const [cfg, setCfg] = useState(tenant?.settings||{});
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!user?.tenantId) return;
    try { await apiFetch(`/tenants/${user.tenantId}/settings`,{method:'PUT',body:cfg}); setSaved(true); setTimeout(()=>setSaved(false),2000); }
    catch(e){ console.error(e); }
  };

  const Toggle = ({label,desc,field}) => (
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:10}}>
      <div>
        <div style={{fontSize:13.5,fontWeight:500,color:C.text}}>{label}</div>
        <div style={{fontSize:12,color:C.text3,marginTop:2}}>{desc}</div>
      </div>
      <div onClick={()=>setCfg(c=>({...c,[field]:!c[field]}))} style={{width:42,height:23,borderRadius:99,background:cfg[field]?C.green:C.bg4,cursor:'pointer',position:'relative',transition:'background .2s',border:`1px solid ${cfg[field]?C.green:C.border2}`,flexShrink:0}}>
        <div style={{position:'absolute',top:2,left:cfg[field]?20:2,width:17,height:17,borderRadius:'50%',background:'#fff',transition:'left .2s',boxShadow:'0 1px 3px rgba(0,0,0,0.4)'}}/>
      </div>
    </div>
  );

  const widgetColor = cfg.widgetColor || '#6366f1';
  const embedCode = `<script\n  src="https://app.nexussupport.ai/widget.js"\n  data-api-key="YOUR_API_KEY"\n  data-color="${widgetColor}"\n  data-position="${cfg.widgetPosition||'bottom-right'}"\n  data-name="${tenant?.name||'Support'}"\n  data-greeting="${cfg.widgetGreeting||'Hi! How can I help you today?'}">\n<\/script>`;

  return (
    <div style={{padding:'28px 32px',animation:'fadeUp .4s ease'}}>
      <PageHeader title="Settings" subtitle={`Tenant: ${tenant?.name||'Platform'}`}
        action={<PrimaryBtn onClick={save} style={{background:saved?C.green:C.accent}}>{saved?'✅ Saved!':'💾 Save Changes'}</PrimaryBtn>}/>
      <div style={{display:'flex',flexDirection:'column',gap:20}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          <Card>
            <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:18,color:C.text}}>AI Configuration</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[['LLM Model','aiModel',[['claude-sonnet-4-6','Claude Sonnet 4.6 (Recommended)'],['claude-opus-4-6','Claude Opus 4.6'],['claude-haiku-4-5','Claude Haiku 4.5']]],
                ['STT Provider','sttProvider',[['deepgram','Deepgram Nova-2'],['whisper','OpenAI Whisper'],['google','Google STT']]],
                ['TTS Provider','ttsProvider',[['elevenlabs','ElevenLabs (High quality)'],['polly','AWS Polly'],['google','Google TTS']]],
                ['Telephony','telephony',[['twilio','Twilio'],['vonage','Vonage'],['vapi','Vapi.ai']]]].map(([lbl,field,opts])=>(
                <div key={field}>
                  <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:7,textTransform:'uppercase',letterSpacing:'.5px'}}>{lbl}</div>
                  <select value={cfg[field]||opts[0][0]} onChange={e=>setCfg(c=>({...c,[field]:e.target.value}))}
                    style={{width:'100%',padding:'10px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:13.5,outline:'none'}}>
                    {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Card>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <Card>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:14,color:C.text}}>Features & Routing</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <Toggle label="Auto-Escalate" desc="Route frustrated users to humans" field="autoEscalate"/>
                <Toggle label="Voice AI" desc="STT → LLM → TTS pipeline" field="voiceEnabled"/>
                <Toggle label="RAG Search" desc="Vector KB before LLM reply" field="ragEnabled"/>
                <Toggle label="CSAT Surveys" desc="Auto-send after resolution" field="csatEnabled"/>
              </div>
            </Card>
            <Card>
              <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:14,color:C.text}}>Tenant Info</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[['Tenant ID',user?.tenantId||'—'],['Plan',tenant?.plan||'—'],['Industry',tenant?.industry||'—'],['Since',tenant?.createdAt?.slice(0,10)||'—']].map(([k,v])=>(
                  <div key={k} style={{background:C.bg3,borderRadius:9,padding:'12px 14px'}}>
                    <div style={{fontSize:10,color:C.text3,textTransform:'uppercase',letterSpacing:'.5px',marginBottom:5}}>{k}</div>
                    <div style={{fontSize:13,fontWeight:500,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Widget Customization */}
        <Card>
          <div style={{fontFamily:'Syne,sans-serif',fontSize:13,fontWeight:700,marginBottom:18,color:C.text}}>💬 Chat Widget Customization</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:24}}>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:7,textTransform:'uppercase',letterSpacing:'.5px'}}>Widget Color</div>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <input type="color" value={widgetColor} onChange={e=>setCfg(c=>({...c,widgetColor:e.target.value}))}
                    style={{width:44,height:36,borderRadius:8,border:'none',cursor:'pointer',background:'none'}}/>
                  <input value={widgetColor} onChange={e=>setCfg(c=>({...c,widgetColor:e.target.value}))}
                    style={{flex:1,padding:'9px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:13,outline:'none'}}/>
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:7,textTransform:'uppercase',letterSpacing:'.5px'}}>Widget Name</div>
                <input value={cfg.widgetName||tenant?.name||''} onChange={e=>setCfg(c=>({...c,widgetName:e.target.value}))}
                  placeholder="e.g. AI Builders Support"
                  style={{width:'100%',padding:'9px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:13,outline:'none'}}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:7,textTransform:'uppercase',letterSpacing:'.5px'}}>Welcome Greeting</div>
                <textarea value={cfg.widgetGreeting||''} onChange={e=>setCfg(c=>({...c,widgetGreeting:e.target.value}))}
                  placeholder="Hi! Welcome to AI Builders Academy. How can I help you today?"
                  style={{width:'100%',padding:'9px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:13,outline:'none',height:80,resize:'none'}}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:7,textTransform:'uppercase',letterSpacing:'.5px'}}>Widget Position</div>
                <select value={cfg.widgetPosition||'bottom-right'} onChange={e=>setCfg(c=>({...c,widgetPosition:e.target.value}))}
                  style={{width:'100%',padding:'9px 12px',background:C.bg3,border:`1px solid ${C.border}`,borderRadius:9,color:C.text,fontSize:13,outline:'none'}}>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>
            <div>
              {/* Preview */}
              <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Preview</div>
              <div style={{background:'#f0f2f5',borderRadius:12,padding:16,height:160,position:'relative',marginBottom:16}}>
                <div style={{fontSize:11,color:'#888',textAlign:'center',marginTop:20}}>Your website</div>
                <div style={{position:'absolute',bottom:12,right:cfg.widgetPosition==='bottom-left'?'auto':12,left:cfg.widgetPosition==='bottom-left'?12:'auto',width:44,height:44,borderRadius:'50%',background:widgetColor,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,boxShadow:'0 4px 16px rgba(0,0,0,0.2)'}}>💬</div>
              </div>
              {/* Embed code */}
              <div style={{fontSize:11,fontWeight:600,color:C.text3,marginBottom:8,textTransform:'uppercase',letterSpacing:'.5px'}}>Embed Code</div>
              <div style={{background:'rgba(0,0,0,0.3)',borderRadius:9,padding:12,position:'relative'}}>
                <code style={{fontSize:11,color:C.accent3,lineHeight:1.8,display:'block',whiteSpace:'pre',overflow:'auto'}}>{embedCode}</code>
                <button onClick={()=>navigator.clipboard?.writeText(embedCode)}
                  style={{position:'absolute',top:8,right:8,padding:'3px 8px',background:'rgba(99,102,241,0.2)',border:`1px solid rgba(99,102,241,0.3)`,borderRadius:6,color:C.accent2,fontSize:10,cursor:'pointer'}}>
                  📋 Copy
                </button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function relTime(ts) {
  const m = Math.floor((Date.now()-new Date(ts))/60000);
  if (m<1) return 'just now';
  if (m<60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h<24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}
