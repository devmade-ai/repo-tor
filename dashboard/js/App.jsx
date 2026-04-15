import React, { useEffect, useCallback, useState } from 'react';
import { useApp } from './AppContext.jsx';
import { useToast } from './components/Toast.jsx';
import useScrollLock from './hooks/useScrollLock.js';
import { embedIds, isEmbedMode, themeParam, bgParam, dataUrlParam } from './urlParams.js';
import { debugAdd } from './debugLog.js';
import { applyTheme, DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME } from './themes.js';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import DropZone from './components/DropZone.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import DetailPane from './components/DetailPane.jsx';
import SettingsPane from './components/SettingsPane.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import EmbedRenderer from './components/EmbedRenderer.jsx';
import HeatmapTooltip from './components/HeatmapTooltip.jsx';
import Summary from './sections/Summary.jsx';
import Timeline from './sections/Timeline.jsx';
import Timing from './sections/Timing.jsx';
import Progress from './sections/Progress.jsx';
import Contributors from './sections/Contributors.jsx';
import Tags from './sections/Tags.jsx';
import Health from './sections/Health.jsx';
import Discover from './sections/Discover.jsx';
import Projects from './sections/Projects.jsx';

function combineDatasets(datasets) {
    if (datasets.length === 0) return null;
    if (datasets.length === 1) return datasets[0];

    const combined = {
        commits: [],
        metadata: {
            repo_name: [],
            generated_at: new Date().toISOString(),
            total_commits: 0,
        },
    };

    datasets.forEach(dataset => {
        if (dataset.commits && Array.isArray(dataset.commits)) {
            combined.commits = combined.commits.concat(dataset.commits);
        }
        if (dataset.metadata) {
            if (dataset.metadata.repo_name) {
                const names = Array.isArray(dataset.metadata.repo_name)
                    ? dataset.metadata.repo_name
                    : [dataset.metadata.repo_name];
                combined.metadata.repo_name = combined.metadata.repo_name.concat(names);
            }
            // Fix: Merge metadata instead of overwriting. Previously, later datasets
            // silently overwrote metadata from earlier ones (e.g., authors map).
            Object.keys(dataset.metadata).forEach(key => {
                if (key !== 'repo_name' && key !== 'generated_at' && key !== 'total_commits') {
                    const existing = combined.metadata[key];
                    const incoming = dataset.metadata[key];
                    // Deep merge plain objects (e.g., authors maps); overwrite primitives
                    if (existing && typeof existing === 'object' && !Array.isArray(existing)
                        && incoming && typeof incoming === 'object' && !Array.isArray(incoming)) {
                        combined.metadata[key] = { ...existing, ...incoming };
                    } else {
                        combined.metadata[key] = incoming;
                    }
                }
            });
        }
    });

    combined.metadata.total_commits = combined.commits.length;
    combined.metadata.repo_name = [...new Set(combined.metadata.repo_name)];
    if (combined.metadata.repo_name.length === 1) {
        combined.metadata.repo_name = combined.metadata.repo_name[0];
    }

    return combined;
}

// Embed mode detection and URL param parsing handled by urlParams.js
// Theme/bg overrides applied in useEffect below (inside React lifecycle)

export default function App() {
    const { state, dispatch } = useApp();
    const { addToast } = useToast();
    const [loadError, setLoadError] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);

    // Lock body scroll when any overlay pane is open
    // Requirement: Prevent background scrolling when panes are open
    // Approach: Ref-counted useScrollLock hook — multiple overlays (detail pane,
    //   settings, quick guide) can each hold a lock independently without racing.
    // Alternatives:
    //   - Direct document.body.style.overflow: Rejected — race condition when
    //     multiple overlays set/clear independently (see useScrollLock.js)
    useScrollLock(state.detailPane.open || state.settingsPaneOpen);

    // Apply embed overrides from URL: ?theme=light|dark, ?bg=hex|transparent
    // Requirement: Let embedder apps match the embedded element's background
    //   to their site. `?theme=light|dark` forces the corresponding DaisyUI
    //   theme. `?bg=hex|transparent` overrides --color-base-100 directly.
    // Approach: Route the theme override through themes.js applyTheme() with
    //   skipPersist=true — the override is session-scoped and should not
    //   pollute the user's localStorage. Then override --color-base-100 for
    //   the background parameter. Runs in useEffect (not module scope) to
    //   avoid racing with AppContext's initial applyTheme() call.
    // Alternatives:
    //   - Module-scope overrides: Rejected — raced with React dark mode management.
    //   - postMessage from parent: Rejected — URL params are simpler and stateless.
    //   - Inline DOM mutations (previous approach): Rejected — duplicated the
    //     .dark/data-theme/meta-color logic that themes.js centralizes.
    useEffect(() => {
        if (!isEmbedMode) return;
        if (themeParam === 'light') {
            applyTheme(false, DEFAULT_LIGHT_THEME, /* skipPersist */ true);
        } else if (themeParam === 'dark') {
            applyTheme(true, DEFAULT_DARK_THEME, /* skipPersist */ true);
        }
        if (bgParam) {
            // Validate: only accept 'transparent' or valid hex color (3-8 hex chars)
            // to prevent CSS injection via malformed values. --color-base-100 is
            // the DaisyUI token body reads via `background-color: var(--color-base-100)`.
            const root = document.documentElement;
            const hexValue = bgParam.startsWith('#') ? bgParam : `#${bgParam}`;
            if (bgParam === 'transparent') {
                root.style.setProperty('--color-base-100', 'transparent');
            } else if (/^#[0-9a-fA-F]{3,8}$/.test(hexValue)) {
                root.style.setProperty('--color-base-100', hexValue);
            }
        }
    }, []);

    // Requirement: Two-phase data loading for time-windowed file format
    // Approach: Load data.json (summary) first for fast initial paint with pre-aggregated
    //   charts, then lazy-load per-month commit files in background for drilldowns/filters.
    //   Detects legacy format (inline commits) and skips lazy loading if commits already present.
    // Alternatives:
    //   - Load everything at once: Rejected — 2.9 MB payload, slow initial load
    //   - Only load commits on demand: Rejected — too complex for filter/drilldown interactions
    useEffect(() => {
        const controller = new AbortController();
        let timedOut = false;
        // Timeout: abort fetch after 30s to prevent indefinite hangs on slow networks
        const timeoutId = setTimeout(() => { timedOut = true; controller.abort(); }, 30000);

        async function loadData() {
            try {
                // Requirement: Accept data URL via ?data= query param for external hosting
                // Approach: Check URL params first, fall back to ./data.json. The ?data=
                //   param lets users host their data.json elsewhere and point the dashboard at it.
                // Alternatives:
                //   - postMessage from parent: Rejected — adds complexity for iframe use case
                //   - Config file: Rejected — requires build step or server-side config
                // dataUrlParam imported from urlParams.js (parsed once, shared across modules)

                // Requirement: Validate ?data= URL to prevent SSRF and unsafe schemes
                // Approach: Only allow http/https URLs. Reject file://, data://, ftp://, etc.
                // Alternatives:
                //   - Allow any URL: Rejected — SSRF risk, could fetch internal network resources
                //   - Restrict to same-origin only: Rejected — legitimate use case for cross-origin data
                if (dataUrlParam) {
                    try {
                        const parsed = new URL(dataUrlParam, window.location.origin);
                        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
                            throw new Error('Only http and https URLs are supported for the data parameter.');
                        }
                    } catch (urlErr) {
                        if (urlErr.message.includes('Only http')) throw urlErr;
                        throw new Error('The data URL is not valid. Please check the URL format.');
                    }
                }

                // Phase 1: Load summary data
                let r;
                if (dataUrlParam) {
                    r = await fetch(dataUrlParam, { signal: controller.signal });
                    if (!r.ok) {
                        throw new Error(`Could not load data from the provided URL (HTTP ${r.status}). Check the URL and try again.`);
                    }
                } else {
                    r = await fetch('./data.json', { signal: controller.signal });
                    if (r.status === 404) return; // No data file — user can upload
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                }
                const ct = r.headers.get('content-type') || '';
                if (!dataUrlParam && ct.includes('text/html')) return; // SPA rewrite, not JSON

                const data = await r.json();
                if (!data) return;

                dispatch({ type: 'LOAD_DATA', payload: data });

                // Phase 2: If commits are already inline (legacy format or file upload),
                // skip lazy loading — data is complete
                if (Array.isArray(data.commits) && data.commits.length > 0) {
                    return;
                }

                // New format: load per-month commit files from data-commits/
                const commitMonths = data.metadata?.commitMonths;
                if (!Array.isArray(commitMonths) || commitMonths.length === 0) {
                    return; // No commit months index — nothing to lazy load
                }

                dispatch({ type: 'SET_COMMITS_LOADING', payload: true });

                // Fetch all month files in parallel. Each promise returns
                // { commits, failed } so failures are collected from results
                // after Promise.all — no shared mutable array across async callbacks.
                const monthPromises = commitMonths.map(async (month) => {
                    const url = `./data-commits/${month}.json`;
                    try {
                        const resp = await fetch(url, { signal: controller.signal });
                        if (!resp.ok) {
                            console.warn(`Failed to load commits for ${month}: HTTP ${resp.status}`);
                            return { commits: [], failed: month };
                        }
                        const monthData = await resp.json();
                        return { commits: monthData.commits || [], failed: null };
                    } catch (monthErr) {
                        if (monthErr.name === 'AbortError') throw monthErr;
                        console.warn(`Failed to load commits for ${month}:`, monthErr.message);
                        return { commits: [], failed: month };
                    }
                });

                const monthResults = await Promise.all(monthPromises);
                if (controller.signal.aborted) return;

                // Merge all month commits, sort newest first
                const allCommits = monthResults
                    .flatMap(r => r.commits)
                    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                dispatch({ type: 'LOAD_COMMITS', payload: allCommits });

                // Show warning if some months failed to load — user should know
                // their data may be incomplete
                const failedMonths = monthResults.filter(r => r.failed).map(r => r.failed);
                if (failedMonths.length > 0) {
                    setLoadError(
                        `Some data could not be loaded (${failedMonths.join(', ')}). ` +
                        'The dashboard may show incomplete results for those months.'
                    );
                }
            } catch (err) {
                if (err.name === 'AbortError') {
                    // Timeout abort: show error. Component unmount abort: do nothing.
                    if (timedOut) {
                        setLoadError('Loading took too long. Check your connection and try again, or upload a data file below.');
                        setInitialLoading(false);
                    }
                    return;
                }
                debugAdd('boot', 'error', 'Data load failed: ' + err.message, { stack: err.stack });
                const isJsonParseError = err instanceof SyntaxError;
                const userMessage = isJsonParseError
                    ? 'The dashboard data file could not be read. It may be corrupted or in the wrong format. Try uploading a fresh export below.'
                    : 'Something went wrong loading the dashboard. Please try again, or upload a data file below.';
                setLoadError(userMessage);
            } finally {
                clearTimeout(timeoutId);
                if (!controller.signal.aborted) setInitialLoading(false);
            }
        }

        loadData();
        return () => { clearTimeout(timeoutId); controller.abort(); };
    }, []);

    // Heatmap tooltip positioning is handled by the HeatmapTooltip portal component
    // (rendered in the JSX below). Replaced the vanilla DOM useEffect that used
    // document.getElementById, classList, and manual style positioning.

    const handleFiles = useCallback((files) => {
        // Fix: Validate file size before reading to prevent browser tab hanging
        // on very large files. 50MB matches the maxBuffer used in extract scripts.
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
        const jsonFiles = Array.from(files).filter(f => f.name.endsWith('.json'));
        const oversized = jsonFiles.find(f => f.size > MAX_FILE_SIZE);
        if (oversized) {
            setLoadError(`File "${oversized.name}" is too large (${(oversized.size / 1024 / 1024).toFixed(0)}MB). Maximum size is 50MB.`);
            return;
        }

        const readers = jsonFiles
            .map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        try {
                            resolve(JSON.parse(reader.result));
                        } catch (e) {
                            reject(e);
                        }
                    };
                    reader.onerror = reject;
                    reader.readAsText(file);
                });
            });

        if (readers.length === 0) {
            setLoadError('No JSON files found. Please upload .json files.');
            return;
        }

        setLoadError(null);
        Promise.all(readers).then(datasets => {
            if (datasets.length === 0) return;
            const combined = combineDatasets(datasets);
            if (combined) {
                dispatch({ type: 'LOAD_DATA', payload: combined });
                const commitCount = combined.commits?.length || 0;
                const repoNames = Array.isArray(combined.metadata?.repo_name)
                    ? combined.metadata.repo_name : combined.metadata?.repo_name ? [combined.metadata.repo_name] : [];
                const repoText = repoNames.length > 0 ? ` from ${repoNames.length} repo${repoNames.length !== 1 ? 's' : ''}` : '';
                addToast(`Loaded ${commitCount.toLocaleString()} changes${repoText}`, { type: 'success', duration: 4000 });
            }
        }).catch(err => {
            debugAdd('import', 'error', 'File upload failed: ' + err.message, { stack: err.stack });
            const message = err instanceof SyntaxError
                ? 'This file doesn\'t look like valid dashboard data. Try exporting from the extraction script first.'
                : `Something went wrong reading the file: ${err.message}`;
            setLoadError(message);
        });
    }, [dispatch, addToast]);

    // Wait for initial data.json fetch before deciding what to show
    if (initialLoading) {
        return (
            <div
                className="flex items-center justify-center min-h-screen flex-col gap-4"
                role="status"
            >
                {/* role="status" is an implicit aria-live="polite" live region — adding
                    an explicit aria-live here would duplicate the semantics, same trap
                    as the Toast nested-live-region fix earlier today. The <p> text
                    below carries the announcement; the spinner is decorative and
                    aria-hidden. */}
                <span className="loading loading-spinner loading-lg text-primary" aria-hidden="true" />
                <p className="text-sm text-base-content/60">Loading dashboard&hellip;</p>
            </div>
        );
    }

    // Embed mode: render only the requested chart(s), no dashboard chrome
    if (embedIds) {
        if (!state.data) {
            return (
                <div className="flex flex-col items-center justify-center min-h-50 p-6 text-center text-base-content/80 font-sans text-sm gap-2">
                    <p>No data available to display this chart.</p>
                    <p>Make sure data.json is deployed.</p>
                </div>
            );
        }
        return <EmbedRenderer embedIds={embedIds} />;
    }

    // If no data loaded, show the drop zone (or error)
    if (!state.data) {
        return (
            <div>
                {loadError && (
                    <div className="max-w-2xl mx-auto px-4 pt-12 pb-4">
                        <div role="alert" className="card bg-base-200 border border-base-300">
                            <div className="card-body items-center text-center">
                                <p className="text-base-content text-base mb-2">
                                    Could not load dashboard data
                                </p>
                                <p className="text-base-content/60 text-sm mb-4">
                                    {loadError}
                                </p>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="btn btn-primary"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <DropZone onFiles={handleFiles} />
            </div>
        );
    }

    // Layout architecture: ONE DaisyUI drawer for the filter sidebar,
    // plus two fixed-positioned slide-over panes (detail + settings)
    // using stock Tailwind utilities for the transform animation.
    //
    // Why not three nested DaisyUI drawers (the previous attempt)?
    //   - DaisyUI v5's drawer is designed for one-drawer-per-page UX.
    //     Nesting three (filter → detail → settings) was an undocumented
    //     pattern, and the click-outside / focus / z-index behaviour
    //     across three drawer-overlays could not be verified without
    //     running a browser. The simpler architecture below uses ONE
    //     drawer for the filter (the standard `lg:drawer-open` pattern,
    //     well-supported) and two plain fixed-positioned slide-overs
    //     for detail and settings.
    //   - Detail and settings panes are simple `fixed top-0 right-0
    //     h-screen w-full max-w-{lg|sm}` with a `transform translate-x-{0|full}`
    //     swap driven by reducer state. Stock Tailwind utilities only
    //     — no custom classes, no custom CSS, no @utility directives.
    //     Same vanilla-DaisyUI policy compliance as the rest of the app.
    //   - Backdrop overlays are `fixed inset-0 bg-black/60 transition-opacity`
    //     siblings of each pane that toggle pointer-events + opacity
    //     based on the pane's open state. Click-to-close handled by
    //     onClick → dispatch.
    //
    // Filter sidebar still uses DaisyUI `drawer lg:drawer-open` so it's
    // inline on desktop (lg+) and overlay on mobile — that's the
    // documented standard pattern and works without nesting.
    return (
        <div className="drawer lg:drawer-open">
            <input
                id="filter-drawer-toggle"
                type="checkbox"
                className="drawer-toggle"
                checked={state.filterSidebarOpen}
                onChange={e => dispatch({ type: e.target.checked ? 'OPEN_FILTER_SIDEBAR' : 'CLOSE_FILTER_SIDEBAR' })}
                aria-label="Toggle filter sidebar"
            />
            <div className="drawer-content flex flex-col min-h-screen">
                <ErrorBoundary><Header /></ErrorBoundary>
                <div className="print:hidden"><ErrorBoundary><TabBar /></ErrorBoundary></div>
                <main className="max-w-7xl mx-auto w-full px-4 md:px-8 pb-12 flex-1">
                    <ErrorBoundary key={state.activeTab}>
                        {state.activeTab === 'overview' && <Summary />}
                        {state.activeTab === 'activity' && (
                            <div className="space-y-4 sm:space-y-6">
                                <Timeline />
                                <hr className="border-base-300 opacity-30" />
                                <Timing />
                            </div>
                        )}
                        {state.activeTab === 'work' && (
                            <div className="space-y-4 sm:space-y-6">
                                <Progress />
                                <hr className="border-base-300 opacity-30" />
                                <Contributors />
                                <hr className="border-base-300 opacity-30" />
                                <Tags />
                            </div>
                        )}
                        {state.activeTab === 'health' && <Health />}
                        {state.activeTab === 'discover' && <Discover />}
                        {state.activeTab === 'projects' && <Projects />}
                    </ErrorBoundary>
                </main>
                <HeatmapTooltip />

                {/* Detail pane — fixed slide-over from the right.
                    Uses stock Tailwind transform/transition for the
                    slide animation, and a sibling backdrop for click-
                    to-close. Open state controlled by React reducer. */}
                <div
                    className={`fixed inset-0 bg-black/60 z-30 transition-opacity duration-300 print:hidden ${state.detailPane.open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => dispatch({ type: 'CLOSE_DETAIL_PANE' })}
                    aria-hidden="true"
                />
                <aside
                    className={`fixed top-0 right-0 h-screen w-full max-w-lg z-40 transform transition-transform duration-300 print:hidden ${state.detailPane.open ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <ErrorBoundary><DetailPane /></ErrorBoundary>
                </aside>

                {/* Settings pane — same pattern as detail. Higher z-index
                    so it stacks above detail when both are open. */}
                <div
                    className={`fixed inset-0 bg-black/60 z-40 transition-opacity duration-300 print:hidden ${state.settingsPaneOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => dispatch({ type: 'CLOSE_SETTINGS_PANE' })}
                    aria-hidden="true"
                />
                <aside
                    className={`fixed top-0 right-0 h-screen w-full max-w-sm z-40 transform transition-transform duration-300 print:hidden ${state.settingsPaneOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <ErrorBoundary><SettingsPane /></ErrorBoundary>
                </aside>
            </div>
            <div className="drawer-side print:hidden">
                <label htmlFor="filter-drawer-toggle" className="drawer-overlay" aria-label="Close filter sidebar" />
                <ErrorBoundary><FilterSidebar /></ErrorBoundary>
            </div>
        </div>
    );
}
