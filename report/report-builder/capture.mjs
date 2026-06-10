#!/usr/bin/env node
// =============================================================================
//  capture.mjs — Multi-shot screenshot tool for the Synergit report
//
//  Reads ./captures.config.mjs, logs in via the Synergit auth API, injects the
//  JWT into localStorage, then iterates through every shot navigating to its
//  route and saving a 2x retina PNG into ../image/<name>.png (i.e. directly
//  into the LaTeX report's image/ folder).
//
//  Usage:
//      $env:SYNERGIT_BASE_URL   = "http://localhost:5173"   # frontend (Vite)
//      $env:SYNERGIT_API_URL    = "http://localhost:8080"   # gateway / backend
//      $env:SYNERGIT_LOGIN_USER = "CaliMinux"
//      $env:SYNERGIT_LOGIN_PASS = "yourpassword"
//      node capture.mjs
//
//  Optional flags:
//      --only=name1,name2     run only those named shots
//      --skip=name1           skip those named shots
//      --headed               show the browser window (debugging)
//      --slow                 slow-mo 200ms between actions
//
//  Requires: playwright (`npm install playwright && npx playwright install chromium`)
// =============================================================================

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Tiny .env loader (no dependencies) ──────────────────────────────────────
// Looks for ./.env next to capture.mjs and sets process.env.* (without
// overriding values that are already set, e.g. from PowerShell).
function loadDotenv() {
  const p = resolve(__dirname, '.env');
  if (!existsSync(p)) return;
  console.log(`→ Loading .env from ${p}`);
  for (const raw of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadDotenv();

// Dynamic import AFTER .env has been loaded so the config sees the values.
const { default: shots } = await import('./captures.config.mjs');

// ─── Config from env / args ──────────────────────────────────────────────────
const baseUrl = process.env.SYNERGIT_BASE_URL || 'http://localhost:5173';
const apiUrl  = process.env.SYNERGIT_API_URL  || 'http://localhost:8080';
const user    = process.env.SYNERGIT_LOGIN_USER;
const pass    = process.env.SYNERGIT_LOGIN_PASS;
const W = Number(process.env.CAPTURE_W || 1440);
const H = Number(process.env.CAPTURE_H || 900);

// Output directly into the LaTeX report's image folder (../image/ relative to
// this bundle), so \figauto{image/synergit-*.png} resolves immediately after
// capture without an extra copy step.
const outDir  = resolve(__dirname, '..', 'image');

const args = process.argv.slice(2);
const only  = (args.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const skip  = (args.find(a => a.startsWith('--skip=')) || '').slice(7).split(',').filter(Boolean);
const headed = args.includes('--headed');
const slow   = args.includes('--slow');

// ─── Login via API to get JWT ────────────────────────────────────────────────
async function login() {
  if (!user || !pass) {
    console.warn('⚠  SYNERGIT_LOGIN_USER/SYNERGIT_LOGIN_PASS not set — skipping login.');
    console.warn('   Only shots with `auth:false` will work.');
    return null;
  }
  console.log(`→ Logging in as ${user} via ${apiUrl}/api/v1/auth/login`);
  const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: user, password: pass }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Login failed (HTTP ${res.status}): ${body}`);
  }
  const json = await res.json();
  if (!json.token) throw new Error(`Login response has no "token": ${JSON.stringify(json)}`);
  console.log('  ✓ token acquired');
  return json.token;
}

// ─── Filter shots based on --only / --skip ───────────────────────────────────
function filterShots(all) {
  return all.filter(s => {
    if (only.length && !only.includes(s.name)) return false;
    if (skip.includes(s.name)) return false;
    return true;
  });
}

// ─── Take a single screenshot ────────────────────────────────────────────────
async function captureOne(page, shot) {
  const url = baseUrl + shot.route;
  const file = join(outDir, `${shot.name}.png`);
  process.stdout.write(`  · ${shot.name.padEnd(28)} ← ${shot.route}`);
  try {
    if (shot.width || shot.height) {
      await page.setViewportSize({
        width: shot.width || W,
        height: shot.height || H,
      });
    }
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    if (shot.waitFor) {
      await page.waitForSelector(shot.waitFor, { timeout: 10_000 });
    }
    if (shot.delay) await page.waitForTimeout(shot.delay);
    await page.screenshot({
      path: file,
      fullPage: shot.fullPage === true,
    });
    console.log('  ✓');
    return { ok: true };
  } catch (err) {
    console.log(`  ✗ ${err.message.split('\n')[0]}`);
    return { ok: false, error: err.message };
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  await mkdir(outDir, { recursive: true });
  const list = filterShots(shots);
  if (!list.length) {
    console.error('No shots matched. Use --only=… or remove --skip=… to include some.');
    process.exit(1);
  }
  console.log(`Synergit screenshot tool · ${list.length} shot(s) · output: ${outDir}`);

  const token = await login();

  const browser = await chromium.launch({
    headless: !headed,
    slowMo: slow ? 200 : 0,
  });
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2,
  });
  // Inject token into localStorage BEFORE any navigation so the SPA boots in
  // an authenticated state (it reads `localStorage.getItem('token')`).
  if (token) {
    await context.addInitScript(t => {
      try { localStorage.setItem('token', t); } catch {}
    }, token);
  }
  const page = await context.newPage();

  const results = [];
  for (const shot of list) {
    if (shot.auth === false && token) {
      // Open in a tokenless context for login/register pages
      const anonCtx = await browser.newContext({
        viewport: { width: W, height: H },
        deviceScaleFactor: 2,
      });
      const anonPage = await anonCtx.newPage();
      results.push({ name: shot.name, ...(await captureOne(anonPage, shot)) });
      await anonCtx.close();
    } else {
      results.push({ name: shot.name, ...(await captureOne(page, shot)) });
    }
  }

  await browser.close();

  const ok = results.filter(r => r.ok).length;
  const fail = results.length - ok;
  console.log(`\n→ ${ok} captured, ${fail} failed.`);
  if (fail) {
    console.log('Failed shots:');
    results.filter(r => !r.ok).forEach(r => console.log(`  · ${r.name}: ${r.error.split('\n')[0]}`));
    process.exit(1);
  }
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
