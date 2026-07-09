import React,{createContext,useContext,useState,useEffect}from'react';
const Ctx=createContext(null);
export function AuthProvider({children}){
  const[user,setUser]=useState(null);
  const[tenant,setTenant]=useState(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    const token=localStorage.getItem('ns_token');
    const u=localStorage.getItem('ns_user');
    const t=localStorage.getItem('ns_tenant');
    if(token&&u){setUser(JSON.parse(u));if(t)setTenant(JSON.parse(t));}
    setLoading(false);
  },[]);
  const login=(token,u,t)=>{
    localStorage.setItem('ns_token',token);
    localStorage.setItem('ns_user',JSON.stringify(u));
    if(t)localStorage.setItem('ns_tenant',JSON.stringify(t));
    setUser(u);setTenant(t);
  };
  const logout=()=>{
    ['ns_token','ns_user','ns_tenant'].forEach(k=>localStorage.removeItem(k));
    setUser(null);setTenant(null);
  };
  return<Ctx.Provider value={{user,tenant,login,logout,loading}}>{children}</Ctx.Provider>;
}
export const useAuth=()=>useContext(Ctx);