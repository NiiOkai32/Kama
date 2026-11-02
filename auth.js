(() => {
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
  window.kamaSupabase = window.supabase.createClient(config.url, config.publishableKey);
  window.kamaRecovery=new URLSearchParams(location.hash.slice(1)).get('type')==='recovery';
  window.kamaSupabase.auth.onAuthStateChange?.(event=>{
    if(event==='PASSWORD_RECOVERY'){window.kamaRecovery=true;setTimeout(()=>window.dispatchEvent(new Event('kama:recovery')),0)}
  });
  // Account-linked gameplay analytics are disabled, including old callers.
  window.kamaTrack = async () => {};
})();
