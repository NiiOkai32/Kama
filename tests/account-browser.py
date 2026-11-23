"""Exercise the account forms with local Supabase browser fixtures."""
import os

from playwright.sync_api import expect, sync_playwright

BASE = os.environ.get("KAMA_TEST_URL", "http://127.0.0.1:8000/")
CALLBACK = "https://niiokai32.github.io/Kama/game.html"
STUB = """
window.supabase = {
  createClient(_url, _key, options) {
    window.authOptions = options.auth;
    const response = (method, payload) => {
      window.calls.push({ method, payload });
      return window.nextAuthResponse;
    };
    return {
      auth: {
        getUser: async () => ({ data: { user: { id: 'fixture', email: 'test@example.invalid' } } }),
        onAuthStateChange: callback => { window.authChange = callback; },
        signUp: async payload => response('signup', payload),
        signInWithPassword: async payload => response('signin', payload),
        resetPasswordForEmail: async (email, opts) => response('reset', { email, ...opts })
      }
    };
  }
};
"""

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(executable_path="/usr/bin/chromium", args=["--no-sandbox"])
    context = browser.new_context(viewport={"width": 390, "height": 844})
    context.add_init_script("""
      localStorage.setItem('kama_age_confirmed', String(Date.now()));
      localStorage.setItem('kama_how_seen', '1');
      window.calls = [];
      window.nextAuthResponse = { data: {}, error: null };
    """)
    context.route(
        "**/assets/vendor/supabase.js",
        lambda route: route.fulfill(content_type="application/javascript", body=STUB),
    )
    page = context.new_page()
    page.goto(BASE + "signup.html")
    page.keyboard.press("Tab")
    expect(page.get_by_role("link", name="Skip to main content")).to_be_focused()
    page.keyboard.press("Enter")
    expect(page.locator("#accountMain")).to_be_focused()
    page.fill("#email", "test@example.invalid")
    page.fill("#password", "browser-fixture-password")
    page.get_by_role("button", name="Create account").click()
    assert page.evaluate("calls.length") == 0
    page.check("#termsAccepted")
    page.get_by_role("button", name="Create account").click()
    expect(page.locator("#successTitle")).to_have_text("Check your email")
    expect(page.locator("#successTitle")).to_be_focused()
    confirmation_copy = page.locator("#successText").inner_text()
    assert page.evaluate("calls[0].payload.options") == {"emailRedirectTo": CALLBACK}
    assert page.evaluate("authOptions.detectSessionInUrl") is False

    page.goto(BASE + "signup.html")
    page.evaluate("nextAuthResponse = { error: { status: 422, code: 'user_already_exists' } }")
    page.fill("#email", "test@example.invalid")
    page.fill("#password", "browser-fixture-password")
    page.check("#termsAccepted")
    page.get_by_role("button", name="Create account").click()
    expect(page.locator("#successText")).to_have_text(confirmation_copy)

    page.goto(BASE + "signin.html")
    page.fill("#email", "test@example.invalid")
    page.fill("#password", "browser-fixture-password")
    for code in ("invalid_credentials", "email_not_confirmed"):
        page.evaluate("(code) => nextAuthResponse = { error: { status: 400, code } }", code)
        page.get_by_role("button", name="Sign in", exact=True).click()
        expect(page.locator("#status")).to_have_text(
            "Could not sign in. Check your email and password or request a password reset."
        )
    page.evaluate("nextAuthResponse = { data: {}, error: null }")
    page.get_by_role("button", name="Sign in", exact=True).click()
    expect(page.locator("#successTitle")).to_be_focused()

    reset_copy = None
    for error in (None, {"status": 404, "code": "user_not_found"}):
        page.goto(BASE + "reset.html")
        page.evaluate("(error) => nextAuthResponse = { error }", error)
        page.fill("#resetEmail", "test@example.invalid")
        page.get_by_role("button", name="Send reset link").click()
        expect(page.locator("#resetStatus")).to_contain_text("If this address can receive a reset link")
        if reset_copy is None:
            reset_copy = page.locator("#resetStatus").inner_text()
        expect(page.locator("#resetStatus")).to_have_text(reset_copy)
        assert page.evaluate("calls[0].payload.redirectTo") == CALLBACK

    page.goto(BASE + "game.html")
    expect(page.locator("#draw")).to_be_visible()
    assert page.evaluate("authOptions.detectSessionInUrl") is True
    expect(page.locator("#passwordDialog")).to_be_hidden()
    page.evaluate("authChange('PASSWORD_RECOVERY', { access_token: 'fixture-session' })")
    expect(page.locator("#passwordDialog")).to_be_visible()

    page.goto(BASE + "game.html")
    page.locator("#sessionPanel").evaluate("panel => panel.open = true")
    page.click('[data-open="settingsDialog"]')
    page.uncheck("#gameShortcuts")
    page.locator("#settingsDialog [data-close]").last.click()
    page.keyboard.press("d")
    expect(page.locator("#emptyState")).to_be_visible()
    page.reload()
    page.locator("#sessionPanel").evaluate("panel => panel.open = true")
    page.click('[data-open="settingsDialog"]')
    expect(page.locator("#gameShortcuts")).not_to_be_checked()
    page.check("#gameShortcuts")
    page.locator("#settingsDialog [data-close]").last.click()
    page.keyboard.press("d")
    expect(page.locator("#emptyState")).to_be_hidden()
    page.keyboard.press("Escape")
    page.wait_for_url("**/quiet.html")

    print("PASS account responses, fixed callbacks, recovery, terms agreement and keyboard controls.")
    browser.close()
