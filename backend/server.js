const express=require('express');
const cors=require('cors');
const helmet=require('helmet');
const morgan=require('morgan');
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const rateLimit=require('express-rate-limit');
const app=express();
const PORT=process.env.PORT||4000;
const JWT_SECRET=process.env.JWT_SECRET||'nexussupport-dev-secret-change-in-prod';
app.use(helmet({contentSecurityPolicy:false}));
app.use(cors({origin:process.env.FRONTEND_URL||'http://localhost:3000',credentials:true}));
app.use(express.json({limit:'2mb'}));
app.use(morgan('dev'));
app.use('/api/',rateLimit({windowMs:15*60*1000,max:200}));
const TENANTS=[
  {id:'tenant_a',name:'ShopNow E-Commerce',industry:'E-Commerce',plan:'Enterprise',primaryColor:'#3b82f6',logoEmoji:'🛒',createdAt:'2023-03-15',settings:{aiModel:'claude-sonnet-4-6',autoEscalate:true,voiceEnabled:true,ragEnabled:true,csatEnabled:true}},
  {id:'tenant_b',name:'CloudStack SaaS',industry:'SaaS',plan:'Pro',primaryColor:'#22c55e',logoEmoji:'💻',createdAt:'2023-06-01',settings:{aiModel:'claude-sonnet-4-6',autoEscalate:true,voiceEnabled:false,ragEnabled:true,csatEnabled:false}},
  {id:'tenant_c',name:'MedCare Health',industry:'Healthcare',plan:'Enterprise',primaryColor:'#ec4899',logoEmoji:'🏥',createdAt:'2023-09-10',settings:{aiModel:'claude-opus-4-6',autoEscalate:true,voiceEnabled:true,ragEnabled:true,csatEnabled:true}},
];
const USERS=[
  {id:'u1',tenantId:'tenant_a',email:'admin@shopnow.com',name:'Alice Johnson',role:'admin',passwordHash:bcrypt.hashSync('demo1234',10)},
  {id:'u2',tenantId:'tenant_a',email:'agent@shopnow.com',name:'Bob Smith',role:'agent',passwordHash:bcrypt.hashSync('demo1234',10)},
  {id:'u3',tenantId:'tenant_b',email:'admin@cloudstack.com',name:'Clara Davis',role:'admin',passwordHash:bcrypt.hashSync('demo1234',10)},
  {id:'u4',tenantId:'tenant_b',email:'agent@cloudstack.com',name:'Dan Lee',role:'agent',passwordHash:bcrypt.hashSync('demo1234',10)},
  {id:'u5',tenantId:'tenant_c',email:'admin@medcare.com',name:'Eva Patel',role:'admin',passwordHash:bcrypt.hashSync('demo1234',10)},
  {id:'u6',tenantId:null,email:'superadmin@nexussupport.com',name:'Super Admin',role:'superadmin',passwordHash:bcrypt.hashSync('admin1234',10)},
];
const AGENTS=[
  {id:'ag1',tenantId:'tenant_a',name:'Triage Agent',type:'triage',status:'online',resolvedToday:847,activeChats:12,accuracy:98},
  {id:'ag2',tenantId:'tenant_a',name:'Resolution Agent',type:'resolution',status:'online',resolvedToday:623,activeChats:8,accuracy:87},
  {id:'ag3',tenantId:'tenant_a',name:'Voice Agent',type:'voice',status:'online',resolvedToday:48,activeChats:3,accuracy:91},
  {id:'ag4',tenantId:'tenant_a',name:'Escalation Agent',type:'escalation',status:'busy',resolvedToday:31,activeChats:2,accuracy:93},
  {id:'ag5',tenantId:'tenant_b',name:'Triage Agent',type:'triage',status:'online',resolvedToday:412,activeChats:6,accuracy:95},
  {id:'ag6',tenantId:'tenant_b',name:'Resolution Agent',type:'resolution',status:'online',resolvedToday:380,activeChats:5,accuracy:90},
  {id:'ag7',tenantId:'tenant_c',name:'Triage Agent',type:'triage',status:'online',resolvedToday:198,activeChats:4,accuracy:96},
  {id:'ag8',tenantId:'tenant_c',name:'Voice Agent',type:'voice',status:'online',resolvedToday:87,activeChats:2,accuracy:88},
];
function seedConversations(){
  const customers=[{name:'Sarah Rodriguez',email:'sarah@email.com'},{name:'Marcus Kim',email:'marcus@email.com'},{name:'Layla Patel',email:'layla@email.com'},{name:'David Wu',email:'david@email.com'},{name:'Aisha Thompson',email:'aisha@email.com'},{name:'James Mitchell',email:'james@email.com'},{name:'Priya Nair',email:'priya@email.com'},{name:'Robert Barnes',email:'robert@email.com'},{name:'Emma Wilson',email:'emma@email.com'},{name:'Carlos Mendez',email:'carlos@email.com'}];
  const subjects=['Order not arrived after 3 days','Password reset - account locked','Duplicate charge refund request','Integration webhook failing','Enterprise upgrade pricing inquiry','Subscription renewal billing issue','Return label for defective item','Large billing dispute needs review','API rate limit exceeded','Feature access after plan upgrade'];
  const channels=['chat','voice','email'],statuses=['open','resolved','pending','escalated'],sentiments=['positive','neutral','negative'];
  const convos=[];let id=1000;
  ['tenant_a','tenant_b','tenant_c'].forEach(tid=>{
    for(let i=0;i<25;i++){
      const daysAgo=Math.floor(Math.random()*30),hoursAgo=Math.floor(Math.random()*23);
      const created=new Date();created.setDate(created.getDate()-daysAgo);created.setHours(created.getHours()-hoursAgo);
      const status=statuses[Math.floor(Math.random()*statuses.length)];
      convos.push({id:'conv_'+(id++),tenantId:tid,customer:customers[i%customers.length],subject:subjects[i%subjects.length],channel:channels[Math.floor(Math.random()*channels.length)],status,aiResolved:Math.random()>0.18,csatScore:Math.random()>0.3?parseFloat((Math.random()*2+3).toFixed(1)):null,sentiment:sentiments[Math.floor(Math.random()*sentiments.length)],messageCount:Math.floor(Math.random()*10)+2,createdAt:created.toISOString(),updatedAt:new Date(created.getTime()+Math.random()*3600000).toISOString(),resolvedAt:status==='resolved'?new Date(created.getTime()+Math.random()*7200000).toISOString():null});
    }
  });
  return convos;
}
const CONVERSATIONS=seedConversations();
function buildMessages(conv){
  const dialogues=[{c:'Hi, I need help with: '+conv.subject,a:'Hello '+conv.customer.name.split(' ')[0]+'! I can help with that. Let me pull up your account details.'},
    {c:"I've been waiting and still no update.",a:'I sincerely apologise for the delay. I can see your case and am prioritising it now.'},
    {c:'Can you confirm what you are doing?',a:conv.status==='resolved'?'Great news - I have fully resolved your issue. Is there anything else I can help with?':'I am actively working on this. Your reference ID is '+conv.id+'. You will receive an update shortly.'},
    {c:'Thank you for your help.',a:'You are very welcome! Do not hesitate to reach out if you need anything else. Have a great day!'}];
  const messages=[];const base=new Date(conv.createdAt);const count=Math.min(conv.messageCount,dialogues.length);
  for(let i=0;i<count;i++){const t1=new Date(base.getTime()+i*200000);const t2=new Date(base.getTime()+i*200000+40000);
    messages.push({id:conv.id+'_c'+i,role:'customer',content:dialogues[i].c,timestamp:t1.toISOString(),sender:conv.customer.name});
    messages.push({id:conv.id+'_a'+i,role:'ai',content:dialogues[i].a,timestamp:t2.toISOString(),sender:'AI Agent',agentType:'resolution'});}
  if(conv.status==='escalated')messages.push({id:conv.id+'_sys',role:'system',content:'Escalated to human agent - frustration score: 0.87.',timestamp:new Date(base.getTime()+count*200000+120000).toISOString(),sender:'System'});
  return messages.sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
}
function auth(req,res,next){const token=req.headers.authorization?.split(' ')[1];if(!token)return res.status(401).json({error:'No token'});try{req.user=jwt.verify(token,JWT_SECRET);next();}catch{res.status(401).json({error:'Invalid token'});}}
function tenantGuard(req,res,next){if(req.user.role==='superadmin')return next();if(req.params.tenantId&&req.params.tenantId!==req.user.tenantId)return res.status(403).json({error:'Access denied'});next();}
app.post('/api/auth/login',async(req,res)=>{
  const{email,password}=req.body;
  if(!email||!password)return res.status(400).json({error:'Email and password required'});
  const user=USERS.find(u=>u.email.toLowerCase()===email.toLowerCase());
  if(!user||!bcrypt.compareSync(password,user.passwordHash))return res.status(401).json({error:'Invalid credentials'});
  const tenant=user.tenantId?TENANTS.find(t=>t.id===user.tenantId):null;
  const token=jwt.sign({userId:user.id,tenantId:user.tenantId,role:user.role,name:user.name,email:user.email},JWT_SECRET,{expiresIn:'8h'});
  res.json({token,user:{id:user.id,name:user.name,email:user.email,role:user.role,tenantId:user.tenantId},tenant});
});
app.get('/api/auth/me',auth,(req,res)=>{const user=USERS.find(u=>u.id===req.user.userId);const tenant=user?.tenantId?TENANTS.find(t=>t.id===user.tenantId):null;res.json({user:{id:user.id,name:user.name,email:user.email,role:user.role,tenantId:user.tenantId},tenant});});
app.get('/api/tenants',auth,(req,res)=>{if(req.user.role!=='superadmin')return res.status(403).json({error:'Superadmin only'});res.json(TENANTS);});
app.get('/api/tenants/:tenantId',auth,tenantGuard,(req,res)=>{const t=TENANTS.find(t=>t.id===req.params.tenantId);if(!t)return res.status(404).json({error:'Not found'});res.json(t);});
app.put('/api/tenants/:tenantId/settings',auth,tenantGuard,(req,res)=>{if(!['admin','superadmin'].includes(req.user.role))return res.status(403).json({error:'Admins only'});const t=TENANTS.find(t=>t.id===req.params.tenantId);if(!t)return res.status(404).json({error:'Not found'});t.settings={...t.settings,...req.body};res.json(t);});
app.get('/api/tenants/:tenantId/dashboard',auth,tenantGuard,(req,res)=>{
  const tid=req.params.tenantId;const convos=CONVERSATIONS.filter(c=>c.tenantId===tid);
  const today=new Date();today.setHours(0,0,0,0);const todayC=convos.filter(c=>new Date(c.createdAt)>=today);
  const resolved=convos.filter(c=>c.status==='resolved');const aiResolved=convos.filter(c=>c.aiResolved&&c.status==='resolved');
  const csats=convos.filter(c=>c.csatScore).map(c=>c.csatScore);
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));d.setHours(0,0,0,0);const label=d.toLocaleDateString('en',{weekday:'short'});const count=convos.filter(c=>{const cd=new Date(c.createdAt);cd.setHours(0,0,0,0);return cd.getTime()===d.getTime();}).length;return{label,count};});
  res.json({totalConversations:convos.length,activeToday:todayC.filter(c=>['open','pending'].includes(c.status)).length,resolvedToday:todayC.filter(c=>c.status==='resolved').length,aiResolutionRate:resolved.length?Math.round((aiResolved.length/resolved.length)*100):0,avgCsat:csats.length?(csats.reduce((a,b)=>a+b,0)/csats.length).toFixed(1):'0',openTickets:convos.filter(c=>c.status==='open').length,escalated:convos.filter(c=>c.status==='escalated').length,byChannel:convos.reduce((acc,c)=>{acc[c.channel]=(acc[c.channel]||0)+1;return acc;},{}),last7Days:last7,sentimentBreakdown:{positive:convos.filter(c=>c.sentiment==='positive').length,neutral:convos.filter(c=>c.sentiment==='neutral').length,negative:convos.filter(c=>c.sentiment==='negative').length}});
});
app.get('/api/tenants/:tenantId/conversations',auth,tenantGuard,(req,res)=>{
  const{status,channel,search,page=1,limit=20}=req.query;
  let list=CONVERSATIONS.filter(c=>c.tenantId===req.params.tenantId);
  if(status&&status!=='all')list=list.filter(c=>c.status===status);
  if(channel&&channel!=='all')list=list.filter(c=>c.channel===channel);
  if(search){const q=search.toLowerCase();list=list.filter(c=>c.customer.name.toLowerCase().includes(q)||c.subject.toLowerCase().includes(q));}
  list.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));
  const total=list.length;
  res.json({conversations:list.slice((page-1)*limit,page*limit),total,page:+page,pages:Math.ceil(total/limit)});
});
app.get('/api/tenants/:tenantId/conversations/:convId',auth,tenantGuard,(req,res)=>{const conv=CONVERSATIONS.find(c=>c.id===req.params.convId&&c.tenantId===req.params.tenantId);if(!conv)return res.status(404).json({error:'Not found'});res.json({...conv,messages:buildMessages(conv)});});
app.get('/api/tenants/:tenantId/agents',auth,tenantGuard,(req,res)=>{res.json(AGENTS.filter(a=>a.tenantId===req.params.tenantId));});
app.get('/api/tenants/:tenantId/analytics',auth,tenantGuard,(req,res)=>{
  const convos=CONVERSATIONS.filter(c=>c.tenantId===req.params.tenantId);
  const monthly=Array.from({length:6},(_,i)=>{const d=new Date();d.setMonth(d.getMonth()-(5-i));const mc=convos.filter(c=>{const cd=new Date(c.createdAt);return cd.getMonth()===d.getMonth()&&cd.getFullYear()===d.getFullYear();});return{label:d.toLocaleDateString('en',{month:'short',year:'2-digit'}),total:mc.length,resolved:mc.filter(c=>c.status==='resolved').length,aiResolved:mc.filter(c=>c.aiResolved).length};});
  res.json({monthly,topIssues:[{label:'Billing & Payments',count:Math.floor(convos.length*.28)},{label:'Order Tracking',count:Math.floor(convos.length*.22)},{label:'Account Access',count:Math.floor(convos.length*.18)},{label:'Refunds',count:Math.floor(convos.length*.15)},{label:'Technical Issues',count:Math.floor(convos.length*.12)},{label:'Other',count:Math.floor(convos.length*.05)}],avgResolutionTimeHours:1.4,firstContactResolution:73});
});
app.get('/health',(_,res)=>res.json({status:'ok',timestamp:new Date().toISOString()}));
app.listen(PORT,()=>console.log('NexusSupport API running on http://localhost:'+PORT));