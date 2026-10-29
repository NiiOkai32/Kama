from playwright.sync_api import sync_playwright,expect
from datetime import datetime,timedelta,timezone
from pathlib import Path
import json,uuid,time,os,tempfile
BASE=os.environ.get('KAMA_TEST_URL','http://127.0.0.1:8001/')
ARTIFACTS=Path(os.environ.get('KAMA_TEST_ARTIFACTS',tempfile.mkdtemp(prefix='kama-duet-')))
ARTIFACTS.mkdir(parents=True,exist_ok=True)
HOST='11111111-1111-4111-8111-111111111111';GUEST='22222222-2222-4222-8222-222222222222';OTHER='33333333-3333-4333-8333-333333333333'
now=lambda:datetime.now(timezone.utc).isoformat()
class Server:
 def __init__(self):self.room=None;self.calls=[];self.code='a'*32
 def call(self,user,body):
  self.calls.append((user,body));a=body['action']
  def fail(message,status=403):return {'error':message,'status':status}
  if a=='membership':return {'premium':user==HOST,'offer':{'amount_minor':199,'currency':'USD','checkout_enabled':False}}
  if a=='resume':return {'room':self.room.copy() if self.room and self.room['status']=='open' and user in [self.room['host_id'],self.room['guest_id']] else None,'server_now':now()}
  if a=='create':
   if user!=HOST:return fail('A Duet membership is required to host.')
   self.room={'id':str(uuid.uuid4()),'host_id':HOST,'guest_id':None,'host_name':body['display_name'],'guest_name':None,'status':'open','revision':0,'round':0,'card':None,'card_id':None,'host_ready':False,'guest_ready':False,'host_seen_at':now(),'guest_seen_at':None,'leader_index':0,'remaining_seconds':0,'timer_ends_at':None,'outcome':None,'host_reveal':None,'guest_reveal':None}
   return {'room':self.room.copy(),'invite_token':self.code,'server_now':now()}
  r=self.room
  if not r or r['status']!='open':return fail('This room has closed.')
  if a=='join':
   if body['code']!=self.code:return fail('This invitation is unavailable.')
   if r['guest_id'] not in [None,user] or user==HOST:return fail('This room already has two players.')
   r.update(guest_id=user,guest_name=body['display_name'],guest_seen_at=now());r['revision']+=1
  else:
   if user not in [r['host_id'],r['guest_id']]:return fail('This room is unavailable.')
   if a=='status':r['host_seen_at' if user==HOST else 'guest_seen_at']=now()
   elif a=='draw':
    if r['guest_id'] is None:return fail('Wait for your partner.',400)
    if body['revision']!=r['revision']:return fail('The room changed. Try again.',409)
    r.update(card=body['card'],card_id=str(uuid.uuid4()),round=r['round']+1,host_ready=False,guest_ready=False,remaining_seconds=body['card']['s'],timer_ends_at=None,outcome=None,host_reveal=None,guest_reveal=None);r['revision']+=1
   elif a=='ready':r['host_ready' if user==HOST else 'guest_ready']=True;r['revision']+=1
   elif a in ['timer_start','timer_pause','complete']:
    if not(r['host_ready'] and r['guest_ready']):return fail('Both players must be ready.')
    if a=='timer_start':r['timer_ends_at']=(datetime.now(timezone.utc)+timedelta(seconds=r['remaining_seconds'] or r['card']['s'])).isoformat()
    elif a=='timer_pause':r['remaining_seconds']=max(0,int((datetime.fromisoformat(r['timer_ends_at'])-datetime.now(timezone.utc)).total_seconds()+.99));r['timer_ends_at']=None
    else:r['outcome']='completed';r['timer_ends_at']=None;r['remaining_seconds']=0
    r['revision']+=1
   elif a=='reveal':r['host_reveal' if user==HOST else 'guest_reveal']=body['text'];r['revision']+=1
   elif a=='swap':r['leader_index']=1-r['leader_index'];r['revision']+=1
   elif a=='leave':r.update(status='closed',card=None,host_reveal=None,guest_reveal=None,timer_ends_at=None);r['revision']+=1
   elif a=='invite':return {'room':r.copy(),'invite_token':self.code,'server_now':now()}
  return {'room':r.copy(),'server_now':now()}
STUB='''window.supabase={createClient:()=>({
auth:{getUser:async()=>({data:{user:{id:USER,email:'fixture@example.com',user_metadata:{usage_tracking:false}}},error:null})},
functions:{invoke:async(name,options)=>{const reply=await window.duetFixture(options.body);if(reply.error)return {data:null,error:{message:reply.error,context:new Response(JSON.stringify({error:reply.error}),{status:reply.status||403})}};return {data:reply,error:null}}},
channel:()=>({on(type,filter,callback){this.callback=callback;return this},subscribe(callback){window.duetChannels??=[];window.duetChannels.push(this);callback('SUBSCRIBED');return this}}),
removeChannel:async channel=>{window.duetChannels=(window.duetChannels||[]).filter(x=>x!==channel)}
})};'''
passed=[]
def ok(s):passed.append(s);print('PASS',s,flush=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);server=Server();pages=[];contexts=[];errors=[]
 def make(user,width=1440,height=1000):
  c=b.new_context(viewport={'width':width,'height':height},reduced_motion='reduce');contexts.append(c)
  c.route('https://cdn.jsdelivr.net/**',lambda route:route.fulfill(status=200,content_type='application/javascript',body=STUB.replace('USER',json.dumps(user))))
  page=c.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.expose_binding('duetFixture',lambda source,body:server.call(user,body));page.goto(BASE+'game.html');page.wait_for_function("!document.documentElement.classList.contains('auth-pending')");page.wait_for_timeout(150);pages.append(page);return page
 def sync():
  if server.room:
   for page in pages:page.evaluate("r=>(window.duetChannels||[]).forEach(c=>c.callback({new:r}))",server.room.copy())
 host=make(HOST);guest=make(GUEST)
 host.click('.md[data-m="duet"]');guest.click('.md[data-m="duet"]')
 expect(guest.locator('#duetOffer')).to_be_visible();expect(guest.locator('#duetBuy')).to_be_disabled();expect(guest.locator('#duetCreate')).to_be_hidden();expect(guest.locator('#duetOffer')).to_contain_text('$1.99');ok('The proposed US$1.99 paywall is visible, checkout is disabled, and free guests retain Join')
 host.fill('#duetName','Alex');host.click('#duetCreate');expect(host.locator('#duetRoom')).to_be_visible();expect(host.locator('#duetDraw')).to_be_disabled();link=host.locator('#duetInviteLink').input_value();assert '#duet=' in link
 guest.fill('#duetName','Riley');guest.fill('#duetCode',link);guest.click('#duetJoin');sync();expect(host.locator('#duetDraw')).to_be_enabled();expect(guest.locator('#duetDraw')).to_be_enabled();ok('A paid host creates a private room and one unpaid partner joins by invitation')
 other=make(OTHER);other.click('.md[data-m="duet"]');other.fill('#duetName','Third');other.fill('#duetCode',link);other.click('#duetJoin');expect(other.locator('#duetStatus')).to_contain_text('two players');expect(other.locator('#duetRoom')).to_be_hidden();ok('A third account cannot join or read the two-player room')
 host.click('#duetDraw');sync();expect(host.locator('#gate')).to_be_visible();expect(guest.locator('#gate')).to_be_visible();assert host.evaluate('cur.t')==guest.evaluate('cur.t');expect(host.locator('#g2')).to_be_disabled();expect(guest.locator('#g1')).to_be_disabled()
 host.click('#g1');sync();expect(guest.locator('#gate')).to_be_visible();guest.click('#g2');sync();expect(host.locator('#gate')).to_be_hidden();expect(guest.locator('#gate')).to_be_hidden();ok('Both devices receive the same prompt and each person confirms only their own readiness')
 host.click('#start');sync();expect(guest.locator('#start')).to_have_text('Pause together');guest.click('#start');sync();expect(host.locator('#start')).to_have_text('Start together');assert host.locator('#timer').inner_text()==guest.locator('#timer').inner_text();ok('The shared timer starts and pauses for both players')
 host.fill('#answer','A private answer that stays on my device.');assert guest.locator('#answer').input_value()=='';assert not any('A private answer' in json.dumps(body) for user,body in server.calls)
 host.click('.duet-private summary');host.click('#duetPrivateDraw');private=host.locator('#duetPrivateText').inner_text();assert server.room['host_reveal'] is None;host.click('#duetReveal');sync();expect(guest.locator('#duetPeerReveal')).to_have_text('Your partner reveals: '+private);ok('Typed answers remain local; private prompts reach the partner only after explicit reveal')
 guest.click('#done');sync();expect(host.locator('#done')).to_be_disabled();expect(guest.locator('#done')).to_be_disabled();expect(host.locator('#outcomeStatus')).to_contain_text('Completed together');ok('Completing a round updates both devices without duplicate completion controls')
 for width,height in [(320,568),(390,844),(768,1024),(1440,1000)]:
  host.set_viewport_size({'width':width,'height':height});host.wait_for_timeout(80);assert host.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,height)
  for selector in ['.md[data-m="duet"]','#duetDraw','#duetLeave']:
   box=host.locator(selector).bounding_box();assert box and box['width']>=44 and box['height']>=44,(selector,box)
  if width==390:host.screenshot(path=str(ARTIFACTS/'duet-room-mobile.png'))
 ok('Duet room controls fit phone, tablet and PC widths with touch-sized targets')
 host.click('.md[data-m="cards"]');host.click('#draw');expect(host.locator('#card')).to_be_visible();host.click('.md[data-m="duet"]');expect(host.locator('#outcomeStatus')).to_contain_text('Completed together');ok('Local play and an existing remote room can be switched without losing the shared round')
 guest.click('#duetLeave');host.click('#duetReconnect');expect(host.locator('#duetRoom')).to_be_hidden();expect(guest.locator('#duetRoom')).to_be_hidden();assert server.room['card'] is None;ok('Leaving closes the room and clears shared prompts; the partner reconnect sees it closed')
 guest.set_viewport_size({'width':390,'height':844});guest.screenshot(path=str(ARTIFACTS/'duet-paywall-mobile.png'),full_page=True)
 guest.set_viewport_size({'width':1440,'height':1000});guest.screenshot(path=str(ARTIFACTS/'duet-paywall-desktop.png'),full_page=True)
 assert not errors,errors;ok('No uncaught browser errors in the two-player test flow')
 for c in contexts:c.close()
 b.close()
(ARTIFACTS/'duet-ui-verification.json').write_text(json.dumps({'passed':passed,'backend':'Two independent browser contexts with a shared fixture API and simulated authorized Realtime updates; no real payment or account was created.'},indent=2))
