import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { to:'/dashboard',     icon:'📊', label:'Dashboard' },
  { to:'/conversations', icon:'💬', label:'Conversations' },
  { to:'/tickets',       icon:'🎫', label:'Tickets' },
  { to:'/agents',        icon:'🤖', label:'AI Agents' },
  { to:'/voice',         icon:'📞', label:'Voice Calls' },
  { to:'/analytics',     icon:'📈', label:'Analytics' },
  { to:'/knowledge',     icon:'📚', label:'Knowledge Base' },
  { to:'/settings',      icon:'⚙️', label:'Settings' },
];

export default function Layout() {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [col, setCol] = useState(false);
  const tc = { tenant_a:'#3b82f6', tenant_b:'#10b981', tenant_c:'#ec4899' }[user?.tenantId] || '#6366f1';

  return (
    <div style={{display:'flex',height:'100vh',overflow:'hidden',background:'#070810'}}>
      <aside style={{width:col?68:228,background:'#0d0f1c',borderRight:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',transition:'width .25s',overflow:'hidden',flexShrink:0}}>
        
        {/* Brand */}
        <div style={{padding:col?'16px':'16px 18px',borderBottom:'1px solid rgba(255,255,255,0.06)',display:'flex',alignItems:'center',gap:10,minHeight:60}}>
          <div style={{width:32,height:32,background:'rgba(99,102,241,0.15)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,flexShrink:0}}>💬</div>
          {!col && <span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:16,color:'#f0f0f8',flex:1,whiteSpace:'nowrap'}}>Nexus<span style={{color:'#818cf8'}}>Support</span></span>}
          <button onClick={()=>setCol(c=>!c)} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:7,color:'#454a6b',fontSize:11,cursor:'pointer',padding:'4px 8px',flexShrink:0,transition:'all .15s'}}>{col?'›':'‹'}</button>
        </div>

        {/* Tenant */}
        {!col && tenant && (
          <div style={{margin:'10px 10px 2px',padding:'10px 12px',background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:10,display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:tc,boxShadow:`0 0 8px ${tc}55`,flexShrink:0}}/>
            <div style={{minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:'#e0e0f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tenant.name}</div>
              <div style={{fontSize:10,color:'#454a6b',marginTop:1}}>{tenant.plan} Plan</div>
            </div>
          </div>
        )}

        {/* Nav items */}
        <nav style={{flex:1,padding:'8px',overflowY:'auto'}}>
          {NAV.map(item => {
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink key={item.to} to={item.to} title={col?item.label:undefined} style={{
                display:'flex', alignItems:'center', gap:10,
                padding: col ? '10px' : '9px 12px',
                margin:'1px 0', borderRadius:9,
                textDecoration:'none', transition:'all .15s',
                justifyContent: col ? 'center' : 'flex-start',
                background: isActive ? 'rgba(99,102,241,0.13)' : 'transparent',
                color: isActive ? '#a5b4fc' : '#5a6080',
                borderLeft: isActive ? '2px solid #6366f1' : '2px solid transparent',
                fontWeight: isActive ? 500 : 400,
              }}>
                <span style={{fontSize:15,flexShrink:0}}>{item.icon}</span>
                {!col && <span style={{fontSize:13.5}}>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div style={{padding:'10px 8px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:col?'8px':'8px 10px',borderRadius:9}}>
            <div style={{width:32,height:32,borderRadius:9,background:`${tc}18`,border:`1px solid ${tc}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:tc,flexShrink:0}}>{user?.name?.[0]}</div>
            {!col && <>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'#e0e0f0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</div>
                <div style={{fontSize:11,color:'#454a6b',textTransform:'capitalize'}}>{user?.role}</div>
              </div>
              <button onClick={()=>{logout();navigate('/login');}} style={{background:'none',border:'none',color:'#454a6b',fontSize:15,cursor:'pointer',padding:'4px',transition:'color .15s'}}
                onMouseOver={e=>e.target.style.color='#ef4444'} onMouseOut={e=>e.target.style.color='#454a6b'} title="Sign out">⏻</button>
            </>}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,overflow:'auto',background:'#070810'}}><Outlet /></main>
    </div>
  );
}
