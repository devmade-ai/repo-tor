// Rendered checks for the phone filter drawer, touch size, the short
// menu, dates, Clear All, and the tab address. Uses the system Chrome
// via puppeteer-core. Skips when Chrome is not installed. Starts its own
// Vite server so it does not depend on a dev server already running.
//
// Chrome is launched in America/New_York so a calendar day in the page
// is not the same instant as a UTC day. Expected counts are computed
// with the same helper the dashboard uses.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dateRangeBounds } from '../../dashboard/js/filterDates.js';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '../..');
const CHROME = [
    process.env.CHROME_PATH,
    '/usr/local/bin/google-chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
].find((p) => p && existsSync(p));

const DATE_ERROR = 'The start date is after the end date, so no changes match. Choose an end date on the start date or after it.';

function loadCommits() {
    const commits = [];
    const dir = join(REPO, 'dashboard/public/data-commits');
    for (const name of readdirSync(dir)) {
        if (!name.endsWith('.json')) continue;
        const data = JSON.parse(readFileSync(join(dir, name), 'utf8'));
        commits.push(...data.commits);
    }
    return commits;
}

function countInRange(commits, from, to, useUTC) {
    const bounds = dateRangeBounds(from, to, useUTC);
    if (bounds.inverted) return 0;
    return commits.filter((commit) => {
        const ms = Date.parse(commit.timestamp);
        if (Number.isNaN(ms)) return true;
        if (bounds.from != null && ms < bounds.from) return false;
        if (bounds.to != null && ms > bounds.to) return false;
        return true;
    }).length;
}

function countInZone(from, to, useUTC, timeZone) {
    const moduleUrl = pathToFileURL(join(REPO, 'dashboard/js/filterDates.js')).href;
    const script = `
      import { dateRangeBounds } from ${JSON.stringify(moduleUrl)};
      import { readdirSync, readFileSync } from 'node:fs';
      const bounds = dateRangeBounds(${JSON.stringify(from)}, ${JSON.stringify(to)}, ${useUTC});
      let n = 0;
      for (const name of readdirSync('dashboard/public/data-commits')) {
        if (!name.endsWith('.json')) continue;
        const data = JSON.parse(readFileSync('dashboard/public/data-commits/' + name, 'utf8'));
        for (const commit of data.commits) {
          const ms = Date.parse(commit.timestamp);
          if (Number.isNaN(ms)) { n++; continue; }
          if (bounds.from != null && ms < bounds.from) continue;
          if (bounds.to != null && ms > bounds.to) continue;
          n++;
        }
      }
      process.stdout.write(String(n));
    `;
    const run = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
        cwd: REPO,
        env: { ...process.env, TZ: timeZone },
        encoding: 'utf8',
    });
    if (run.status !== 0) throw new Error(run.stderr || 'count failed');
    return Number(run.stdout);
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
    test('dashboard shell in Chrome', { skip: 'no Chrome binary on this machine' }, () => {});
} else if (!existsSync(join(REPO, 'dashboard/public/data.json'))) {
    test('dashboard shell in Chrome', { skip: 'dashboard/public/data.json is missing — run node scripts/aggregate-processed.js' }, () => {});
} else {
    const COMMITS = loadCommits();
    const TOTAL = COMMITS.length;
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
            } catch { /* not up yet */ }
            await new Promise((r) => setTimeout(r, 200));
        }
        if (!up) throw new Error(`Vite did not start\n${viteLog}`);

        const puppeteer = await import('puppeteer-core');
        browser = await puppeteer.launch({
            executablePath: CHROME,
            headless: true,
            args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
            env: { ...process.env, TZ: 'America/New_York' },
        });
    });

    after(() => {
        // browser.close() and a live Vite pipe keep the test runner
        // from exiting. Kill the processes and drop the pipes.
        try { browser?.process()?.kill('SIGKILL'); } catch { /* already gone */ }
        try {
            vite?.stdout?.destroy();
            vite?.stderr?.destroy();
            vite?.kill('SIGKILL');
        } catch { /* already gone */ }
    });

    async function openPage(width, height, pointer) {
        const page = await browser.newPage();
        // This Chrome rejects emulating the `pointer` media feature.
        // A touch viewport is what actually makes `(pointer: coarse)`
        // match. A desktop viewport reports `pointer: none` here (no
        // mouse is exposed), which uses the same compact rules as
        // `pointer: fine` because the larger size is only inside the
        // coarse query.
        await page.setViewport({
            width,
            height,
            deviceScaleFactor: 1,
            isMobile: pointer === 'coarse',
            hasTouch: pointer === 'coarse',
        });
        await page.evaluateOnNewDocument(() => {
            localStorage.setItem('quickGuideSeen', 'true');
            localStorage.removeItem('dashboardFilters');
            localStorage.removeItem('useUTC');
        });
        return page;
    }

    async function gotoApp(page, path = '/') {
        await page.goto(base + path, { waitUntil: 'domcontentloaded' });
        try {
            await page.waitForFunction((total) => {
                const text = document.querySelector('header')?.innerText || '';
                return text.includes(total.toLocaleString()) || text.includes(String(total));
            }, { timeout: 30000 }, TOTAL);
        } catch (error) {
            const body = await page.evaluate(() => document.body.innerText.slice(0, 400));
            throw new Error(`${error.message}\nPage text: ${body}\nVite: ${viteLog.slice(-500)}`);
        }
    }

    async function openDrawer(page) {
        await page.click('button[aria-label^="Toggle filters"]');
        await page.waitForFunction(() => {
            const side = document.querySelector('.drawer-side');
            if (!side) return false;
            const box = side.getBoundingClientRect();
            const style = getComputedStyle(side);
            return style.visibility === 'visible' && box.x > -1 && box.x < 2;
        }, { timeout: 5000 });
    }

    async function setDate(page, label, value) {
        await page.$eval(`input[aria-label="${label}"]`, (el, next) => {
            const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
            const tracker = el._valueTracker;
            if (tracker) tracker.setValue('');
            proto.set.call(el, next);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, value);
    }

    function sidebarText(page) {
        return page.evaluate(() => {
            const side = [...document.querySelectorAll('aside')].find((el) => el.innerText.includes('Clear All'));
            return side ? side.innerText : '';
        });
    }

    test('settled drawer hits, Escape, and overlay coordination', { timeout: 180000 }, async () => {
        for (const width of [320, 375, 390]) {
            const page = await openPage(width, 844, 'coarse');
            await gotoApp(page);
            const pointerMatches = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
            assert.equal(pointerMatches, true, `${width}px did not match pointer: coarse`);
            const tabs = await page.$$eval('[role="tab"]', (els) => {
                const tops = els.map((el) => Math.round(el.getBoundingClientRect().top));
                const list = document.querySelector('[role="tablist"]');
                return {
                    tops,
                    wrap: getComputedStyle(list).flexWrap,
                    scrolls: list.scrollWidth > list.clientWidth + 1,
                };
            });
            assert.equal(new Set(tabs.tops).size, 1, `${width}px tabs stacked: ${tabs.tops.join(',')}`);
            assert.equal(tabs.wrap, 'nowrap', `${width}px flex-wrap is ${tabs.wrap}`);
            if (width === 320) assert.equal(tabs.scrolls, true, '320px tab row does not scroll');

            await openDrawer(page);
            const hit = await page.evaluate(() => {
                function probe(selector) {
                    const el = document.querySelector(selector);
                    const box = el.getBoundingClientRect();
                    const x = box.x + box.width / 2;
                    const y = box.y + box.height / 2;
                    const at = document.elementFromPoint(x, y);
                    return {
                        w: box.width,
                        h: box.height,
                        ok: !!at && (el === at || el.contains(at)),
                        hit: at ? (at.getAttribute('aria-label') || at.closest('button,a,label')?.getAttribute('aria-label') || at.textContent || '').trim().slice(0, 60) : 'none',
                    };
                }
                const side = document.querySelector('.drawer-side');
                const panel = side.querySelector('aside');
                const panelBox = panel.getBoundingClientRect();
                const overlayX = Math.min(window.innerWidth - 2, panelBox.right + 8);
                const overlayHit = document.elementFromPoint(overlayX, Math.min(panelBox.bottom - 20, window.innerHeight - 20));
                return {
                    z: getComputedStyle(side).zIndex,
                    include: probe('button[aria-label="Tags: Include"]'),
                    exclude: probe('button[aria-label="Tags: Exclude"]'),
                    pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                    overlayLabel: overlayHit?.closest('[aria-label]')?.getAttribute('aria-label') || overlayHit?.getAttribute('aria-label') || '',
                    panelRight: panelBox.right,
                };
            });
            assert.ok(Number(hit.z) >= 50, `${width}px drawer z-index is ${hit.z}`);
            assert.equal(hit.include.ok, true, `${width}px Include hit ${hit.include.hit}`);
            assert.equal(hit.exclude.ok, true, `${width}px Exclude hit ${hit.exclude.hit}`);
            assert.ok(hit.include.h >= 44 && hit.include.w >= 44, `${width}px Include is ${hit.include.w}x${hit.include.h}`);
            assert.ok(hit.pageOverflow <= 1, `${width}px page overflows by ${hit.pageOverflow}`);
            if (width >= 390) {
                assert.equal(hit.overlayLabel, 'Close filter sidebar', `${width}px overlay hit ${hit.overlayLabel}`);
            }

            const targets = await page.evaluate(() => {
                function size(selector) {
                    const el = document.querySelector(selector);
                    const box = el.getBoundingClientRect();
                    return { w: box.width, h: box.height, font: parseFloat(getComputedStyle(el).fontSize) };
                }
                return {
                    menu: size('button[aria-label="Menu"]'),
                    filter: size('button[aria-label^="Toggle filters"]'),
                    settings: size('button[aria-label="Settings"]'),
                    tab: size('[role="tab"]'),
                    dates: size('input[aria-label="Filter from date"]'),
                    clear: size('aside button.btn-outline'),
                    list: size('.drawer-side button[aria-haspopup="listbox"]'),
                };
            });
            for (const [name, box] of Object.entries(targets)) {
                assert.ok(box.h >= 44, `${width}px ${name} height ${box.h}`);
                if (name !== 'clear' && name !== 'dates' && name !== 'list') {
                    assert.ok(box.w >= 44, `${width}px ${name} width ${box.w}`);
                }
            }
            assert.ok(targets.dates.font >= 16, `${width}px date font ${targets.dates.font}`);

            await page.click('.drawer-side button[aria-haspopup="listbox"]');
            await page.waitForSelector('.drawer-side [role="listbox"]');
            await page.keyboard.press('Escape');
            const listStillOpen = await page.$eval('.drawer-side button[aria-haspopup="listbox"]', (el) => el.getAttribute('aria-expanded'));
            const drawerStillOpen = await page.$eval('.drawer-side', (el) => getComputedStyle(el).visibility);
            assert.equal(listStillOpen, 'false');
            assert.equal(drawerStillOpen, 'visible');
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => getComputedStyle(document.querySelector('.drawer-side')).visibility === 'hidden');

            await page.close();
        }

        const page = await openPage(390, 844, 'coarse');
        await gotoApp(page);
        await page.click('button[aria-label="Settings"]');
        await page.waitForFunction(() => {
            const button = document.querySelector('button[aria-label="Close settings"]');
            if (!button) return false;
            const box = button.getBoundingClientRect();
            return box.right <= window.innerWidth + 1 && box.width >= 44 && box.height >= 44;
        });
        const closeHit = await page.evaluate(() => {
            const button = document.querySelector('button[aria-label="Close settings"]');
            const box = button.getBoundingClientRect();
            const at = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            const select = document.querySelector('#work-hour-start');
            const selectBox = select.getBoundingClientRect();
            const row = document.querySelector('input[name="view-level"][value="executive"]').closest('label');
            const rowBox = row.getBoundingClientRect();
            const rowHit = document.elementFromPoint(rowBox.x + 24, rowBox.y + rowBox.height / 2);
            return {
                closeOk: button.contains(at),
                selectH: selectBox.height,
                selectFont: parseFloat(getComputedStyle(select).fontSize),
                rowH: rowBox.height,
                rowOk: row.contains(rowHit),
            };
        });
        assert.equal(closeHit.closeOk, true);
        assert.ok(closeHit.selectH >= 44, `work-hour select height ${closeHit.selectH}`);
        assert.ok(closeHit.selectFont >= 16, `work-hour font ${closeHit.selectFont}`);
        assert.ok(closeHit.rowH >= 44 && closeHit.rowOk, `radio row ${closeHit.rowH}`);

        await page.$eval('button[aria-label^="Toggle filters"]', (el) => el.click());
        await page.waitForFunction(() => {
            const dialog = document.querySelector('[role="dialog"][aria-label="Settings"]');
            const pane = dialog?.closest('aside');
            const side = document.querySelector('.drawer-side');
            if (!pane || !side) return false;
            return pane.getBoundingClientRect().left >= window.innerWidth - 2
                && getComputedStyle(side).visibility === 'visible';
        });
        const covered = await page.evaluate(() => {
            const button = document.querySelector('button[aria-label="Settings"]');
            const box = button.getBoundingClientRect();
            const at = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            return button.contains(at);
        });
        assert.equal(covered, false, 'settings button is still hittable under the open drawer');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.drawer-side')).visibility === 'hidden');

        await page.click('[aria-label*="features built"]');
        await page.waitForFunction(() => {
            const dialog = document.querySelector('[role="dialog"][aria-label="Feature Commits"]');
            const pane = dialog?.closest('aside');
            return pane && pane.getBoundingClientRect().right <= window.innerWidth + 1 && pane.getBoundingClientRect().left < window.innerWidth - 20;
        });
        await page.$eval('button[aria-label^="Toggle filters"]', (el) => el.click());
        await page.waitForFunction(() => {
            const dialog = document.querySelector('[role="dialog"][aria-label="Feature Commits"]');
            const pane = dialog?.closest('aside');
            return pane && pane.getBoundingClientRect().left >= window.innerWidth - 2;
        });
        await page.close();
    });

    test('short menu scrolls in portrait and landscape', { timeout: 90000 }, async () => {
        for (const [width, height] of [[390, 480], [740, 360], [844, 390]]) {
            const page = await openPage(width, height, 'coarse');
            await gotoApp(page);
            await page.click('button[aria-label="Menu"]');
            await page.waitForSelector('nav[aria-label="Secondary actions"]');
            const menu = await page.$eval('nav[aria-label="Secondary actions"]', (nav) => {
                nav.scrollTop = nav.scrollHeight;
                const last = [...nav.querySelectorAll('button')].at(-1);
                const navBox = nav.getBoundingClientRect();
                const lastBox = last.getBoundingClientRect();
                return {
                    scrollHeight: nav.scrollHeight,
                    clientHeight: nav.clientHeight,
                    overflowY: getComputedStyle(nav).overflowY,
                    maxHeight: getComputedStyle(nav).maxHeight,
                    lastBottom: lastBox.bottom,
                    navBottom: navBox.bottom,
                    viewport: window.innerHeight,
                    itemH: lastBox.height,
                };
            });
            assert.equal(menu.overflowY, 'auto', `${width}x${height} overflow ${menu.overflowY}`);
            assert.ok(menu.clientHeight < menu.viewport, `${width}x${height} menu is the whole screen`);
            assert.ok(menu.lastBottom <= menu.navBottom + 1, `${width}x${height} last item ${menu.lastBottom} past menu ${menu.navBottom}`);
            assert.ok(menu.lastBottom <= menu.viewport + 1, `${width}x${height} last item past the screen`);
            assert.ok(menu.itemH >= 44, `${width}x${height} menu row ${menu.itemH}`);
            if (height <= 480) {
                assert.ok(menu.scrollHeight > menu.clientHeight + 1, `${width}x${height} menu does not scroll (${menu.scrollHeight} vs ${menu.clientHeight}, max ${menu.maxHeight})`);
            }
            await page.close();
        }
    });

    test('fine pointer keeps compact controls', { timeout: 60000 }, async () => {
        const page = await openPage(1280, 800, 'fine');
        await gotoApp(page);
        const coarse = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
        assert.equal(coarse, false, 'desktop viewport matched pointer: coarse');
        const size = await page.evaluate(() => {
            function box(selector) {
                const el = document.querySelector(selector);
                const rect = el.getBoundingClientRect();
                return { w: rect.width, h: rect.height, font: parseFloat(getComputedStyle(el).fontSize) };
            }
            const list = document.querySelector('[role="tablist"]');
            const tops = [...document.querySelectorAll('[role="tab"]')].map((el) => Math.round(el.getBoundingClientRect().top));
            return {
                menu: box('button[aria-label="Menu"]'),
                settings: box('button[aria-label="Settings"]'),
                tab: box('[role="tab"]'),
                date: box('input[aria-label="Filter from date"]'),
                include: box('button[aria-label="Tags: Include"]'),
                wrap: getComputedStyle(list).flexWrap,
                tops,
                headerX: document.querySelector('header').getBoundingClientRect().x,
            };
        });
        assert.ok(size.menu.h <= 42 && size.menu.w <= 42, `menu ${size.menu.w}x${size.menu.h}`);
        assert.ok(size.settings.h <= 42 && size.settings.w <= 42, `settings ${size.settings.w}x${size.settings.h}`);
        assert.ok(size.tab.h < 44, `tab height ${size.tab.h}`);
        assert.ok(size.date.font < 16, `date font ${size.date.font}`);
        assert.ok(size.date.h < 44, `date height ${size.date.h}`);
        assert.ok(size.include.h < 44, `include height ${size.include.h}`);
        assert.equal(size.wrap, 'nowrap');
        assert.equal(new Set(size.tops).size, 1);
        assert.ok(size.headerX >= 300, `desktop header starts at ${size.headerX}, sidebar is not in flow`);
        await page.close();
    });

    test('dates, Clear All, and the tab address', { timeout: 120000 }, async () => {
        const page = await openPage(1280, 800, 'fine');
        await gotoApp(page);
        let text = await sidebarText(page);
        assert.match(text, /1 filter active/);
        assert.match(text, /merge/);
        const headerBefore = await page.$eval('header', (el) => el.innerText);
        assert.match(headerBefore, /Filtered/);

        await page.evaluate(() => {
            [...document.querySelectorAll('button')].find((el) => el.textContent.trim() === 'Clear All').click();
        });
        await page.waitForFunction((total) => {
            const header = document.querySelector('header').innerText;
            return header.includes(total.toLocaleString()) && !header.includes('Filtered') && !header.includes('Showing');
        }, {}, TOTAL);
        text = await sidebarText(page);
        assert.doesNotMatch(text, /filter active/);
        assert.match(text, new RegExp(`Showing ${TOTAL} of ${TOTAL}`));

        await setDate(page, 'Filter from date', '2026-01-01');
        await page.waitForFunction(() => document.body.innerText.includes('1 filter active'));

        const day = '2026-03-08';
        const localExpected = countInZone(day, day, false, 'America/New_York');
        const utcExpected = countInRange(COMMITS, day, day, true);
        assert.notEqual(localExpected, utcExpected, 'this day does not distinguish local and UTC in the data');
        await setDate(page, 'Filter from date', day);
        await setDate(page, 'Filter to date', day);
        await page.waitForFunction((expected) => {
            const side = [...document.querySelectorAll('aside')].find((el) => el.innerText.includes('Clear All'));
            return side && side.innerText.includes(`Showing ${expected} of`);
        }, {}, localExpected);

        await page.click('button[aria-label="Settings"]');
        await page.waitForFunction(() => {
            const input = document.querySelector('input[aria-label="Use UTC timezone"]');
            if (!input) return false;
            const box = input.getBoundingClientRect();
            return box.width > 0 && box.right <= window.innerWidth + 1 && box.left >= 0;
        });
        await page.evaluate(() => {
            document.querySelector('input[aria-label="Use UTC timezone"]').closest('label').click();
        });
        await page.waitForFunction((expected) => {
            const side = [...document.querySelectorAll('aside')].find((el) => el.innerText.includes('Clear All'));
            return side && side.innerText.includes(`Showing ${expected} of`);
        }, {}, utcExpected);
        await page.click('button[aria-label="Close settings"]');

        await setDate(page, 'Filter from date', '2026-10-01');
        await setDate(page, 'Filter to date', '2020-01-01');
        await page.waitForFunction((message) => document.body.innerText.includes(message), {}, DATE_ERROR);
        const values = await page.evaluate(() => ({
            from: document.querySelector('input[aria-label="Filter from date"]').value,
            to: document.querySelector('input[aria-label="Filter to date"]').value,
            invalid: document.querySelector('input[aria-label="Filter from date"]').getAttribute('aria-invalid'),
            described: document.querySelector('input[aria-label="Filter from date"]').getAttribute('aria-describedby'),
        }));
        assert.equal(values.from, '2026-10-01');
        assert.equal(values.to, '2020-01-01');
        assert.equal(values.invalid, 'true');
        assert.equal(values.described, 'date-range-error');
        text = await sidebarText(page);
        assert.match(text, /Showing 0 of/);

        await setDate(page, 'Filter from date', '2026-01-01');
        await setDate(page, 'Filter to date', '2026-04-30');
        await page.waitForFunction((message) => !document.body.innerText.includes(message), {}, DATE_ERROR);
        const recovered = await sidebarText(page);
        assert.doesNotMatch(recovered, /Showing 0 of/);
        assert.match(recovered, /Showing \d+ of/);

        await page.goto(`${base}/?tab=discover&foo=keep#section`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Discover'));
        assert.match(page.url(), /tab=discover/);
        assert.match(page.url(), /foo=keep/);
        assert.match(page.url(), /#section$/);

        await page.evaluate(() => {
            [...document.querySelectorAll('[role="tab"]')].find((el) => el.textContent.trim() === 'Health').click();
        });
        await page.waitForFunction(() => location.search.includes('tab=health'));
        assert.match(page.url(), /foo=keep/);
        assert.match(page.url(), /#section$/);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Health'));

        await page.evaluate(() => {
            [...document.querySelectorAll('[role="tab"]')].find((el) => el.textContent.trim() === 'Summary').click();
        });
        await page.waitForFunction(() => !new URL(location.href).searchParams.has('tab'));
        assert.match(page.url(), /foo=keep/);
        await page.goBack();
        await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Health'));
        await page.goForward();
        await page.waitForFunction(() => {
            const selected = document.querySelector('[role="tab"][aria-selected="true"]');
            return selected?.textContent.includes('Summary') && !new URL(location.href).searchParams.has('tab');
        });

        await page.goto(`${base}/?tab=nope&foo=keep`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => document.querySelector('[role="tab"][aria-selected="true"]')?.textContent.includes('Summary'));
        assert.match(page.url(), /tab=nope/);
        await page.evaluate(() => {
            [...document.querySelectorAll('[role="tab"]')].find((el) => el.textContent.trim() === 'Timeline').click();
        });
        await page.waitForFunction(() => location.search.includes('tab=activity'));
        assert.doesNotMatch(page.url(), /tab=nope/);
        assert.match(page.url(), /foo=keep/);
        await page.close();
    });

    test('a closed phone drawer still explains a backwards date', { timeout: 60000 }, async () => {
        const page = await openPage(390, 844, 'coarse');
        await gotoApp(page);
        await openDrawer(page);
        await setDate(page, 'Filter from date', '2026-10-01');
        await setDate(page, 'Filter to date', '2020-01-01');
        await page.waitForSelector('#date-range-error');
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.drawer-side')).visibility === 'hidden');
        const header = await page.$eval('header', (el) => el.innerText);
        assert.match(header, /start date is after the end date/);
        const alerts = await page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].filter((el) => {
            const style = getComputedStyle(el);
            if (style.visibility === 'hidden' || style.display === 'none') return false;
            let node = el;
            while (node) {
                const parent = getComputedStyle(node);
                if (parent.visibility === 'hidden' || parent.display === 'none') return false;
                node = node.parentElement;
            }
            return true;
        }).map((el) => el.innerText.replace(/\s+/g, ' ').trim()));
        assert.deepEqual(alerts, [DATE_ERROR]);
        await page.close();
    });
}
