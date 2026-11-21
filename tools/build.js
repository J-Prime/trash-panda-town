// Concatenates src/ into the single-file index.html.
const fs = require('fs'), path = require('path');
const src = f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8');
const JS = ['core.js', 'sound.js', 'meta.js', 'forest.js', 'map.js', 'app.js', 'pop-engine.js', 'pop.js', 'kitchen.js', 'stack.js', 'bingo.js', 'sort.js', 'boot.js'];
// Each build gets an id; version.json lets installed copies notice a newer one. src/note.txt is the "what's new" line.
const BUILD = new Date().toISOString().slice(0, 19).replace(/[-:T]/g, '');
const note = fs.existsSync(path.join(__dirname, '../src/note.txt')) ? src('note.txt').trim() : '';
const out = [
  // Standalone hosting needs these; the Artifact skeleton would add them itself.
  '<!doctype html>\n<html lang="en">\n<meta charset="utf-8">',
  src('head.html').trim(),
  '<style>', src('base.css').trim(), src('v2.css').trim(), '</style>',
  src('body.html').trim(),
  '<script>', "(() => {\n'use strict';", `const BUILD = '${BUILD}';`, ...JS.map(src), '})();', '</script>', '',
].join('\n');
fs.writeFileSync(path.join(__dirname, '../index.html'), out);
fs.writeFileSync(path.join(__dirname, '../version.json'), JSON.stringify({ build: BUILD, note }) + '\n');
fs.writeFileSync('/tmp/tpt-script.js', "(() => {\n'use strict';\nconst BUILD = '';\n" + JS.map(src).join('\n') + '\n})();');
console.log('index.html', (out.length / 1024).toFixed(1) + ' KB', 'build ' + BUILD);
