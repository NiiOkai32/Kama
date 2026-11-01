import {cpSync,existsSync,mkdirSync,readFileSync,rmSync,writeFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const supplied=process.argv[2];
if(!supplied)throw new Error('Pass the latest Kama web dist directory.');
const source=path.resolve(supplied),destination=path.join(root,'android/app/src/main/assets/web');
for(const name of ['game.html','game.js','questions.js','duet.js','privacy.js','supabase-config.js'])if(!existsSync(path.join(source,name)))throw new Error('Missing complete web build: '+name);
rmSync(destination,{recursive:true,force:true});mkdirSync(destination,{recursive:true});cpSync(source,destination,{recursive:true});
cpSync(path.join(root,'tools/native-shell.js'),path.join(destination,'native-shell.js'));
cpSync(path.join(root,'tools/native.css'),path.join(destination,'native.css'));
for(const name of readdirSync(destination).filter(n=>n.endsWith('.html')&&n!=='quiet.html'&&n!=='privacy.html')){
  const file=path.join(destination,name);let html=readFileSync(file,'utf8');
  html=html.replace('<script src="assets/vendor/supabase.js"','<script src="native-shell.js"></script><script src="assets/vendor/supabase.js"');
  html=html.replace('</head>','<link rel="stylesheet" href="native.css"></head>');
  writeFileSync(file,html);
}
const game=path.join(destination,'game.js');let js=readFileSync(game,'utf8');
const needle='  const client=window.kamaSupabase;';
if(!js.includes(needle))throw new Error('Review the game Auth adapter before packaging this version.');
js=js.replace(needle,needle+"\n  if(window.kamaNative&&window.kamaNativeLocalPlay){accountUser=null;authRender();document.documentElement.classList.remove('auth-pending');return}");
writeFileSync(game,js);
const auth=path.join(destination,'auth.js');let authJs=readFileSync(auth,'utf8');
authJs=authJs.replace('  const config = window.KAMA_SUPABASE_CONFIG || {};',"  const config = window.KAMA_SUPABASE_CONFIG || {};\n  if(window.kamaNative&&window.kamaNativeLocalPlay&&location.pathname.endsWith('game.html')){window.kamaSupabase=null;window.kamaTrack=async()=>{};return}");
writeFileSync(auth,authJs);
const notice=path.join(destination,'privacy.html');let html=readFileSync(notice,'utf8');
html=html.replace('<h2>Your account</h2>','<h2>Android app</h2><p>All game content is bundled in the APK. Local play needs no account or internet. Sign-in and remote Duet need internet; purchases remain unavailable. Game data is kept in this app’s private browser profile, separate from Chrome. Clear this device removes Kama’s app-browser data. Android app backup is disabled, and uninstalling normally removes app data; exported deck files remain where you saved them. Release builds hide content from screenshots and the recent-apps preview. Email confirmation and password recovery links open the hosted Kama website in your browser; return to this app and sign in afterwards.</p><h2>Your account</h2>');
writeFileSync(notice,html);
const records=[];
function scan(dir){for(const name of readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,name.name);if(name.isDirectory())scan(p);else records.push({path:path.relative(destination,p),sha256:createHash('sha256').update(readFileSync(p)).digest('hex')})}}
scan(destination);writeFileSync(path.join(root,'docs/bundled-assets.json'),JSON.stringify({sourceCommit:'23921b2fc8c9392757f97d63bc95c2306b4dc451',files:records},null,2)+'\n');
console.log('Bundled '+records.length+' offline web files. Server-only sources and signing material are excluded.');
