import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import ApiKeys from './pages/ApiKeys';
import { Dashboard, Conversations, Tickets, Agents, Analytics, Voice, Knowledge, Settings } from './pages/Pages';

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#070810',flexDirection:'column',gap:16}}>
      <div style={{fontSize:32}}>💬</div>
      <div style={{fontFamily:'Syne,sans-serif',fontSize:18,fontWeight:700,color:'#f0f0f8'}}>NexusSupport</div>
      <div style={{width:32,height:32,border:'2px solid rgba(99,102,241,0.3)',borderTop:'2px solid #6366f1',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

function Public({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"      element={<Public><Login /></Public>} />
          <Route path="/signup"     element={<Public><Signup /></Public>} />
          <Route path="/onboarding" element={<Guard><Onboarding /></Guard>} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"     element={<Dashboard />} />
            <Route path="conversations" element={<Conversations />} />
            <Route path="tickets"       element={<Tickets />} />
            <Route path="agents"        element={<Agents />} />
            <Route path="voice"         element={<Voice />} />
            <Route path="analytics"     element={<Analytics />} />
            <Route path="knowledge"     element={<Knowledge />} />
            <Route path="settings"      element={<Settings />} />
            <Route path="api-keys"      element={<ApiKeys />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
