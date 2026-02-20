const $ = id => document.getElementById(id);
const ids = ['netWorth','income','saveRate','raisePct','raiseInvestPct','returnPct','inflationPct','horizon','wr','prevIncome','currIncome','spendBefore','spendAfter'];
ids.forEach(id=>$(id).addEventListener('input', render));

function currency(n){return `$${Math.round(n).toLocaleString()}`}

function project({years,nw,income,saveRate,raisePct,raiseInvestPct,ret,infl}){
  const d=[nw], l=[nw];
  let di=nw, li=nw, inc=income;
  for(let y=1;y<=years;y++){
    const baseSave=inc*(saveRate/100);
    const raise=inc*(raisePct/100);
    const investRaise=raise*(raiseInvestPct/100);
    const driftRaise=raise-investRaise;
    di = di*(1+ret/100) + baseSave + investRaise;
    li = li*(1+ret/100) + baseSave - driftRaise;
    d.push(di); l.push(li);
    inc *= (1 + infl/100 + raisePct/100);
  }
  return {d,l};
}

function drawChart(d,l){
  const c=$('chart'),ctx=c.getContext('2d');
  const w=c.width,h=c.height,p=40;
  ctx.clearRect(0,0,w,h);
  const max=Math.max(...d,...l)*1.1;
  const x=i=>p+i*(w-2*p)/(d.length-1);
  const y=v=>h-p-(v/max)*(h-2*p);

  ctx.strokeStyle='#2d3444';ctx.lineWidth=1;
  for(let i=0;i<5;i++){const yy=p+i*(h-2*p)/4;ctx.beginPath();ctx.moveTo(p,yy);ctx.lineTo(w-p,yy);ctx.stroke();}

  ctx.beginPath(); ctx.moveTo(x(0),y(d[0])); d.forEach((v,i)=>ctx.lineTo(x(i),y(v))); ctx.strokeStyle='#6a88ff'; ctx.lineWidth=3; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x(0),y(l[0])); l.forEach((v,i)=>ctx.lineTo(x(i),y(v))); ctx.strokeStyle='#c35c76'; ctx.lineWidth=3; ctx.stroke();

  ctx.beginPath();
  d.forEach((v,i)=> i===0?ctx.moveTo(x(i),y(v)):ctx.lineTo(x(i),y(v)));
  for(let i=l.length-1;i>=0;i--) ctx.lineTo(x(i),y(l[i]));
  ctx.closePath(); ctx.fillStyle='rgba(92,195,255,0.15)'; ctx.fill();
}

function render(){
  const nw=+$('netWorth').value||0, income=+$('income').value||0, saveRate=+$('saveRate').value||0;
  const raisePct=+$('raisePct').value||0, raiseInvestPct=+$('raiseInvestPct').value||0, ret=+$('returnPct').value||0;
  const infl=+$('inflationPct').value||0, years=+$('horizon').value||10, wr=+$('wr').value||4;

  const {d,l}=project({years,nw,income,saveRate,raisePct,raiseInvestPct,ret,infl});
  drawChart(d,l);

  const driftCost = d[d.length-1]-l[l.length-1];
  $('driftCost').textContent=currency(driftCost);

  const ten=project({years:10,nw,income,saveRate,raisePct,raiseInvestPct,ret,infl});
  $('delta10').textContent = currency(ten.d[10]-ten.l[10]);

  const annualSave=income*(saveRate/100);
  const fiTarget=annualSave/(wr/100);
  $('fiTarget').textContent=currency(fiTarget);

  const currAge=30;
  const fiIndex= d.findIndex(v=>v>=fiTarget);
  const fiAge= fiIndex===-1 ? '40+' : String(currAge+fiIndex);
  $('fiAge').textContent=fiAge;
  $('yearsRemain').textContent= fiIndex===-1 ? '>10' : String(fiIndex);

  const prev=+$('prevIncome').value||0,curr=+$('currIncome').value||0;
  const sb=+$('spendBefore').value||0,sa=+$('spendAfter').value||0;
  const monthlyCreep=Math.max(0,sa-sb);
  $('monthlyCreep').textContent=currency(monthlyCreep);
  const annualCost=monthlyCreep*12;
  $('annualCost').textContent=currency(annualCost);
  const compLoss=annualCost*(((1+ret/100)**10-1)/(ret/100||0.07));
  $('compLoss').textContent=currency(compLoss);
  $('fiDelay').textContent = driftCost>0 ? `${Math.max(1,Math.round(driftCost/(annualSave||1)))} years` : '0 years';
}

render();