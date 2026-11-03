#!/usr/bin/env node
/**
 * Smoke checks against a running frontend.
 *
 * The container healthcheck only asks for `/`. That misses the failures that
 * actually happen to a Next.js standalone build: a page that throws while
 * rendering on the server (500 on that route only), or static files that did
 * not get copied into the image — the HTML arrives, every script 404s, and the
 * site is a blank page while the healthcheck stays green.
 *
 * So this asks for a handful of public pages and then fetches the scripts and
 * styles the home page references.
 *
 *   node scripts/smoke.mjs http://127.0.0.1:3001
 *
 * Exits non-zero if any check fails, so it can gate a deploy.
 */
const BASE = (process.argv[2] || 'http://127.0.0.1:3001').replace(/\/+$/, '');

// Public pages that need no login and no live data to render.
const PAGES = ['/', '/auth/login', '/auth/register', '/leaderboard', '/privacy', '/terms', '/contact'];

let passed = 0;
let failed = 0;
const ok = (name, detail = '') => {
  passed++;
  console.log(`  ok    ${name}${detail ? ` — ${detail}` : ''}`);
};
const fail = (name, reason) => {
  failed++;
  console.log(`  FAIL  ${name} — ${reason}`);
};

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual' });
  return { status: res.status, text: await res.text() };
}

async function main() {
  console.log(`\nSmoke checks against ${BASE}\n`);

  console.log('Pages');
  let homeHtml = '';
  for (const path of PAGES) {
    const { status, text } = await get(path);
    if (status === 200 && /<html[\s>]/i.test(text)) {
      ok(path, `${Math.round(text.length / 1024)} KB`);
      if (path === '/') homeHtml = text;
    } else {
      fail(path, `status ${status}`);
    }
  }

  console.log('\nStatic assets referenced by the home page');
  const assets = [...new Set(homeHtml.match(/\/_next\/static\/[^"'\s)]+\.(?:js|css)/g) || [])];
  if (assets.length === 0) {
    fail('assets referenced', 'the home page names no /_next/static files');
  } else {
    let broken = 0;
    for (const a of assets) {
      const { status } = await get(a);
      if (status !== 200) {
        broken++;
        fail(a, `status ${status}`);
      }
    }
    if (broken === 0) ok('assets load', `${assets.length} file(s), all 200`);
  }

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`\nSmoke run could not complete: ${err.message}\n`);
  process.exit(2);
});
