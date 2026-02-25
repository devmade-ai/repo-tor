import React, { useEffect, useCallback, useState } from 'react';
import { useApp } from './AppContext.jsx';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import DropZone from './components/DropZone.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import DetailPane from './components/DetailPane.jsx';
import SettingsPane from './components/SettingsPane.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import EmbedRenderer from './components/EmbedRenderer.jsx';
import SummaryTab from './tabs/SummaryTab.jsx';
import TimelineTab from './tabs/TimelineTab.jsx';
import TimingTab from './tabs/TimingTab.jsx';
import ProgressTab from './tabs/ProgressTab.jsx';
import ContributorsTab from './tabs/ContributorsTab.jsx';
import TagsTab from './tabs/TagsTab.jsx';
import HealthTab from './tabs/HealthTab.jsx';
import SecurityTab from './tabs/SecurityTab.jsx';
import DiscoverTab from './tabs/DiscoverTab.jsx';
import ProjectsTab from './tabs/ProjectsTab.jsx';

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

// Detect embed mode from URL: ?embed=chart-id or ?embed=id1,id2
const embedIds = (() => {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('embed');
    if (!raw) return null;
    return raw.split(',').map(s => s.trim()).filter(Boolean);
})();

// Apply embed overrides from URL: ?theme=light|dark, ?bg=hex|transparent
// Requirement: Let embedder apps match the embedded element's background to their site
// Approach: Override --bg-primary CSS variable (read by body and .embed-mode styles)
// Alternatives:
//   - postMessage from parent: Rejected — adds complexity, URL param is simpler and stateless
//   - CSS variable injection from parent: Rejected — CSS can't cross iframe boundaries
if (embedIds) {
    const params = new URLSearchParams(window.location.search);

    const themeParam = params.get('theme');
    if (themeParam === 'light') {
        document.documentElement.classList.remove('dark');
    }
    // dark is already the default, but be explicit if requested
    if (themeParam === 'dark') {
        document.documentElement.classList.add('dark');
    }

    const bgParam = params.get('bg');
    if (bgParam) {
        const bgValue = bgParam === 'transparent' ? 'transparent'
            : bgParam.startsWith('#') ? bgParam : `#${bgParam}`;
        document.documentElement.style.setProperty('--bg-primary', bgValue);
    }
}

export default function App() {
    const { state, dispatch } = useApp();
    const [loadError, setLoadError] = useState(null);
    const [loadSuccess, setLoadSuccess] = useState(null);
    const [initialLoading, setInitialLoading] = useState(true);

    // Lock body scroll when any overlay pane is open
    useEffect(() => {
        const anyOpen = state.detailPane.open || state.settingsPaneOpen;
        document.body.style.overflow = anyOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [state.detailPane.open, state.settingsPaneOpen]);

    // Auto-load data.json on mount
    useEffect(() => {
        fetch('./data.json')
            .then(r => {
                if (r.status === 404) return null; // No data file — user can upload
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                if (data) dispatch({ type: 'LOAD_DATA', payload: data });
            })
            .catch(err => {
                console.error('Failed to load data.json:', err);
                setLoadError(`Failed to load dashboard data: ${err.message}`);
            })
            .finally(() => setInitialLoading(false));
    }, []);

    // Heatmap tooltip handler
    useEffect(() => {
        const tooltip = document.getElementById('heatmap-tooltip');
        if (!tooltip) return;

        function handleMouseOver(e) {
            const target = e.target.closest('[data-tooltip]');
            if (!target) {
                tooltip.classList.remove('visible');
                return;
            }
            tooltip.textContent = target.getAttribute('data-tooltip');
            tooltip.classList.add('visible');

            // Fix: Clamp tooltip position to viewport bounds to prevent clipping
            const rect = target.getBoundingClientRect();
            let left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2;
            let top = rect.top - tooltip.offsetHeight - 6;
            // Clamp horizontal: keep within viewport with 4px padding
            left = Math.max(4, Math.min(left, window.innerWidth - tooltip.offsetWidth - 4));
            // If tooltip would go above viewport, show below the target instead
            if (top < 4) {
                top = rect.bottom + 6;
            }
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        }

        function handleMouseOut(e) {
            const target = e.target.closest('[data-tooltip]');
            if (target) {
                tooltip.classList.remove('visible');
            }
        }

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
        };
    }, []);

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
        setLoadSuccess(null);
        Promise.all(readers).then(datasets => {
            if (datasets.length === 0) return;
            const combined = combineDatasets(datasets);
            if (combined) {
                dispatch({ type: 'LOAD_DATA', payload: combined });
                // Requirement: Provide success feedback after data upload
                // Approach: Brief toast message with commit/repo count
                const commitCount = combined.commits?.length || 0;
                const repoNames = Array.isArray(combined.metadata?.repo_name)
                    ? combined.metadata.repo_name : combined.metadata?.repo_name ? [combined.metadata.repo_name] : [];
                const repoText = repoNames.length > 0 ? ` from ${repoNames.length} repo${repoNames.length !== 1 ? 's' : ''}` : '';
                setLoadSuccess(`Loaded ${commitCount.toLocaleString()} commits${repoText}`);
                setTimeout(() => setLoadSuccess(null), 4000);
            }
        }).catch(err => {
            console.error('Error loading files:', err);
            // Requirement: Distinguish error types for non-technical users
            const message = err instanceof SyntaxError
                ? 'This file doesn\'t look like valid dashboard data. Try exporting from the extraction script first.'
                : `Something went wrong reading the file: ${err.message}`;
            setLoadError(message);
        });
    }, [dispatch]);

    // Wait for initial data.json fetch before deciding what to show
    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen flex-col gap-4">
                <div className="loading-spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
                <p className="text-sm text-themed-tertiary">Loading dashboard&hellip;</p>
            </div>
        );
    }

    // Embed mode: render only the requested chart(s), no dashboard chrome
    if (embedIds) {
        if (!state.data) {
            return (
                <div className="embed-error">
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
            <div className="dashboard-enter">
                {loadError && (
                    <div role="alert" className="max-w-2xl mx-auto px-4 pt-12 pb-4">
                        <div className="card text-center">
                            <p className="text-themed-primary text-base mb-2">
                                Could not load dashboard data
                            </p>
                            <p className="text-themed-tertiary text-sm mb-4">
                                {loadError}
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                className="btn-icon btn-primary"
                            >
                                Retry
                            </button>
                        </div>
                    </div>
                )}
                <DropZone onFiles={handleFiles} />
            </div>
        );
    }

    return (
        <div className="min-h-screen dashboard-enter">
            <Header />
            <TabBar />
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="dashboard-layout mt-6">
                    <FilterSidebar />
                    <div className="tab-content-area">
                        <ErrorBoundary key={state.activeTab}>
                            {state.activeTab === 'overview' && <SummaryTab />}
                            {state.activeTab === 'activity' && (
                                <div className="space-y-6">
                                    <TimelineTab />
                                    <TimingTab />
                                </div>
                            )}
                            {state.activeTab === 'work' && (
                                <div className="space-y-6">
                                    <ProgressTab />
                                    <ContributorsTab />
                                    <TagsTab />
                                </div>
                            )}
                            {state.activeTab === 'health' && (
                                <div className="space-y-6">
                                    <HealthTab />
                                    <SecurityTab />
                                </div>
                            )}
                            {state.activeTab === 'discover' && <DiscoverTab />}
                            {state.activeTab === 'projects' && <ProjectsTab />}
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
            <DetailPane />
            <SettingsPane />
            {/* Success toast — brief confirmation after file upload */}
            {loadSuccess && (
                <div className="toast show" role="status" aria-live="polite">
                    {loadSuccess}
                </div>
            )}
        </div>
    );
}
