import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const files = [
  'index.html', 'game.html', 'signup.html', 'signin.html', 'reset.html',
  'privacy.html', 'terms.html', 'quiet.html',
  'design.css', 'game.css', 'auth.css', 'responsive.css',
  'quiet.css', 'privacy.css', 'music.css',
  'auth.js', 'game.js', 'random.js', 'questions.js', 'account-pages.js',
  'device.js', 'privacy.js',
  'safety-gate.js', 'music-links.js', 'music.js'
];
const assets = [
  'assets/emblem.svg', 'assets/favicon.svg', 'assets/icons.svg',
  'assets/vendor/LICENSE.supabase', 'assets/vendor/README.md', 'assets/vendor/supabase.js'
];
const published = [...files, ...assets, '_headers'];
// Publish only the listed regular files, including assets nested under checked directories.
for (const file of published) {
  let source = root;
  for (const segment of file.split('/')) {
    source = path.join(source, segment);
    if (lstatSync(source).isSymbolicLink()) throw new Error('Cannot publish a symbolic link: ' + file);
  }
  if (!lstatSync(source).isFile()) throw new Error('Cannot publish a non-file: ' + file);
}

// Only the explicitly named public build variables override the uploaded site config.
// Do not use unrelated workspace credentials when preparing this existing site.
let saved = {};
const configPath = path.join(root, 'supabase-config.js');
if (existsSync(configPath)) {
  const context = { window: {} };
  vm.runInNewContext(readFileSync(configPath, 'utf8'), context, { timeout: 1000 });
  saved = context.window.KAMA_SUPABASE_CONFIG || {};
}
const supplied = (process.env.KAMA_SUPABASE_URL || process.env.KAMA_SUPABASE_PUBLISHABLE_KEY)
  ? { url: process.env.KAMA_SUPABASE_URL, publishableKey: process.env.KAMA_SUPABASE_PUBLISHABLE_KEY }
  : process.env.SUPABASE_PUBLISHABLE_KEY
    ? { url: process.env.SUPABASE_URL, publishableKey: process.env.SUPABASE_PUBLISHABLE_KEY }
    : saved;
const url = supplied.url || '';
const publishableKey = supplied.publishableKey || '';
if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) || !publishableKey.startsWith('sb_publishable_')) {
  throw new Error('A valid public Supabase URL and publishable key are required before building.');
}
const authRedirectUrl = process.env.KAMA_AUTH_REDIRECT_URL ?? saved.authRedirectUrl;
if (authRedirectUrl !== undefined) {
  let callback;
  try {
    callback = new URL(authRedirectUrl);
  } catch {
    throw new Error('KAMA_AUTH_REDIRECT_URL must be the published HTTPS game.html URL.');
  }
  if (callback.protocol !== 'https:' || callback.username || callback.password ||
      callback.search || callback.hash || !callback.pathname.endsWith('/game.html') ||
      callback.href !== authRedirectUrl) {
    throw new Error('KAMA_AUTH_REDIRECT_URL must be the published HTTPS game.html URL.');
  }
}
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
// GitHub Pages publishes this branch's root; keep root and dist policies identical.
for (const file of files.filter(f=>f.endsWith('.html'))) {
  const pagePath=path.join(root,file);
  let html=readFileSync(pagePath,'utf8').replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/g,'').replace(/<meta name="referrer"[^>]*>/g,'');
  const hashes=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].filter(m=>!m[0].includes('src=')&&m[1].trim()).map(m=>"'sha256-"+createHash('sha256').update(m[1]).digest('base64')+"'");
  const policy="default-src 'none'; script-src 'self' "+hashes.join(' ')+"; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src "+url+" "+url.replace('https:','wss:')+"; media-src 'self' blob:; base-uri 'self'; form-action 'self'; object-src 'none'";
  html=html.replace(/(<meta charset=[^>]+>)/i,'$1<meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="'+policy+'">');
  writeFileSync(pagePath,html);
}
for (const file of published) {
  const target = path.join(dist, file);
  mkdirSync(path.dirname(target), { recursive: true });
  cpSync(path.join(root, file), target);
}
writeFileSync(path.join(dist, 'supabase-config.js'), `window.KAMA_SUPABASE_CONFIG = ${JSON.stringify({ url, publishableKey, authRedirectUrl })};\n`);
console.log('Built Netlify-ready dist folder using the existing site configuration.');
