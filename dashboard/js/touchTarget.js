/**
 * Coarse-pointer hit size and field text size.
 *
 * Requirement: On a touch screen, controls are at least 44 by 44 CSS pixels
 *   and editable text is at least 16px. A fine pointer keeps the compact
 *   DaisyUI size.
 * Approach: Tailwind's `pointer-coarse` variant. `min-h-11` / `min-w-11`
 *   are 2.75rem (44px). `text-base` is 16px. No new CSS class and no
 *   arbitrary bracket value.
 * Alternatives:
 *   - Always 44px: Rejected — fine-pointer screens stay compact.
 *   - A custom `@media (pointer: coarse)` class: Rejected — the vanilla
 *     policy forbids a new class, and the variant already exists.
 */

export const COARSE_HIT = 'pointer-coarse:min-h-11 pointer-coarse:min-w-11';
export const COARSE_FIELD = 'pointer-coarse:min-h-11 pointer-coarse:text-base';
