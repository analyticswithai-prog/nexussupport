import React,{useState}from'react';
import{NavLink,useNavigate,Outlet}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
const NAV=[{to:'/dashboard',icon:'📊',label:'Dashboard'},{to:'/conversations',icon:'💬',label:'Conversations'},{to:'/tickets',icon:'🎫',label:'Tickets'},{to:'/agents',icon:'🤖',label:'AI Agents'},{to:'/voice',icon:'📞',label:'Voice Calls'},{to:'/analytics',icon:'📈',label:'Analytics'},{to:'/knowledge',icon:'📚',label:'Knowledge Base'},{to:'/settings',icon:'⚙️',label:'Settings'}];
export default function Layout(){
  const{user,tenant,logout}=useAuth();
  const navigate=useNavigate();
  const[col,setCol]=useState(false);
  return(
    <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
      <aside style={{width:col?64:220,background:'var(--bg2)',borderRight:'1px solid var(--border)',display:'flex',flexDirection:'column',transition:'width .2s',overflow:'hidden',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'18px 16px 14px',borderBottom:'1px solid var(--border)'}}>
          <span style={{fontSize:22}}>💬</span>
          {!col&&<span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:17,color:'var(--text)',flex:1}}>Nexus<span style={{color:'#9d97ff'}}>Support</span></span>}
          <button onClick={()=>setCol(c=>!c)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:14,cursor:'pointer',marginLeft:'auto'}}>{col?'→':'←'}</button>
        </div>
        {!col&&tenant&&(
          <div style={{display:'flex',alignItems:'center',gap:10,margin:10,padding:'10px 12px',background:'var(--bg3)',borderRadius:10,border:'1px solid var(--border)'}}>
            <span style={{fontSize:20}}>{tenant.logoEmoji}</span>
            <div><div style={{fontSize:12,fontWeight:600,color:'var(--text)',lineHeight:1.2}}>{tenant.name}</div><div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{tenant.plan}</div></div>
          </div>
        )}
        <nav style={{flex:1,padding:'8px 0'}}>
          {NAV.map(item=>(
            <NavLink key={item.to} to={item.to} title={col?item.label:undefined}
              style={({isActive})=>({display:'flex',alignItems:'center',gap:11,padding:'9px 16px',margin:'1px 8px',borderRadius:'0 8px 8px 0',textDecoration:'none',transition:'all .15s',background:isActive?'rgba(108,99,255,0.14)':'transparent',color:isActive?'var(--accent2)':'var(--text2)',borderLeft:isActive?'3px solid var(--accent)':'3px solid transparent'})}>
              <span style={{fontSize:17,flexShrink:0}}>{item.icon}</span>
              {!col&&<span style={{fontSize:13.5}}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        <div style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderTop:'1px solid var(--border)'}}>
          <div style={{width:32,height:32,borderRadius:9,background:'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:'#fff',flexShrink:0}}>{user?.name?.[0]}</div>
          {!col&&<><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name}</div><div style={{fontSize:11,color:'var(--text3)',textTransform:'capitalize'}}>{user?.role}</div></div><button onClick={()=>{logout();navigate('/login');}} style={{background:'none',border:'none',color:'var(--text3)',fontSize:16,cursor:'pointer'}} title="Sign out">⏻</button></>}
        </div>
      </aside>
      <main style={{flex:1,overflow:'auto'}}><Outlet/></main>
    </div>
  );
}