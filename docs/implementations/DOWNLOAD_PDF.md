# Download as PDF (via `window.print()`)

Zero-dependency PDF download using the browser's native print dialog.

**1. Trigger button:**
```jsx
<button type="button" onClick={() => window.print()}>
  Download as PDF
</button>
```

**2. The `no-print` utility class** — hide interactive elements when printing:
```css
@media print {
  .no-print {
    display: none !important;
  }
}
```

Apply `className="no-print"` to: navigation bars, action buttons, footers, modals, tooltips, debug overlays.

**3. Print-friendly CSS overrides:**
```css
@media print {
  body {
    background: white !important;
    color: black !important;
  }
  a {
    color: black !important;
    text-decoration: underline !important;
  }
  section {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
```
