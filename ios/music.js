(() => {
  const byId=id=>document.getElementById(id),links=window.KamaMusicLinks;
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  let library=links.saved(read('kama_music_library',[]));
  let selection=read('kama_music_selected','');
  let session=false;try{session=sessionStorage.getItem('kama_music_session')==='1'}catch{}
  const quiet=byId('musicQuiet');quiet.checked=read('kama_music_quiet',true)!==false;
  const status=text=>{byId('musicStatus').textContent=text};
  function entries(){const custom=new Set(library.map(item=>item.url));return [...links.starters.filter(item=>!custom.has(item.url)).map(item=>({...item,...links.playlist(item.url)})),...library]}
  function selected(){return entries().find(item=>item.url===selection)}
  function mute(){
    window.kamaMusicQuiet=session&&quiet.checked;
    if(window.kamaMusicQuiet&&typeof ac!=='undefined'&&ac){const previous=ac;ac=null;previous.close().catch(()=>{});byId('amb').setAttribute('aria-pressed','false');byId('amb').title='Ambient sound';}
    byId('musicRestore').disabled=!window.kamaMusicQuiet;
  }
  function render(){
    const items=entries(),choice=byId('musicChoice');choice.replaceChildren();
    for(const item of items){const option=document.createElement('option');option.value=item.url;option.textContent=item.label+' · '+item.provider;choice.append(option)}
    if(!items.some(item=>item.url===selection))selection=items[0]?.url||'';
    choice.value=selection;
    const item=selected(),open=byId('musicLaunch');
    if(item){open.href=item.url;open.textContent='Open in '+item.provider;open.removeAttribute('aria-disabled')}
    else{open.removeAttribute('href');open.textContent='Choose a playlist';open.setAttribute('aria-disabled','true')}
    // In the APK a same-window navigation is handed to Android's external
    // ACTION_VIEW handler. Remote pages never enter its privileged WebView.
    if(window.kamaNative){open.removeAttribute('target')}else open.target='_blank';
    byId('musicRemove').disabled=!library.some(item=>item.url===selection);
    write('kama_music_selected',selection);mute();
  }
  byId('musicChoice').onchange=event=>{selection=event.target.value;render();status('Playlist selected. Open it, press Play there, then return to Kama.')};
  byId('musicForm').onsubmit=event=>{
    event.preventDefault();
    try{
      const parsed=links.playlist(byId('musicUrl').value),label=byId('musicLabel').value.trim().slice(0,48)||parsed.provider+' playlist';
      const at=library.findIndex(item=>item.url===parsed.url);
      if(at<0&&library.length>=12)throw new Error('You can save 12 playlists. Remove one to add another.');
      const item={...parsed,label};if(at<0)library.push(item);else library[at]=item;
      selection=item.url;const persisted=write('kama_music_library',library);byId('musicForm').reset();render();
      status(persisted?'Playlist saved on this device.':'Added for this session; this browser could not save it.');
    }catch(error){status(error.message)}
  };
  byId('musicRemove').onclick=()=>{library=library.filter(item=>item.url!==selection);write('kama_music_library',library);selection='';render();status('Saved playlist removed. Starter suggestions remain available.')};
  byId('musicLaunch').addEventListener('click',event=>{
    const item=selected();if(!item){event.preventDefault();status('Choose a playlist first.');return}
    session=true;try{sessionStorage.setItem('kama_music_session','1')}catch{}mute();
    status('Opening '+item.provider+'. Press Play there, then return to Kama. Music controls stay in your music app or tab.');
  });
  quiet.onchange=()=>{session=quiet.checked;try{session?sessionStorage.setItem('kama_music_session','1'):sessionStorage.removeItem('kama_music_session')}catch{}write('kama_music_quiet',quiet.checked);mute();status(window.kamaMusicQuiet?'Kama sounds are muted. Music stays controlled in your music app.':'Kama sounds are available. This does not pause your music app.')};
  byId('musicRestore').onclick=()=>{quiet.checked=false;quiet.onchange();status('Kama sounds restored. Stop or pause your playlist in its music app or tab.')};
  byId('musicDialog').addEventListener('close',()=>{byId('musicForm').reset()});
  window.kamaMusic={get quiet(){return window.kamaMusicQuiet===true},get selected(){return selected()||null}};
  render();
})();
