(() => {
  const byId=id=>document.getElementById(id);
  let client=null,member=false,privatePrompt='',lastCardId=null,inviteToken='',clockOffset=0,clockTick=null,connection='connecting';
  let completed=new Set(ld('kama_duet_completed',[]));
  const active=()=>mode==='duet'&&!!client?.room;
  function errorMessage(error){return error?.message||'Could not connect to Duet. Try again.'}
  function status(message){byId('duetStatus').textContent=message}
  function name(){return byId('duetName').value.trim()}
  function invitation(code){const url=new URL('game.html',location.href);url.search='';url.hash='duet='+code;return url.href}
  function extractCode(value){
    const input=value.trim();if(/^[a-f0-9]{32}$/i.test(input))return input.toLowerCase();
    try{const code=new URLSearchParams(new URL(input).hash.slice(1)).get('duet');if(/^[a-f0-9]{32}$/i.test(code||''))return code.toLowerCase()}catch{}
    throw new Error('Paste the invitation link or its full code.');
  }
  async function api(body){
    const {data,error}=await window.kamaSupabase.functions.invoke('duet',{body});
    if(error){let message=error.message;try{message=(await error.context.clone().json()).error||message}catch{}const failure=new Error(message||'Could not connect to Duet.');failure.status=error.context?.status||0;throw failure}
    if(data?.error)throw new Error(data.error);return data;
  }
  function updateConnection(){
    if(!client?.room)return;
    const r=client.room,host=r.host_id===accountUser.id;
    byId('duetConnection').textContent=connection==='live'?'Live':connection==='connecting'?'Connecting…':'Reconnecting…';
    const seen=host?r.guest_seen_at:r.host_seen_at;
    byId('duetPresence').textContent=!r.guest_id?'Waiting for your partner.':Date.now()+clockOffset-Date.parse(seen||0)<45000?'Your partner is here.':'Your partner may be away. Their place is saved.';
  }
  function renderClock(){
    if(!active()||!client.room.card)return;
    const r=client.room;const seconds=r.timer_ends_at?Math.max(0,Math.ceil((Date.parse(r.timer_ends_at)-Date.now()-clockOffset)/1000)):r.remaining_seconds;
    byId('timer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
    byId('start').textContent=r.timer_ends_at&&seconds>0?'Pause together':seconds===0?'Restart together':'Start together';
    updateConnection();
  }
  function render(room,offset=clockOffset){
    clockOffset=offset;const inDuet=mode==='duet';
    if(!inDuet){clearInterval(clockTick);clockTick=null;return}
    if(room&&room.card&&!clockTick)clockTick=setInterval(renderClock,500);
    if(!room){clearInterval(clockTick);clockTick=null;}
    byId('duetLobby').classList.toggle('hidden',!!room);byId('duetRoom').classList.toggle('hidden',!room);
    byId('duetOffer').classList.toggle('hidden',member);byId('duetCreate').classList.toggle('hidden',!member);
    byId('duetDraw').disabled=!room?.guest_id;
    byId('actionDock').classList.toggle('hidden',!room);
    if(!room){byId('roundLabel').textContent='Play from anywhere';lastCardId=null;byId('card').classList.add('hidden');document.documentElement.dataset.playing='false';status(member?'Your membership is active. Start a room or join your partner.':'One membership lets you host. An invited partner joins for free.');return}
    const host=room.host_id===accountUser.id;
    byId('duetPair').textContent=room.host_name+' + '+(room.guest_name||'your partner');
    byId('duetInvitation').classList.toggle('hidden',!host||!!room.guest_id);
    byId('duetInviteLink').value=inviteToken?invitation(inviteToken):'Copy a fresh invitation below';
    status(room.guest_id?'Your room is private. Draw a card when you’re ready.':'Your room is ready. Invite your partner.');updateConnection();
    if(!room.card){byId('card').classList.add('hidden');return}
    const both=room.host_ready&&room.guest_ready;
    if(lastCardId!==room.card_id){
      lastCardId=room.card_id;level=room.card.l;renderMood();privatePrompt='';byId('duetPrivateText').textContent='Only you can see it until you reveal it.';
      const auto=byId('auto').checked;byId('auto').checked=false;
      try{show({...room.card})}finally{byId('auto').checked=auto}
      clearInterval(tid);tid=null;
    }
    leader=room.leader_index;turn();
    byId('roundLabel').textContent='Shared round '+String(room.round).padStart(2,'0');
    byId('card').classList.toggle('locked',!both);
    renderGateButtons([room.host_name,room.guest_name||'Partner']);
    const ready=[room.host_ready,room.guest_ready],mine=host?0:1;
    [0,1].forEach(i=>{const b=byId('g'+(i+1));b.disabled=i!==mine||ready[i];b.textContent=i===mine?(ready[i]?'You’re ready':'I’m ready'):(ready[i]?'Partner is ready':'Waiting for partner')});
    byId('gnote').textContent='A yes from both of you before this round begins.';
    byId('start').disabled=!both;byId('done').disabled=!both||room.outcome==='completed';
    byId('photo').classList.add('hidden');byId('failed').classList.add('hidden');
    byId('duetPrivateDraw').disabled=!room.card_id;byId('duetReveal').disabled=!privatePrompt||!both;
    const revealed=host?room.guest_reveal:room.host_reveal;
    byId('duetPeerReveal').classList.toggle('hidden',!revealed);byId('duetPeerReveal').textContent=revealed?'Your partner reveals: '+revealed:'';
    if(room.outcome==='completed'){
      if(!completed.has(room.card_id)){outcome('completed');completed.add(room.card_id);completed=new Set([...completed].slice(-100));sv('kama_duet_completed',[...completed])}
      byId('outcomeStatus').textContent='Completed together. Ready for another?';
    }
    if(!both&&document.activeElement===byId('name')){const heading=byId('gate').querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true})}
    renderClock();
  }
  async function run(button,operation){
    if(button?.disabled)return;const restore=button?.disabled;
    if(button)button.disabled=true;
    let failure;
    try{return await operation()}catch(error){failure=error;showToast(errorMessage(error))}
    finally{if(button)button.disabled=!!restore;render(client?.room);if(failure)status(errorMessage(failure))}
  }
  const originalMode=setMode;
  setMode=function(next){
    originalMode(next);document.documentElement.dataset.mode=next;
    byId('m-duet-actions').classList.toggle('hidden',next!=='duet');
    if(next==='duet'){byId('emptyState').classList.add('hidden');lastCardId=null;render(client?.room)}
    else{byId('actionDock').classList.remove('hidden');clearInterval(clockTick);clockTick=null;byId('photo').classList.remove('hidden');byId('failed').classList.remove('hidden');byId('start').disabled=false;byId('done').disabled=false}
  };
  const originalReady=gtap;
  gtap=function(i){if(!active())return originalReady(i);run(byId('g'+(i+1)),()=>client.command('ready'))};
  for(const [id,action] of [['start',null],['done','complete'],['swap','swap']]){
    const original=byId(id).onclick;
    byId(id).onclick=()=>{if(!active())return original();run(byId(id),()=>client.command(action||(client.room.timer_ends_at&&Date.parse(client.room.timer_ends_at)>Date.now()+clockOffset?'timer_pause':'timer_start')))};
  }
  async function draw(){
    if(!client?.room?.guest_id)throw new Error('Wait for your partner to join.');
    const kind=byId('duetKind').value==='desire'?'desire':'truth';
    const prompt=promptPicker.take(TD[kind][level]||TD[kind][1],{avoid:client.room.card?.t});
    if(!prompt)throw new Error('No prompts match this deck.');
    return client.command('draw',{card:{l:level,k:kind==='truth'?'Truth':'Desire',n:kind==='truth'?'Truth':'Desire',t:prompt,s:kind==='truth'?60:120}});
  }
  const originalSkip=byId('skip').onclick;byId('skip').onclick=()=>active()?run(byId('skip'),draw):originalSkip();
  byId('duetDraw').onclick=()=>run(byId('duetDraw'),draw);
  byId('duetCreate').onclick=()=>run(byId('duetCreate'),async()=>{if(!name())throw new Error('Enter your name first.');const r=await client.create(name());if(!r)return;inviteToken=r.invite_token;render(client.room)});
  byId('duetJoin').onclick=()=>run(byId('duetJoin'),async()=>{if(!name())throw new Error('Enter your name first.');await client.join(extractCode(byId('duetCode').value),name());sessionStorage.removeItem('kama_duet_invite')});
  byId('duetCode').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();byId('duetJoin').click()}});
  byId('duetCopy').onclick=()=>run(byId('duetCopy'),async()=>{
    if(!inviteToken){const reply=await client.command('invite');inviteToken=reply.invite_token}
    const link=invitation(inviteToken);byId('duetInviteLink').value=link;
    try{await navigator.clipboard.writeText(link);showToast('Invitation copied.')}catch{byId('duetInviteLink').select();showToast('Copy the selected invitation link.')}
  });
  byId('duetLeave').onclick=()=>run(byId('duetLeave'),async()=>{await client.command('leave');privatePrompt='';inviteToken='';lastCardId=null;render(null)});
  byId('duetReconnect').onclick=()=>run(byId('duetReconnect'),()=>client.refresh());
  byId('duetPrivateDraw').onclick=()=>{
    if(!active()||!client.room.card_id)return;
    const kind=randomInt(2)?'truth':'desire';privatePrompt=promptPicker.take(TD[kind][level]||TD[kind][1],{avoid:privatePrompt})||'';
    byId('duetPrivateText').textContent=privatePrompt;byId('duetReveal').disabled=!(client.room.host_ready&&client.room.guest_ready);
  };
  byId('duetReveal').onclick=()=>run(byId('duetReveal'),()=>client.command('reveal',{text:privatePrompt}));
  async function initialize(){
    if(client||!accountUser)return;
    client=new window.KamaDuetClient.DuetClient({
      userId:accountUser.id,api,onState:render,onError:error=>status(errorMessage(error)),canPoll:()=>!document.hidden,
      onConnection:state=>{connection=state;updateConnection()},
      subscribe:(id,onChange,onConnection)=>{
        const channel=window.kamaSupabase.channel('duet-room-'+id).on('postgres_changes',{event:'UPDATE',schema:'public',table:'duet_rooms',filter:'id=eq.'+id},payload=>onChange(payload.new)).subscribe(state=>onConnection(state==='SUBSCRIBED'?'live':'reconnecting'));
        return ()=>window.kamaSupabase.removeChannel(channel).catch(()=>{});
      }
    });
    try{
      const membership=await api({action:'membership'});member=membership.premium===true;
      await client.resume();
      if(mode==='duet')render(client.room);
    }catch(error){status('Duet is being prepared. Local play is available.');byId('duetCreate').classList.add('hidden')}
    try{const invite=sessionStorage.getItem('kama_duet_invite');if(invite){byId('duetCode').value=invite;setMode('duet')}}catch{}
  }
  window.kamaDuet={getNames:()=>client?.room?[client.room.host_name,client.room.guest_name||'Partner']:null,get active(){return active()},get room(){return client?.room}};
  document.addEventListener('kama:auth-ready',initialize,{once:true});if(accountUser)initialize();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)client?.refresh()});
  window.addEventListener('pagehide',()=>{clearInterval(clockTick);clockTick=null;client?.stop()});
  window.addEventListener('pageshow',event=>{if(event.persisted&&client){client.resume().catch(error=>status(errorMessage(error)))}});
})();
