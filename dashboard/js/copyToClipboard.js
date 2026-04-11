/**
 * Clipboard utility with multiple fallbacks.
 *
 * Requirement: Copy text to clipboard across all browsers and PWA webviews
 * Approach: Three-tier fallback — ClipboardItem Blob (works when writeText is blocked),
 *   writeText (standard API), textarea (mobile PWA webviews where Clipboard API fails).
 * Alternatives:
 *   - writeText only: Rejected — blocked in some PWA webview contexts
 *   - Third-party clipboard library: Rejected — adds dependency for 15 lines of code
 *
 * See: glow-props docs/implementations/DEBUG_SYSTEM.md (Clipboard Utilities)
 */

/**
 * Copy text to clipboard with multiple fallbacks.
 * @param {string} text
 * @returns {Promise<boolean>} true if copy succeeded
 */
export async function copyToClipboard(text) {
    // Method 1: ClipboardItem Blob — works in contexts where writeText is blocked
    try {
        const blob = new Blob([text], { type: 'text/plain' });
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
        return true;
    } catch { /* fall through */ }

    // Method 2: writeText
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch { /* fall through */ }

    // Method 3: Textarea fallback for mobile PWA webviews
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    } catch { return false; }
}
