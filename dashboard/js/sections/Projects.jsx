import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import { PAGE_LIMITS } from '../state.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import ShowMoreButton from '../components/ShowMoreButton.jsx';
import useShowMore from '../hooks/useShowMore.js';

// Requirement: Provide a directory of all live projects with quick-access links
// Approach: Fetch projects.json (static file alongside data.json) and render as card grid
// Alternatives:
//   - Hardcode project list in component: Rejected — not maintainable, data changes frequently
//   - Read from config/repos.json: Rejected — config/ not in Vite build output
//   - Derive from loaded analytics data only: Rejected — misses projects without analytics

export default function Projects() {
    const { state, filteredCommits, commitsLoaded, isMobile } = useApp();
    const [projects, setProjects] = useState([]);
    const [loadError, setLoadError] = useState(null);

    // Fix: Added AbortController to prevent setState on unmounted component.
    // Without cleanup, if the component unmounts during fetch, React warns about
    // memory leaks and state updates on unmounted components.
    useEffect(() => {
        const controller = new AbortController();
        fetch('./projects.json', { signal: controller.signal })
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json();
            })
            .then(data => {
                if (data?.projects) setProjects(data.projects);
            })
            .catch(err => {
                if (err.name === 'AbortError') return;
                console.error('Failed to load projects.json:', err);
                setLoadError('Could not load project list. The file may not be deployed yet.');
            });
        return () => controller.abort();
    }, []);

    // Enrich projects with commit counts from analytics data
    // Requirement: Show commit counts instantly during Phase 1
    // Approach: Use summary.repoCommitCounts (pre-aggregated) during Phase 1,
    //   then switch to computing from loaded commits (which respects filters).
    // Alternatives:
    //   - Show null during Phase 1: Rejected — counts are available in summary
    //   - Only use loaded commits: Rejected — 1-3s delay where counts are missing
    const enriched = useMemo(() => {
        let repoCounts;
        if (commitsLoaded) {
            // Phase 2: compute from filtered commits (respects user-applied filters)
            repoCounts = {};
            filteredCommits.forEach(c => {
                if (c.repo_id) {
                    repoCounts[c.repo_id] = (repoCounts[c.repo_id] || 0) + 1;
                }
            });
        } else {
            // Phase 1: use pre-aggregated counts from summary
            repoCounts = state.data?.summary?.repoCommitCounts || null;
        }

        return projects.map(p => ({
            ...p,
            commitCount: repoCounts ? (repoCounts[p.name] || 0) : null,
        }));
    }, [projects, filteredCommits, state.data?.summary?.repoCommitCounts, commitsLoaded]);

    // Split into live (has liveUrl) and other projects
    const { liveProjects, otherProjects } = useMemo(() => {
        const live = enriched.filter(p => p.liveUrl);
        const other = enriched.filter(p => !p.liveUrl);
        return { liveProjects: live, otherProjects: other };
    }, [enriched]);

    // Paginate project grids — 6 mobile / 12 desktop
    // Must be called before early returns to satisfy React hooks rules
    const {
        visible: visibleLive,
        hasMore: liveHasMore,
        remaining: liveRemaining,
        showMore: showMoreLive,
    } = useShowMore(liveProjects, ...PAGE_LIMITS.projects, isMobile);

    const {
        visible: visibleOther,
        hasMore: otherHasMore,
        remaining: otherRemaining,
        showMore: showMoreOther,
    } = useShowMore(otherProjects, ...PAGE_LIMITS.projects, isMobile);

    if (loadError) {
        return (
            <div className="card projects-error">
                <p className="text-themed-secondary">{loadError}</p>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="loading-spinner loading-spinner-md" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <CollapsibleSection
                title="Live Projects"
                subtitle={`${liveProjects.length} projects with live sites`}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleLive.map(project => (
                        <ProjectCard key={project.name} project={project} />
                    ))}
                </div>
                {liveHasMore && (
                    <ShowMoreButton remaining={liveRemaining} pageSize={isMobile ? PAGE_LIMITS.projects[0] : PAGE_LIMITS.projects[1]} onClick={showMoreLive} />
                )}
            </CollapsibleSection>

            {otherProjects.length > 0 && (
                <CollapsibleSection
                    title="Other Repositories"
                    subtitle={`${otherProjects.length} repositories`}
                    defaultExpanded={false}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {visibleOther.map(project => (
                            <ProjectCard key={project.name} project={project} />
                        ))}
                    </div>
                    {otherHasMore && (
                        <ShowMoreButton remaining={otherRemaining} pageSize={isMobile ? PAGE_LIMITS.projects[0] : PAGE_LIMITS.projects[1]} onClick={showMoreOther} />
                    )}
                </CollapsibleSection>
            )}
        </div>
    );
}

function ProjectCard({ project }) {
    return (
        <div className="project-card">
            <div className="flex items-start justify-between gap-2">
                <h4 className="text-themed-primary font-medium text-base">
                    {project.name}
                </h4>
                {project.language && (
                    <span className="project-lang-badge">
                        {project.language}
                    </span>
                )}
            </div>

            {project.description && (
                <p className="text-sm text-themed-tertiary mt-1">{project.description}</p>
            )}

            {project.commitCount != null && project.commitCount > 0 && (
                <p className="text-xs text-themed-muted mt-2">
                    {project.commitCount} commits tracked
                </p>
            )}

            <div className="flex gap-3 mt-3">
                {project.liveUrl && (
                    <a
                        href={project.liveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-link project-link-primary"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Open
                    </a>
                )}
                {project.repoUrl && (
                    <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="project-link project-link-secondary"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                        </svg>
                        GitHub
                    </a>
                )}
            </div>
        </div>
    );
}
