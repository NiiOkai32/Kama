
// Minimal account status. Signup and sign-in live on their own pages.
const $=id=>document.getElementById(id);
const {normalize:promptKey,randomInt,unique:uniquePrompts,PromptPicker}=window.KamaRandom;
const promptPicker=new PromptPicker({storageKey:'kama_prompt_rotation_v1'});
let accountUser=null;
function authRender(){ $('accountSignedOut').classList.toggle('hidden',!!accountUser);$('accountSignedIn').classList.toggle('hidden',!accountUser);if(accountUser)$('accountInfo').textContent=accountUser.email; }
function trackUsage(event){if(window.kamaTrack)window.kamaTrack(event).catch(()=>{})}
$('signout').onclick=async()=>{try{await window.kamaSupabase.auth.signOut()}finally{window.location.replace('index.html')}};
const CARDS=[
// level 1: warm-up
{l:1,n:"The Slow Embrace",t:"Stand close, arms around each other. Breathe in time for one full minute before anyone speaks.",s:60},
{l:1,n:"Whispered Praise",t:"Take turns whispering what you find most beautiful about the other. Three things each.",s:90},
{l:1,n:"The Long Kiss",t:"Kiss slowly, with no hurry and no hands below the shoulders. Let it build.",s:120},
{l:1,n:"Hands of Silk",t:"One of you lies back while the other maps their arms, neck and back with fingertips only.",s:180},
{l:1,n:"Eyes Open",t:"Sit facing each other, foreheads touching. Say nothing. Hold each other’s gaze.",s:90},
{l:1,n:"The Unhurried Massage",t:"Warm some oil in your hands and massage the shoulders and lower back. Ask what feels best.",s:240},
// level 2: heat
{l:2,n:"The Lotus Seat",t:"Sit facing each other, close, legs wrapped around. Kiss, hold, and let the rhythm find you.",s:180},
{l:2,n:"The Clasp",t:"Lie wrapped together, limbs intertwined. Explore with lips and breath, slowly.",s:180},
{l:2,n:"The Moon’s Path",t:"The leader traces a slow path with their lips from neck to navel and back. Partner guides with sounds.",s:150},
{l:2,n:"Tell Me",t:"Whisper one thing you have wanted to try. The other answers: yes, maybe, or not yet.",s:120},
{l:2,n:"Blindfold Hour",t:"One of you is blindfolded. The other chooses sensations: breath, feather, ice, silk. Switch halfway.",s:300},
{l:2,n:"The Bamboo Splitting",t:"A slow, playful entwining of legs while kissing deeply. Take your time and read each other’s breath.",s:180},
// level 3: fire
{l:3,n:"The Yawning Pose",t:"Start with a deep embrace, then shift together into a position you both enjoy. Narrate what feels good.",s:300},
{l:3,n:"The Supported Embrace",t:"One partner leans on a wall or bed edge, the other holds close. Focus on rhythm and eye contact.",s:240},
{l:3,n:"The Turning Wheel",t:"Begin in any shape you love and change position every minute. Neither plans the next move.",s:360},
{l:3,n:"Role Reversal",t:"Whoever has been following now leads for the whole card. Say aloud what you want.",s:300},
{l:3,n:"The Final Hour",t:"Choose your favourite card from tonight and spend the time on it, no timer pressure. Savour.",s:420}
];
const HUES={1:340,2:350,3:10};
let level=1,cur=null,leader=0,turnCard=null,tid=null,left=0,imgs={};
function names(){return [$('p1').value.trim()||'One',$('p2').value.trim()||'Two',...$('p3').value.split(',').map(x=>x.trim()).filter(Boolean)]}
// Each named traditional position gets its own simple, non-explicit pose study.
// The figures are deliberately abstract silhouettes so the art reads clearly at card size.
const POSES={
"The Lotus Seat":"lotus","The Seated Lotus":"lotus","The Clasp":"embrace","The Bamboo Splitting":"side","The Side-by-Side Nest":"side","Utphullaka Â· The Opened Flower":"open","Indrani Â· The Queenâ€™s Pose":"fold","Veshtitaka Â· The Wrapped Vine":"side","Piditaka Â· The Pressed Embrace":"stack","Karkataka Â· The Crabâ€™s Hold":"sit","Paravritta Â· The Turning Pose":"turn","Samputa Â· The Jewel Box":"stack","Padmasana Â· The Lotus":"lotus","Shulachitaka Â· The Fixed Nail":"raised","The Rolling Wave":"roll","Vijrimbhitaka Â· The Yawning Pose":"open","Vadavaka Â· The Mareâ€™s Grip":"embrace","Vamsha-vidaritaka Â· The Splitting of a Bamboo":"raised","Dhenuka Â· The Cow":"kneel","Avalambitaka Â· The Supported Pose":"stand","The Supported Stand":"stand","The Yawning Pose":"open","The Supported Embrace":"stand","The Turning Wheel":"turn"
};
function poseArt(kind,h){
  const ink=`hsl(${h},68%,76%)`,gold='#e6b86a';
  const person=(x,y,scale=1,rot=0)=>`<g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" fill="${ink}" stroke="${ink}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><circle cx="0" cy="-28" r="10" stroke="none"/><path d="M0 -14 Q-4 1 0 15 M0 -4 Q-15 1 -22 11 M0 -4 Q14 0 21 10 M0 14 Q-13 23 -20 35 M0 14 Q13 22 20 34" fill="none"/></g>`;
  let figures='';
  const p=(...a)=>figures+=person(...a);
  if(kind==='lotus'){p(132,116,1.4);p(191,116,1.4,180)}
  else if(kind==='side'||kind==='roll'){p(125,111,1.45,90);p(196,119,1.4,-90)}
  else if(kind==='stack'||kind==='open'||kind==='fold'||kind==='raised'){p(131,142,1.35,90);p(191,112,1.35,-90);if(kind==='raised')figures+=`<path d="M190 126 Q220 78 234 62" fill="none" stroke="${gold}" stroke-width="5" stroke-linecap="round"/>`;if(kind==='open'||kind==='fold')figures+=`<path d="M130 145 Q108 113 103 84 M130 145 Q150 112 156 83" fill="none" stroke="${gold}" stroke-width="5" stroke-linecap="round"/>`}
  else if(kind==='sit'){p(132,120,1.35);p(190,120,1.35,180)}
  else if(kind==='kneel'){p(130,105,1.35,90);p(202,111,1.35,180)}
  else if(kind==='stand'){p(132,120,1.25,-12);p(193,120,1.25,12);figures+=`<path d="M260 46v118" stroke="${gold}" stroke-width="4" opacity=".7"/>`}
  else if(kind==='turn'){p(132,118,1.4,-25);p(193,118,1.4,155);figures+=`<path d="M91 64a69 48 0 0 1 140 0" fill="none" stroke="${gold}" stroke-width="2" stroke-dasharray="4 7"/>`}
  else {p(132,118,1.4);p(191,118,1.4,180)}
  return `<svg viewBox="0 0 320 200" role="img" aria-label="Abstract silhouette illustration of this position"><defs><radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="hsl(${h},55%,24%)"/><stop offset="1" stop-color="#14090f"/></radialGradient></defs><rect width="320" height="200" fill="url(#g)"/><ellipse cx="160" cy="164" rx="104" ry="12" fill="${gold}" opacity=".12"/>${figures}<path d="M75 164h170" stroke="${gold}" opacity=".32" stroke-width="1"/></svg>`;
}
function art(c){
  if(POSES[c.n])return poseArt(POSES[c.n],HUES[c.l]+(c.n.length*7)%40);
  const i=c.n.length*7+c.t.length;
  const h=HUES[c.l]+(i*17)%40;
  const a=(i*37)%60;
  return `<svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="g" cx="50%" cy="50%" r="70%"><stop offset="0" stop-color="hsl(${h},60%,26%)"/><stop offset="1" stop-color="#14090f"/></radialGradient></defs><rect width="320" height="200" fill="url(#g)"/>
  <g fill="none" stroke-linecap="round" stroke-width="2.2">
  <path d="M20 ${150-a/2} C 90 ${20+a} , 140 ${190-a} , 200 ${90} S 290 ${40+a/2} 305 ${120}" stroke="hsl(${h},80%,70%)" opacity=".9"/>
  <path d="M20 ${60+a/2} C 90 ${190-a} , 150 ${20+a} , 210 ${110} S 280 ${170-a/2} 305 ${70}" stroke="hsl(${(h+30)%360},85%,76%)" opacity=".8"/>
  <path d="M20 105 C 100 ${60+a} , 160 ${150-a} , 305 100" stroke="#e6b86a" opacity=".45" stroke-width="1.2"/></g>
  <circle cx="${70+a*2}" cy="${60+a}" r="2" fill="#e6b86a"/><circle cx="${240-a}" cy="140" r="1.6" fill="#e6b86a"/></svg>`;
}
function show(c){
  if(c!==cur)trackUsage('card_drawn');
  cur=c;clearInterval(tid);tid=null;left=c.s;
  outcomeRecorded=false;$('outcomeStatus').textContent='';$('forfeit').classList.add('hidden');['done','failed'].forEach(id=>$(id).disabled=false);
  $('card').classList.remove('hidden');
  $('art').innerHTML=imgs[c.n]?`<img src="${imgs[c.n]}" alt="">`:art(c);
  const heatTag=c.k==='Wind-down'?'Wind-down':['Date night','Warm-up','Heat','Fire'][c.l];
  $('tag').textContent=heatTag+(c.k&&c.k!==heatTag?' · '+c.k:'');updFav();
  $('name').textContent=c.n;$('text').textContent=c.t;$('truthAnswer').classList.toggle('hidden',c.k!=='Truth'&&!c.q);$('answer').value='';
  const hw=HOW[c.n],hb=$('how');
  if(hw){$('howContent').innerHTML='<ol>'+hw.map(s=>'<li>'+s+'</li>').join('')+'</ol><p>Stay comfortable. Pause or swap any time.</p>';hb.open=false;hb.classList.remove('hidden')}else hb.classList.add('hidden');
  turn();tick();$('start').textContent='Start timer';
}
function turn(){
  const n=names();
  if(turnCard!==cur){if(turnCard)leader=(leader+1)%n.length;turnCard=cur}
  leader=((leader%n.length)+n.length)%n.length;
  const lead=n[leader],follow=n[(leader+1)%n.length];
  const pair=cur&&(cur.k==='Truth'||cur.q)?lead+' asks · '+follow+' answers':
    cur&&cur.k==='Desire'?lead+' invites · '+follow+' responds':
    lead+' leads (A) · '+follow+' follows (B)';
  const others=n.filter((_,i)=>i!==leader&&i!==(leader+1)%n.length);
  $('turn').textContent=pair+(others.length?' · '+others.length+' watching, by agreement':'');
}
function tick(){const m=String(Math.floor(left/60)).padStart(2,'0'),s=String(left%60).padStart(2,'0');$('timer').textContent=m+':'+s}
function draw(){
  const card=promptPicker.take(CARDS.filter(c=>c.l===level&&c.k!=='Wind-down'&&ok(c)),{avoid:cur?.t});
  if(!card){showToast('No cards match. Try another theme or level.');return}
  show(card);
}
document.querySelectorAll('.lv').forEach(b=>b.onclick=()=>{
  level=+b.dataset.l;
  document.querySelectorAll('.lv').forEach(x=>x.setAttribute('aria-pressed',x===b));
});
// ---- more cards: traditional Kamasutra names (transliterations vary) ----
CARDS.push(
{l:2,k:"Traditional",n:"Utphullaka · The Opened Flower",t:"One of you reclines, knees gently drawn up, while the other leans in close. Slow kisses, shared breath, and a lot of eye contact.",s:240},
{l:2,k:"Traditional",n:"Indrani · The Queen’s Pose",t:"One partner reclines with legs folded, the other kneels close and attentive. A tender, unhurried shape named for the queen of the gods.",s:240},
{l:2,k:"Traditional",n:"Veshtitaka · The Wrapped Vine",t:"Lie side by side, legs entwined like climbing vines, holding each other tight. Move slowly, as if you had all night.",s:240},
{l:2,k:"Traditional",n:"Piditaka · The Pressed Embrace",t:"Close together, bodies pressed from chest to knee, arms locked. Stay still first, then let a rhythm begin on its own.",s:180},
{l:2,k:"Traditional",n:"Karkataka · The Crab’s Hold",t:"Hold each other from the front with limbs wrapped firmly around. Nuzzle necks and shoulders and listen to each other’s breathing.",s:180},
{l:2,k:"Traditional",n:"Paravritta · The Turning Pose",t:"Begin in an embrace, then slowly turn together, changing who leads and who follows without ever breaking contact.",s:240},
{l:3,k:"Traditional",n:"Samputa · The Jewel Box",t:"Lie close with legs closing around each other, like a lidded box. Intimate, slow, and all about staying connected.",s:300},
{l:3,k:"Traditional",n:"Padmasana · The Lotus",t:"Sit entwined face to face, legs folded around each other, foreheads touching. Find a gentle rocking rhythm and keep your eyes open.",s:360},
{l:3,k:"Traditional",n:"Shulachitaka · The Fixed Nail",t:"One partner reclines while the other holds a leg raised close. Stay steady, move gently, and check in often on comfort.",s:300},
{l:3,k:"Our twist",n:"The Rolling Wave",t:"Lie close and roll together slowly, passing the lead back and forth like the swell of a wave.",s:360}
);

// ---- more traditional cards ----
CARDS.push(
{l:3,k:"Traditional",n:"Vijrimbhitaka · The Yawning Pose",t:"A raised, open shape where the hips are lifted to change the angle. Slow, close and very attentive.",s:300},
{l:3,k:"Traditional",n:"Vadavaka · The Mare’s Grip",t:"Stillness over motion. One partner uses a gentle squeeze to hold the other, letting tension and release set the rhythm.",s:300},
{l:3,k:"Traditional",n:"Vamsha-vidaritaka · The Splitting of a Bamboo",t:"One leg rests high while the other stays long. A stretch-and-lean shape for the flexible and the patient.",s:300},
{l:3,k:"Traditional",n:"Dhenuka · The Cow",t:"A rear-facing shape, held hips to hips, where one partner leads and the other sets the pace with their voice.",s:300},
{l:3,k:"Traditional",n:"Avalambitaka · The Supported Pose",t:"Standing and leaning, with a wall or bed edge taking the weight. Balance, trust and slow rocking.",s:240}
);

// ---- how each is performed ----
const HOW={
"Utphullaka · The Opened Flower":["Partner A lies on their back and draws the knees up, letting them fall comfortably open.","Partner B kneels or leans in close, resting weight on their forearms.","A pillow under A’s hips raises the angle and eases the lower back.","Stay face to face and kiss often."],
"Indrani · The Queen’s Pose":["Partner A lies back and folds the knees in toward the chest, feet flat or crossed at the ankles.","Partner B kneels close and leans in, hands beside A’s shoulders or holding their knees.","Draw the knees closer for a snug fit and ease them out if it feels intense."],
"Veshtitaka · The Wrapped Vine":["Lie on your sides, facing each other.","Cross your legs together so they twine, and hold each other’s shoulders and hips.","There is little room to move, so rock gently and let the closeness do the work."],
"Piditaka · The Pressed Embrace":["Partner A lies on their back with legs together.","Partner B lies over them chest to chest, legs outside A’s, weight on the elbows.","Press close and use tiny, slow movements."],
"Karkataka · The Crab’s Hold":["Face each other, seated or reclining.","Wrap arms and legs around each other like a clasp.","Rest foreheads together, nuzzle necks, and rock hips slowly."],
"Paravritta · The Turning Pose":["Begin in any face-to-face embrace.","Without separating, slowly roll or turn so the other partner is now on top or leading.","Keep contact the whole time and talk through each turn."],
"Samputa · The Jewel Box":["Partner A lies on their back with legs closed together.","Partner B kneels or straddles over them, thighs outside A’s.","The tight fit calls for small, slow movements. Roll to your sides if it gets tiring."],
"Padmasana · The Lotus":["Partner A sits cross-legged, or as close as is comfortable, on a cushion.","Partner B sits facing them, legs wrapped around A’s waist.","Hold each other’s backs, rest foreheads together, and find a slow rocking rhythm."],
"Shulachitaka · The Fixed Nail":["Partner A reclines with one leg stretched out straight and the other raised and held close to the chest.","Partner B kneels close and supports the raised leg.","Stay within A’s flexibility, and swap legs halfway."],
"The Rolling Wave":["Lie on your sides, close, facing each other.","Roll together slowly onto your backs, then over to the other side, trading the lead each time.","Never lose contact, and keep the rhythm slow, like a swell."],
"Vijrimbhitaka · The Yawning Pose":["Partner A lies back with a pillow under the hips and the legs lifted and opened.","Partner B kneels close, holding A’s thighs or hips.","The raised angle changes sensation. Lower the hips whenever it tires."],
"Vadavaka · The Mare’s Grip":["Come together lying down or sitting, whichever is comfortable.","Partner A gently squeezes and releases with the thigh muscles, holding the other close.","Stay mostly still and let the squeeze set the rhythm."],
"Vamsha-vidaritaka · The Splitting of a Bamboo":["Partner A lies back with one leg resting on Partner B’s shoulder and the other stretched flat.","Partner B kneels close and holds the raised leg.","Swap legs halfway and go only as far as A’s flexibility allows."],
"Dhenuka · The Cow":["Partner A goes on hands and knees, or lowers to forearms for comfort.","Partner B kneels or stands behind, holding A’s hips.","Agree the pace out loud, and switch to side-lying for a softer variation."],
"Avalambitaka · The Supported Pose":["Partner A stands against a wall or leans on a sturdy bed edge.","Partner B stands close with arms around A’s waist.","Rock slowly and stop if either of you’s legs tire."]
};

// ---- timers: chime, auto-start, dice ----
function chime(){
  try{const C=new (window.AudioContext||window.webkitAudioContext)();
    [0,.35].forEach((t,i)=>{const o=C.createOscillator(),g=C.createGain();o.frequency.value=i?660:523;o.connect(g);g.connect(C.destination);
      g.gain.setValueAtTime(.15,C.currentTime+t);g.gain.exponentialRampToValueAtTime(.001,C.currentTime+t+.5);o.start(C.currentTime+t);o.stop(C.currentTime+t+.55)});
    setTimeout(()=>C.close().catch(()=>{}),1200);
  }catch(e){}
  try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}
}
const _show=show;
show=function(c){const isNew=c!==cur;_show(c);if(isNew&&$('auto').checked)$('start').click()};
let dt=null,dleft=0,dtotal=0,dopen=false;
function drender(){const m=String(Math.floor(dleft/60)).padStart(2,'0'),s=String(dleft%60).padStart(2,'0');$('dtimer').textContent=m+':'+s}
function setDiceTimer(txt){
  clearInterval(dt);dt=null;
  const sec={'30 seconds':30,'1 minute':60,'2 minutes':120}[txt];
  $('dctl').classList.remove('hidden');
  dopen=!sec;dtotal=sec||0;dleft=dtotal;
  $('dnote').textContent=(dopen?'No time limit. The clock counts up, so stop whenever you both want to.':'')+(level===3?' Fire roll: choose only what you both enthusiastically want; skip or change any result.':'');
  $('dstart').textContent='Start timer';drender();
}
let diceAnchor=0,dicePaused=0;
function updateDiceClock(){
 if(!dt)return;
 dleft=dopen?dicePaused+Math.floor((Date.now()-diceAnchor)/1000):Math.max(0,Math.ceil((diceAnchor-Date.now())/1000));
 drender();
 if(!dopen&&dleft===0){clearInterval(dt);dt=null;chime();$('dtimer').textContent='Time’s up';$('dstart').textContent='Restart'}
}
$('dstart').onclick=()=>{
 if(dt){updateDiceClock();clearInterval(dt);dt=null;$('dstart').textContent=dleft===0&&!dopen?'Restart':'Resume';return}
 if(!dopen&&dleft<=0)dleft=dtotal;
 dicePaused=dleft;diceAnchor=dopen?Date.now():Date.now()+dleft*1000;
 $('dstart').textContent='Pause';dt=setInterval(updateDiceClock,250);updateDiceClock();
};
$('ddone').onclick=()=>{clearInterval(dt);dt=null;$('dctl').classList.add('hidden');$('dres').textContent=''};

// ---- storage helpers ----
function ld(k,d){try{return JSON.parse(localStorage.getItem(k))||d}catch(e){return d}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
let favs=ld('kama_favs',[]),custom=ld('kama_custom',[]);
custom.forEach(c=>CARDS.push(c));

// ---- modes ----
let mode='cards',lastKind=null;
function setMode(m){
  mode=m;clearInterval(tid);tid=null;
  document.querySelectorAll('.md').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m));
  ['cards','td','dice'].forEach(k=>$('m-'+k).classList.toggle('hidden',k!==m));
  if(m==='dice')$('card').classList.add('hidden');
}
document.querySelectorAll('.md').forEach(b=>b.onclick=()=>{setMode(b.dataset.m);trackUsage('mode_'+b.dataset.m)});

// ---- draw / skip ----
$('draw').onclick=draw;
$('skip').onclick=()=>{mode==='td'&&lastKind?drawTD(lastKind):draw()};

// ---- truth or desire ----
const TD={
truth:{
1:["What was the moment you first felt drawn to me?","What is your favourite way I touch you?","What is something small I do that makes you melt?","Describe our perfect slow evening."],
2:["Where do you most love to be kissed?","What is a fantasy you have thought about lately?","What do you wish I did more often?","What outfit of mine do you secretly love most?"],
3:["Tell me exactly what you want tonight.","What is something you have been shy to ask for?","What would make tonight unforgettable for you?","Describe the one moment between us you replay most."]},
desire:{
1:["Give your partner a one-minute hand massage.","Kiss somewhere you never usually do, like a wrist or shoulder.","Dance slowly together for one whole song.","Trace a heart on your partner’s back and let them guess what it is."],
2:["Whisper something you want to do to them, right in their ear.","Slowly remove one item of their clothing, or let them remove yours.","Give a two-minute oil massage, then swap.","Kiss your way up from their hand to their neck, slowly."],
3:["Lead the next minute however you wish. They answer yes, or not yet.","Pick a Fire card and try it together.","Swap roles and take full control for three minutes.","Close your eyes and let your partner choose every touch for two minutes."]}
};
TD.desire[1].push("Let your partner choose a scent or lotion, then give them a gentle hand massage.","Stand forehead to forehead and take turns setting the pace of a slow sway.","Draw a tiny shape on your partner’s back with one fingertip and let them guess it.","Offer your partner a choice of three kisses: cheek, hand, or lips.","Recreate the first moment you remember feeling a spark between you.","Take turns choosing a line from a love song to sing or whisper to each other.");
TD.desire[2].push("Let your partner choose a fabric or soft object, then use it for a gentle touch on their arm or shoulder.","Give your partner a playful 30-second dance, then invite them to pull you close.","Take turns naming a place you would like kissed; give each kiss only if it gets a yes.","Sit back-to-back and describe the sensations you notice, then turn and share a kiss.","Choose a position card and spend a minute finding a comfortable, connected version of it.","Have your partner close their eyes while you offer two gentle touches; ask which they prefer.","Trade a whispered invitation for a date later this week, then seal it with a kiss.");
TD.desire[3].push("Choose a favorite Kamasutra pose and recreate its closeness in a comfortable, fully clothed version; trade who leads.","Invite your partner to choose a song, then explore a slow dance that grows more intimate only as you both want.","Offer a warm or cool sensation on your partner’s hand or forearm and ask which they prefer; avoid extreme temperatures.","Let your partner arrange pillows and guide you into a position that feels comfortable; stay there and kiss for a while.","Take turns giving a one-minute spoken description of a fantasy date or sensual scene, then choose one detail to act out together.","Ask your partner to choose a blindfolded or eyes-open version of gentle touch; let them guide each sensation.","Set a two-minute timer: one partner gives affectionate attention while the other simply receives, then switch.","Invite your partner to show you a favorite way to be kissed or held, then mirror it back to them.","Choose one piece of clothing or accessory for your partner to wear or remove, asking first and making the reveal playful.","If you both want intimate touch, let the receiver guide your hand and pace; switch roles only if both want to.");
function drawTD(kind){
  lastKind=kind;
  const question=promptPicker.take(TD[kind][level]||TD[kind][1],{avoid:cur?.t});
  if(!question){showToast('No prompts match this section.');return}
  show({l:level,k:kind==='truth'?'Truth':'Desire',n:kind==='truth'?'Truth':'Desire',t:question,s:kind==='truth'?60:120});
}
$('truth').onclick=()=>drawTD('truth');
$('desire').onclick=()=>drawTD('desire');

// ---- custom cards ----
function cc(){const n=custom.length;$('ccount').textContent=n?n+' custom card'+(n>1?'s':'')+' in your deck.':'Added to your selected heat level.'}
$('cadd').onclick=()=>{
  const v=$('cu').value.trim();if(!v)return;
  const c={l:level,k:"Ours",n:"Our Own Card",t:v,s:180};
  custom.push(c);CARDS.push(c);sv('kama_custom',custom);
  $('cu').value='';cc();
};
cc();

// ---- favourites ----
function fkey(c){return c.n+'|'+c.t}
function updFav(){
  if(!cur)return;
  const on=favs.some(f=>fkey(f)===fkey(cur));
  $('fav').setAttribute('aria-pressed',String(on));$('fav').setAttribute('aria-label',on?'Remove from favourites':'Save to favourites');$('fav').title=on?'Saved to favourites':'Save to favourites';
}
function renderFavs(){
  const box=$('favs');box.innerHTML='';
  if(!favs.length){box.innerHTML='<div class="note" style="margin:0">Your favourites start with a heart. Save a card you love.</div>';return}
  favs.forEach((f,i)=>{
    const d=document.createElement('div');d.className='fv';
    const b=document.createElement('button');b.textContent=f.n;
    b.onclick=()=>{$('favoritesDialog').close();setMode('cards');show(f);window.scrollTo({top:0,behavior:'smooth'})};
    const x=document.createElement('button');x.className='x';x.textContent='✕';x.setAttribute('aria-label','Remove');
    x.onclick=()=>{favs.splice(i,1);sv('kama_favs',favs);renderFavs();updFav()};
    d.append(b,x);box.append(d);
  });
}
$('fav').onclick=()=>{
  if(!cur)return;
  const i=favs.findIndex(f=>fkey(f)===fkey(cur));
  if(i>=0)favs.splice(i,1);else favs.push({l:cur.l,k:cur.k,n:cur.n,t:cur.t,s:cur.s,q:cur.q===true});
  sv('kama_favs',favs);renderFavs();updFav();
};
renderFavs();

// ---- dice ----
const PARTS=[["lips","neck","shoulders","hands","back","hair"],["inner wrists","collarbone","ears","stomach","thighs","spine"],["jawline","nape","hips","lower back"]];
const ACTS=[["kiss","stroke","hold","whisper near"],["tease","trace","massage","breathe softly on"],["savour","explore","nibble gently","worship"]];
const FIRE_PAIRS=[
  {a:"perform oral sex on",p:"penis"},{a:"perform oral sex on",p:"vulva"},{a:"kiss and lick gently",p:"clitoris"},
  {a:"suck gently",p:"breasts"},{a:"kiss and suck gently",p:"nipples"},
  {a:"gently finger",p:"vagina"},{a:"use your fingertips to tease",p:"clitoris"},
  {a:"stroke slowly",p:"penis"},{a:"caress gently",p:"vulva"}
];
FIRE_PAIRS.push(
  {a:"kiss slowly",p:"inner thighs"},{a:"caress with your fingertips",p:"breasts"},
  {a:"gently stroke",p:"nipples"},{a:"give oral pleasure to",p:"clitoris"},
  {a:"give oral pleasure to",p:"penis"},{a:"gently finger",p:"vagina"},
  {a:"trace soft circles over",p:"vulva"},{a:"kiss tenderly",p:"chest"}
);
const TIMES=["30 seconds","1 minute","2 minutes","until they sigh","until they ask for more"];
function pool(a){let r=[];for(let i=0;i<Math.max(1,level);i++)r=r.concat(a[i]);return r}
const pick=a=>a.length?a[randomInt(a.length)]:undefined;
let rolling=false,who=0,rollInterval=null;
function cancelRoll(){
 clearInterval(rollInterval);rollInterval=null;rolling=false;
 $('roll').disabled=false;$('roll').removeAttribute('aria-busy');
}
$('roll').onclick=()=>{
 if(rolling||mode!=='dice')return;
 clearInterval(dt);dt=null;$('dctl').classList.add('hidden');
 rolling=true;$('roll').disabled=true;$('roll').setAttribute('aria-busy','true');
 const P=pool(PARTS),A=pool(ACTS),fire=level===3?pick(FIRE_PAIRS):null;let n=0;
 const frame=()=>{
  $('d1').textContent=pick(A);$('d2').textContent=pick(P);$('d3').textContent=pick(TIMES);
 };
 const finish=()=>{
  frame();cancelRoll();
  const nm=names();who%=nm.length;const actor=who,target=(who+1)%nm.length;who=(who+1)%nm.length;
      if(fire){$('d1').textContent=fire.a;$('d2').textContent=fire.p;}
      const others=nm.filter((_,i)=>i!==actor&&i!==target);
      $('dres').textContent=nm[actor]+' will '+$('d1').textContent+' '+nm[target]+'’s '+$('d2').textContent+', for '+$('d3').textContent+'.'+(others.length?' Everyone else ('+others.join(', ')+') can observe or join only if everyone agrees.':'');setDiceTimer($('d3').textContent);
 };
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){finish();return}
 rollInterval=setInterval(()=>{frame();if(++n>=10)finish()},70);
};
$('swap').onclick=()=>{leader=(leader+1)%names().length;turn()};
let cardDeadline=0;
function updateCardClock(){
 if(!tid)return;
 left=Math.max(0,Math.ceil((cardDeadline-Date.now())/1000));tick();
 if(left===0){clearInterval(tid);tid=null;chime();$('timer').textContent='Time’s up';$('start').textContent='Restart'}
}
$('start').onclick=()=>{
 if(!cur||$('card').classList.contains('locked'))return;
 if(tid){updateCardClock();clearInterval(tid);tid=null;$('start').textContent=left===0?'Restart':'Resume';return}
 if(left<=0)left=cur.s;
 cardDeadline=Date.now()+left*1000;$('start').textContent='Pause';
 tid=setInterval(updateCardClock,250);updateCardClock();
};
$('photo').onclick=()=>$('file').click();
$('file').onchange=e=>{
 const file=e.target.files[0],target=cur;e.target.value='';if(!file||!target)return;
 const image=new Image(),url=URL.createObjectURL(file);
 image.onload=()=>{
  try{
   const scale=Math.min(1,640/Math.max(image.width,image.height)),canvas=document.createElement('canvas');
   canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);
   imgs[target.n]=canvas.toDataURL('image/jpeg',.75);sv('kama_imgs',imgs);
   if(cur===target){const preview=new Image();preview.alt='Your card image';preview.src=imgs[target.n];$('art').replaceChildren(preview)}
  }catch(error){showToast('Could not use this image. Try another.')}
  finally{URL.revokeObjectURL(url)}
 };
 image.onerror=()=>{URL.revokeObjectURL(url);showToast('Could not open this image. Try a JPEG or PNG.')};image.src=url;
};
// ---- v4 additions ----
HUES[0]=210;Object.assign(imgs,ld('kama_imgs',{}));
CARDS.push(
{l:0,k:"Date night",n:"Cook Together",t:"Choose a recipe, cook it side by side, and feed each other the first bite.",s:900},
{l:0,k:"Date night",n:"Kitchen Slow Dance",t:"Pick one song, dim the lights and dance as if nobody else existed.",s:240},
{l:0,k:"Date night",n:"Massage Swap",t:"Ten minutes each, no goal beyond relaxing. Ask what feels best.",s:600},
{l:0,k:"Date night",n:"Letters of Desire",t:"Write each other a short, flirty note, then read them aloud.",s:300},
{l:0,k:"Date night",n:"Stargazing Pause",t:"Lie together outside or by a window and share one thing you’re looking forward to.",s:300},
{l:0,k:"Wind-down",n:"Slow Breathing",t:"Lie together and match your breathing for two full minutes.",s:120},
{l:0,k:"Wind-down",n:"Three Thank-Yous",t:"Each name three things you appreciated about tonight.",s:120},
{l:0,k:"Wind-down",n:"Aftercare Cuddle",t:"Hold each other, with water and a blanket nearby. Share one thing you loved.",s:300},
{l:0,k:"Wind-down",n:"Gentle Head Rub",t:"Take turns stroking each other’s hair until you’re both sleepy.",s:240}
);
TD.truth[1].push("What song makes you think of us?","What is your favourite memory of us?");
TD.truth[2].push("What touch makes you feel most wanted?","Where would you love us to be more adventurous?");
TD.truth[3].push("What is one wish and one boundary you’d like me to know?");
TD.desire[1].push("Feed your partner something sweet, slowly.","Give a compliment for each finger of one hand.");
TD.desire[2].push("Kiss them for one full minute, then stop and smile.","Whisper something you adore about their body.");
TD.desire[3].push("Choose: lead slowly, or ask to be led.","Pick one of your saved favourites and do it now.");
CARDS.push(
{l:1,n:"A Small Secret",t:"Take turns sharing a small thing you have been looking forward to. Finish with a warm hug.",s:120},
{l:1,n:"The Compliment Game",t:"Trade specific compliments: one about a quality, one about a gesture, and one about a memory.",s:150},
{l:1,n:"A Hand to Hold",t:"Sit side by side and explore each other’s hands with gentle attention. Ask before changing pressure.",s:120},
{l:2,n:"The Swaying Pair",t:"Stand close and sway to a quiet song. Let one partner guide, then switch without breaking the embrace.",s:240},
{l:2,n:"The Side-by-Side Nest",t:"Lie facing each other on your sides, legs loosely entwined. Share slow kisses and keep checking in.",s:240},
{l:2,n:"The Listening Pause",t:"One partner offers a gentle touch while the other describes what feels soothing. Switch after a minute.",s:180},
{l:3,n:"The Seated Lotus",t:"Sit facing one another on cushions, legs comfortably crossed or loosely entwined. Hold close and find a gentle rhythm.",s:300},
{l:3,n:"The Supported Stand",t:"Stand together with a wall or sturdy bed edge nearby for balance. Embrace, sway, and pause if either person tires.",s:240},
{l:3,n:"The Shared Choice",t:"Each name a position or kind of touch you both enjoy. Choose one together, adjust it for comfort, and pause to check in.",s:300}
);
// A clearer rise in intensity: affectionate, teasing, then deeply sensual.
CARDS.push(
{l:0,k:"Date night",n:"The Almost Kiss",t:"Sit close enough to feel each other’s warmth. Trade slow, lingering almost-kisses, then share what you’re looking forward to.",s:120},
{l:0,k:"Date night",n:"A Note for Later",t:"Write one tender promise for the end of the evening and tuck it somewhere your partner will find it.",s:180},
{l:1,k:"Warm-up",n:"The Slow Tease",t:"Take turns giving a trail of light kisses along the face, neck, shoulders, and hands. Pause often; let anticipation do the talking.",s:180},
{l:1,k:"Warm-up",n:"Closer, Then Closer",t:"With clothes on, take turns drawing each other into a closer embrace. Whisper what you enjoy about the way your partner responds.",s:180},
{l:2,k:"Heat",n:"The Long Unwrapping",t:"Ask permission before removing or loosening one item at a time. Take your time with every pause, glance, and kiss; either of you can say ‘keep going’ or ‘pause.’",s:300},
{l:2,k:"Heat",n:"Tell Me Where",t:"One partner closes their eyes while the other offers slow kisses or feather-light touches over comfortable places. Give clear directions and switch when ready.",s:240},
{l:3,k:"Fire",n:"The Slow Reveal",t:"Take turns choosing one layer to loosen or remove, with a lingering kiss between each choice. Keep your eyes on each other and ask before every next step.",s:360},
{l:3,k:"Fire",n:"Want and Wait",t:"Whisper one thing you want your partner to do, then let them decide whether to say yes, suggest a change, or save it for later. Trade turns and build the moment slowly.",s:300},
{l:3,k:"Fire",n:"No Rush, All Attention",t:"Give your partner your undivided attention: slow kisses, warm hands, and whispered encouragement wherever they’ve said feels good. Pause to ask what they want more of.",s:360},
{l:3,k:"Fire",n:"The Lingering Kiss",t:"Kiss as if you have nowhere else to be. Let the pace rise and soften naturally; use words or a gentle hand signal whenever you want to slow down or stop.",s:300},
{l:3,k:"Fire",n:"Choose My Pace",t:"One partner leads with a slow sequence of kisses and affectionate touches. The other guides the pace with a word, a nod, or a hand. Switch when you both want.",s:360}
);
CARDS.push(
{l:3,k:"Fire",n:"Intimate Attention",t:"With an enthusiastic yes, take turns touching each other’s most sensitive areas over or under clothing. Ask what pressure and pace feel best, and pause or change anything immediately if asked.",s:360},
{l:3,k:"Fire",n:"Oral Pleasure, Their Choice",t:"Ask your partner whether they would enjoy receiving oral sex. If yes, let them guide what feels good and where to focus; if not, choose another kind of touch together. Check in as you go.",s:420},
{l:3,k:"Fire",n:"Take Turns Receiving",t:"If you both want oral sex, take turns giving and receiving it, with each person guiding pace and comfort. Agree on boundaries first; either person can pause or switch activities at any time.",s:480},
{l:3,k:"Fire",n:"A Slow Beginning",t:"If you both want penetrative sex, take time to get comfortable, use lubricant if helpful, and agree on protection and boundaries first. Go slowly, check in often, and stop if anything hurts or either person changes their mind. Otherwise choose a different kind of closeness.",s:480},
{l:3,k:"Fire",n:"Ask, Then Explore",t:"Each partner names one intimate touch they would enjoy receiving and one they do not want. Choose only a shared yes, then explore at the receiver’s pace. A maybe can wait for another time.",s:360},
{l:3,k:"Fire",n:"Guide My Hands",t:"With permission, place your partner’s hands where you would like to be touched, then guide them with simple words or gestures. Switch roles so each of you gets to ask for what feels good.",s:360},
{l:3,k:"Fire",n:"More, Softer, Pause",t:"Choose an intimate touch you both want. The receiving partner can say ‘more,’ ‘softer,’ or ‘pause’ at any time; the giving partner checks in and follows their lead.",s:360},
{l:3,k:"Fire",n:"Choose Your Yes",t:"Together choose between oral sex, penetrative sex, intimate touch, or simply kissing. Talk through boundaries and protection before starting, then stay attentive to each other’s comfort throughout.",s:420}
);
// Keep every level stocked with varied prompts so repeats take longer.
TD.truth[1].push("What kind of affection helps you feel at home with me?","Which ordinary moment together would you gladly relive?","What makes you feel most appreciated during a busy week?","What would your ideal no phones evening look like?","What is a compliment you still remember?","Which little ritual should we make ours?");
TD.truth[2].push("What kind of anticipation do you enjoy most?","What helps you relax enough to be playful?","What is a new setting for a date you would enjoy?","What do you want me to notice more often?","Which kind of kiss would you ask for right now?","What makes you feel especially close after a date?");
TD.truth[3].push("What would you like to explore together at a pace that feels right?","How can I make it easier for you to ask for what you want?","What kind of attention makes you feel irresistible?","What would you like us to try once, with a clear pause option?","Which boundary feels especially important to keep tonight?","What would make you feel cared for after an intense moment?");
TD.desire[1].push("Take turns choosing a song that reminds you of each other.","Hold hands and trade one sincere compliment each.","Give a gentle shoulder squeeze, then ask if they want more.","Sit close and share a favourite memory in a whisper.","Choose a cozy drink and bring it to your partner.","Make up a private nickname for tonight.");
TD.desire[2].push("Take turns guiding the other's hand to a comfortable place.","Share a slow kiss, pause, and ask what they would enjoy next.","Trace a pattern on their palm and let them guess it.","Give a two-minute scalp massage, checking pressure as you go.","Describe a date you would love to plan for them.","Let your partner choose the next song and dance close.");
TD.desire[3].push("Ask your partner to choose between two kinds of touch, then follow their lead.","Share one wish and one limit, then choose a mutually comfortable prompt.","Take turns giving a one-minute massage wherever your partner requests.","Slowly build a kiss, pausing whenever either of you wants.","Choose a position card together and adapt it for comfort.","Spend two quiet minutes holding eye contact, then say what you enjoyed.");
TD.desire[1].push("Kiss your partner slowly, then whisper where you would like the next kiss to land.","Pull your partner close for a lingering embrace and tell them what you find irresistible about them.","Trace a gentle path over your partner’s shoulders and arms; ask where they would like you to go next.","Give your partner a soft kiss, pause just before the next one, and let them draw you closer.","Take turns offering a kiss on a place your partner chooses.","Choose a romantic Kamasutra-inspired pose, such as sitting face to face, and hold each other there for a minute.");
TD.desire[2].push("Whisper a kiss or touch you would love to give, then wait for an enthusiastic yes before doing it.","Let your partner guide your hands to a place they enjoy being touched; switch when you both want.","Share a slow, lingering kiss while one partner chooses the pace and the other chooses when to pause.","Kiss along your partner’s neck or shoulders, checking that they want you to continue.","Settle into a comfortable Kamasutra-inspired position and trade slow kisses without rushing to change it.","Ask your partner whether they want a sensual massage, kisses, or a different kind of touch, then follow their choice.");
TD.desire[3].push("Ask whether your partner wants oral sex, intimate touching, or kissing; act only on a clear yes and let them guide you.","If you both want oral sex, take turns giving and receiving, checking in about comfort and boundaries as you go.","If you both choose penetrative sex, agree on protection, lubricant, and boundaries first; let the receiving partner guide the pace and stop if anything hurts.","Choose a Kamasutra-inspired position together, make it comfortable with pillows, and trade who leads the movement.","Invite your partner to name one sensitive place they want kissed or touched; explore it slowly and ask before moving on.","Take turns guiding each other’s hands, asking for more, softer, or pause as you go.","Whisper one thing you want to try together tonight; your partner can say yes, suggest a change, or save it for another time.","Kiss and touch each other slowly, pausing to ask what feels best before building the intensity.","If you both want to explore a new position, take time to get settled and keep talking about comfort and pleasure.","Give your partner a long, attentive kiss, then ask what kind of closeness they want next.");
TD.desire[3].push("Ask if your partner wants oral sex; if yes, let them guide you, and if not, choose another pleasure they do want.","If you both want penetrative sex, agree on protection, lubricant, and boundaries, then go slowly and check in.","Take turns naming a sensitive place you would like kissed or touched; act only on shared yeses.","Invite your partner to guide your hands to a place they enjoy, and ask before moving elsewhere.","Choose oral sex, intimate touch, or kissing together; either of you can change the plan at any time.");
TD.truth[1].push("What kind of kiss makes you blush?","What small gesture would make tonight feel romantic?");
TD.truth[2].push("What kind of teasing makes anticipation exciting for you?","Where do you like a gentle kiss when we’re alone?");
TD.truth[3].push("What would you love me to whisper when we’re close?","Which kind of slow touch makes you feel most desired?","What would you like to ask for tonight, if the answer could be yes, no, or maybe later?","How do you want me to check in when the mood gets intense?");
TD.truth[1].push("What playful challenge would make you laugh together?","Which of my everyday habits do you find unexpectedly charming?","Would you rather plan a surprise date or be surprised?","What kind of music makes you want to get closer?");
TD.truth[2].push("Would you enjoy a blindfold, a whispered instruction, or neither?","Which kind of touch do you want me to take my time with?","What makes a position feel connected and comfortable for you?","Would you rather be kissed slowly or surprised with a confident kiss?","What would you like me to say while we explore each other?");
TD.truth[3].push("Which intimate touch would you like to receive first, and what should I avoid?","Would you like to give or receive oral pleasure tonight, or choose something else?","What position would let you feel both comfortable and completely close to me?","What word or gesture should we use to slow down immediately?","What do you want me to do after we finish being intimate?");
TD.desire[1].push("Choose a playful secret signal that means ‘kiss me’ and use it once tonight.","Let your partner pick a scarf, song, or scent to set the mood for a slow embrace.","Take turns inventing a two-step dance and perform it together.","Give your partner three gentle kisses in places they choose.");
TD.desire[2].push("Have one partner guide the other into a comfortable seated embrace, then trade who guides.","Offer a slow kiss on the inside of the wrist, then ask where they want the next one.","Take turns giving a sincere, specific whispered compliment while standing close.","Let your partner choose a 60-second massage focus: hands, shoulders, scalp, or feet.","Choose a Kamasutra-inspired pose and make a cozy, clothed version with cushions.");
TD.desire[3].push("Invite your partner to choose a position and adjust it together until it feels good for both of you.","Ask your partner to show you the pace and pressure they enjoy with an intimate touch, then mirror their guidance.","If you both want oral pleasure, ask your partner to guide you with words or a hand signal; pause whenever requested.","If you both want fingering, ask what feels comfortable first and let your partner guide pace, pressure, and whether to continue.","If you both want breast or nipple play, ask what kind of touch they enjoy and follow their directions.","Choose one intimate activity you both want, then take turns saying ‘more,’ ‘slower,’ or ‘pause.’","Offer your partner a choice between being kissed, touched, or simply held close; honor their answer.","Take turns describing a position you want to try, then choose a shared yes and set it up comfortably.");
TD.truth[1].push("Which kind of kiss would you like more of?","What makes a slow embrace feel especially romantic to you?","Do you prefer a playful surprise or knowing what is coming?","What is one affectionate touch that always makes you smile?","Which Kamasutra-inspired idea sounds intriguing, even if we adapt it our way?");
TD.truth[2].push("Which position makes you feel closest to me, and why?","Do you prefer to lead, follow, or trade roles when we kiss?","What kind of anticipation makes you want a kiss even more?","Which part of a slow, shared embrace would you like to linger in?","Is there a Kamasutra position you would like to try with pillows or other support?","What would make exploring a new position feel relaxed and comfortable?");
TD.truth[3].push("Which position makes you feel most desired, and what do you love about it?","Would you rather take the lead, be guided, or switch while we explore a position together?","What kind of touch would you like me to give more attention to tonight?","Is there a sensual fantasy or Kamasutra-inspired scene you would enjoy sharing with me?","What would you like me to ask before we try a new intimate touch or position?","Would you enjoy oral sex, intimate touch, or kissing right now—and what would make it feel especially good for you?","If we choose penetrative sex, what pace, position, and protection would help you feel comfortable and wanted?","What is one desire you feel excited to share, and one thing you want to keep as a boundary?");
TD.desire[1].push("Share a lingering kiss, then tell your partner one thing you adore about them.","Brush noses, hold hands, and trade a playful compliment.");
TD.desire[2].push("Whisper a tempting compliment and let your partner choose the next kiss.","Take turns kissing along the jaw or neck, pausing wherever your partner asks.");
TD.desire[3].push("Ask your partner what they want more of, then give them your full attention for two minutes.","Trade whispered wishes. Choose one you both want to explore now, and save the rest without pressure.","Kiss slowly while one partner guides the other’s hands to welcome places. Switch who guides when you’re both ready.","Take turns choosing the next kiss or touch; each choice needs an enthusiastic yes.");
PARTS[0].push("temples","arms");PARTS[1].push("hands","waist");ACTS[0].push("cradle","hum softly against");TIMES.push("one slow song");
PARTS[0].push("cheeks","fingertips","upper back");PARTS[1].push("shoulder blades","side","knees");PARTS[2].push("calves","hips","chest");
ACTS[0].push("kiss gently","hold","brush softly");ACTS[1].push("draw circles over","trace slowly","rest a hand on");ACTS[2].push("massage gently","kiss softly","explore with fingertips");
TIMES.push("one minute","three slow breaths","until either of you asks to pause");

// Imported prompts retain the categories and heat levels from the supplied file.
const questionBank=window.KAMA_QUESTION_BANK;
for(const kind of ['truth','desire']){
 for(const heat of [1,2,3])TD[kind][heat]=uniquePrompts([...TD[kind][heat],...questionBank[kind][heat]]);
}
TD.truth[0]=uniquePrompts([...(TD.truth[0]||[]),...questionBank.dateNight]);
CARDS.push(
 ...questionBank.dateNight.map(t=>({l:0,k:'Date night',n:'A Little More Us',t,s:90,q:true})),
 ...questionBank.windDown.map(t=>({l:0,k:'Wind-down',n:'One Last Thought',t,s:90,q:true}))
);
const distinctCards=uniquePrompts(CARDS);
CARDS.splice(0,CARDS.length,...distinctCards);

// themes
const TH={"Massage":/massage|oil|silk/i,"Sensory play":/blindfold|feather|ice/i,"Talking & whispers":/whisper|tell me|name/i,"Traditional positions":null,"Dancing & romance":/dance|gaze|eyes open/i,"Taking control":/lead|control|role/i};
const off=new Set();
function ok(c){for(const k of off){const r=TH[k];if(k==="Traditional positions"?c.k==="Traditional":r&&r.test(c.n+' '+c.t))return false}return true}
$('chips').innerHTML=Object.keys(TH).map(k=>'<label><input type="checkbox" checked data-t="'+k+'">'+k+'</label>').join('');
$('chips').onchange=e=>{const k=e.target.dataset.t;e.target.checked?off.delete(k):off.add(k)};

// consent gate, flip, check-ins
let gOk=[0,0],nDraw=0;
const CHK=["How are we doing? Anything you’d like more or less of?","Quick check: still comfortable and enjoying this?","Pause for a breath. What feels best right now?"];
const _s2=show;
function renderGateButtons(playerNames){
  const actions=$('readyActions');
  while(actions.children.length>playerNames.length)actions.lastElementChild.remove();
  playerNames.forEach((player,i)=>{
    let button=actions.children[i];
    if(!button){button=document.createElement('button');button.className='main ready-person';actions.append(button)}
    button.id='g'+(i+1);button.textContent=player+': ready';button.disabled=false;
    button.onclick=()=>gtap(i);
  });
}
show=function(c){
  const nw=c!==cur;_s2(c);if(!nw)return;
  const cd=$('card');cd.classList.remove('flip');void cd.offsetWidth;cd.classList.add('flip');
  if(c.l===3||c.wild){
    const n=names();gOk=n.map(()=>0);cd.classList.add('locked');
    renderGateButtons(n);
    $('gnote').textContent='A yes from everyone before we reveal.';
    clearInterval(tid);tid=null;left=c.s;tick();$('start').textContent='Start timer';
  }else cd.classList.remove('locked');
  if(++nDraw%4===0){$('chkt').textContent=pick(CHK);$('chk2').classList.remove('hidden')}
};
function gtap(i){gOk[i]=1;$('g'+(i+1)).disabled=true;if(gOk.every(Boolean)){$('card').classList.remove('locked');if($('auto').checked)$('start').click()}}
$('g1').onclick=()=>gtap(0);$('g2').onclick=()=>gtap(1);
$('gskip').onclick=()=>$('skip').click();
$('chkok').onclick=()=>$('chk2').classList.add('hidden');

// modes, mystery, evening
setMode=function(m){mode=m;clearInterval(tid);tid=null;
  document.querySelectorAll('.md').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m));
  ['cards','td','dice','ev'].forEach(k=>$('m-'+k).classList.toggle('hidden',k!==m));
  if(m==='dice')$('card').classList.add('hidden');};
$('skip').onclick=()=>{mode==='td'&&lastKind?drawTD(lastKind):mode==='ev'?evNext():draw()};
$('wild').onclick=()=>{const p=CARDS.filter(c=>c.l<=level&&c.k!=='Wind-down'&&ok(c));if(!p.length){showToast('No cards match your themes.');return}const card=promptPicker.take(p,{avoid:cur?.t});show(Object.assign({},card,{wild:true}))};
const ST=[1,1,2,2,3,3,'w'],NM=['Warm-up','Warm-up','Heat','Heat','Fire','Fire','Wind-down'];let si=-1;
function evNext(){
  si++;
  if(si>=ST.length){si=-1;$('evp').textContent='Your evening is complete. Hold each other close.';$('evb').textContent='Begin again';return}
  const s=ST[si];
  let p=s==='w'?CARDS.filter(c=>c.k==='Wind-down'):CARDS.filter(c=>c.l===s&&c.k!=='Date night'&&c.k!=='Wind-down'&&ok(c));
  if(!p.length){si--;showToast('No cards match this stage. Adjust your themes.');return}
  if(s!=='w')level=s;
  show(promptPicker.take(p,{avoid:cur?.t}));
  $('evp').textContent='Stage '+(si+1)+' of '+ST.length+' · '+NM[si];$('evb').textContent='Next card';
}
$('evb').onclick=evNext;

// points, export, night, ambient
let done=+ld('kama_done',0),results=ld('kama_results',{completed:0,failed:0,skipped:0}),outcomeRecorded=false;
function stat(){$('completedCount').innerHTML=done+'<span>cards completed</span>';$('stat').textContent=results.skipped+' skipped · '+results.failed+' forfeits'}
const FORFEITS=[
  'Offer your partner three sincere compliments.',
  'Bring everyone a glass of water, then let the group choose the next card.',
  'Give a 30-second shoulder massage, if they would enjoy one.',
  'Do a playful 10-second dance for the group.',
  'Let someone else choose a cozy song for the next round.'
];
function nextForfeit(){ $('forfeitText').textContent=pick(FORFEITS); }
function outcome(kind){if(outcomeRecorded)return;clearInterval(tid);tid=null;$('start').textContent='Start timer';outcomeRecorded=true;results[kind]++;sv('kama_results',results);if(kind==='completed'){done++;sv('kama_done',done)}stat();trackUsage('outcome_'+kind);$('outcomeStatus').textContent=kind==='completed'?'Nicely played. Ready for another?':kind==='failed'?'Choose a forfeit, or skip it.':'Skipped. Always your choice.';if(kind==='failed'){nextForfeit();$('forfeit').classList.remove('hidden')}['done','failed'].forEach(id=>$(id).disabled=true)}
$('done').onclick=()=>outcome('completed');$('failed').onclick=()=>outcome('failed');
$('forfeitAnother').onclick=nextForfeit;
$('forfeitSkip').onclick=()=>{$('forfeit').classList.add('hidden');$('outcomeStatus').textContent='Forfeit skipped. Keep playing.'};
stat();
$('fcopy').onclick=async()=>{const t=favs.map(f=>'• '+f.n+': '+f.t).join('\n')||'No favourites yet.';const x=$('fexp');x.value=t;x.classList.remove('hidden');x.select();try{await navigator.clipboard.writeText(t);showToast('List copied.')}catch(error){showToast('Select and copy your list below.')}};
$('night').onclick=()=>{const r=document.documentElement;const on=r.dataset.theme!=='night';r.dataset.theme=on?'night':'dark';$('night').setAttribute('aria-pressed',String(on));sv('kama_theme',r.dataset.theme)};
let ac=null;
$('amb').onclick=()=>{
  if(ac){ac.close();ac=null;$('amb').setAttribute('aria-pressed','false');$('amb').title='Ambient sound';return}
  try{ac=new (window.AudioContext||window.webkitAudioContext)();const g=ac.createGain();g.gain.value=.05;const f=ac.createBiquadFilter();f.type='lowpass';f.frequency.value=500;f.connect(g);g.connect(ac.destination);
    [110,164.8,220,277.2].forEach((fr,i)=>{const o=ac.createOscillator();o.frequency.value=fr;const l=ac.createOscillator(),lg=ac.createGain();l.frequency.value=.05+i*.03;lg.gain.value=3;l.connect(lg);lg.connect(o.frequency);o.connect(f);o.start();l.start()});
    $('amb').setAttribute('aria-pressed','true');$('amb').title='Turn ambient sound off'}catch(e){ac=null}
};
// ---- duet (two devices) ----
let room=null,duetOn=false,did='',dmine=0,dtheirs=0,mysec='';
const _g=gtap;
gtap=function(i){if(!(duetOn&&mode==='duet'))return _g(i);dmine=1;$('g1').disabled=true;if(room)room.emit('ready',{cid:did});dchk()};
function dchk(){if(dmine&&dtheirs){$('card').classList.remove('locked');if($('auto').checked)$('start').click()}}
const _s3=show;
show=function(c){$('g2').classList.remove('hidden');_s3(c)};
function duetShow(d){
  const f=CARDS.find(x=>x.n===d.n)||{l:Math.min(3,Math.max(0,+d.l||1)),n:'Shared card',t:String(d.t||'').slice(0,300),s:180};
  did=String(d.cid||'').slice(0,20);dmine=0;dtheirs=0;
  show(Object.assign({},f,{k:f.k||'Shared'}));
  if($('card').classList.contains('locked')){$('g2').classList.add('hidden');$('g1').textContent='I’m ready';$('g1').disabled=false;$('gnote').textContent='Waiting for you both. Tap when you’re happy to see this card.'}
}
setMode=function(m){mode=m;clearInterval(tid);tid=null;
  document.querySelectorAll('.md').forEach(x=>x.setAttribute('aria-pressed',x.dataset.m===m));
  ['cards','td','dice','ev','duet'].forEach(k=>$('m-'+k).classList.toggle('hidden',k!==m));
  if(m==='dice')$('card').classList.add('hidden');};
$('djoin').onclick=async()=>{
  const code=($('dcode').value||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,20);
  if(!code){$('dst').textContent='Enter a short code you both use.';return}
  try{
    const R=await claude.use('room');
    if(!R){$('dst').textContent='Duet only works when this page is opened inside Claude while signed in.';return}
    if(room)await room.leave();
    room=await R.join('kama'+code);duetOn=true;
    room.onPeers(ch=>{const n=ch.peers.length;$('dst').textContent=n>1?'Connected · '+n+' here':'Connected. Waiting for your partner to join the same code.'});
    room.on('card',m=>{if(m.data&&typeof m.data==='object')duetShow(m.data)});
    room.on('ready',m=>{if(!m.isMe&&m.data&&m.data.cid===did){dtheirs=1;dchk()}});
    room.on('secret',m=>{if(!m.isMe&&m.data&&typeof m.data.t==='string')$('dpeer').textContent='Your partner reveals: '+m.data.t.slice(0,300)});
  }catch(e){$('dst').textContent='Could not join. Check the sharing permissions and try again.'}
};
$('dcard').onclick=()=>{
  if(!room)return;
  let p=CARDS.filter(c=>c.l===level&&c.k!=='Wind-down'&&ok(c));if(!p.length)p=CARDS.filter(c=>c.l===level);
  const c=promptPicker.take(p,{avoid:cur?.t});if(!c)return;room.emit('card',{cid:Math.random().toString(36).slice(2,10),n:c.n,t:c.t,l:c.l});
};
$('dsec').onclick=()=>{const k=Math.random()<.5?'truth':'desire',a=TD[k][level]||TD[k][1];mysec=promptPicker.take(a,{avoid:mysec})||'';$('dmine').textContent='Only you can see this: '+mysec;$('dreveal').classList.remove('hidden')};
$('dreveal').onclick=()=>{if(room&&mysec){room.emit('secret',{t:mysec});$('dmine').textContent='Revealed to your partner.'}};
const _sk=$('skip').onclick;
$('skip').onclick=()=>{if(mode==='duet'){$('dcard').click();return}outcome('skipped');_sk()};

// Interface state. Keep existing browser storage keys so saved cards survive deployment.
function showToast(message){let toast=document.getElementById('toast');if(!toast){toast=document.createElement('div');toast.id='toast';toast.setAttribute('role','status');document.body.append(toast)}toast.textContent=message;toast.classList.add('visible');clearTimeout(showToast.timeout);showToast.timeout=setTimeout(()=>toast.classList.remove('visible'),3200)}
document.querySelectorAll('[data-open]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.open).showModal()));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close()}}));

document.documentElement.dataset.theme=ld('kama_theme','dark');
$('night').setAttribute('aria-pressed',String(document.documentElement.dataset.theme==='night'));
function renderMood(){
 document.querySelectorAll('.lv').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.l===level)));
 $('heatNumber').textContent=String(level).padStart(2,'0')+' / 03';
 $('heatCaption').textContent=['Keep it light. Make a memory.','Start slow. Find your spark.','A little bolder. A little closer.','For an enthusiastic yes from everyone.'][level];
 document.documentElement.dataset.heat=String(level);
}
document.querySelectorAll('.lv').forEach(b=>b.addEventListener('click',renderMood));
renderMood();
const modeCopy={cards:['THE CONNECTION DECK','Leave a little to chance.','One card. Two people. No rush.'],td:['TRUTH OR DESIRE','A question. Or a little courage.','Say a little more. Get a little closer.'],dice:['A ROLL OF CHEMISTRY','',''],ev:['THE EVENING EDITION','Make a night of it.','Seven cards. A spark, a slow build, a soft landing.'],duet:['DUET','','']};
const gameSetMode=setMode;
setMode=function(m){
 gameSetMode(m);cancelRoll();clearInterval(dt);dt=null;$('dstart').textContent='Start timer';
 document.documentElement.dataset.playing='false';$('m-dice-actions').classList.toggle('hidden',m!=='dice');
 $('card').classList.add('hidden');$('chk2').classList.add('hidden');
 $('emptyState').classList.toggle('hidden',m==='dice');
 $('modeLabel').textContent=modeCopy[m][0];$('emptyTitle').textContent=modeCopy[m][1];$('emptyText').textContent=modeCopy[m][2];
 $('roundLabel').textContent=m==='dice'?'Make your own luck':'Ready when you are';
};
let sessionRound=0;
const gameShow=show;
show=function(c){const fresh=c!==cur;gameShow(c);$('emptyState').classList.add('hidden');if(fresh)sessionRound++;$('roundLabel').textContent='Round '+String(sessionRound).padStart(2,'0');renderMood();document.documentElement.dataset.playing='true';if(fresh){const target=$('card').classList.contains('locked')?$('gate').querySelector('h2'):$('name');target.tabIndex=-1;target.focus({preventScroll:true});if(matchMedia('(max-width: 979px)').matches)requestAnimationFrame(()=>$('card').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}))}};
const gameEvening=evNext;
evNext=function(){gameEvening();document.querySelectorAll('#eveningProgress span').forEach((s,i)=>s.classList.toggle('active',si>=i));renderMood()};
$('evb').onclick=evNext;
const addCustom=$('cadd').onclick;
$('cadd').onclick=()=>{if(!$('cu').value.trim()){showToast('Write your card first.');return}addCustom();showToast('Added to your deck.')};
$('cu').addEventListener('keydown',e=>{if(e.key==='Enter')$('cadd').click()});
(async()=>{
 try{
  const client=window.kamaSupabase;
  if(!client){window.location.replace('index.html?setup=1');return}
  const {data,error}=await client.auth.getUser();
  if(error||!data.user){window.location.replace('index.html');return}
  accountUser=data.user;authRender();document.documentElement.classList.remove('auth-pending');trackUsage('session_start');
 }catch(error){window.location.replace('signin.html?connection=1')}
})();


document.addEventListener('visibilitychange',()=>{
 if(!document.hidden){updateCardClock();updateDiceClock()}
 if(ac){const operation=document.hidden?ac.suspend():ac.resume();operation.catch(()=>{})}
});
window.addEventListener('pagehide',()=>{
 updateCardClock();updateDiceClock();clearInterval(tid);clearInterval(dt);tid=null;dt=null;cancelRoll();
 $('start').textContent=left>0?'Resume':'Restart';$('dstart').textContent='Resume';
 if(ac)ac.suspend().catch(()=>{});
});
function clickGameAction(id){const button=$(id);if(button&&!button.disabled&&button.getClientRects().length){button.click();return true}return false}
document.addEventListener('keydown',event=>{
 if(document.documentElement.classList.contains('auth-pending')||event.defaultPrevented||event.repeat||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
 if(event.target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')||document.querySelector('dialog[open]'))return;
 if(event.key===' '&&event.target.closest('button,a,summary'))return;
 const key=event.key.toLowerCase();let handled=false;
 if(key==='?'){$('rulesDialog').showModal();handled=true}
 else if(key==='d'){if(mode!=='ev'&&mode!=='cards')document.querySelector('.md[data-m=cards]').click();handled=clickGameAction(mode==='ev'?'evb':'draw')}
 else if(key==='t'){if(mode!=='td')document.querySelector('.md[data-m=td]').click();handled=clickGameAction('truth')}
 else if(key==='y'){if(mode!=='td')document.querySelector('.md[data-m=td]').click();handled=clickGameAction('desire')}
 else if(key==='r'){if(mode!=='dice')document.querySelector('.md[data-m=dice]').click();handled=clickGameAction('roll')}
 else if(key===' ')handled=mode==='dice'?clickGameAction('dstart'):clickGameAction('start');
 else if(key==='arrowright')handled=clickGameAction($('card').classList.contains('locked')?'gskip':'skip');
 else if(key==='f')handled=clickGameAction('fav');
 if(handled)event.preventDefault();
});
const modeButtons=[...document.querySelectorAll('.mode-nav .md')];
document.querySelector('.mode-nav').addEventListener('keydown',event=>{
 const index=modeButtons.indexOf(event.target);if(index<0)return;
 let next;if(event.key==='ArrowRight')next=(index+1)%modeButtons.length;
 else if(event.key==='ArrowLeft')next=(index+modeButtons.length-1)%modeButtons.length;
 else if(event.key==='Home')next=0;else if(event.key==='End')next=modeButtons.length-1;else return;
 event.preventDefault();modeButtons[next].focus();modeButtons[next].click();
});
