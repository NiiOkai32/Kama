(() => {
  if (window.top !== window) return;
  const config = window.KAMA_SUPABASE_CONFIG || {};
  if (!window.supabase?.createClient) {
    window.kamaSupabaseError = "Could not load the Supabase client. Check your connection and reload.";
    window.kamaSupabase = null;
    return;
  }
  if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(config.url || "") || typeof config.publishableKey !== 'string' || !config.publishableKey.startsWith('sb_publishable_') || config.publishableKey.includes("REPLACE_ME")) {
    window.kamaSupabaseError = "The account connection is not configured correctly. Please contact the site owner.";
    window.kamaSupabase = null;
    return;
  }
  // Use the configured HTTPS callback instead of the current page's host.
  window.kamaAuthRedirectUrl = config.authRedirectUrl || 'https://niiokai32.github.io/Kama/game.html';
  window.kamaSupabase = window.supabase.createClient(config.url, config.publishableKey, {
    auth: { detectSessionInUrl: location.pathname.endsWith('/game.html') }
  });
  window.kamaRecovery = false;
  window.kamaSupabase.auth.onAuthStateChange?.((event, session) => {
    if (event !== 'PASSWORD_RECOVERY' || !session?.access_token) return;
    window.kamaRecovery = true;
    setTimeout(() => window.dispatchEvent(new Event('kama:recovery')), 0);
  });
  // Account-linked gameplay analytics are disabled, including old callers.
  window.kamaTrack = async () => {};
})();
