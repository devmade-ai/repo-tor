import React, { useEffect, useCallback } from 'react';
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

    // Lock body scroll when any overlay pane is open
    useEffect(() => {
        const anyOpen = state.detailPane.open || state.settingsPaneOpen;
        document.body.style.overflow = anyOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [state.detailPane.open, state.settingsPaneOpen]);

    // Auto-load data.json on mount
    useEffect(() => {
        fetch('./data.json')
            .then(r => r.json())
            .then(data => dispatch({ type: 'LOAD_DATA', payload: data }))
            .catch(() => {}); // silently fail, user can upload
    }, []);

    // PWA initialization
    useEffect(() => {
        let pwaModule = null;
        try {
            pwaModule = import('./pwa.js');
        } catch (e) {
            // PWA module not available in dev
        }
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

        Promise.all(readers).then(datasets => {
            if (datasets.length === 0) return;
            const combined = combineDatasets(datasets);
            if (combined) {
                dispatch({ type: 'LOAD_DATA', payload: combined });
            }
        }).catch(err => {
            console.error('Error loading files:', err);
        });
    }, [dispatch]);

    // If no data loaded, show the drop zone
    if (!state.data) {
        return <DropZone onFiles={handleFiles} />;
    }

    return (
        <div className="min-h-screen">
            <Header />
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <TabBar />
                <div className="dashboard-layout mt-6">
                    <FilterSidebar />
                    <div className="tab-content-area">
                        <ErrorBoundary key={state.activeTab}>
                            {state.activeTab === 'overview' && <SummaryTab />}
                            {state.activeTab === 'activity' && (
                                <>
                                    <TimelineTab />
                                    <TimingTab />
                                </>
                            )}
                            {state.activeTab === 'work' && (
                                <>
                                    <ProgressTab />
                                    <ContributorsTab />
                                    <TagsTab />
                                </>
                            )}
                            {state.activeTab === 'health' && (
                                <>
                                    <HealthTab />
                                    <SecurityTab />
                                </>
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
