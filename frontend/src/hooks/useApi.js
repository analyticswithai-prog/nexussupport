const BASE=import.meta.env.VITE_API_URL||'/api';
export const getToken=()=>localStorage.getItem('ns_token');
export async function apiFetch(path,opts={}){
  const token=getToken();
  const res=await fetch(BASE+path,{
    ...opts,
    headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{}),...opts.headers},
    body:opts.body?JSON.stringify(opts.body):undefined,
  });
  if(!res.ok){const e=await res.json().catch(()=>({error:'Request failed'}));throw new Error(e.error||'Request failed');}
  return res.json();
}