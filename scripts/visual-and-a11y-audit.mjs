#!/usr/bin/env node
/**
 * AJN BUZZ IMAGE v6.2.0 — Phase 4, 6, 7, 8 Visual, Accessibility, Performance & SEO Audit
 * Must be executed against the PRODUCTION server (`next build` && `next start`).
 */
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '/root/.bun/install/global/node_modules/playwright-core/index.mjs';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const CHROMIUM_EXECUTABLE =
  '/ms-playwright/chromium_headless_shell-1247/chrome-headless-shell-linux64/chrome-headless-shell';
const SCREENSHOT_DIR = path.join(process.cwd(), 'public', 'audit-screenshots');
const REPORT_PATH = path.join(process.cwd(), 'scripts', 'visual-a11y-perf-seo-report.json');

const VIEWPORTS = [
  { name: '320px', width: 320, height: 568, isMobile: true },
  { name: '375px', width: 375, height: 667, isMobile: true },
  { name: '390px', width: 390, height: 844, isMobile: true },
  { name: '430px', width: 430, height: 932, isMobile: true },
  { name: 'landscape-667x375', width: 667, height: 375, isMobile: true },
  { name: '768px', width: 768, height: 1024, isMobile: false },
  { name: '1024px', width: 1024, height: 768, isMobile: false },
  { name: '1280px', width: 1280, height: 800, isMobile: false },
  { name: '1440px', width: 1440, height: 900, isMobile: false },
  { name: '1920px', width: 1920, height: 1080, isMobile: false },
];

const ALL_30_SLUGS = [
  'compress', 'compress-to-kb', 'resize', 'resize-cm', 'resize-mm',
  'resize-inches', 'photo-size-converter', 'crop', 'aspect-ratio-crop', 'passport-photo-maker',
  'id-photo-maker', 'photo-35x45', 'photo-2x2', 'dpi-changer', 'signature-maker',
  'signature-upload-crop', 'signature-resize', 'signature-size-reducer', 'signature-background-remover', 'signature-to-png',
  'photo-editor', 'text-on-image', 'dimension-checker', 'quality-checker', 'upscale',
  'rotate', 'remove-metadata', 'convert', 'convert-to-jpg', 'jpg-to-png',
];

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const browser = await chromium.launch({
    executablePath: CHROMIUM_EXECUTABLE,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  const report = {
    serverUrl: BASE_URL,
    timestamp: new Date().toISOString(),
    viewportChecks: [],
    accessibilityChecks: [],
    performanceChecks: [],
    seoAndRoutingChecks: {},
  };

  console.log('=== PHASE 4: VIEWPORT & SCREENSHOT AUDIT ===');
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    // 1. Home page + Cookie Banner
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(200);

    const homeMetrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const searchInput = document.querySelector('#home-tool-search');
      const firstCard = document.querySelector('.tool-card');
      const cookieBanner = document.querySelector('.cookie-banner');
      const searchRect = searchInput ? searchInput.getBoundingClientRect() : null;
      const cardRect = firstCard ? firstCard.getBoundingClientRect() : null;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasOverflow: doc.scrollWidth > doc.clientWidth + 1,
        searchVisibleInViewport: searchRect ? (searchRect.top >= 0 && searchRect.bottom <= window.innerHeight) : false,
        firstRowVisibleInViewport: cardRect ? (cardRect.top < window.innerHeight) : false,
        cookieBannerPresent: Boolean(cookieBanner),
      };
    });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `home-${vp.name}.png`),
      fullPage: false,
    });

    // 2. Tool pages: passport-photo-maker, compress-to-kb, signature-maker
    for (const slug of ['passport-photo-maker', 'compress-to-kb', 'signature-maker']) {
      await page.goto(`${BASE_URL}/${slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(150);

      const toolMetrics = await page.evaluate(() => {
        const doc = document.documentElement;
        const dropzone = document.querySelector('.dropzone');
        const dropRect = dropzone ? dropzone.getBoundingClientRect() : null;
        const mobileStickyBar = document.querySelector('.mobile-editor-action-bar');
        const stickyStyle = mobileStickyBar ? window.getComputedStyle(mobileStickyBar) : null;
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          hasOverflow: doc.scrollWidth > doc.clientWidth + 1,
          dropzoneTop: dropRect ? Math.round(dropRect.top) : null,
          dropzoneImmediatelyVisible: dropRect ? (dropRect.top >= 0 && dropRect.top < window.innerHeight * 0.85) : false,
          mobileStickyBarVisible: stickyStyle ? stickyStyle.display !== 'none' : false,
        };
      });

      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `${slug}-${vp.name}.png`),
        fullPage: false,
      });

      report.viewportChecks.push({
        viewport: vp.name,
        page: `/${slug}`,
        ...toolMetrics,
      });
    }

    // 3. Error state & Result state at representative viewports (320px, 375px, 768px, 1440px)
    if (['320px', '375px', '768px', '1440px'].includes(vp.name)) {
      await page.goto(`${BASE_URL}/compress-to-kb`, { waitUntil: 'networkidle' });
      // Dismiss cookie banner if visible so we also capture clean error/result states
      const essentialBtn = page.locator('.cookie-banner button:has-text("Essential Only")');
      if (await essentialBtn.count() > 0) {
        await essentialBtn.click();
      }
      // Click Process with no file to trigger error state
      await page.locator('button.action-big').click();
      await page.waitForTimeout(150);
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, `error-state-${vp.name}.png`),
        fullPage: false,
      });

      // Upload portrait to passport-photo-maker and process for Result state
      const portraitPath = '/tmp/ajn-test-assets/portrait-plain-bg.jpg';
      if (fs.existsSync(portraitPath)) {
        await page.goto(`${BASE_URL}/passport-photo-maker`, { waitUntil: 'networkidle' });
        await page.locator('input[type="file"]').first().setInputFiles(portraitPath);
        await page.locator('.preview-stage img').first().waitFor({ state: 'visible', timeout: 15000 });
        await page.locator('button.action-big').click();
        await page.locator('.result-ready').waitFor({ state: 'visible', timeout: 25000 });
        await page.locator('.result-ready').scrollIntoViewIfNeeded();
        await page.waitForTimeout(200);
        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `result-state-${vp.name}.png`),
          fullPage: false,
        });
      }
    }

    report.viewportChecks.push({
      viewport: vp.name,
      page: '/',
      ...homeMetrics,
    });

    await context.close();
  }

  console.log('=== PHASE 4.5: ACCESSIBILITY (axe-core 4.14.0 + DOM/Keyboard/ARIA) AUDIT ===');
  {
    const axePath = '/root/.bun/install/cache/axe-core@4.14.0@@@1/axe.min.js';
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    for (const route of ['/', '/passport-photo-maker', '/compress-to-kb', '/signature-maker']) {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      if (fs.existsSync(axePath)) {
        await page.addScriptTag({ path: axePath });
      }
      const a11y = await page.evaluate(async () => {
        const issues = [];
        document.querySelectorAll('img').forEach((img) => {
          if (!img.hasAttribute('alt')) issues.push(`Missing alt on img: ${img.src}`);
        });
        document.querySelectorAll('input, select, textarea').forEach((el) => {
          if (el.type === 'hidden') return;
          const id = el.id;
          const hasForLabel = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
          const hasParentLabel = el.closest('label');
          const hasAria = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby');
          if (!hasForLabel && !hasParentLabel && !hasAria) {
            issues.push(`Unlabeled control: <${el.tagName.toLowerCase()} type="${el.type || ''}">`);
          }
        });
        document.querySelectorAll('button').forEach((btn) => {
          const text = (btn.textContent || '').trim();
          const aria = btn.getAttribute('aria-label') || btn.getAttribute('title');
          if (!text && !aria) {
            issues.push(`Unnamed button: ${btn.className}`);
          }
        });
        const dropzone = document.querySelector('.dropzone[role="button"]');
        const dropzoneKeyboardReady = window.location.pathname === '/' ? true : Boolean(
          dropzone && dropzone.getAttribute('tabindex') === '0' && (dropzone.textContent || '').trim().length > 0
        );
        const ariaLiveCount = document.querySelectorAll('[aria-live]').length;

        let axeViolations = [];
        if (window.axe) {
          const axeRes = await window.axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] },
          });
          axeViolations = axeRes.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            description: v.description,
            nodes: v.nodes.map((n) => n.html.slice(0, 140)),
          }));
        }

        return {
          issues,
          dropzoneKeyboardReady,
          ariaLiveCount,
          axeViolations,
          seriousOrCriticalAxeCount: axeViolations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical'
          ).length,
        };
      });
      report.accessibilityChecks.push({ route, ...a11y });
    }
    await context.close();
  }

  console.log('=== PHASE 6: PERFORMANCE & LAZY-LOADING AUDIT ===');
  for (const profile of [
    { name: 'mobile', viewport: { width: 390, height: 844 } },
    { name: 'desktop', viewport: { width: 1440, height: 900 } },
  ]) {
    for (const route of ['/', '/passport-photo-maker', '/compress-to-kb', '/signature-maker']) {
      const context = await browser.newContext({ viewport: profile.viewport });
      const page = await context.newPage();

      const loadedScripts = [];
      page.on('request', (req) => {
        if (req.resourceType() === 'script' || req.url().includes('worker')) {
          loadedScripts.push(req.url());
        }
      });

      const t0 = Date.now();
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
      const loadWallMs = Date.now() - t0;

      const perf = await page.evaluate(async () => {
        const nav = performance.getEntriesByType('navigation')[0];
        const paints = performance.getEntriesByType('paint');
        const fcp = paints.find((p) => p.name === 'first-contentful-paint')?.startTime || 0;
        let cls = 0;
        for (const entry of performance.getEntriesByType('layout-shift')) {
          if (!entry.hadRecentInput) cls += entry.value;
        }
        return {
          ttfbMs: Math.round(nav ? nav.responseStart - nav.requestStart : 0),
          domContentLoadedMs: Math.round(nav ? nav.domContentLoadedEventEnd : 0),
          fcpMs: Math.round(fcp),
          cls: Number(cls.toFixed(4)),
        };
      });

      const jszipLoadedOnInit = loadedScripts.some((u) => u.toLowerCase().includes('jszip'));
      const workerLoadedOnInit = loadedScripts.some((u) => u.includes('image-worker.js'));

      report.performanceChecks.push({
        profile: profile.name,
        route,
        loadWallMs,
        ...perf,
        jszipLoadedOnInit,
        workerLoadedOnInit,
      });

      await context.close();
    }
  }

  console.log('=== PHASE 8: SEO, REDIRECTS & ROUTING AUDIT ===');
  // 1. Check 308 redirects
  const watermarkRes = await fetch(`${BASE_URL}/watermark`, { redirect: 'manual' });
  const toolsRedirectRes = await fetch(`${BASE_URL}/tools/passport-photo-maker`, { redirect: 'manual' });

  // 2. Check sitemaps, robots, ads.txt
  const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`);
  const sitemapText = await sitemapRes.text();
  const imageSitemapRes = await fetch(`${BASE_URL}/image-sitemap.xml`);
  const imageSitemapText = await imageSitemapRes.text();
  const robotsRes = await fetch(`${BASE_URL}/robots.txt`);
  const robotsText = await robotsRes.text();
  const adsTxtRes = await fetch(`${BASE_URL}/ads.txt`);
  const adsTxtText = await adsTxtRes.text();

  // 3. Check all 30 tool pages for canonical, unique title/description, JSON-LD, and SVG endpoint
  const titles = new Set();
  const descriptions = new Set();
  let all30PagesOk = true;
  let all30SvgsOk = true;
  let all30JsonLdOk = true;
  const toolSeoFailures = [];

  for (const slug of ALL_30_SLUGS) {
    const res = await fetch(`${BASE_URL}/${slug}`);
    const html = await res.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const descMatch = html.match(/<meta name="description" content="([^"]+)"/);
    const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/);
    const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];

    const title = titleMatch ? titleMatch[1] : '';
    const desc = descMatch ? descMatch[1] : '';
    const canonical = canonicalMatch ? canonicalMatch[1] : '';

    if (res.status !== 200 || !title || !desc || canonical !== `https://www.ajn.buzz/${slug}`) {
      all30PagesOk = false;
      toolSeoFailures.push({ slug, status: res.status, canonical });
    }
    titles.add(title);
    descriptions.add(desc);

    if (jsonLdMatches.length === 0) {
      all30JsonLdOk = false;
      toolSeoFailures.push({ slug, error: 'Missing JSON-LD' });
    } else {
      for (const m of jsonLdMatches) {
        try {
          JSON.parse(m[1]);
        } catch (err) {
          all30JsonLdOk = false;
          toolSeoFailures.push({ slug, error: `Invalid JSON-LD: ${err.message}` });
        }
      }
    }

    const svgRes = await fetch(`${BASE_URL}/seo-tools/${slug}.svg`);
    const svgText = await svgRes.text();
    if (svgRes.status !== 200 || !svgText.includes('<svg')) {
      all30SvgsOk = false;
      toolSeoFailures.push({ slug, error: `SVG endpoint status ${svgRes.status}` });
    }
  }

  // 4. Legal & Company pages
  const legalPages = {};
  for (const p of ['/about', '/contact', '/privacy', '/terms']) {
    const r = await fetch(`${BASE_URL}${p}`);
    legalPages[p] = r.status;
  }

  report.seoAndRoutingChecks = {
    watermarkRedirect: {
      status: watermarkRes.status,
      location: watermarkRes.headers.get('location'),
    },
    toolsSlugRedirect: {
      status: toolsRedirectRes.status,
      location: toolsRedirectRes.headers.get('location'),
    },
    sitemapStatus: sitemapRes.status,
    sitemapUrlCount: (sitemapText.match(/<loc>/g) || []).length,
    imageSitemapStatus: imageSitemapRes.status,
    imageSitemapImageCount: (imageSitemapText.match(/<image:image>/g) || []).length,
    robotsStatus: robotsRes.status,
    robotsHasSitemap: robotsText.includes('https://www.ajn.buzz/sitemap.xml'),
    adsTxtStatus: adsTxtRes.status,
    adsTxtContent: adsTxtText.trim(),
    all30PagesOk,
    uniqueTitlesCount: titles.size,
    uniqueDescriptionsCount: descriptions.size,
    all30JsonLdOk,
    all30SvgsOk,
    toolSeoFailures,
    legalPages,
  };

  await browser.close();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log('Saved visual/a11y/perf/seo report to', REPORT_PATH);

  const overflowFailures = report.viewportChecks.filter((v) => v.hasOverflow);
  const a11yFailures = report.accessibilityChecks.filter(
    (a) => a.issues.length > 0 || !a.dropzoneKeyboardReady || a.seriousOrCriticalAxeCount > 0
  );
  console.log(`Overflow failures: ${overflowFailures.length}`);
  console.log(`Accessibility failures: ${a11yFailures.length}`);
  console.log(`SEO failures: ${toolSeoFailures.length}`);

  if (overflowFailures.length > 0 || a11yFailures.length > 0 || toolSeoFailures.length > 0) {
    console.error({ overflowFailures, a11yFailures, toolSeoFailures });
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
