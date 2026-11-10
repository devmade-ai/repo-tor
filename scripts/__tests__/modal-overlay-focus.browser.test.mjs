// Regression: closed slide-over panes (Settings + Detail) must not expose
// off-screen controls to Tab. Detail must return focus to its opener on close.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = [
    process.env.CHROME_PATH,
    '/usr/local/bin/google-chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
].find((p) => p && existsSync(p));

function loadCommitTotal() {
    const data = JSON.parse(readFileSync(join(REPO, 'dashboard/public/data.json'), 'utf8'));
    return data.metadata?.commitCount ?? 0;
}

function freePort() {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.on('error', reject);
        server.listen(0, '127.0.0.1', () => {
            const { port } = server.address();
            server.close(() => resolve(port));
        });
    });
}

if (!CHROME) {
    test('modal overlay focus', { skip: 'no Chrome binary on this machine' }, () => {});
} else if (!existsSync(join(REPO, 'dashboard/public/data.json'))) {
    test('modal overlay focus', { skip: 'dashboard/public/data.json is missing' }, () => {});
} else {
    const TOTAL = loadCommitTotal();
    let vite;
    let viteLog = '';
    let browser;
    let base;

    before(async () => {
        const port = await freePort();
        base = `http://127.0.0.1:${port}`;
        vite = spawn('npx', ['vite', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
            cwd: REPO,
            env: { ...process.env, BROWSER: 'none' },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
        vite.stdout.on('data', (chunk) => { viteLog += chunk; });
        vite.stderr.on('data', (chunk) => { viteLog += chunk; });
        vite.unref();
        const deadline = Date.now() + 30000;
        let up = false;
        while (Date.now() < deadline) {
            try {
                const res = await fetch(base);
                if (res.ok) { up = true; break; }
            } catch { /* retry */ }
            await new Promise((r) => setTimeout(r, 200));
        }
        if (!up) throw new Error(`Vite did not start\n${viteLog}`);

        const puppeteer = await import('puppeteer-core');
        browser = await puppeteer.launch({
            executablePath: CHROME,
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
        });
    });

    after(() => {
        try { browser?.process()?.kill('SIGKILL'); } catch { /* gone */ }
        try {
            vite?.stdout?.destroy();
            vite?.stderr?.destroy();
            vite?.kill('SIGKILL');
        } catch { /* gone */ }
    });

    async function openApp(page, width, height, coarse) {
        await page.setViewport({
            width,
            height,
            deviceScaleFactor: 1,
            isMobile: coarse,
            hasTouch: coarse,
        });
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('quickGuideSeen', 'true');
        });
        await page.goto(base, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction((total) => {
            const text = document.querySelector('header')?.innerText || '';
            return text.includes(total.toLocaleString()) || text.includes(String(total));
        }, { timeout: 30000 }, TOTAL);
    }

    async function waitSettingsClosed(page) {
        await page.waitForFunction(() => {
            const dialog = document.querySelector('#settings-pane');
            const close = document.querySelector('button[aria-label="Close settings"]');
            if (!dialog?.hasAttribute('inert') || !close) return false;
            return close.getBoundingClientRect().left > window.innerWidth - 2;
        });
    }

    /** Tab using real Puppeteer keyboard (matches user repro). */
    async function tabSweepKeyboard(page, count) {
        const hits = [];
        for (let i = 0; i < count; i++) {
            await page.keyboard.press('Tab');
            const snap = await page.evaluate(() => {
                const active = document.activeElement;
                const detailInert = document.querySelector('#detail-pane')?.hasAttribute('inert');
                const settingsInert = document.querySelector('#settings-pane')?.hasAttribute('inert');
                return {
                    aria: active?.getAttribute('aria-label') ?? active?.tagName,
                    detailInert,
                    settingsInert,
                    isDetailClose: active?.getAttribute('aria-label') === 'Close detail pane',
                    isSettingsClose: active?.getAttribute('aria-label') === 'Close settings',
                };
            });
            if (snap.isDetailClose && snap.detailInert !== false) {
                hits.push({ step: i + 1, aria: snap.aria, kind: 'detail-close' });
            }
            if (snap.isSettingsClose && snap.settingsInert) {
                hits.push({ step: i + 1, aria: snap.aria, kind: 'settings-close' });
            }
        }
        return hits;
    }

    test('after Settings dismiss, Tab sweep skips hidden Detail (1280×800)', { timeout: 90000 }, async () => {
        const page = await browser.newPage();
        await openApp(page, 1280, 800, false);

        await page.click('button[aria-label="Settings"]');
        await page.keyboard.press('Escape');
        await waitSettingsClosed(page);

        await page.focus('button[aria-label="Settings"]');
        const hits = await tabSweepKeyboard(page, 45);
        assert.deepEqual(hits, [], `hidden pane controls received focus: ${JSON.stringify(hits)}`);

        await page.close();
    });

    test('after Settings dismiss, 13 Tabs from Settings do not land on Detail close', { timeout: 60000 }, async () => {
        const page = await browser.newPage();
        await openApp(page, 1280, 800, false);

        await page.click('button[aria-label="Settings"]');
        await page.keyboard.press('Escape');
        await waitSettingsClosed(page);
        await page.focus('button[aria-label="Settings"]');

        let landedOnDetailClose = false;
        for (let i = 0; i < 13; i++) {
            await page.keyboard.press('Tab');
            const aria = await page.$eval(':focus', (el) => el.getAttribute('aria-label'));
            if (aria === 'Close detail pane') landedOnDetailClose = true;
        }
        assert.equal(landedOnDetailClose, false, 'Tab reached hidden Close detail pane');

        await page.close();
    });

    test('mobile Tab sweep skips hidden overlays (390×844)', { timeout: 90000 }, async () => {
        const page = await browser.newPage();
        await openApp(page, 390, 844, true);

        await page.focus('button[aria-label="Settings"]');
        const hits = await tabSweepKeyboard(page, 30);
        assert.deepEqual(hits, [], `mobile hidden pane focus: ${JSON.stringify(hits)}`);

        await page.close();
    });

    test('Detail: open, trap, Escape return, reopen (desktop)', { timeout: 90000 }, async () => {
        const page = await browser.newPage();
        await openApp(page, 1280, 800, false);

        const openerSelector = '[aria-label*="features built"]';
        await page.focus(openerSelector);
        await page.keyboard.press('Enter');

        await page.waitForFunction(() => {
            const dialog = document.querySelector('#detail-pane');
            const close = document.querySelector('button[aria-label="Close detail pane"]');
            return dialog && !dialog.hasAttribute('inert')
                && document.activeElement === close
                && close.getBoundingClientRect().left < window.innerWidth;
        });

        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('#detail-pane')?.hasAttribute('inert'));

        const afterEscape = await page.evaluate((sel) => {
            const opener = document.querySelector(sel);
            return {
                openerFocused: document.activeElement === opener,
                detailInert: document.querySelector('#detail-pane')?.hasAttribute('inert'),
            };
        }, openerSelector);
        assert.equal(afterEscape.openerFocused, true, 'Escape returns focus to drill-down card');
        assert.equal(afterEscape.detailInert, true);

        await page.keyboard.press('Enter');
        await page.waitForFunction(() => !document.querySelector('#detail-pane')?.hasAttribute('inert'));
        await page.waitForFunction(() => {
            const close = document.querySelector('button[aria-label="Close detail pane"]');
            return document.activeElement === close;
        });

        await page.click('button[aria-label="Close detail pane"]');
        await page.waitForFunction(() => document.querySelector('#detail-pane')?.hasAttribute('inert'));
        const afterMouse = await page.evaluate((sel) => document.activeElement === document.querySelector(sel), openerSelector);
        assert.equal(afterMouse, true, 'mouse close returns focus to opener');

        await page.close();
    });

    test('Detail: open and close on mobile (390×844)', { timeout: 90000 }, async () => {
        const page = await browser.newPage();
        await openApp(page, 390, 844, true);

        await page.click('[aria-label*="features built"]');
        await page.waitForFunction(() => !document.querySelector('#detail-pane')?.hasAttribute('inert'));
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => document.querySelector('#detail-pane')?.hasAttribute('inert'));

        const hits = await tabSweepKeyboard(page, 30);
        assert.deepEqual(hits, []);

        await page.close();
    });
}
