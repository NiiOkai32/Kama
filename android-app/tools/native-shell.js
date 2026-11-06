(() => {
  window.kamaNative=window.KamaAndroid?.isAndroidApp?.()===true;
  if(!window.kamaNative)return;
  const file=location.pathname.split('/').pop();
  if(file==='signin.html'||file==='signup.html'){try{sessionStorage.removeItem('kama_native_local_play')}catch{}}
  try{window.kamaNativeLocalPlay=sessionStorage.getItem('kama_native_local_play')==='1'}catch{window.kamaNativeLocalPlay=false}
  try{
    Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.KamaAndroid.copyText(String(text))}},configurable:true});
  }catch{}
  document.addEventListener('DOMContentLoaded',()=>{
    if(document.getElementById('intro')){
      const button=document.createElement('a');button.id='localPlay';button.href='game.html';button.className='button primary native-play';button.textContent='Play on this device';
      button.onclick=()=>{try{sessionStorage.setItem('kama_native_local_play','1')}catch{}};
      const note=document.createElement('p');note.className='field-hint';note.textContent='Local play works offline. Sign in for remote Duet.';
      const intro=document.getElementById('intro');intro.after(button,note);
    }
    if(!document.getElementById('arena'))return;
    const before=setMode;
    setMode=function(next){
      before(next);
      if(next==='duet'&&window.kamaNativeLocalPlay){
        document.getElementById('duetStatus').textContent='Sign in with internet access to play with a remote partner.';
        document.getElementById('duetJoin').disabled=true;
        document.getElementById('duetCreate').disabled=true;
        document.getElementById('nativeDuetSignin').classList.remove('hidden');
      }
    };
    const signin=document.createElement('a');signin.id='nativeDuetSignin';signin.className='button primary hidden';signin.href='signin.html';signin.textContent='Sign in for Duet';document.getElementById('duetLobby').append(signin);
    if(window.kamaNativeLocalPlay){
      document.getElementById('deleteAccount').disabled=true;
      document.getElementById('deleteAccount').title='Sign in to delete a server account.';
    }
    document.getElementById('exportDeck').onclick=()=>{
      const json=JSON.stringify({version:1,cards:custom.map(c=>({l:c.l,n:c.n,t:c.t,s:c.s}))},null,2);
      window.KamaAndroid.saveDeck(json);
    };
    document.getElementById('quickHide').title='Hide the table. Android Back then closes the app.';
  });
})();
