import React, { useRef, useState, useCallback } from 'react';

export default function DropZone({ onFiles }) {
    const fileInputRef = useRef(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const handleClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
            onFiles(files);
        }
    }, [onFiles]);

    const handleFileChange = useCallback((e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFiles(files);
        }
        // Reset the input so the same file can be selected again
        e.target.value = '';
    }, [onFiles]);

    return (
        <div className="max-w-2xl mx-auto px-4 py-16" style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ color: '#e5e7eb', fontSize: '20px', fontWeight: 600, textAlign: 'center', marginBottom: '24px', fontFamily: 'var(--font-mono, monospace)' }}>
                Git Analytics Dashboard
            </h1>
            <div
                className={`drop-zone ${isDragOver ? 'drag-over' : ''}`}
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick();
                    }
                }}
            >
                <div className="text-center">
                    <svg
                        className="drop-zone-icon mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                    </svg>
                    <p className="text-themed-primary font-medium">Drop JSON files here</p>
                    <p className="text-sm text-themed-tertiary mt-2">or click to browse</p>
                </div>
            </div>
            <input
                type="file"
                accept=".json"
                multiple
                hidden
                ref={fileInputRef}
                onChange={handleFileChange}
            />
        </div>
    );
}
