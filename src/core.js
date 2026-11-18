/**
 * Didban Security: pure, independently testable domain logic.
 * All alert fields remain compatible with backups from Didban v1–v3.
 * No network access, GitHub mutations, or package commands are performed.
 */
export const STORAGE_KEY = 'didban-security-en-v1';
export const SCHEMA_VERSION = 1;
export const SEVERITY = Object.freeze({ critical:'Critical', high:'High', moderate:'Moderate', low:'Low', unknown:'Unverified' });
export const STATUS = Object.freeze({ new:'New', review:'Under review', ready:'Ready for remediation', blocked:'Blocked', fixing:'Implementing', testing:'Testing', resolved:'Resolved', accepted:'Risk accepted' });
export const KIND = Object.freeze({ direct:'Direct', transitive:'Transitive', unknown:'Unverified' });
export const USAGE = Object.freeze({ used:'Confirmed in code', unused:'Confirmed unused', unknown:'Not investigated' });
export const RISK = Object.freeze({ low:'Low', medium:'Medium', high:'High', unknown:'Unassessed' });
export const OUTCOME = Object.freeze({ pending:'Not run', pass:'Passed', fail:'Failed', blocked:'Blocked' });
export const blank = () => ({version:SCHEMA_VERSION,repositories:[],alerts:[],history:[]});
export const active = data => data.alerts.filter(a=>a.status!=='resolved' && a.status!=='accepted');
export const repoOf = (data,id) => data.repositories.find(r=>r.id===id);
export const alertOf = (data,id) => data.alerts.find(a=>a.id===id);
export const repoName = (data,alert) => {const r=repoOf(data,alert.repositoryId);return r?(r.alias||r.slug):'Missing repository';};
export const packageKey = a => `${String(a.ecosystem||'npm').trim().toLowerCase()}::${String(a.packageName||'').trim().toLowerCase()}`;
export function sharedGroups(data) {
  const m=new Map();
  for (const a of data.alerts){
    if (!a.packageName)continue;
    const key=packageKey(a);
    if (!m.has(key))m.set(key,{key,name:a.packageName,ecosystem:a.ecosystem||'npm',repos:new Set(),alerts:[]});
    const g=m.get(key);g.repos.add(a.repositoryId);g.alerts.push(a);
  }
  return [...m.values()].filter(g=>g.repos.size>1).sort((a,b)=>b.repos.size-a.repos.size);
}
export const sharedCount = (data,a) => sharedGroups(data).find(g=>g.key===packageKey(a))?.repos.size||1;
export function urgency(data,a){
  const sev={critical:40,high:30,moderate:20,low:10,unknown:0}[a.severity]??0;
  const use=a.codeUse==='used'?25:0;
  const shared=Math.min(20,10*Math.max(0,sharedCount(data,a)-1));
  const manual={high:12,normal:0,low:-5}[a.manualPriority]??0;
  return {score:Math.max(0,sev+use+shared+manual),needsReview:a.severity==='unknown'||a.codeUse==='unknown',components:{severity:sev,use,shared,manual}};
}
export function blocked(a){return a.status==='blocked'||Boolean(String(a.blocker||'').trim())||(a.plan?.tests||[]).some(t=>t.status==='fail'||t.status==='blocked');}
export function readiness(a){
  const p=a.plan||{};const reasons=[];
  if (a.status==='resolved'||a.status==='accepted')reasons.push('This alert is closed');
  if (blocked(a))reasons.push('An active blocker or failed test is present');
  if (!String(a.safeVersion||'').trim())reasons.push('Verified safe version is missing');
  if (!String(p.commands||'').trim())reasons.push('The upgrade commands are not documented');
  if (!p.commandsApproved)reasons.push('Upgrade commands have not been approved');
  if (!String(p.rollback||'').trim())reasons.push('Rollback steps are missing');
  if (!p.compatRisk||p.compatRisk==='unknown')reasons.push('Compatibility risk has not been assessed');
  if (!Array.isArray(p.tests)||p.tests.length===0)reasons.push('A test checklist has not been defined');
  return {ready:reasons.length===0,reasons};
}
export function roadmap(data){
  const open=active(data);
  const ready=open.filter(a=>readiness(a).ready).sort((a,b)=>
    (a.executionOrder??999999)-(b.executionOrder??999999) ||
    ({low:0,medium:1,high:2,unknown:3}[a.plan?.compatRisk]??3)-({low:0,medium:1,high:2,unknown:3}[b.plan?.compatRisk]??3) ||
    urgency(data,b).score-urgency(data,a).score
  );
  return {ready,blocked:open.filter(blocked),incomplete:open.filter(a=>!blocked(a)&&!readiness(a).ready),closed:data.alerts.filter(a=>['resolved','accepted'].includes(a.status))};
}
export function quality(data){
  return active(data).map(a=>{
    const gaps=[];
    if(a.severity==='unknown')gaps.push('Severity is unverified');
    if(a.codeUse==='unknown')gaps.push('Runtime usage has not been investigated');
    if(a.codeUse!=='unknown'&&(!a.evidence||!a.verifiedAt))gaps.push('Usage evidence or review date is missing');
    if(!a.safeVersion)gaps.push('Safe version is missing');
    if(!a.owner)gaps.push('No owner assigned');
    if(!a.url)gaps.push('GitHub alert URL is missing');
    if(!a.depPath)gaps.push('Dependency path is missing');
    if(a.dueDate&&new Date(a.dueDate+'T23:59:59').getTime()<Date.now())gaps.push('Target date has passed');
    return {alert:a,gaps};
  }).filter(x=>x.gaps.length);
}
export function validGithubUrl(value,expectedSlug=''){
  try {const u=new URL(value);if(u.protocol!=='https:'||u.hostname.toLowerCase()!=='github.com'||u.username||u.password)return false;
    if(!expectedSlug)return true;
    return u.pathname.replace(/^\/+|\/+$/g,'').replace(/\.git$/i,'').toLowerCase()===expectedSlug.toLowerCase();
  }catch{return false;}
}
export function validHttps(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}}
export function validateRepo(data,v,excludeId=''){
  if(!/^[\w.-]+\/[\w.-]+$/.test(v.slug||''))return 'Repository must use owner/repository format.';
  if(!validGithubUrl(v.url,v.slug))return 'Enter a matching HTTPS GitHub repository URL.';
  if(data.repositories.some(r=>r.slug.toLowerCase()===v.slug.toLowerCase()&&r.id!==excludeId))return 'This repository already exists.';
  return null;
}
export function validateAlert(data,v,excludeId=''){
  if(!repoOf(data,v.repositoryId))return 'Select an existing repository.';
  if(!/^(@[\w.-]+\/)?[\w.~-]+$/.test(v.packageName||''))return 'Enter a valid npm package name.';
  if(v.url&&!validGithubUrl(v.url))return 'GitHub alert links must use HTTPS and github.com.';
  if(v.sourceUrl&&!validHttps(v.sourceUrl))return 'Evidence source must use HTTPS.';
  if(v.codeUse!=='unknown'&&(!v.evidence||!v.verifiedAt))return 'Confirmed code usage requires evidence and a review date.';
  if(v.alertId&&data.alerts.some(a=>a.repositoryId===v.repositoryId&&String(a.alertId||'').toLowerCase()===v.alertId.toLowerCase()&&a.id!==excludeId))return 'This alert ID is already recorded for this repository.';
  return null;
}
export function validatePlan(v,approved){
  if(approved&&(!v.commands||!v.approvedBy))return 'Approving commands requires commands and a reviewer name.';
  if(v.executionOrder&&!/^[1-9]\d*$/.test(v.executionOrder))return 'Execution order must be a positive whole number.';
  if(String(v.tests||'').split('\n').filter(x=>x.trim()).length>150)return 'Limit test cases to 150 per alert.';
  return null;
}
export function validateClosure(alert,method,reviewer,reason){
  if(!reviewer?.trim()||!reason?.trim())return 'Reviewer and closure rationale are required.';
  if(method==='resolved'){
    if(!readiness(alert).ready)return 'Complete the remediation plan and clear blockers before resolving.';
    if(!(alert.plan?.tests||[]).some(t=>t.status==='pass'))return 'At least one passing test is required for resolution.';
    if((alert.plan?.tests||[]).some(t=>t.status==='fail'||t.status==='blocked'))return 'Failed or blocked tests must be addressed.';
  }
  return null;
}
export function validateBackup(obj){
  if(!obj||obj.version!==1||!Array.isArray(obj.repositories)||!Array.isArray(obj.alerts)||!Array.isArray(obj.history))throw Error('Unsupported backup format. Expected Didban schema v1.');
  const repos=new Set(),alerts=new Set();
  for(const r of obj.repositories){if(!r||typeof r.id!=='string'||repos.has(r.id)||!r.slug||!validGithubUrl(r.url,r.slug))throw Error('Invalid or duplicate repository in backup.');repos.add(r.id);}
  for(const a of obj.alerts){if(!a||typeof a.id!=='string'||alerts.has(a.id)||!repos.has(a.repositoryId)||!a.packageName||(a.url&&!validGithubUrl(a.url))||(a.sourceUrl&&!validHttps(a.sourceUrl))||(a.plan?.tests&&!Array.isArray(a.plan.tests)))throw Error('Invalid or duplicate alert in backup.');alerts.add(a.id);}
  if(!obj.history.every(h=>h&&typeof h.id==='string'&&typeof h.at==='string'))throw Error('Invalid history entries.');
  return {version:1,repositories:obj.repositories,alerts:obj.alerts,history:obj.history};
}
export const csvCell=v=>{let x=String(v??'').replace(/[\r\n\t]+/g,' ');if(/^[\s]*[=+@-]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"';};
/** Dependabot GitHub REST API alert object or a minimal array of alert objects. */
export function normalizeDependabot(raw,repoId){
  const input=Array.isArray(raw)?raw:(Array.isArray(raw?.alerts)?raw.alerts:(Array.isArray(raw?.items)?raw.items:null));
  if(!input)throw Error('Expected a JSON array of Dependabot alerts (or an object with alerts/items).');
  if(input.length>10000)throw Error('For safety, limit imports to 10,000 alerts at a time.');
  return input.map((item,i)=>{
    if(!item||typeof item!=='object')return {ok:false,reason:'Not an object',index:i+1};
    const dep=item.dependency||{};const vuln=item.security_vulnerability||{};const adv=item.security_advisory||{};
    const name=dep.package?.name||item.packageName||item.package_name||'';
    const ecosystem=(dep.package?.ecosystem||item.ecosystem||'npm').toLowerCase();
    const alertId=String(item.number||item.alertId||item.id||'').trim();
    const severity=(vuln.severity||adv.severity||item.severity||'unknown').toLowerCase();
    const url=item.html_url||item.url||'';
    if(!name||ecosystem!=='npm'||!SEVERITY[severity]||!validGithubUrl(url)||!alertId)return {ok:false,reason:'Missing name, valid GitHub URL, alert number or unsupported ecosystem/severity',index:i+1};
    const safe=typeof vuln.first_patched_version==='object'?vuln.first_patched_version?.identifier:vuln.first_patched_version;
    const scope=(dep.scope||item.kind||'unknown').toLowerCase();
    const state=(item.state||'open').toLowerCase();
    const status=state==='fixed'?'resolved':state==='dismissed'?'accepted':'new';
    const current=dep.manifest_path||item.depPath||'';
    const alert={repositoryId:repoId,alertId,packageName:name,ecosystem:'npm',url,sourceUrl:validHttps(adv.references?.[0]?.url)?adv.references[0].url:'',kind:KIND[scope]?scope:'unknown',severity,
      currentVersion:item.currentVersion||'',safeVersion:safe||item.safeVersion||'',depPath:current,
      codeUse:'unknown',evidence:'',verifiedAt:'',manualPriority:'normal',status,owner:'',dueDate:'',blocker:'',notes:adv.summary||item.notes||'',provenance:'GitHub Dependabot JSON import',
      plan:{commands:'',commandsApproved:false,compatRisk:'unknown',rollback:'',tests:[]},closure:null};
    return {ok:true,index:i+1,alert};
  });
}
export function importPreview(data,normalized,repoId){
  const seen=new Set(),rows=normalized.map(x=>{
    if(!x.ok)return x;
    const a=x.alert,key=`${repoId}/${a.alertId}`.toLowerCase();
    if(seen.has(key))return {...x,ok:false,reason:'Repeated in uploaded file'};
    seen.add(key);
    if(data.alerts.some(item=>item.repositoryId===repoId&&String(item.alertId).toLowerCase()===a.alertId.toLowerCase()))return {...x,ok:false,reason:'Already recorded in this repository'};
    // Closed alerts are intentionally excluded from active work queues, but retained in history.
    return x;
  });
  return {rows,valid:rows.filter(r=>r.ok),skipped:rows.filter(r=>!r.ok)};
}
export function demoDataset(){
  const timestamp=new Date().toISOString();
  const r1={id:'demo-r1',slug:'demo-org/customer-portal',url:'https://github.com/demo-org/customer-portal',alias:'Customer Portal',environment:'Production',notes:'Example repository. No actual GitHub connection.',createdAt:timestamp};
  const r2={id:'demo-r2',slug:'demo-org/analytics-console',url:'https://github.com/demo-org/analytics-console',alias:'Analytics Console',environment:'Staging',notes:'Example repository. No actual GitHub connection.',createdAt:timestamp};
  const base={ecosystem:'npm',kind:'transitive',currentVersion:'',safeVersion:'',codeUse:'unknown',evidence:'',verifiedAt:'',manualPriority:'normal',owner:'',dueDate:'',blocker:'',notes:'DEMO DATA — not a real security advisory.',provenance:'Illustrative sample',url:'',sourceUrl:'',status:'new',plan:{commands:'',commandsApproved:false,compatRisk:'unknown',rollback:'',tests:[]},closure:null,createdAt:timestamp,updatedAt:timestamp,executionOrder:null};
  return {version:1,repositories:[r1,r2],alerts:[
    {...base,id:'demo-a1',repositoryId:r1.id,packageName:'lodash',alertId:'DEMO-101',severity:'high',kind:'direct',safeVersion:'Verify with advisory'},
    {...base,id:'demo-a2',repositoryId:r2.id,packageName:'lodash',alertId:'DEMO-102',severity:'moderate'},
    {...base,id:'demo-a3',repositoryId:r1.id,packageName:'minimist',alertId:'DEMO-103',severity:'critical',blocker:'Waiting for regression coverage'}
  ],history:[]};
}
