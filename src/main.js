import './style.css';
import { deployment } from './config';
import { read, connectWallet, write } from './chain';

const escape = (v) => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const date = (v) => v ? new Date(v * 1000).toLocaleString() : '—';
const short = (v) => v ? `${v.slice(0,6)}…${v.slice(-4)}` : '—';
const state = { claims: [], total: 0, offset: 0, selected: null, wallet: null, loading: true, error: '', filter: '', profile: null };
const methods = {
  create_profile: ['display_name','github_login','identity_url'],
  submit_claim: ['claim_id','title','skill','statements_json'],
  attach_evidence: ['claim_id','url','content_hash','note'],
  request_verification: ['claim_id'], validator_review: ['claim_id'],
  challenge_claim: ['claim_id','url','content_hash','reason'],
  review_challenges: ['claim_id'], finalize: ['claim_id'],
  resolve_timeout: ['claim_id'], cancel_claim: ['claim_id'], revoke_credential: ['claim_id']
};
const titles = { create_profile: 'Create profile', submit_claim: 'Submit contribution claim', attach_evidence: 'Attach public evidence', request_verification: 'Lock evidence & request verification', validator_review: 'Request validator review', challenge_claim: 'Challenge a claim', review_challenges: 'Review counter-evidence', finalize: 'Finalize decision', resolve_timeout: 'Close an expired review', cancel_claim: 'Cancel draft or pending claim', revoke_credential: 'Revoke your credential' };
document.querySelector('#app').innerHTML = `
<header><a class="brand" href="/"><img src="/favicon.svg" alt=""><span>Credential<span class="light">Proof</span></span></a><nav><a href="https://github.com/amzar1st/CredentialProof" target="_blank" rel="noopener">Source ↗</a><a id="explorer" target="_blank" rel="noopener">Contract ↗</a><button id="wallet" class="subtle">Use browser wallet</button></nav></header>
<main><div class="intro"><div><div class="eyebrow">PROFESSIONAL CREDENTIAL REGISTRY</div><h1>Your work.<br><em>The evidence to prove it.</em></h1><p>Public contributions, reviewed by GenLayer validators.<br>Credentials carry the evidence and the exact scope verified.</p></div><div class="network"><span class="dot"></span> GenLayer Studionet <span class="tag">DEVELOPMENT</span><div id="network-status">Reading finalized registry…</div><a href="${deployment.studio}" target="_blank" rel="noopener">Use Studio’s built-in wallet ↗</a></div></div>
<div class="metrics"><div><span id="total">—</span><small>Claims in registry</small></div><div><span id="issued">—</span><small>Active credentials on this page</small></div><div><span id="pending">—</span><small>Under review on this page</small></div><div><span>02<span class="unit"> min</span></span><small>Demo challenge window</small></div></div>
<div class="workspace"><section class="registry"><div class="section-title"><h2>Contribution registry</h2><button id="refresh" class="subtle">↻ Refresh</button></div><label class="search"><span>⌕</span><input id="search" placeholder="Search this page by skill, name or claim" aria-label="Search claims on this page"></label><div id="claims" aria-live="polite"></div><div class="pagination"><button id="prev" class="subtle">← Previous</button><span id="page"></span><button id="next" class="subtle">Next →</button></div><div class="profile-search"><h3>Verify a profile</h3><p>Reputation counts finalized, active credentials only.</p><form id="profile-form"><input name="owner" placeholder="0x… profile wallet address" aria-label="Profile wallet address" required pattern="0x[a-fA-F0-9]{40}"><button class="primary">Read profile</button></form><div id="profile-result" aria-live="polite"></div></div></section>
<aside><div class="section-title"><h2>Claim workspace</h2><span class="tag">LIVE</span></div><div id="detail"><div class="empty"><span class="seal">✓</span><h3>Select a claim</h3><p>Inspect evidence, validator decisions and the finalized credential scope.</p></div></div><div class="action-area"><h3>Take the next step</h3><p class="muted">Use Studio without connecting a wallet, or sign here with your browser wallet.</p><label for="method">Action</label><select id="method">${Object.keys(methods).map(m=>`<option value="${m}">${titles[m]}</option>`).join('')}</select><form id="action-form"><div id="fields"></div><button id="prepare" class="primary" type="submit">Prepare Studio action</button></form><div id="prepared" hidden><h4>Ready for Studio</h4><p>Open the contract in Studio, select this method, and enter these arguments in order. Submit with Normal (Full Consensus).</p><pre id="arguments"></pre><button id="copy" class="subtle">Copy arguments</button> <a id="studio-action" target="_blank" rel="noopener">Open Studio ↗</a></div><div id="tx" role="status"></div></div></aside></div>
<footer><span>Evidence first. Finality before reputation.</span><p>Studionet demo • Non-transferable registry records • Not an accreditation authority</p></footer></main>`;
document.querySelector('#explorer').href = `${deployment.explorer}/address/${deployment.address}`;

function render() {
  document.querySelector('#total').textContent = state.total;
  document.querySelector('#issued').textContent = state.claims.filter(c=>c.status==='ISSUED'&&!c.revoked).length;
  document.querySelector('#pending').textContent = state.claims.filter(c=>['REQUESTED','PROVISIONAL','REVIEWED'].includes(c.status)).length;
  document.querySelector('#network-status').textContent = state.loading ? 'Reading finalized registry…' : state.error ? 'Registry read unavailable' : 'Connected · finalized state';
  const claims = state.claims.filter(c=>JSON.stringify([c.title,c.skill,c.profile.github_login,c.id]).toLowerCase().includes(state.filter));
  document.querySelector('#claims').innerHTML = state.loading ? '<div class="empty">Loading finalized records…</div>' : state.error ? `<div class="error">${escape(state.error)}<p>Refresh to retry. No sample records are substituted.</p></div>` : claims.length ? claims.map(c=>`<button class="claim-card ${c.id===state.selected?.id?'selected':''}" data-claim="${escape(c.id)}"><div class="claim-top"><span class="avatar">${escape(c.profile.github_login.slice(0,2).toUpperCase())}</span><span><strong>${escape(c.profile.display_name)}</strong><small>@${escape(c.profile.github_login)}</small></span><span class="badge ${c.status==='ISSUED'&&!c.revoked?'positive':''}">${escape(c.revoked?'REVOKED':c.status)}</span></div><h3>${escape(c.title)}</h3><div class="claim-bottom"><span>${escape(c.skill)}</span><span>${c.evidence.length} source${c.evidence.length===1?'':'s'} · ${escape(c.id)}</span></div></button>`).join('') : '<div class="empty">No claims found. Create a profile to start a verifiable record.</div>';
  document.querySelectorAll('[data-claim]').forEach(b=>b.onclick=()=>selectClaim(b.dataset.claim));
  document.querySelector('#prev').disabled = state.offset === 0 || state.loading;
  document.querySelector('#next').disabled = state.offset + 25 >= state.total || state.loading;
  document.querySelector('#page').textContent = state.total ? `${state.offset+1}–${Math.min(state.offset+25,state.total)} of ${state.total}` : '0 records';
  renderDetail();
}
function renderDetail() {
  const c = state.selected;
  if (!c) return;
  const r = c.result;
  const final = ['ISSUED','REJECTED'].includes(c.status);
  document.querySelector('#detail').innerHTML = `<div class="detail-heading"><span class="eyebrow">${escape(c.id)}</span><h3>${escape(c.title)}</h3><span class="badge ${c.status==='ISSUED'&&!c.revoked?'positive':''}">${escape(c.revoked?'REVOKED':c.status)}</span></div><p class="owner">@${escape(c.profile.github_login)} · ${escape(short(c.owner))}</p><h4>Submitted statements</h4><ol>${c.statements.map((s,i)=>`<li>${escape(s)} ${r?.supported?.[i]?'<span class="supported">Supported</span>':''}</li>`).join('')}</ol><h4>Public evidence</h4>${c.evidence.map((e,i)=>`<div class="evidence"><a href="${escape(e.url)}" target="_blank" rel="noopener">${escape(new URL(e.url).hostname)} ↗</a><small>${escape(e.note||e.url)}</small><code>${escape(e.sha256?`SHA-256 ${e.sha256}`:'Content hash not committed')}</code>${r?.sources?.[i]?`<small>${r.sources[i].usable?'Fetched and usable':'Unavailable / commitment mismatch'}</small>`:''}</div>`).join('')}<h4>Validator decision</h4><div class="decision"><strong>${escape(r?.verdict||'AWAITING REVIEW')}</strong><p>${escape(r?.reasoning||'Validators have not reviewed this claim yet.')}</p><small>${final?'Application decision finalized':'Provisional decisions do not count toward reputation'}</small></div>${c.challenge_deadline?`<p class="deadline">Challenge window closes<br><strong>${date(c.challenge_deadline)}</strong></p>`:''}${c.challenges.length?`<h4>Counter-evidence (${c.challenges.length})</h4>${c.challenges.map(e=>`<div class="evidence"><a href="${escape(e.url)}" target="_blank" rel="noopener">${escape(short(e.party))} ↗</a><p>${escape(e.note)}</p></div>`).join('')}`:''}${c.credential?`<div class="credential"><span class="eyebrow">${c.revoked?'REVOKED':'FINALIZED'} CREDENTIAL</span><h4>${escape(c.credential.id)}</h4><ul>${c.credential.scope.map(s=>`<li>${escape(s)}</li>`).join('')}</ul><small>Non-transferable · Issued ${date(c.credential.issued_at)}</small></div>`:''}<details><summary>Full on-chain record</summary><pre>${escape(JSON.stringify(c,null,2))}</pre></details>`;
}
async function refresh() {
  state.loading=true; state.error=''; render();
  try {
    const [config,page]=await Promise.all([read('get_config'),read('list_claims',[state.offset,25])]);
    if(config.name!=='CredentialProof') throw new Error('Unexpected contract registry.');
    state.claims=page.claims;state.total=page.total;
    if(state.selected) state.selected=await read('get_claim',[state.selected.id]);
    else if(state.claims.length) state.selected=state.claims[0];
  } catch(e) { state.error=e.message;state.claims=[];state.selected=null;document.querySelector('#detail').innerHTML='<div class="empty">Live data could not be read.</div>'; }
  state.loading=false;render();fields();
}
async function selectClaim(id) { state.selected=state.claims.find(c=>c.id===id) || await read('get_claim',[id]);render();fields();return {id:state.selected.id,status:state.selected.status}; }
function fields() {
  const m=document.querySelector('#method').value;
  document.querySelector('#fields').innerHTML=methods[m].map(k=>`<label for="field-${k}">${escape(k.replaceAll('_',' '))}</label>${k==='statements_json'?`<textarea id="field-${k}" name="${k}" required placeholder='["I authored a specific, publicly attributable contribution."]'></textarea>`:k==='note'||k==='reason'?`<textarea id="field-${k}" name="${k}" ${k==='reason'?'required':''}></textarea>`:`<input id="field-${k}" name="${k}" ${k==='content_hash'?'pattern="[a-f0-9]{64}" placeholder="Optional SHA-256 of source bytes"':'required'} value="${k==='claim_id'?escape(state.selected?.id||''):''}" ${k.includes('url')?'type="url"':''}>`}`).join('');
  document.querySelector('#prepared').hidden=true;
  document.querySelector('#prepare').textContent=state.wallet?'Sign transaction & await finality':'Prepare Studio action';
  if(m==='create_profile') {
    document.querySelector('#fields').insertAdjacentHTML('beforeend','<p class="identity-help">Publish the following line in a raw file under your GitHub account. The login and wallet must match your profile.</p><code id="identity-token"></code>');
    const update=()=>{document.querySelector('#identity-token').textContent=`CredentialProof:${deployment.address.toLowerCase()}:${(state.wallet?.address||deployment.owner).toLowerCase()}:${document.querySelector('[name="github_login"]').value.toLowerCase()}`;};
    document.querySelector('[name="github_login"]').addEventListener('input',update);update();
  }
}
let prepared=null;
document.querySelector('#action-form').onsubmit=async e=>{
  e.preventDefault();const form=new FormData(e.target);const method=document.querySelector('#method').value;
  const args=methods[method].map(k=>String(form.get(k)||''));
  const status=document.querySelector('#tx'); status.textContent='';
  try {
    if(method==='submit_claim') {const parts=JSON.parse(form.get('statements_json'));if(!Array.isArray(parts)||parts.length<1||parts.length>3||parts.some(s=>typeof s!=='string'||s.trim().length<10||s.length>500))throw new Error('Provide 1–3 JSON statements of 10–500 characters.');}
    if(!state.wallet) {
      prepared={method,args};document.querySelector('#arguments').textContent=JSON.stringify(prepared,null,2);document.querySelector('#studio-action').href=deployment.studio;document.querySelector('#prepared').hidden=false;return;
    }
    document.querySelector('#prepare').disabled=true;
    await write(state.wallet.client,method,args,tx=>{status.innerHTML=`<p>${escape(tx.status)}</p><a href="${deployment.explorer}/tx/${tx.hash}" target="_blank" rel="noopener">${escape(short(tx.hash))} ↗</a>`;});
    await refresh();
  } catch(error) {status.textContent=error.message;} finally {document.querySelector('#prepare').disabled=false;}
};
document.querySelector('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(prepared,null,2));document.querySelector('#copy').textContent='Copied';}catch{document.querySelector('#tx').textContent='Select and copy the arguments above.';}};
document.querySelector('#wallet').onclick=async()=>{try{state.wallet=await connectWallet();document.querySelector('#wallet').textContent=short(state.wallet.address);fields();}catch(e){document.querySelector('#tx').textContent=e.message;}};
window.ethereum?.on?.('accountsChanged',()=>{state.wallet=null;document.querySelector('#wallet').textContent='Use browser wallet';fields();});
window.ethereum?.on?.('chainChanged',()=>{state.wallet=null;document.querySelector('#wallet').textContent='Use browser wallet';fields();});
document.querySelector('#profile-form').onsubmit=async e=>{e.preventDefault();const target=document.querySelector('#profile-result');try{const p=await read('get_profile',[new FormData(e.target).get('owner')]);target.innerHTML=`<h4>${escape(p.display_name)} · @${escape(p.github_login)}</h4><p>${p.reputation.verified} verified · ${p.reputation.partial} partial credentials</p>${p.credentials.map(c=>`<div class="credential"><strong>${escape(c.skill)} · ${escape(c.verdict)}</strong><ul>${c.scope.map(s=>`<li>${escape(s)}</li>`).join('')}</ul></div>`).join('')||'<p>No finalized, active credentials.</p>'}`;}catch(err){target.textContent=err.message;}};
document.querySelector('#method').onchange=fields;
document.querySelector('#search').oninput=e=>{state.filter=e.target.value.toLowerCase();render();};
document.querySelector('#refresh').onclick=refresh;
document.querySelector('#prev').onclick=()=>{state.offset=Math.max(0,state.offset-25);refresh();};
document.querySelector('#next').onclick=()=>{state.offset+=25;refresh();};
if(document.modelContext?.registerTool) {
  const life=new AbortController();window.addEventListener('pagehide',()=>life.abort(),{once:true});
  for(const tool of [
    {name:'read_credential_registry',description:'Refresh and return the public finalized credential registry.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async()=>{await refresh();if(state.error)throw new Error(state.error);return {total:state.total,claims:state.claims.map(c=>({id:c.id,status:c.status,title:c.title}))};}},
    {name:'inspect_credential_claim',description:'Read a public finalized claim and show it in the claim workspace.',inputSchema:{type:'object',properties:{claim_id:{type:'string'}},required:['claim_id'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:async({claim_id})=>{if(typeof claim_id!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(claim_id))throw new Error('Invalid claim ID');state.selected=await read('get_claim',[claim_id]);render();fields();return {id:claim_id,status:state.selected.status,credential:state.selected.credential};}}
  ]) Promise.resolve(document.modelContext.registerTool(tool,{signal:life.signal})).catch(()=>{});
}
fields();refresh();
