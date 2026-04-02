/**
 * repo-tor embed helper — auto-resizes iframes containing embedded charts.
 *
 * Usage: add this script to any page that embeds repo-tor charts:
 *   <script src="https://repo-tor.vercel.app/embed.js"></script>
 *
 * The script listens for resize messages from embedded iframes and adjusts
 * their height automatically. No other setup required.
 */
(function () {
  'use strict';

  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'repo-tor:resize') return;

    var height = event.data.height;
    if (typeof height !== 'number' || height <= 0 || height > 50000) return;

    // Requirement: Validate message source matches an iframe on this page
    // Approach: Match event.source against iframe contentWindow before acting.
    //   This ensures only messages from our own embedded iframes trigger resizes.
    // Alternatives:
    //   - Check event.origin: Rejected — embed URL varies per deployment
    //   - Accept any message: Rejected — other scripts could trigger unwanted resizes
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === event.source) {
        iframes[i].style.height = height + 'px';
        break;
      }
    }
  });
})();
