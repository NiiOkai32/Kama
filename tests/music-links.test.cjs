const test=require('node:test');
const assert=require('node:assert/strict');
const {playlist,saved,starters}=require('../music-links.js');
const SP='https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO';
const AM='https://music.apple.com/us/playlist/love-songs-essentials/pl.9170a7ae18d04316ac426bbb0152fbf8';
test('a whole Spotify playlist is canonicalized without tracking data',()=>{
  assert.deepEqual(playlist(SP+'?si=private-share-id#fragment'),{provider:'Spotify',url:SP});
  assert.equal(playlist(SP.replace('/playlist/','/intl-en/playlist/')).url,SP);
});
test('Apple playlist links lose selected-track and affiliate parameters',()=>{
  assert.deepEqual(playlist(AM+'?i=123&at=tracking'),{provider:'Apple Music',url:AM});
  assert.equal(playlist('https://music.apple.com/gh/playlist/pl.u-123abc').provider,'Apple Music');
});
test('scripts, non-provider hosts, lookalikes, credentials and arbitrary ports are rejected',()=>{
  for(const input of ['javascript:alert(1)','http://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO','https://open.spotify.com.evil.example/playlist/37i9dQZF1DX4sWSpwq3LiO','https://evil@open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',SP.replace('.com/','.com:444/'),'https://music.apple.com.evil.example/us/playlist/pl.123'])assert.throws(()=>playlist(input));
});
test('individual tracks, albums, short links and malformed playlist paths are rejected',()=>{
  for(const input of [SP.replace('/playlist/','/track/'),SP.replace('/playlist/','/album/'),'https://spotify.link/example','https://music.apple.com/us/album/example/123','https://music.apple.com/us/playlist/evil%2Fslug/pl.123',SP+'/extra',SP.slice(0,-2)])assert.throws(()=>playlist(input));
});
test('stored playlists are bounded, sanitized and deduplicated before use',()=>{
  const list=saved([{url:SP+'?si=1',label:' A quiet night '},{url:SP,label:'duplicate'},{url:'javascript:alert(1)',label:'bad'},{url:AM,label:'x'.repeat(100)}]);
  assert.equal(list.length,2);assert.equal(list[0].label,'A quiet night');assert.equal(list[1].label.length,48);
  assert.deepEqual(saved({unexpected:'shape'}),[]);assert.equal(saved([{url:SP}])[0].label,'Spotify playlist');
});
test('every starter is an ordinary canonical playlist link',()=>{
  assert.equal(starters.length,4);for(const item of starters)assert.equal(playlist(item.url).url,item.url);
});
