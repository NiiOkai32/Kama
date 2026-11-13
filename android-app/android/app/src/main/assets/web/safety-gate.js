// A self-declaration, not identity or age verification. No birth date is collected.
(() => {
  const lifetime=30*24*60*60*1000;
  function accepted(){try{const at=Number(localStorage.getItem('kama_age_confirmed'));return at>0&&at<=Date.now()&&Date.now()-at<lifetime}catch{return false}}
  window.kamaAgeConfirmed=accepted();
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&window.kamaAgeConfirmed&&!accepted())location.reload()});
  if(window.kamaAgeConfirmed)return;
  document.documentElement.classList.add('age-pending');
  const originalTitle=document.title;document.title='Welcome';
  document.addEventListener('DOMContentLoaded',()=>{
    const dialog=document.createElement('dialog');dialog.id='ageGate';dialog.setAttribute('aria-labelledby','ageTitle');
    const title=document.createElement('h2');title.id='ageTitle';title.textContent='Adults only';
    const text=document.createElement('p');text.textContent='Everyone playing must be 18 or older. You can pause or stop at any time.';
    const yes=document.createElement('button');yes.className='main';yes.textContent='I am 18 or older';
    const no=document.createElement('a');no.className='ghost';no.href='quiet.html';no.textContent='Leave';
    const note=document.createElement('p');note.className='note';note.textContent='This confirms your declaration. It does not verify your age.';
    dialog.append(title,text,yes,no,note);document.body.append(dialog);
    dialog.addEventListener('cancel',event=>event.preventDefault());
    yes.onclick=()=>{window.kamaAgeConfirmed=true;try{localStorage.setItem('kama_age_confirmed',String(Date.now()))}catch{}document.documentElement.classList.remove('age-pending');document.title=originalTitle;dialog.close();dialog.remove();window.dispatchEvent(new Event('kama:age-confirmed'))};
    dialog.showModal();
  });
})();
