#!/usr/bin/env node
/**
 * Post-build script: creates admin.html from index.html
 * - Swaps manifest.json → admin-manifest.json
 * - Injects a script that sets hash to #/admin before React loads
 * - Changes title and apple-mobile-web-app-title
 */
const fs = require('fs');
const path = require('path');

const buildDir = path.join(__dirname, '..', 'build');
const indexPath = path.join(buildDir, 'index.html');
const adminPath = path.join(buildDir, 'admin.html');

let html = fs.readFileSync(indexPath, 'utf8');

// 1. Swap manifest (handle absolute path, non-greedy, force cache bust)
html = html.replace(/href="\/[^"]*\/manifest.json"/, 'href="/ZenaideSImoes/admin-manifest.json?v=2"');

// 2. Change title
html = html.replace('<title>Zenaide Simoes</title>', '<title>Admin - Zenaide Simões</title>');

// 3. Change apple-mobile-web-app-title
html = html.replace(
  'content="Zenaide Simões"',
  'content="Admin Zenaide"'
);

// 4. Change theme-color
html = html.replace(
  'content="#fafaf9"',
  'content="#ffffff"'
);

// 5. Change status-bar-style (ensure black text)
html = html.replace(
  'content="black-translucent"',
  'content="default"'
);

// 5. Inject admin route script BEFORE closing </head>
// This sets the hash to #/admin BEFORE any React scripts load
const adminScript = `
<script>
  // Admin PWA: set hash to /admin before React loads
  if (!window.location.hash || window.location.hash === '#/' || window.location.hash === '#') {
    window.location.hash = '/admin';
  }
</script>
`;
html = html.replace('</head>', adminScript + '</head>');

fs.writeFileSync(adminPath, html, 'utf8');
console.log('✅ admin.html created from index.html');
