// Existing account flows, deferred until the document and auth client are ready.
if(document.getElementById('intro')){

(async()=>{try{if(!window.kamaSupabase){document.getElementById('setupMessage').textContent=window.kamaSupabaseError||'Account service is not configured yet.';document.getElementById('setupMessage').classList.remove('hidden');return}const {data}=await window.kamaSupabase.auth.getUser();if(data.user){document.getElementById('intro').textContent='Your next evening starts here.';document.querySelector('.actions').classList.add('hidden');document.getElementById('continue').classList.remove('hidden')}}catch(error){document.getElementById('setupMessage').textContent='Connection interrupted. Try signing in again.';document.getElementById('setupMessage').classList.remove('hidden')}})();

}
if(document.getElementById('signinForm')){

document.getElementById('signinForm').addEventListener('submit',async event=>{
  event.preventDefault();const status=document.getElementById('status');
  if(!window.kamaSupabase){status.textContent=window.kamaSupabaseError||'Account service is unavailable.';return}
  status.textContent='Signing in…';
  const submit=event.target.querySelector('button[type=submit]');submit.disabled=true;
  try{
    const {data,error}=await window.kamaSupabase.auth.signInWithPassword({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value});
    if(error)throw error;
    if(data.user&&data.user.user_metadata?.usage_tracking===true)await window.kamaTrack('session_start').catch(()=>{});
    document.getElementById('formPanel').classList.add('hidden');document.getElementById('success').classList.remove('hidden');
  }catch(error){status.textContent=error.message||'Could not sign in.'}finally{submit.disabled=false}
});

}
if(document.getElementById('signupForm')){

document.getElementById('signupForm').addEventListener('submit',async event=>{
  event.preventDefault();const status=document.getElementById('status');
  if(!window.kamaSupabase){status.textContent=window.kamaSupabaseError||'Account service is unavailable.';return}
  status.textContent='Creating account…';
  const submit=event.target.querySelector('button[type=submit]');submit.disabled=true;
  try{
    const {data,error}=await window.kamaSupabase.auth.signUp({email:document.getElementById('email').value.trim(),password:document.getElementById('password').value,options:{emailRedirectTo:new URL('game.html',window.location.href).href,data:{usage_tracking:document.getElementById('tracking').checked}}});
    if(error)throw error;
    if(data.session){if(document.getElementById('tracking').checked)await window.kamaTrack('session_start').catch(()=>{});document.getElementById('successTitle').textContent='Account created';document.getElementById('successText').textContent='Your evening is waiting.'}
    else{document.getElementById('successTitle').textContent='Check your email';document.getElementById('successText').textContent='Tap the confirmation link in your email, then sign in.';document.getElementById('continue').href='signin.html';document.getElementById('continue').textContent='Sign in'}
    document.getElementById('formPanel').classList.add('hidden');document.getElementById('success').classList.remove('hidden');
  }catch(error){status.textContent=error.message||'Could not create account.'}finally{submit.disabled=false}
});

}