from playwright.sync_api import sync_playwright, expect
from datetime import datetime, timedelta, timezone
import os, json

BASE = os.environ.get('KAMA_TEST_URL', 'http://127.0.0.1:8001/')
STUB = """window.supabase={createClient:()=>({auth:{getUser:async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid',user_metadata:{}}},error:null})},functions:{invoke:async(name,options)=>({data:options.body.action==='membership'?{premium:false}:{room:null},error:null})}})};"""

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':390,'height':844}, reduced_motion='reduce')
    context.add_init_script("localStorage.setItem('kama_age_confirmed',String(Date.now()));localStorage.setItem('kama_how_seen','1')")
    context.route('**/assets/vendor/supabase.js', lambda route: route.fulfill(status=200, content_type='application/javascript', body=STUB))
    state = {'kind':'valid', 'amount':3259, 'requests':0}
    def quote(route):
        state['requests'] += 1
        now = datetime.now(timezone.utc)
        if state['kind'] == 'outage':
            route.fulfill(status=503, content_type='application/json', body='{"local_price":null}')
            return
        data = {'offer':{'currency':'USD','amount_minor':299}, 'local_price':{'currency':'GHS','amount_minor':state['amount']}, 'server_now':now.isoformat(), 'rate_as_of':(now-timedelta(hours=1)).isoformat(), 'display_valid_until':(now+timedelta(minutes=15)).isoformat(), 'checkout_enabled':False}
        if state['kind'] == 'expired': data['display_valid_until'] = (now-timedelta(seconds=1)).isoformat()
        if state['kind'] == 'wrong_price': data['offer']['amount_minor'] = 199
        route.fulfill(status=200, content_type='application/json', body=json.dumps(data))
    context.route('**/functions/v1/duet-price', quote)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE+'game.html')
    page.wait_for_function("!document.documentElement.classList.contains('auth-pending')")
    page.wait_for_timeout(100)
    assert state['requests'] == 0
    page.click('.md[data-m="duet"]')
    expect(page.locator('#duetGhs')).to_contain_text('32.59')
    expect(page.locator('#duetOffer')).to_contain_text('US$2.99')
    expect(page.locator('#duetRateNote')).to_contain_text('Daily rate')
    expect(page.locator('#duetBuy')).to_be_disabled()
    assert page.locator('.duet-rate-source').get_attribute('href') == 'https://www.exchangerate-api.com'
    print('PASS fixed US$2.99 base with server-derived GHS price and visible daily-rate attribution', flush=True)
    state['amount'] = 3887
    page.evaluate("window.dispatchEvent(new Event('online'))")
    expect(page.locator('#duetGhs')).to_contain_text('38.87')
    print('PASS GHS price changes on refresh without changing the USD base', flush=True)
    for kind in ['expired','wrong_price','outage']:
        state['kind'] = kind
        page.evaluate("window.dispatchEvent(new Event('online'))")
        expect(page.locator('#duetGhs')).to_contain_text('unavailable')
        assert '38.87' not in page.locator('#duetGhs').inner_text()
        expect(page.locator('#duetBuy')).to_be_disabled()
    print('PASS expired, mismatched and unavailable quotes never fall back to an old cedi amount', flush=True)
    state['kind'] = 'valid'
    page.evaluate("window.clockBefore=Date.now;Date.now=()=>window.clockBefore()+3*365*24*60*60*1000;window.dispatchEvent(new Event('online'))")
    expect(page.locator('#duetGhs')).to_contain_text('38.87')
    page.evaluate('Date.now=window.clockBefore')
    page.evaluate("window.dispatchEvent(new Event('offline'))")
    expect(page.locator('#duetGhs')).to_contain_text('Go online')
    print('PASS wrong device clocks do not extend quote validity, and offline status removes the quote', flush=True)
    before = state['requests']
    page.click('.md[data-m="cards"]')
    page.evaluate("window.dispatchEvent(new Event('online'))")
    page.wait_for_timeout(100)
    assert state['requests'] == before
    page.click('.md[data-m="duet"]')
    expect(page.locator('#duetGhs')).to_contain_text('38.87')
    for width,height in [(320,568),(390,844),(844,390),(1440,1000)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors, errors
    print('PASS no background price requests in local modes, responsive offer and no browser errors', flush=True)
    browser.close()
