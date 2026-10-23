/* ===== DADOS ===== */
const T={n:{c:'#f2c9a0',p:1,nm:'Normal',h:350,s:''},e:{c:'#78c2ff',p:2,nm:'Estável',h:350,s:'◆'},h:{c:'#ff7b7b',p:3,nm:'Pesada',h:1000,s:'●'},b:{c:'#ffd24d',p:5,nm:'Bônus',h:400,s:'★'},s:{c:'#c39bff',p:2,nm:'Surpresa',h:400,s:'?'}};
const COL=['#78c2ff','#c39bff','#7ee0a1','#ffb066'],CN=['AZUL','ROXO','VERDE','LARANJA'],ROUNDS=12;
const EVS=[
 {i:'🌬️',n:'VENTO',d:'A torre fica mais instável nesta rodada.',f:()=>G.wind=1},
 {i:'🌎',n:'TERREMOTO',d:'A torre balança: −15% de estabilidade nesta rodada.',f:()=>G.quake=1},
 {i:'⚡',n:'SOBRECARGA',d:'Peças de uma cor valem o dobro nesta rodada (veja o painel).',f:()=>G.surge=rnd(['n','e','h','b'])},
 {i:'🧊',n:'GELO',d:'Uma peça congelou e não pode ser retirada nesta rodada.',f:()=>{const c=[];G.lv.forEach((l,i)=>l.forEach((b,j)=>{if(removable(i,j))c.push(b.id)}));G.ice=rnd(c)}},
 {i:'💰',n:'DOBRO',d:'As próximas 3 peças retiradas valem o dobro.',f:()=>G.dbl=3}];
const CH=[
 ()=>{const n=2+Math.floor(Math.random()*(G.lv.length-3));return{txt:`Retire uma peça do ${n}º andar`,test:i=>i+1==n}},
 ()=>({txt:'Retire uma peça azul 🟦',test:(i,j,b)=>b.t=='e'}),
 ()=>({txt:'Retire uma peça amarela 🟨',test:(i,j,b)=>b.t=='b'}),
 ()=>({txt:'Retire a peça do meio de um andar',test:(i,j)=>j==1}),
 ()=>({txt:'Jogue em menos de 8 segundos ⏱️',test:(i,j,b,t)=>t<8000})];

/* ===== UTILITÁRIOS ===== */
const $=s=>document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms)),rnd=a=>a[Math.floor(Math.random()*a.length)],rn=(a,b)=>a+Math.random()*(b-a);
let G=null,rot=-28,AC,uid=0;
const me=()=>{if(!G||G.over)return null;const p=G.players[G.cur];return p.ai?null:p};
const mu=s=>s>=10?5:s>=5?3:s>=3?2:1,log=t=>{G.log.unshift(t);G.log.length=20};
const F=s=>`<i class="f">${s}</i><i class="k"></i><i class="r"></i><i class="l"></i><i class="t"></i>`;
function snd(f=300,d=.12,t='square'){try{AC=AC||new AudioContext();const o=AC.createOscillator(),g=AC.createGain();o.type=t;o.frequency.value=f;g.gain.value=.05;o.connect(g);g.connect(AC.destination);o.start();g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.stop(AC.currentTime+d)}catch(e){}}
function fx(t,c,el){const b=(el||$('#stage')).getBoundingClientRect(),d=document.createElement('div');d.className='fx';d.textContent=t;d.style.cssText=`left:${b.left+b.width/2}px;top:${b.top+b.height/(el?2:3)}px;color:${c||'#2b2350'}`;document.body.appendChild(d);setTimeout(()=>d.remove(),1500)}
function modal(html,auto,btn='CONTINUAR'){return new Promise(res=>{const m=$('#modal');m.innerHTML=`<div class="card">${html}${btn?`<button class="btn" id="mok">${btn}</button>`:''}</div>`;m.classList.add('on');const done=()=>{m.classList.remove('on');res()};if(btn)$('#mok').onclick=done;if(auto)setTimeout(done,auto);snd(400,.2,'triangle')})}
const show=id=>document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('on',s.id===id));
const RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
function puff(x,y,c,n=10,sp=90){                                    // explosão de partículas
  if(RM)return;
  for(let k=0;k<n;k++){const d=document.createElement('div'),a=Math.random()*6.28,r=rn(sp*.4,sp);
    d.style.cssText=`position:fixed;left:${x}px;top:${y}px;width:${rn(6,14)}px;height:${rn(6,14)}px;border-radius:50%;background:${c};border:2px solid #2b2350;z-index:61;pointer-events:none`;document.body.appendChild(d);
    d.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(a)*r}px),calc(-50% + ${Math.sin(a)*r-20}px)) scale(.2)`,opacity:0}],{duration:rn(500,900),easing:'ease-out'}).onfinish=()=>d.remove()}
}
function thump(a){if(RM)return;$('#stage').animate([{transform:'translate(0,0)'},{transform:`translate(${-a}px,${a*.7}px)`},{transform:`translate(${a}px,${-a*.6}px)`},{transform:'translate(0,0)'}],{duration:300})}
function flash(){const d=document.createElement('div');d.style.cssText='position:absolute;inset:0;background:#fff;z-index:5;pointer-events:none';$('#stage').appendChild(d);d.animate([{opacity:.85},{opacity:0}],{duration:600}).onfinish=()=>d.remove()}
function ring(){const d=document.createElement('div');d.style.cssText='position:absolute;left:50%;bottom:34px;width:360px;height:96px;margin-left:-180px;border-radius:50%;border:5px solid #fff;pointer-events:none';$('#stage').appendChild(d);d.animate([{transform:'scale(.3)',opacity:.9},{transform:'scale(1.8)',opacity:0}],{duration:1000,easing:'ease-out'}).onfinish=()=>d.remove()}

/* ===== REGRAS: estabilidade da torre ===== */
const removable=(i,j)=>{const b=G.lv[i][j];return !!b&&i<G.lv.length-1&&G.ice!==b.id};
function stab(){
  let s=100;const n=G.lv.length;
  G.lv.forEach((l,i)=>{
    if(i==n-1)return;const c=l.filter(Boolean).length;
    if(!c){s=-999;return}
    let pen=c==3?0:c==2?(l[1]?10:4):(l[1]?18:40);                // andar incompleto pesa mais perto da base
    if(l.some(b=>b&&b.t=='e'))pen*=.5;                          // peça estável reforça o andar
    s-=pen*(.6+.08*(n-1-i));
  });
  s-=G.lv.slice(-3).flat().filter(b=>b&&b.t=='h').length*5;     // pesadas no topo
  s-=(G.wind?10:0)+(G.quake?15:0);
  return Math.max(0,Math.round(s));
}
const ch=s=>s<=0?1:s>=55?0:Math.pow((55-s)/55,1.3);               // chance de cair

/* ===== INÍCIO ===== */
function newGame(n,demo,md){
  const nm=($('#pname').value.trim()||'Jogador').toUpperCase();
  const rb=()=>{const r=Math.random();return{id:++uid,t:r<.55?'n':r<.67?'e':r<.77?'h':r<.87?'b':'s',st:Math.random()<.2}};
  G={lv:Array.from({length:12},()=>[rb(),rb(),rb()]),players:[...Array(n)].map((_,i)=>({name:demo?'IA '+CN[i]:i==0?nm:'IA '+CN[i],col:COL[i],ai:demo||i>0,pts:0,rm:0,streak:0,best:0})),
   round:1,cur:0,phase:'pick',md,demo,over:false,log:[],hint:'',ice:null,wind:0,quake:0,surge:null,dbl:0,ch:null,left:10,t0:0,held:null,hold:null};
  show('game');startRound();
}
async function startRound(){
  const g=G;if(g.round>ROUNDS){finish();return}
  g.wind=g.quake=0;g.surge=null;g.ice=null;
  if(g.round%3==0){const e=rnd(EVS);e.f();log(`Rodada ${g.round}: ${e.n}`);render();await modal(`<small>EVENTO ESPECIAL</small><div class="ev">${e.i}</div><h2>${e.n}</h2><p>${e.d}</p>`,g.demo?1800:0);if(G!==g)return}
  if(g.round==1&&!g.shown){g.shown=1;g.intro=true;g.phase='intro';render();snd(300,.3,'triangle');await sleep(1900);if(G!==g)return;g.intro=false}
  beginTurn();
}
function beginTurn(){
  const g=G;g.phase='pick';g.t0=Date.now();g.left=10;g.held=null;g.ch=g.md=='d'?rnd(CH)():null;
  g.hint=g.players[g.cur].ai?'':'Sua vez! Segure uma peça para puxá-la.';render();
  if(g.players[g.cur].ai)aiTurn();
}
function endTurn(){G.cur++;if(G.cur>=G.players.length){G.cur=0;G.round++;startRound()}else beginTurn()}

/* ===== JOGADA ===== */
async function doRemove(p,i,j){
  const g=G,b=g.lv[i][j],el=document.querySelector(`.b[data-i="${i}"][data-j="${j}"]`);
  g.phase='busy';if(el){el.classList.remove('sel');el.classList.add('out');const r=el.getBoundingClientRect();puff(r.left+r.width/2,r.top+r.height/2,T[b.t].c,12,110)}snd(200,.3,'sawtooth');await sleep(380);if(G!==g)return;
  g.lv[i][j]=null;
  if(Math.random()<ch(stab())){await collapse(p);return}
  p.rm++;p.streak++;p.best=Math.max(p.best,p.streak);
  let pts=(T[b.t].p+(b.st?2:0))*mu(p.streak)*(g.surge==b.t?2:1)*(g.dbl>0?2:1);if(g.dbl>0)g.dbl--;
  let msg='+'+pts;
  if(g.ch){const ok=g.ch.test(i,j,b,Date.now()-g.t0);pts+=ok?5:-2;msg+=ok?'  🎯 +5':'  ❌ −2'}
  p.pts+=pts;fx(msg+(mu(p.streak)>1?`  COMBO x${mu(p.streak)}`:''),p.col);snd(660,.2,'triangle');log(`${p.name} retirou uma peça ${T[b.t].nm.toLowerCase()} (+${pts})`);
  g.held=b;g.phase='place';g.hint=p.ai?'':'Agora coloque a peça no topo: clique em um espaço pontilhado.';
  if(b.t=='s'){const e=rnd(EVS);e.f();log(`Surpresa! ${e.n}`);fx(e.i+' '+e.n,'#9b59d6')}
  render();
}
const ghostSlots=()=>{const n=G.lv.length,t=G.lv[n-1];return t.every(Boolean)?[[n,0],[n,1],[n,2]]:t.map((b,j)=>b?null:[n-1,j]).filter(Boolean)};
function place(p,gi,gj){
  const g=G;if(g.phase!='place'||!g.held)return;
  if(gi>=g.lv.length)g.lv.push([null,null,null]);g.lastId=g.held.id;g.lv[gi][gj]=g.held;g.held=null;g.phase='wait';g.hint='';snd(130,.2);log(`${p.name} colocou a peça no topo`);render();setTimeout(()=>{if(G!==g)return;const e=document.querySelector('.b.drop');if(e){const r=e.getBoundingClientRect();puff(r.left+r.width/2,r.top+r.height,'#fff',8,60)}thump(4);snd(110,.15)},520);
  setTimeout(()=>{if(G===g&&!g.over)endTurn()},650);
}
async function collapse(p){
  const g=G,n=g.lv.length;g.over=true;g.phase='over';render();
  $('#wob').className='wob crit';$('#tw').style.transform=`scale(${(Math.min(1,430/(n*34+70))*1.12).toFixed(2)}) rotateX(-16deg) rotateY(${rot}deg)`;
  fx('⚠️ ELA VAI CAIR!','#d6336c');snd(90,.9,'sawtooth');
  [...document.querySelectorAll('#tw .bx')].sort(()=>Math.random()-.5).slice(0,8).forEach(x=>x.animate([{transform:'translateZ(0)'},{transform:`translateZ(${rn(10,22)}px)`},{transform:'translateZ(0)'}],{duration:260,iterations:3}));   // peças escorregando
  await sleep(1100);if(G!==g)return;
  fx('💥 CRASH!','#e8590c');thump(14);flash();ring();snd(60,1.2,'sawtooth');
  let end=0;
  document.querySelectorAll('#tw .lv').forEach((lv,i)=>lv.querySelectorAll('.bx').forEach(x=>{
    const o=i%2?90:0,yf=i*34+rn(-2,2),dx=rn(-210,210),dz=rn(-110,170),rd=rn(180,720)*(Math.random()<.5?-1:1),ax=[Math.random()+.1,Math.random(),Math.random()].join(','),
      du=rn(1500,2100),de=(n-1-i)*45+rn(0,260),
      T=(k,y,sc)=>`rotateY(${-o}deg) translate3d(${dx*k}px,${y}px,${dz*k}px) rotateY(${o}deg) rotate3d(${ax},${rd*sc}deg)`;   // gira, cai, quica e assenta
    x.animate([{transform:T(0,0,0),offset:0},{transform:T(.05,-6,.03),offset:.12},{transform:T(.7,yf*.75,.75),offset:.6,easing:'ease-in'},{transform:T(1,yf,1),offset:.78,easing:'ease-out'},{transform:T(1.03,yf-24,1.05),offset:.88,easing:'ease-in'},{transform:T(1.05,yf,1.05),offset:1}],{duration:du,delay:de,fill:'forwards'});
    end=Math.max(end,du+de);
    if(Math.random()<.4)setTimeout(()=>{if(G!==g)return;const r=x.getBoundingClientRect();puff(r.left+r.width/2,r.top+r.height/2,'#fff',6,70);thump(5);snd(rn(60,110),.2)},de+du*.78);
  }));
  await sleep(end+800);if(G!==g)return;
  const rest=g.players.filter(x=>x!==p),w=rest.reduce((a,x)=>x.pts>a.pts?x:a,rest[0]);
  modal(`<small>💥 TORRE DERRUBADA</small><div class="ev">🏚️</div><h2 style="color:${p.col==='#ffb066'?'#e8590c':'var(--ink)'}">${p.name}</h2><p>${p.pts} pontos · ${p.rm} peças retiradas · maior combo x${mu(p.best)}</p><p style="color:var(--ink);font-weight:700;margin-top:-8px">🏆 Vence: ${w.name} (${w.pts})</p>`,0,'JOGAR NOVAMENTE').then(()=>show('start'));
}
function finish(){
  G.over=true;render();const w=G.players.reduce((a,x)=>x.pts>a.pts?x:a);snd(780,.8,'triangle');
  modal(`<small>A TORRE RESISTIU!</small><div class="big">${w.pts}</div><h2>🏆 ${w.name}</h2><p>${ROUNDS} rodadas sem cair. Maior combo: x${mu(w.best)}</p>`,0,'JOGAR NOVAMENTE').then(()=>show('start'));
}

/* ===== IA ===== */
function aiPick(p){
  let best=null,bv=-1e9;
  G.lv.forEach((l,i)=>l.forEach((b,j)=>{
    if(!removable(i,j))return;l[j]=null;const c=ch(stab());l[j]=b;                      // simula a retirada
    let v=(T[b.t].p+(b.st?2:0))*mu(p.streak+1)*(G.surge==b.t?2:1)-c*60+Math.random()*1.5;
    if(G.ch&&G.ch.test(i,j,b,3000))v+=3;
    if(v>bv){bv=v;best=[i,j]}}));
  return best;
}
async function aiTurn(){
  const g=G,p=g.players[g.cur];await sleep(g.demo?700:1000);if(G!==g||g.over)return;
  const m=aiPick(p);if(!m){finish();return}
  const el=document.querySelector(`.b[data-i="${m[0]}"][data-j="${m[1]}"]`);if(el)el.classList.add('sel');
  await sleep(g.demo?500:800);if(G!==g)return;
  await doRemove(p,m[0],m[1]);if(G!==g||g.over)return;
  await sleep(550);if(G!==g||g.over)return;
  const s=ghostSlots(),sl=s.find(x=>x[1]==1)||rnd(s);place(p,sl[0],sl[1]);
}

/* ===== RENDER ===== */
function render(){
  if(!G)return;
  const S=stab(),n=G.lv.length,zm=Math.min(1,430/(n*34+70)),isme=!!me();
  $('#rnd').textContent=`RODADA ${Math.min(G.round,ROUNDS)}/${ROUNDS}`;
  $('#sc').innerHTML=G.players.map((p,i)=>`<div class="chip${i==G.cur&&!G.over?' cur':''}${G.prev&&G.prev[i]!==p.pts?' bump':''}" style="--c:${p.col}"><i></i>${p.name}<b>${p.pts}</b>${p.streak>=3?`<em>🔥x${mu(p.streak)}</em>`:''}</div>`).join('');
  G.prev=G.players.map(p=>p.pts);let h='';
  G.lv.forEach((l,i)=>{h+=`<div class="lv" style="--i:${i};--o:${i%2?90:0}deg">`+l.map((b,j)=>b?`<div class="b${G.ice===b.id?' ice':''}${G.lastId===b.id?' drop':''}" data-i="${i}" data-j="${j}" style="--z:${(j-1)*40}px;--c:${T[b.t].c}"><div class="bx">${F((b.st?'🔒':'')+T[b.t].s)}</div></div>`:'').join('')+'</div>'});
  if(G.phase=='place'&&isme){const gs=ghostSlots(),gi=gs[0][0];h+=`<div class="lv" style="--i:${gi};--o:${gi%2?90:0}deg">${gs.map(s=>`<div class="b gh" data-gi="${gi}" data-gj="${s[1]}" style="--z:${(s[1]-1)*40}px;--c:#fff"><div class="bx">${F('')}</div></div>`).join('')}</div>`}
  $('#tw').style.transform=`scale(${zm.toFixed(2)}) rotateX(-16deg) rotateY(${rot}deg)`;$('#tw').className='tw'+(G.intro?' in':'');$('#tw').innerHTML=h;G.lastId=null;
  $('#wob').className='wob '+(G.over?'crit':S<30||G.quake?'crit':S<60?'warn':'');
  $('#stage').className=isme&&G.phase=='pick'?'pick':'';$('#stage').style.cssText='';
  const cp=G.players[G.cur],tags=[G.wind&&'🌬️ Vento',G.quake&&'🌎 Terremoto',G.surge&&`⚡ ${T[G.surge].nm} vale 2x`,G.ice&&'🧊 Peça congelada',G.dbl>0&&`💰 Dobro (${G.dbl})`].filter(Boolean);
  $('#side').innerHTML=`
  <div class="box"><div class="turn"><i style="background:${cp.col}"></i>VEZ DE ${cp.name}${G.held?` <span class="hand" style="--c:${T[G.held.t].c}"></span>`:''}</div><div id="hint">${G.hint||'&nbsp;'}</div>${G.md=='v'&&isme?`<div>⏱️ Tempo: <b id="tm">${G.left}</b>s</div>`:''}${G.ch?`<div class="tag">🎯 ${G.ch.txt} (+5 / −2)</div>`:''}</div>
  <div class="box"><h4>ESTABILIDADE</h4><div class="meter"><div class="${S<30?'dg':''}" style="width:${S}%;background:hsl(${S*1.15},85%,55%)"></div></div><b>${S}% · ${S>=60?'ESTÁVEL':S>=30?'INSTÁVEL':'⚠️ PERIGO'}</b>${tags.length?`<div style="margin-top:6px">${tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>`:''}</div>
  <div class="box"><h4>PEÇAS</h4><div class="lgd">${Object.values(T).map(t=>`<span><i style="background:${t.c}"></i>${t.nm} +${t.p}</span>`).join('')}<span>🔒 Presa +2</span></div></div>
  <div class="row"><button class="btn alt" id="rl">◀ Girar</button><button class="btn alt" id="rr">Girar ▶</button></div>
  <div class="box lg"><h4>REGISTRO</h4>${G.log.slice(0,5).map(l=>`<div>${l}</div>`).join('')}</div>`;
  $('#rl').onclick=()=>{rot-=30;render()};$('#rr').onclick=()=>{rot+=30;render()};
}

/* ===== INTERAÇÃO: segurar para puxar ===== */
const cancel=()=>{if(G&&G.hold){clearTimeout(G.hold.t);G.hold.el.classList.remove('sel');G.hold=null}};
$('#stage').addEventListener('pointerdown',e=>{
  const el=e.target.closest('.b:not(.gh)');if(!el||!G||G.phase!='pick'||!me())return;
  const i=+el.dataset.i,j=+el.dataset.j;
  if(!removable(i,j)){G.hint=G.lv[i][j]&&G.ice===G.lv[i][j].id?'🧊 Essa peça está congelada.':'Não dá para retirar peças do último andar.';const h=$('#hint');if(h)h.textContent=G.hint;return}
  const b=G.lv[i][j],ms=T[b.t].h+(b.st?900:0);el.style.setProperty('--d',ms+'ms');el.classList.add('sel');snd(180,ms/1000,'sawtooth');
  G.hold={el,t:setTimeout(()=>{G.hold=null;doRemove(me(),i,j)},ms)};
});
addEventListener('pointerup',cancel);addEventListener('pointercancel',cancel);
$('#stage').addEventListener('click',e=>{const g=e.target.closest('.gh'),p=me();if(g&&p&&G.phase=='place')place(p,+g.dataset.gi,+g.dataset.gj)});
setInterval(()=>{                                                   // modo velocidade: 10 s por jogada
  if(!G||G.over||G.md!='v'||G.phase!='pick'||!me())return;
  G.left--;const t=$('#tm');if(t)t.textContent=Math.max(0,G.left);
  if(G.left<=0){cancel();const c=[];G.lv.forEach((l,i)=>l.forEach((b,j)=>removable(i,j)&&c.push([i,j])));if(!c.length)return;const p=me();p.pts-=2;p.streak=0;G.left=99;fx('⏱️ TEMPO! −2','#d6336c');doRemove(p,...rnd(c))}
},1000);

/* ===== MENU ===== */
const go=f=>{$('#start').classList.add('go');snd(300,.3,'triangle');setTimeout(()=>{$('#start').classList.remove('go');f()},800)};
$('#bplay').onclick=()=>go(()=>newGame(+$('#pn').value,false,$('#pm').value));
$('#bdemo').onclick=()=>go(()=>newGame(4,true,'c'));
$('#bquit').onclick=()=>{cancel();G=null;$('#modal').classList.remove('on');show('start')};
$('#bhow').onclick=()=>modal(`<h2>COMO JOGAR</h2><ul><li><b>Retire uma peça:</b> segure o clique sobre ela até puxar (peças pesadas e presas demoram mais).</li><li><b>Coloque no topo:</b> clique em um espaço pontilhado.</li><li><b>Cuidado:</b> andares incompletos deixam a torre instável. Quem derrubar, perde!</li><li><b>Combo:</b> 3 peças seguidas = x2, 5 = x3, 10 = x5.</li><li><b>Modos:</b> Clássico, Desafio (missões) e Velocidade (10 s).</li><li>Peças roxas (?) disparam um evento surpresa.</li></ul>`,0,'ENTENDI');
$('#ttl').innerHTML=['TOWER','FALL'].map((w,k)=>`<div>${[...w].map((c,i)=>`<span class="ltr" style="--c:${Object.values(T)[(i+k*2)%5].c};--r:${(Math.random()*10-5).toFixed(1)}deg;--d:${(i*.25+k*.4).toFixed(2)}s">${c}</span>`).join('')}</div>`).join('');
for(let k=0;k<6;k++){const c=document.createElement('div');c.className='cloud';c.style.cssText=`top:${rn(4,60)}vh;width:${rn(90,200)}px;animation-duration:${rn(40,90)}s;animation-delay:-${rn(0,60)}s`;document.body.appendChild(c)}
