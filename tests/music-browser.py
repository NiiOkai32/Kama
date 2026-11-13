from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import os, json
BASE=os.environ.get('KAMA_TEST_URL','http://127.0.0.1:8000/')
STUB="window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'fixture-user',email:'fixture@example.invalid',user_metadata:{}}},error:null}),signOut:async()=>({error:null})}})};"
SP='https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for native in [False,True]:
  c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');calls=[];errors=[]
  c.add_init_script("localStorage.setItem('kama_age_confirmed',String(Date.now()));localStorage.setItem('kama_how_seen','1');window.kamaNative="+str(native).lower()+";")
  c.route('**/assets/vendor/supabase.js',lambda r:r.fulfill(status=200,content_type='application/javascript',body=STUB))
  def provider(route):
   calls.append(route.request.url);route.fulfill(status=200,content_type='text/html',body='<title>Music provider fixture</title><p>External playlist</p>')
  c.route('https://open.spotify.com/**',provider);c.route('https://music.apple.com/**',provider)
  page=c.new_page();page.on('pageerror',lambda error:errors.append(str(error)));page.goto(BASE+'game.html');page.wait_for_function("!document.documentElement.classList.contains('auth-pending')")
  page.click('#draw');before=page.evaluate('cur.t');page.click('#musicOpen');expect(page.locator('#musicDialog')).to_be_visible();assert not calls;assert page.locator('iframe').count()==0
  expect(page.locator('#musicChoice option')).to_have_count(4);assert page.locator('#musicLaunch').get_attribute('rel')=='noopener noreferrer'
  assert page.locator('#musicLaunch').get_attribute('target')==(None if native else '_blank')
  page.click('#musicDialog .setting-section summary');label='<img src=x onerror=window.musicInjected=true>'
  page.fill('#musicLabel',label);page.fill('#musicUrl',SP+'?si=private-share-id');page.click('#musicForm button');expect(page.locator('#musicStatus')).to_contain_text('saved');assert page.locator('#musicLaunch').get_attribute('href')==SP
  assert page.locator('#musicChoice img').count()==0;assert not page.evaluate('!!window.musicInjected')
  page.fill('#musicUrl','https://open.spotify.com.evil.example/playlist/37i9dQZF1DX4sWSpwq3LiO');page.click('#musicForm button');expect(page.locator('#musicStatus')).to_contain_text('Use a full');assert page.locator('#musicLaunch').get_attribute('href')==SP
  if native:
   page.evaluate("document.getElementById('musicLaunch').addEventListener('click',e=>{e.preventDefault();window.nativePlaylist=e.currentTarget.href})")
   page.click('#musicLaunch');assert page.evaluate('window.nativePlaylist')==SP
  else:
   with page.expect_popup() as info:page.click('#musicLaunch')
   popup=info.value;popup.wait_for_load_state();assert popup.url==SP;assert popup.evaluate('window.opener') is None;popup.close();assert len(calls)==1
  assert page.evaluate('window.kamaMusicQuiet') is True
  page.evaluate("window.testChimeContexts=0;window.realAudio=window.AudioContext;window.AudioContext=function(){window.testChimeContexts++;throw Error('unexpected audio')};chime();window.AudioContext=window.realAudio;void 0")
  assert page.evaluate('window.testChimeContexts')==0
  page.click('#musicDialog > .main');assert page.evaluate('cur.t')==before;page.click('#amb');expect(page.locator('#toast')).to_contain_text('muted')
  page.click('.md[data-m="td"]');page.click('#truth');assert page.evaluate('window.kamaMusicQuiet') is True
  page.reload();page.wait_for_function("!document.documentElement.classList.contains('auth-pending')");assert page.evaluate('window.kamaMusicQuiet') is True;page.click('#musicOpen');expect(page.locator('#musicChoice')).to_have_value(SP)
  page.click('#musicRestore');assert page.evaluate('window.kamaMusicQuiet') is False;expect(page.locator('#musicQuiet')).not_to_be_checked();page.click('#musicRemove');expect(page.locator('#musicStatus')).to_contain_text('removed')
  page.locator('#musicDialog .setting-section').evaluate('e=>e.open=true')
  for width,height in [(320,568),(390,844),(844,390),(1440,1000)]:
   page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   for selector in ['#musicChoice','#musicLaunch','#musicForm button']:
    box=page.locator(selector).bounding_box();assert box and box['height']>=44,(selector,box)
  page.locator('#musicDialog > .main').click();page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(150);page.locator('#sessionPanel').evaluate('e=>e.open=true');page.click('[data-open="settingsDialog"]');page.click('#clearDevice');page.click('#clearConfirm');page.wait_for_url('**/quiet.html');assert page.evaluate("localStorage.getItem('kama_music_library')") is None
  assert not errors,errors;c.close();print('PASS',('Android-shaped' if native else 'web'),'playlist selection/save, URL safety, explicit external handoff, quiet game, persistence, removal, responsive controls and scoped clearing',flush=True)
 b.close()
