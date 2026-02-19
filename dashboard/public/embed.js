/**
 * repo-tor embed helper — auto-resizes iframes containing embedded charts.
 *
 * Usage: add this script to any page that embeds repo-tor charts:
 *   <script src="https://devmade-ai.github.io/repo-tor/embed.js"></script>
 *
 * The script listens for resize messages from embedded iframes and adjusts
 * their height automatically. No other setup required.
 */
(function () {
  'use strict';

  window.addEventListener('message', function (event) {
    if (!event.data || event.data.type !== 'repo-tor:resize') return;

    var height = event.data.height;
    if (typeof height !== 'number' || height <= 0) return;

    // Find which iframe sent this message and resize it
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      if (iframes[i].contentWindow === event.source) {
        iframes[i].style.height = height + 'px';
        break;
      }
    }
  });
})();
