import React,{useState}from'react';
import{useNavigate}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{apiFetch}from'../hooks/useApi';
const DEMOS=[
  {label:'🛒 ShopNow Admin',email:'admin@shopnow.com',pw:'demo1234',color:'#3b82f6'},
  {label:'🛒 ShopNow Agent',email:'agent@shopnow.com',pw:'demo1234',color:'#3b82f6'},
  {label:'💻 CloudStack Admin',email:'admin@cloudstack.com',pw:'demo1234',color:'#22c55e'},
  {label:'💻 CloudStack Agent',email:'agent@cloudstack.com',pw:'demo1234',color:'#22c55e'},
  {label:'🏥 MedCare Admin',email:'admin@medcare.com',pw:'demo1234',color:'#ec4899'},
  {label:'⚡ Super Admin',email:'superadmin@nexussupport.com',pw:'admin1234',color:'#6c63ff'},
];
export default function Login(){
  const[email,setEmail]=useState('');
  const[pw,setPw]=useState('');
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);
  const{login}=useAuth();
  const navigate=useNavigate();
  const submit=async(e)=>{
    e?.preventDefault();setError('');setBusy(true);
    try{const d=await apiFetch('/auth/login',{method:'POST',body:{email,password:pw}});login(d.token,d.user,d.tenant);navigate('/dashboard');}
    catch(err){setError(err.message);}
    finally{setBusy(false);}
  };
  return(
    <div style={{display:'flex',minHeight:'100vh',background:'#080a10'}}>
      <div style={{flex:1,padding:'60px 56px',display:'flex',flexDirection:'column',justifyContent:'center',background:'linear-gradient(135deg,#0d0f1a,#0f1225)',borderRight:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:48}}><span style={{fontSize:28}}>💬</span><span style={{fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:22,color:'#eeeef5'}}>Nexus<span style={{color:'#9d97ff'}}>Support</span></span></div>
        <h1 style={{fontFamily:'Syne,sans-serif',fontSize:40,fontWeight:800,lineHeight:1.15,letterSpacing:'-1.5px',color:'#eeeef5',marginBottom:16}}>AI-Powered<br/>Customer Support<br/>Platform</h1>
        <p style={{fontSize:15,color:'#8b90aa',marginBottom:40}}>Multi-tenant · Chat · Voice · Agents · Analytics</p>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {['🤖 Claude AI backbone','📞 Voice STT→LLM→TTS','🏢 Full multi-tenancy','📊 Real-time analytics','🔒 Row-level isolation'].map(f=>(<div key={f} style={{fontSize:14,color:'#8b90aa'}}>{f}</div>))}
        </div>
      </div>
      <div style={{width:480,display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 48px'}}>
        <div style={{width:'100%'}}>
          <h2 style={{fontFamily:'Syne,sans-serif',fontSize:24,fontWeight:700,color:'#eeeef5',marginBottom:6}}>Sign in to your workspace</h2>
          <p style={{fontSize:13,color:'#8b90aa',marginBottom:28}}>Use your tenant credentials below</p>
          {error&&<div style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:8,padding:'10px 14px',color:'#ef4444',fontSize:13,marginBottom:16}}>{error}</div>}
          <form onSubmit={submit} style={{display:'flex',flexDirection:'column',gap:4}}>
            <label style={{fontSize:12,fontWeight:600,color:'#8b90aa',marginBottom:4,marginTop:12,textTransform:'uppercase',letterSpacing:'.5px'}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{padding:'11px 14px',background:'#161923',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,color:'#eeeef5',fontSize:14,outline:'none'}}/>
            <label style={{fontSize:12,fontWeight:600,color:'#8b90aa',marginBottom:4,marginTop:12,textTransform:'uppercase',letterSpacing:'.5px'}}>Password</label>
            <input type="password" value={pw} onChange={e=>setPw(e.target.value)} required style={{padding:'11px 14px',background:'#161923',border:'1px solid rgba(255,255,255,.08)',borderRadius:8,color:'#eeeef5',fontSize:14,outline:'none'}}/>
            <button type="submit" disabled={busy} style={{marginTop:20,padding:13,background:'#6c63ff',border:'none',borderRadius:8,color:'#fff',fontSize:15,fontWeight:600,cursor:'pointer',opacity:busy?.7:1}}>{busy?'Signing in...':'Sign in'}</button>
          </form>
          <div style={{textAlign:'center',margin:'20px 0',color:'#4a506a',fontSize:12}}>Demo accounts</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
            {DEMOS.map(d=>(<button key={d.email} onClick={()=>{setEmail(d.email);setPw(d.pw);setError('');}} style={{display:'flex',flexDirection:'column',padding:'10px 12px',background:'#0f1118',border:'1px solid '+d.color+'44',borderRadius:8,cursor:'pointer',textAlign:'left'}}><span style={{color:d.color,fontWeight:600,fontSize:12}}>{d.label}</span><span style={{fontSize:11,color:'#4a506a',marginTop:2}}>{d.email}</span></button>))}
          </div>
          <p style={{textAlign:'center',fontSize:12,color:'#4a506a',marginTop:14}}>Password: <code style={{color:'#9d97ff'}}>demo1234</code></p>
        </div>
      </div>
    </div>
  );
}