(function(root){
  'use strict';
  const starters=[
    {label:'Peaceful Piano',url:'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO'},
    {label:'Chill Hits',url:'https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6'},
    {label:'Love Songs Essentials',url:'https://music.apple.com/us/playlist/love-songs-essentials/pl.9170a7ae18d04316ac426bbb0152fbf8'},
    {label:'Piano Chill',url:'https://music.apple.com/us/playlist/piano-chill/pl.cb4d1c09a2df4230a78d0395fe1f8fde'}
  ];
  function playlist(value){
    if(typeof value!=='string'||value.trim().length>2048)throw new Error('Paste a Spotify or Apple Music playlist link.');
    const input=value.trim();
    if(!/^https:\/\//i.test(input))throw new Error('Use the full HTTPS link from the playlist’s Share menu.');
    let url;try{url=new URL(input)}catch{throw new Error('That playlist link could not be read.')}
    if(url.username||url.password||url.port)throw new Error('Use a normal playlist share link, without sign-in details.');
    if(url.hostname==='open.spotify.com'){
      const match=url.pathname.match(/^\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]{22})\/?$/i);
      if(!match)throw new Error('Choose a Spotify playlist link, rather than a song, album or short link.');
      return {provider:'Spotify',url:'https://open.spotify.com/playlist/'+match[1]};
    }
    if(url.hostname==='music.apple.com'){
      const match=url.pathname.match(/^\/([a-z]{2})\/playlist\/(?:([A-Za-z0-9%._~-]+)\/)?(pl\.[A-Za-z0-9.-]{1,120})\/?$/i);
      if(!match)throw new Error('Choose an Apple Music playlist link, rather than a song or album.');
      if(match[2]){let slug;try{slug=decodeURIComponent(match[2])}catch{throw new Error('That playlist link could not be read.')}if(/[\\/]/.test(slug)||slug==='..')throw new Error('Use the original playlist share link.')}
      return {provider:'Apple Music',url:'https://music.apple.com/'+match[1].toLowerCase()+'/playlist/'+(match[2]?match[2]+'/':'')+match[3]};
    }
    throw new Error('Use a full open.spotify.com or music.apple.com playlist link.');
  }
  function saved(value){
    if(!Array.isArray(value))return [];
    const entries=[],seen=new Set();
    for(const item of value.slice(0,12)){
      try{
        const parsed=playlist(item?.url);if(seen.has(parsed.url))continue;
        const label=typeof item.label==='string'?item.label.trim().slice(0,48):'';
        entries.push({...parsed,label:label||parsed.provider+' playlist'});seen.add(parsed.url);
      }catch{}
    }
    return entries;
  }
  const api={playlist,saved,starters};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.KamaMusicLinks=api;
})(globalThis);
