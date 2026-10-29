import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(root, 'dist');
const files = ['index.html', 'game.html', 'signup.html', 'signin.html', 'design.css', 'game.css', 'auth.css', 'auth.js', 'game.js', 'random.js', 'questions.js', 'account-pages.js', 'device.js', 'responsive.css', 'assets'];
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
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
for (const file of files) cpSync(path.join(root, file), path.join(dist, file), { recursive: true });
writeFileSync(path.join(dist, 'supabase-config.js'), `window.KAMA_SUPABASE_CONFIG = ${JSON.stringify({ url, publishableKey })};\n`);
console.log('Built Netlify-ready dist folder using the existing site configuration.');
