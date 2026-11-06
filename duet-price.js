(() => {
  const amount=document.getElementById('duetGhs'),note=document.getElementById('duetRateNote');
  let timer=null,controller=null,generation=0;
  const active=()=>typeof mode!=='undefined'&&mode==='duet'&&!document.hidden&&!document.getElementById('duetOffer').classList.contains('hidden');
  function clear(text){amount.textContent=text;note.textContent='Rates update daily. Final GHS amount is confirmed before payment.'}
  function stop(){generation++;controller?.abort();controller=null;clearTimeout(timer);timer=null}
  async function refresh(){
    if(!active())return;
    stop();const request=generation;
    if(window.kamaNativeLocalPlay||navigator.onLine===false){clear('Go online for the current GHS price.');return}
    clear('Checking the current GHS price…');
    const config=window.KAMA_SUPABASE_CONFIG;
    if(!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(config?.url||''))return clear('GHS price unavailable.');
    const current=new AbortController();controller=current;const started=performance.now();const abort=setTimeout(()=>current.abort(),9000);
    try{
      const response=await fetch(config.url+'/functions/v1/duet-price',{headers:{apikey:config.publishableKey},credentials:'omit',cache:'no-store',signal:current.signal});
      const data=await response.json();
      if(request!==generation||!active())return;
      const expires=Date.parse(data.display_valid_until),server=Date.parse(data.server_now),asOf=Date.parse(data.rate_as_of);
      const remaining=expires-server-(performance.now()-started);
      if(!response.ok||data.offer?.currency!=='USD'||data.offer.amount_minor!==299||data.local_price?.currency!=='GHS'||
          !Number.isSafeInteger(data.local_price.amount_minor)||data.local_price.amount_minor<=0||
          !Number.isFinite(expires)||!Number.isFinite(server)||!Number.isFinite(asOf)||remaining<=0||expires-server>15*60*1000||asOf>server+5*60*1000||server-asOf>27*60*60*1000)throw new Error('Invalid price quote.');
      amount.textContent=new Intl.NumberFormat('en-GH',{style:'currency',currency:'GHS'}).format(data.local_price.amount_minor/100)+' / month';
      note.textContent='Daily rate · updated '+new Date(asOf).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})+'. Final amount confirmed before payment.';
      // Use the server's remaining validity so an incorrect device clock cannot
      // keep an old quote on screen. No offline/local-storage price fallback.
      timer=setTimeout(refresh,Math.max(1000,Math.min(5*60*1000,remaining)));
    }catch(error){
      if(request===generation&&active()){clear('Current GHS price unavailable. Try again shortly.');timer=setTimeout(refresh,60000)}
    }finally{clearTimeout(abort)}
  }
  const previous=setMode;
  setMode=function(next){previous(next);if(next==='duet')refresh();else stop()};
  document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();clear('Go online for the current GHS price.')}else refresh()});
  window.addEventListener('offline',()=>{stop();clear('Go online for the current GHS price.')});
  window.addEventListener('online',refresh);
  window.addEventListener('pagehide',stop);
  window.addEventListener('pageshow',refresh);
  if(active())refresh();
})();
