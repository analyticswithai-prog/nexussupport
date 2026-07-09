import React from'react';
import{BrowserRouter,Routes,Route,Navigate}from'react-router-dom';
import{AuthProvider,useAuth}from'./context/AuthContext';
import Layout from'./components/Layout';
import Login from'./pages/Login';
import{Dashboard,Conversations,Tickets,Agents,Analytics,Voice,Knowledge,Settings}from'./pages/Pages';
function Guard({children}){
  const{user,loading}=useAuth();
  if(loading)return(<div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#080a10',flexDirection:'column',gap:16}}><div style={{fontSize:32}}>💬</div><div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:'#eeeef5'}}>NexusSupport</div><div style={{width:32,height:32,border:'3px solid rgba(108,99,255,.3)',borderTop:'3px solid #6c63ff',borderRadius:'50%',animation:'spin 1s linear infinite'}}/></div>);
  return user?children:<Navigate to="/login" replace/>;
}
function Public({children}){
  const{user,loading}=useAuth();
  if(loading)return null;
  return user?<Navigate to="/dashboard" replace/>:children;
}
export default function App(){
  return(
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Public><Login/></Public>}/>
          <Route path="/" element={<Guard><Layout/></Guard>}>
            <Route index element={<Navigate to="/dashboard" replace/>}/>
            <Route path="dashboard" element={<Dashboard/>}/>
            <Route path="conversations" element={<Conversations/>}/>
            <Route path="tickets" element={<Tickets/>}/>
            <Route path="agents" element={<Agents/>}/>
            <Route path="voice" element={<Voice/>}/>
            <Route path="analytics" element={<Analytics/>}/>
            <Route path="knowledge" element={<Knowledge/>}/>
            <Route path="settings" element={<Settings/>}/>
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}