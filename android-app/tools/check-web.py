from pathlib import Path
from playwright.sync_api import sync_playwright,expect
import json,mimetypes
ROOT=Path(__file__).resolve().parents[1]/'android/app/src/main/assets/web'
BASE='https://niiokai32.github.io/Kama/'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');calls=[];errors=[]
 c.add_init_script("window.KamaAndroid={isAndroidApp:()=>true,copyText:text=>window.nativeCopied=text,saveDeck:json=>window.nativeDeck=json};")
 def local(route):
  rel=route.request.url.split('/Kama/',1)[1].split('#')[0].split('?')[0] or 'index.html';f=ROOT/rel
  if not f.is_file():route.fulfill(status=404,body='Not found');return
  mime=mimetypes.guess_type(str(f))[0] or 'text/plain';route.fulfill(status=200,content_type=mime,body=f.read_bytes())
 c.route(BASE+'**',local)
 c.route('**/*.supabase.co/**',lambda route:(calls.append(route.request.url),route.abort()))
 page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.goto(BASE+'index.html');page.get_by_role('button',name='I am 18 or older').click();expect(page.locator('#localPlay')).to_be_visible();page.click('#localPlay');expect(page.locator('#rulesDialog')).to_be_visible();page.keyboard.press('Escape');page.wait_for_function("!document.documentElement.classList.contains('auth-pending')")
 assert page.evaluate('window.kamaNativeLocalPlay') is True;assert page.evaluate('accountUser') is None;assert page.evaluate('window.kamaSupabase') is None
 page.click('#draw');expect(page.locator('#card')).to_be_visible();page.click('#failed');page.select_option('#forfeitType','drink');expect(page.locator('#forfeitText')).to_contain_text('one sip');page.select_option('#forfeitType','custom');page.fill('#forfeitCustom','Choose the next song.');page.click('#forfeitDone');page.click('.md[data-m="td"]');page.click('#truth');expect(page.locator('#truthAnswer')).to_be_visible();page.click('.md[data-m="dice"]');page.click('#roll');expect(page.locator('#dctl')).to_be_visible();page.click('.md[data-m="ev"]');page.click('#evb');expect(page.locator('#evp')).to_contain_text('Stage 1')
 page.click('.md[data-m="duet"]');expect(page.locator('#nativeDuetSignin')).to_be_visible();expect(page.locator('#duetJoin')).to_be_disabled();expect(page.locator('#duetBuy')).to_be_disabled();expect(page.locator('#duetStatus')).to_contain_text('Sign in')
 page.click('.md[data-m="cards"]');page.locator('#sessionPanel').evaluate('e=>e.open=true');page.click('[data-open="settingsDialog"]');page.fill('#cu','Share one good memory.');page.click('#cadd');page.click('#exportDeck');data=json.loads(page.evaluate('window.nativeDeck'));assert data['version']==1 and any(card['t']=='Share one good memory.' for card in data['cards'])
 page.set_input_files('#deckFile',{'name':'backup.json','mimeType':'application/json','buffer':json.dumps({'version':1,'cards':[{'l':1,'n':'Native import','t':'Tell a joke.','s':60}]}).encode()});page.click('#importConfirm');assert page.evaluate("custom.some(c=>c.n==='Native import')")
 page.locator('#settingsDialog [data-close]').last.click();page.click('#draw');page.click('#fav');page.click('[data-open="favoritesDialog"]');page.click('#fcopy');assert page.evaluate('window.nativeCopied');page.keyboard.press('Escape')
 for width,height in [(320,568),(390,844),(844,390),(768,1024)]:
  page.set_viewport_size({'width':width,'height':height});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');
 page.click('#pausePlay');expect(page.locator('#pauseDialog')).to_be_visible();page.click('#pauseHide');page.wait_for_url('**/quiet.html');assert page.title()=='Take a moment'
 assert not calls,calls;assert not errors,errors
 print('PASS bundled APK web assets: offline play, all local modes, gated Duet, forfeits, native export/clipboard, JSON import, responsive layouts and privacy controls. No backend requests in local mode.')
 b.close()
