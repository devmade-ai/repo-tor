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

    // State-conditional visual for the drag-over highlight + focus ring
    // + hover discovery hint. Base styles come first so the drag-over
    // overrides land last. Focus-visible adds an explicit outline ring
    // on top of the border/bg tint for strong keyboard visibility —
    // matches TabBar's focus pattern for consistency.
    const dropZoneBase =
        'border-2 border-dashed border-base-300 rounded-lg px-6 py-10 cursor-pointer transition-all ' +
        'hover:border-primary hover:bg-primary/5 ' +
        'focus-visible:border-primary focus-visible:bg-primary/5 ' +
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2';
    const dropZoneActive =
        'border-primary bg-primary/10 shadow-[0_0_20px_color-mix(in_oklab,var(--color-primary)_25%,transparent)]';
    // Icon color flips to primary during drag-over.
    const iconColor = isDragOver ? 'text-primary' : 'text-base-content/60';

    return (
        <div className="max-w-2xl mx-auto px-4 py-16 min-h-[60vh] flex flex-col justify-center">
            <h1 className="text-base-content text-xl font-semibold text-center mb-6 font-mono">Git Analytics Dashboard</h1>
            <div
                className={`${dropZoneBase} ${isDragOver ? dropZoneActive : ''}`}
                onClick={handleClick}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                aria-label="Upload JSON data files by dropping them here or clicking to browse"
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleClick();
                    }
                }}
            >
                <div className="text-center">
                    <svg
                        className={`w-12 h-12 mx-auto mb-3 transition-colors ${iconColor}`}
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
                    <p className="text-base-content font-medium">Drop JSON files here</p>
                    <p className="text-sm text-base-content/60 mt-2">or click to browse</p>
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
