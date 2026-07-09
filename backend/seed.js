const bcrypt=require('bcryptjs');
const db=require('./db');

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
async function main(){
  for(const t of TENANTS)await db.putTenant(t);
  for(const u of USERS)await db.putUser(u);
  for(const a of AGENTS)await db.putAgent(a);
  const convos=seedConversations();
  for(const c of convos)await db.putConversation(c);
  console.log(`Seeded ${TENANTS.length} tenants, ${USERS.length} users, ${AGENTS.length} agents, ${convos.length} conversations.`);
}
main().catch(err=>{console.error(err);process.exit(1);});
