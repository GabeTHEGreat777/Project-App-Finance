const $ = id => document.getElementById(id);
const ids = ['netWorth','income','saveRate','raisePct','raiseInvestPct','returnPct','inflationPct','horizon','wr','prevIncome','currIncome','spendBefore','spendAfter','retA','retB','retC','saveA','saveB','saveC','investA','investB','investC','raiseA','raiseB','raiseC','sims','volatility','taxDrag','taxModel'];
ids.forEach(id=>$(id)?.addEventListener('input', render));
$('runMonte')?.addEventListener('click', runMonteCarlo);
$('syncTaxModel')?.addEventListener('click', () => { const v = +$('taxModel').value || 1; $('taxDrag').value = String(v); render(); runMonteCarlo(); });
$('saveProfile')?.addEventListener('click', saveProfile);
$('loadProfile')?.addEventListener('click', loadProfile);
$('exportPdf')?.addEventListener('click', exportPdfReport);
$('proMode')?.addEventListener('change', applyProMode);

function currency(n){return `$${Math.round(n).toLocaleString()}`}

function isPro(){ return !!$('proMode')?.checked; }

function applyProMode(){
  const on = isPro();
  document.querySelectorAll('[data-pro="true"]').forEach(el => el.classList.toggle('pro-locked', !on));
  if($('proBadge')) $('proBadge').textContent = on ? 'Pro Tier Active' : 'Free Tier';
}

function project({years,nw,income,saveRate,raisePct,raiseInvestPct,ret,infl,taxDrag=0}){
  const d=[nw], l=[nw];
  let di=nw, li=nw, inc=income;
  const effectiveRet=Math.max(-20, ret-taxDrag);
  for(let y=1;y<=years;y++){
    const baseSave=inc*(saveRate/100);
    const raise=inc*(raisePct/100);
    const investRaise=raise*(raiseInvestPct/100);
    const driftRaise=raise-investRaise;
    di = di*(1+effectiveRet/100) + baseSave + investRaise;
    li = li*(1+effectiveRet/100) + baseSave - driftRaise;
    d.push(di); l.push(li);
    inc *= (1 + infl/100 + raisePct/100);
  }
  return {d,l};
}

function drawTwoLineChart(canvasId,d,l,colorA='#6a88ff',colorB='#c35c76'){
  const c=$(canvasId),ctx=c.getContext('2d');
  const w=c.width,h=c.height,p=40;
  ctx.clearRect(0,0,w,h);
  const max=Math.max(...d,...l)*1.1;
  const x=i=>p+i*(w-2*p)/(d.length-1);
  const y=v=>h-p-(v/max)*(h-2*p);

  ctx.strokeStyle='#2d3444';ctx.lineWidth=1;
  for(let i=0;i<5;i++){const yy=p+i*(h-2*p)/4;ctx.beginPath();ctx.moveTo(p,yy);ctx.lineTo(w-p,yy);ctx.stroke();}

  ctx.beginPath(); ctx.moveTo(x(0),y(d[0])); d.forEach((v,i)=>ctx.lineTo(x(i),y(v))); ctx.strokeStyle=colorA; ctx.lineWidth=3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x(0),y(l[0])); l.forEach((v,i)=>ctx.lineTo(x(i),y(v))); ctx.strokeStyle=colorB; ctx.lineWidth=3; ctx.stroke();

  ctx.beginPath();
  d.forEach((v,i)=> i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
  for(let i=l.length-1;i>=0;i--) ctx.lineTo(x(i),y(l[i]));
  ctx.closePath(); ctx.fillStyle='rgba(92,195,255,0.15)'; ctx.fill();
}

function drawScenarioChart(series){
  const c=$('scenarioChart'),ctx=c.getContext('2d');
  const w=c.width,h=c.height,p=40;
  ctx.clearRect(0,0,w,h);
  const all=series.flatMap(s=>s.values);
  const max=Math.max(...all)*1.1;
  const len=series[0].values.length;
  const x=i=>p+i*(w-2*p)/(len-1);
  const y=v=>h-p-(v/max)*(h-2*p);
  ctx.strokeStyle='#2d3444';ctx.lineWidth=1;
  for(let i=0;i<5;i++){const yy=p+i*(h-2*p)/4;ctx.beginPath();ctx.moveTo(p,yy);ctx.lineTo(w-p,yy);ctx.stroke();}

  series.forEach(s=>{
    ctx.beginPath();
    ctx.moveTo(x(0),y(s.values[0]));
    s.values.forEach((v,i)=>ctx.lineTo(x(i),y(v)));
    ctx.strokeStyle=s.color;ctx.lineWidth=2.5;ctx.stroke();
  });
}

function percentile(arr,p){
  const a=[...arr].sort((x,y)=>x-y);
  const idx=(a.length-1)*p;
  const lo=Math.floor(idx), hi=Math.ceil(idx);
  if(lo===hi) return a[lo];
  return a[lo] + (a[hi]-a[lo])*(idx-lo);
}

function drawMonteChart(points){
  const c=$('monteChart'),ctx=c.getContext('2d');
  const w=c.width,h=c.height,p=40;
  ctx.clearRect(0,0,w,h);
  const max=Math.max(...points.p10,...points.p50,...points.p90)*1.1;
  const len=points.p50.length;
  const x=i=>p+i*(w-2*p)/(len-1);
  const y=v=>h-p-(v/max)*(h-2*p);

  ctx.strokeStyle='#2d3444';ctx.lineWidth=1;
  for(let i=0;i<5;i++){const yy=p+i*(h-2*p)/4;ctx.beginPath();ctx.moveTo(p,yy);ctx.lineTo(w-p,yy);ctx.stroke();}

  ctx.beginPath();
  points.p90.forEach((v,i)=> i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
  for(let i=points.p10.length-1;i>=0;i--) ctx.lineTo(x(i),y(points.p10[i]));
  ctx.closePath(); ctx.fillStyle='rgba(106,136,255,0.18)'; ctx.fill();

  ctx.beginPath(); ctx.moveTo(x(0),y(points.p50[0])); points.p50.forEach((v,i)=>ctx.lineTo(x(i),y(v))); ctx.strokeStyle='#5cc3ff'; ctx.lineWidth=3; ctx.stroke();
}

function baseInputs(){
  return {
    nw:+$('netWorth').value||0,
    income:+$('income').value||0,
    saveRate:+$('saveRate').value||0,
    raisePct:+$('raisePct').value||0,
    raiseInvestPct:+$('raiseInvestPct').value||0,
    ret:+$('returnPct').value||0,
    infl:+$('inflationPct').value||0,
    years:+$('horizon').value||10,
  }
}

function currentFormState(){
  const state = {};
  ids.forEach(id => state[id] = $(id)?.value ?? '');
  return state;
}

function applyFormState(state){
  if(!state) return;
  ids.forEach(id => { if($(id) && state[id] !== undefined) $(id).value = state[id]; });
}

function getProfiles(){
  try { return JSON.parse(localStorage.getItem('wealtharc_profiles') || '{}'); }
  catch { return {}; }
}

function setProfiles(p){ localStorage.setItem('wealtharc_profiles', JSON.stringify(p)); }

function refreshProfileSelect(){
  const select = $('profileSelect');
  if(!select) return;
  const profiles = getProfiles();
  select.innerHTML = '';
  const keys = Object.keys(profiles);
  if(keys.length===0){
    const o = document.createElement('option');
    o.textContent='(none)'; o.value='';
    select.appendChild(o);
    $('profileStatus').textContent='No profiles saved yet.';
    return;
  }
  keys.forEach(k=>{ const o=document.createElement('option'); o.value=k; o.textContent=k; select.appendChild(o); });
  $('profileStatus').textContent=`${keys.length} profile(s) saved.`;
}

function saveProfile(){
  if(!isPro()){ $('profileStatus').textContent='Profiles are Pro-only.'; return; }
  const name = ($('profileName')?.value || '').trim() || 'Scenario';
  const profiles = getProfiles();
  profiles[name] = currentFormState();
  setProfiles(profiles);
  refreshProfileSelect();
  $('profileSelect').value = name;
  $('profileStatus').textContent = `Saved profile: ${name}`;
}

function loadProfile(){
  if(!isPro()){ $('profileStatus').textContent='Load profiles is Pro-only.'; return; }
  const name = $('profileSelect')?.value;
  if(!name) return;
  const profiles = getProfiles();
  applyFormState(profiles[name]);
  $('profileStatus').textContent = `Loaded profile: ${name}`;
  render();
  runMonteCarlo();
}

function exportPdfReport(){
  if(!isPro()){ $('profileStatus').textContent='PDF export is Pro-only.'; return; }
  const win = window.jspdf;
  if(!win?.jsPDF){
    $('profileStatus').textContent = 'PDF lib not loaded.';
    return;
  }
  const doc = new win.jsPDF();
  const b = baseInputs();
  const wr = +$('wr').value||4;
  const p10 = $('p10').textContent;
  const p50 = $('p50').textContent;
  const p90 = $('p90').textContent;

  const annualSave=b.income*(b.saveRate/100);
  const fiTarget=annualSave/(wr/100||0.04);

  const lines = [
    'WealthArc - Wealth Projection Report',
    'Tagline: See how your decisions shift your freedom date.',
    '',
    `Net Worth: ${currency(b.nw)}`,
    `Income: ${currency(b.income)}`,
    `Savings Rate: ${b.saveRate}%`,
    `Raise %: ${b.raisePct}%`,
    `Raise Invested %: ${b.raiseInvestPct}%`,
    `Return %: ${b.ret}%`,
    `Inflation %: ${b.infl}%`,
    `Horizon: ${b.years} years`,
    `Tax Drag: ${$('taxDrag').value}% (model ${$('taxModel').value}%)`,
    '',
    `Scenario A: return ${$('retA').value}% | save ${$('saveA').value}% | invest raise ${$('investA').value}%`,
    `Scenario B: return ${$('retB').value}% | save ${$('saveB').value}% | invest raise ${$('investB').value}%`,
    `Scenario C: return ${$('retC').value}% | save ${$('saveC').value}% | invest raise ${$('investC').value}%`,
    '',
    `FI Target Net Worth: ${currency(fiTarget)}`,
    `Current Drift Cost: ${$('driftCost').textContent}`,
    `10Y Net Worth Delta: ${$('delta10').textContent}`,
    `FI Delay: ${$('fiDelay').textContent}`,
    '',
    `Monte Carlo P10: ${p10}`,
    `Monte Carlo P50: ${p50}`,
    `Monte Carlo P90: ${p90}`,
  ];

  let y=15;
  lines.forEach(line=>{ doc.text(line, 12, y); y += 7; if(y>280){ doc.addPage(); y=15; } });
  doc.save('WealthArc-Projection-Report.pdf');
  $('profileStatus').textContent='Exported Wealth Projection Report PDF.';
}

function render(){
  const b=baseInputs();
  const wr=+$('wr').value||4;

  const {d,l}=project({...b});
  drawTwoLineChart('chart',d,l);

  const driftCost = d[d.length-1]-l[l.length-1];
  $('driftCost').textContent=currency(driftCost);

  const ten=project({...b,years:10});
  $('delta10').textContent = currency(ten.d[10]-ten.l[10]);

  const annualSave=b.income*(b.saveRate/100);
  const fiTarget=annualSave/(wr/100||0.04);
  $('fiTarget').textContent=currency(fiTarget);

  const currAge=30;
  const fiIndex= d.findIndex(v=>v>=fiTarget);
  const fiAge= fiIndex===-1 ? '40+' : String(currAge+fiIndex);
  $('fiAge').textContent=fiAge;
  $('yearsRemain').textContent= fiIndex===-1 ? '>10' : String(fiIndex);
  $('fiCountdown').textContent = fiIndex===-1 ? 'Beyond model horizon' : `${fiIndex}y to freedom`;

  const sb=+$('spendBefore').value||0,sa=+$('spendAfter').value||0;
  const monthlyCreep=Math.max(0,sa-sb);
  $('monthlyCreep').textContent=currency(monthlyCreep);
  const annualCost=monthlyCreep*12;
  $('annualCost').textContent=currency(annualCost);
  const compLoss=annualCost*(((1+b.ret/100)**10-1)/(b.ret/100||0.07));
  $('compLoss').textContent=currency(compLoss);
  $('fiDelay').textContent = driftCost>0 ? `${Math.max(1,Math.round(driftCost/(annualSave||1)))} years` : '0 years';

  const sA=project({...b,ret:+$('retA').value||6,saveRate:+$('saveA').value||22,raiseInvestPct:+$('investA').value||55,raisePct:+$('raiseA').value||4}).d;
  const sB=project({...b,ret:+$('retB').value||7,saveRate:+$('saveB').value||28,raiseInvestPct:+$('investB').value||70,raisePct:+$('raiseB').value||5}).d;
  const sC=project({...b,ret:+$('retC').value||9,saveRate:+$('saveC').value||35,raiseInvestPct:+$('investC').value||90,raisePct:+$('raiseC').value||6}).d;
  drawScenarioChart([
    {name:'A',values:sA,color:'#6a88ff'},
    {name:'B',values:sB,color:'#5cc3ff'},
    {name:'C',values:sC,color:'#9ee493'},
  ]);
}

function runMonteCarlo(){
  if(!isPro()){ $('p10').textContent='--'; $('p50').textContent='--'; $('p90').textContent='--'; $('profileStatus').textContent='Monte Carlo is Pro-only.'; return; }
  const b=baseInputs();
  const sims=Math.max(20, +$('sims').value||120);
  const vol=+$('volatility').value||12;
  const taxDrag=+$('taxDrag').value||1;

  const tracks=[];
  for(let s=0;s<sims;s++){
    const vals=[b.nw];
    let v=b.nw, inc=b.income;
    for(let y=1;y<=b.years;y++){
      const randomShock=((Math.random()*2-1)*vol);
      const ret=(b.ret - taxDrag + randomShock);
      const baseSave=inc*(b.saveRate/100);
      const raise=inc*(b.raisePct/100);
      const investRaise=raise*(b.raiseInvestPct/100);
      v = v*(1+ret/100) + baseSave + investRaise;
      vals.push(v);
      inc *= (1 + b.infl/100 + b.raisePct/100);
    }
    tracks.push(vals);
  }

  const p10=[],p50=[],p90=[];
  for(let i=0;i<=b.years;i++){
    const col=tracks.map(t=>t[i]);
    p10.push(percentile(col,0.1));
    p50.push(percentile(col,0.5));
    p90.push(percentile(col,0.9));
  }

  drawMonteChart({p10,p50,p90});
  $('p10').textContent=currency(p10[p10.length-1]);
  $('p50').textContent=currency(p50[p50.length-1]);
  $('p90').textContent=currency(p90[p90.length-1]);
}

refreshProfileSelect();
applyProMode();
render();
runMonteCarlo();