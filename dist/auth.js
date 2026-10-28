(() => {
  const config = window.KAMA_SUPABASE_CONFIG || {};
  if (!window.supabase?.createClient) {
    window.kamaSupabaseError = "Could not load the Supabase client. Check your connection and reload.";
    window.kamaSupabase = null;
    return;
  }
  if (!/^https:\/\/[^/]+\.supabase\.co$/.test(config.url || "") || !config.publishableKey || config.publishableKey.includes("REPLACE_ME")) {
    window.kamaSupabaseError = "Supabase is not configured. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to the deployment environment.";
    window.kamaSupabase = null;
    return;
  }
  window.kamaSupabase = window.supabase.createClient(config.url, config.publishableKey);
  window.kamaTrack = async (event) => {
    const { data: { user } } = await window.kamaSupabase.auth.getUser();
    if (!user || user.user_metadata?.usage_tracking !== true) return;
    const { error } = await window.kamaSupabase.from("usage_events").insert({ user_id: user.id, event });
    if (error) console.warn("Kama usage event was not recorded.");
  };
})();
