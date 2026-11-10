// Regression: Settings drawer focus returns to the header launcher on close
// and hidden pane controls are not keyboard-focusable when closed.
// Desktop 1280×800 — keyboard vs mouse open/close paths.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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

async function focusState(page) {
    return page.evaluate(() => {
        const launcher = document.querySelector('button[aria-label="Settings"]');
        const close = document.querySelector('button[aria-label="Close settings"]');
        const dialog = document.querySelector('#settings-pane');
        const active = document.activeElement;
        function metrics(el) {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {
                left: Math.round(r.left),
                right: Math.round(r.right),
                inViewport: r.left >= -1 && r.right <= window.innerWidth + 1,
            };
        }
        return {
            launcherFocused: active === launcher,
            activeAria: active?.getAttribute('aria-label') ?? active?.id ?? active?.tagName,
            closeMetrics: metrics(close),
            launcherMetrics: metrics(launcher),
            dialogInert: dialog?.hasAttribute('inert') ?? false,
        };
    });
}

if (!CHROME) {
    test('settings pane focus', { skip: 'no Chrome binary on this machine' }, () => {});
} else if (!existsSync(join(REPO, 'dashboard/public/data.json'))) {
    test('settings pane focus', { skip: 'dashboard/public/data.json is missing' }, () => {});
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

    async function openDesktop(page) {
        await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('quickGuideSeen', 'true');
        });
        await page.goto(base, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction((total) => {
            const text = document.querySelector('header')?.innerText || '';
            return text.includes(total.toLocaleString()) || text.includes(String(total));
        }, { timeout: 30000 }, TOTAL);
    }

    async function waitForPaneOpen(page) {
        await page.waitForFunction(() => {
            const dialog = document.querySelector('#settings-pane');
            const close = document.querySelector('button[aria-label="Close settings"]');
            if (!dialog || !close) return false;
            const box = close.getBoundingClientRect();
            return !dialog.hasAttribute('inert')
                && box.right <= window.innerWidth + 1
                && box.left >= 0;
        });
    }

    async function waitForPaneClosed(page) {
        await page.waitForFunction(() => {
            const dialog = document.querySelector('#settings-pane');
            const close = document.querySelector('button[aria-label="Close settings"]');
            if (!dialog?.hasAttribute('inert') || !close) return false;
            return close.getBoundingClientRect().left > window.innerWidth - 2;
        });
    }

    test('keyboard: Enter opens pane; Escape twice restores launcher focus', { timeout: 60000 }, async () => {
        const page = await browser.newPage();
        await openDesktop(page);

        await page.focus('button[aria-label="Settings"]');
        await page.keyboard.press('Enter');
        await waitForPaneOpen(page);
        let snap = await focusState(page);
        assert.equal(snap.activeAria, 'Close settings', 'open focuses first control');

        await page.keyboard.press('Escape');
        await waitForPaneClosed(page);
        snap = await focusState(page);
        assert.equal(snap.launcherFocused, true, 'after Escape focus returns to Settings launcher');
        assert.equal(snap.dialogInert, true);
        assert.equal(snap.closeMetrics.inViewport, false, 'Close control off-screen when closed');

        await page.keyboard.press('Escape');
        snap = await focusState(page);
        assert.equal(snap.launcherFocused, true, 'second Escape keeps focus on launcher');

        await page.close();
    });

    test('mouse: click launcher then Close button restores launcher focus', { timeout: 60000 }, async () => {
        const page = await browser.newPage();
        await openDesktop(page);

        await page.click('button[aria-label="Settings"]');
        await waitForPaneOpen(page);
        await page.click('button[aria-label="Close settings"]');
        await waitForPaneClosed(page);
        const snap = await focusState(page);
        assert.equal(snap.launcherFocused, true, 'mouse close returns focus to launcher');
        assert.equal(snap.dialogInert, true);

        await page.close();
    });

    test('closed pane controls are skipped by Tab', { timeout: 60000 }, async () => {
        const page = await browser.newPage();
        await openDesktop(page);

        await page.click('button[aria-label="Settings"]');
        await waitForPaneOpen(page);
        await page.keyboard.press('Escape');
        await waitForPaneClosed(page);

        await page.focus('button[aria-label="Settings"]');
        await page.keyboard.press('Tab');
        const snap = await focusState(page);
        assert.equal(snap.launcherFocused, false, 'Tab moved focus away from launcher');
        assert.notEqual(snap.activeAria, 'Close settings', 'Tab does not land on hidden Close settings');
        assert.notEqual(snap.activeAria, 'Use UTC timezone', 'Tab does not land on hidden pane control');

        await page.close();
    });
}
