import React from 'react';
import { useApp } from '../AppContext.jsx';

export default function Header() {
    const { state, dispatch } = useApp();

    const repoName = state.data?.metadata?.repo_name;
    const commitCount = state.data?.commits?.length || 0;

    let repoDisplay = '';
    if (repoName) {
        repoDisplay = Array.isArray(repoName) ? repoName.join(', ') : repoName;
    }

    const subtitle = repoDisplay
        ? `${repoDisplay} \u2014 ${commitCount.toLocaleString()} commits`
        : `${commitCount.toLocaleString()} commits`;

    return (
        <header className="dashboard-header px-4 md:px-8 py-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-themed-primary">Git Analytics</h1>
                        <p className="text-sm text-themed-tertiary mt-1">
                            {subtitle}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS_PANE' })}
                            className="btn-theme"
                            aria-label="Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
