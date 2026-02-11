import React, { useEffect, useCallback, useState } from 'react';
import { useApp } from './AppContext.jsx';
import Header from './components/Header.jsx';
import TabBar from './components/TabBar.jsx';
import DropZone from './components/DropZone.jsx';
import FilterSidebar from './components/FilterSidebar.jsx';
import DetailPane from './components/DetailPane.jsx';
import SettingsPane from './components/SettingsPane.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import SummaryTab from './tabs/SummaryTab.jsx';
import TimelineTab from './tabs/TimelineTab.jsx';
import TimingTab from './tabs/TimingTab.jsx';
import ProgressTab from './tabs/ProgressTab.jsx';
import ContributorsTab from './tabs/ContributorsTab.jsx';
import TagsTab from './tabs/TagsTab.jsx';
import HealthTab from './tabs/HealthTab.jsx';
import SecurityTab from './tabs/SecurityTab.jsx';
import DiscoverTab from './tabs/DiscoverTab.jsx';

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
            Object.keys(dataset.metadata).forEach(key => {
                if (key !== 'repo_name' && key !== 'generated_at' && key !== 'total_commits') {
                    combined.metadata[key] = dataset.metadata[key];
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

export default function App() {
    const { state, dispatch } = useApp();
    const [loadError, setLoadError] = useState(null);
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

            const rect = target.getBoundingClientRect();
            tooltip.style.left = rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + 'px';
            tooltip.style.top = rect.top - tooltip.offsetHeight - 6 + 'px';
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
        const readers = Array.from(files)
            .filter(f => f.name.endsWith('.json'))
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
            }
        }).catch(err => {
            console.error('Error loading files:', err);
            setLoadError('Failed to parse JSON file. Please check the file format.');
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

    // If no data loaded, show the drop zone (or error)
    if (!state.data) {
        return (
            <div className="dashboard-enter">
                {loadError && (
                    <div role="alert" className="max-w-2xl mx-auto px-4 pt-12 pb-4">
                        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
                            <p style={{ color: '#e5e7eb', fontSize: '16px', marginBottom: '8px' }}>
                                Could not load dashboard data
                            </p>
                            <p style={{ color: '#767676', fontSize: '13px', marginBottom: '16px' }}>
                                {loadError}
                            </p>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '8px 24px', background: '#2D68FF', color: '#fff',
                                    border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                                }}
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
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
            <DetailPane />
            <SettingsPane />
        </div>
    );
}
