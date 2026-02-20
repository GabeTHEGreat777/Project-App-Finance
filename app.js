const $ = id => document.getElementById(id);
const ids = ['netWorth','income','saveRate','raisePct','raiseInvestPct','returnPct','inflationPct','horizon','wr','prevIncome','currIncome','spendBefore','spendAfter','retA','retB','retC','scenarioInvest','sims','volatility','taxDrag'];
ids.forEach(id=>$(id)?.addEventListener('input', render));
$('runMonte')?.addEventListener('click', runMonteCarlo);

function currency(n){return `$${Math.round(n).toLocaleString()}`}

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

  const sb=+$('spendBefore').value||0,sa=+$('spendAfter').value||0;
  const monthlyCreep=Math.max(0,sa-sb);
  $('monthlyCreep').textContent=currency(monthlyCreep);
  const annualCost=monthlyCreep*12;
  $('annualCost').textContent=currency(annualCost);
  const compLoss=annualCost*(((1+b.ret/100)**10-1)/(b.ret/100||0.07));
  $('compLoss').textContent=currency(compLoss);
  $('fiDelay').textContent = driftCost>0 ? `${Math.max(1,Math.round(driftCost/(annualSave||1)))} years` : '0 years';

  const scenarioInvest=+$('scenarioInvest').value||70;
  const sA=project({...b,ret:+$('retA').value||6,raiseInvestPct:scenarioInvest}).d;
  const sB=project({...b,ret:+$('retB').value||7,raiseInvestPct:scenarioInvest}).d;
  const sC=project({...b,ret:+$('retC').value||9,raiseInvestPct:scenarioInvest}).d;
  drawScenarioChart([
    {name:'A',values:sA,color:'#6a88ff'},
    {name:'B',values:sB,color:'#5cc3ff'},
    {name:'C',values:sC,color:'#9ee493'},
  ]);
}

function runMonteCarlo(){
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

render();
runMonteCarlo();