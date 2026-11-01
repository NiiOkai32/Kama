(() => {
  const byId=id=>document.getElementById(id),started=Date.now();
  const auth=()=>window.kamaSupabase?.auth;
  function message(id,value){byId(id).textContent=value}
  function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close())}
  function pauseLocal(){
    if(tid){updateCardClock();clearInterval(tid);tid=null;byId('start').textContent='Resume'}
    if(dt){updateDiceClock();clearInterval(dt);dt=null;byId('dstart').textContent='Resume'}
    cancelRoll();if(ac)ac.suspend().catch(()=>{});
  }
  function hide(){pauseLocal();document.documentElement.classList.add('privacy-hidden');location.replace('quiet.html')}
  window.kamaQuickHide=hide;
  byId('quickHide').onclick=hide;
  byId('pausePlay').onclick=()=>{
    pauseLocal();window.kamaDuet?.pause?.();closeDialogs();
    document.documentElement.classList.add('play-paused');byId('pauseDialog').showModal();
  };
  byId('resumePlay').onclick=()=>{byId('pauseDialog').close()};
  byId('pauseDialog').addEventListener('close',()=>document.documentElement.classList.remove('play-paused'));
  byId('pauseHide').onclick=hide;
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('dialog[open]')){event.preventDefault();hide()}
  });
  async function clearDevice(){
    try{await auth()?.signOut({scope:'local'})}catch{}
    for(const storage of [localStorage,sessionStorage]){
      const keys=[];for(let i=0;i<storage.length;i++)keys.push(storage.key(i));
      const project=new URL(window.KAMA_SUPABASE_CONFIG.url).hostname.split('.')[0];
      for(const key of keys)if(key?.startsWith('kama_')||key?.startsWith('sb-'+project+'-'))storage.removeItem(key);
    }
    try{localStorage.setItem('kama_cleared_at',String(Date.now()))}catch{}
    hide();
  }
  byId('clearDevice').onclick=()=>byId('clearDialog').showModal();
  byId('clearConfirm').onclick=async()=>{
    byId('clearConfirm').disabled=true;
    try{await clearDevice()}catch{message('clearStatus','Could not clear browser storage. Use your browser’s site-data settings.');byId('clearConfirm').disabled=false}
  };
  window.addEventListener('storage',event=>{if(event.key==='kama_cleared_at'&&Number(event.newValue)>=started)hide()});
  byId('deleteAccount').onclick=()=>{byId('deleteForm').reset();message('deleteStatus','');byId('deleteDialog').showModal()};
  byId('deleteDialog').addEventListener('close',()=>byId('deleteForm').reset());
  byId('deleteForm').onsubmit=async event=>{
    event.preventDefault();const button=byId('deleteConfirm');button.disabled=true;message('deleteStatus','Deleting your account…');
    try{
      const {data,error}=await window.kamaSupabase.functions.invoke('account-delete',{body:{confirmation:byId('deleteWord').value,password:byId('deletePassword').value}});
      if(error){let text='Could not delete your account. Try again.';try{text=(await error.context.clone().json()).error||text}catch{}throw new Error(text)}
      if(data?.deleted!==true)throw new Error('Account deletion was not confirmed. Try again.');
      byId('deleteForm').reset();await clearDevice();
    }catch(error){byId('deletePassword').value='';message('deleteStatus',error.message||'Could not delete your account. Try again.')}finally{button.disabled=false}
  };
  function recovery(){
    if(!window.kamaRecovery||!window.kamaAgeConfirmed)return;
    closeDialogs();byId('passwordDialog').showModal();
  }
  byId('passwordDialog').addEventListener('cancel',e=>e.preventDefault());
  byId('passwordForm').onsubmit=async event=>{
    event.preventDefault();const button=byId('passwordSave');button.disabled=true;
    try{
      const password=byId('newPassword').value;
      if(password.length<12||password.length>256)throw new Error('Use 12–256 characters.');
      if(password!==byId('confirmPassword').value)throw new Error('Passwords do not match.');
      const {error}=await auth().updateUser({password});if(error)throw error;
      byId('passwordForm').reset();window.kamaRecovery=false;byId('passwordDialog').close();
      showToast('Password updated.');
    }catch(error){message('passwordStatus',error.message||'Could not update your password. Request a fresh link.')}finally{button.disabled=false}
  };
  byId('passwordExit').onclick=async()=>{await auth()?.signOut({scope:'local'});hide()};
  window.addEventListener('kama:recovery',recovery);
  window.addEventListener('kama:age-confirmed',()=>{recovery();onboarding()});
  function onboarding(){
    if(window.kamaRecovery||!window.kamaAgeConfirmed)return;
    try{if(localStorage.getItem('kama_how_seen'))return;localStorage.setItem('kama_how_seen','1')}catch{}
    if(!document.querySelector('dialog[open]'))byId('rulesDialog').showModal();
  }
  if(window.kamaAgeConfirmed){recovery();onboarding()}
  window.addEventListener('pageshow',()=>{if(!window.kamaRecovery&&window.kamaAgeConfirmed)onboarding()});
  // A backup file contains text, never executable markup, images or remote URLs.
  byId('exportDeck').onclick=()=>{
    const blob=new Blob([JSON.stringify({version:1,cards:custom.map(c=>({l:c.l,n:c.n,t:c.t,s:c.s}))},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='my-cards.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  byId('importDeck').onclick=()=>byId('deckFile').click();
  let pending=[];
  byId('deckFile').onchange=async event=>{
    const file=event.target.files[0];event.target.value='';if(!file)return;
    try{
      if(file.size>100000)throw new Error('Use a JSON deck smaller than 100 KB.');
      const data=JSON.parse(await file.text());
      if(data.version!==1||!Array.isArray(data.cards)||!data.cards.length||data.cards.length>100)throw new Error('Use a version 1 deck with 1–100 cards.');
      pending=data.cards.map(c=>{
        if(!c||!Number.isInteger(c.l)||c.l<0||c.l>3||typeof c.t!=='string'||!c.t.trim()||c.t.length>1000||typeof c.n!=='string'||!c.n.trim()||c.n.length>120||!Number.isInteger(c.s)||c.s<1||c.s>3600)throw new Error('A card has invalid text, heat level or timer.');
        return {l:c.l,n:c.n.trim(),t:c.t.trim(),s:c.s,k:'Ours'};
      });
      message('importCount',pending.length+' custom cards. Review their wording and boundaries before playing.');byId('importDialog').showModal();
    }catch(error){pending=[];showToast(error.message||'Could not import that deck.')}
  };
  byId('importConfirm').onclick=()=>{
    const known=new Set(CARDS.map(c=>promptKey(c.t)));let added=0;
    pending.forEach(c=>{const key=promptKey(c.t);if(!known.has(key)){known.add(key);custom.push(c);CARDS.push(c);added++}});
    sv('kama_custom',custom);pending=[];cc();byId('importDialog').close();showToast(added+' custom cards added.');
  };
  byId('importDialog').addEventListener('close',()=>pending=[]);
})();
