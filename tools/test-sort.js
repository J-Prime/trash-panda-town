const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../src/sort.js', 'utf8');
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const Sort = new Function('shuffle', src + ';return Sort')(shuffle);
for (const [c, e] of [[3, 2], [6, 2], [9, 2], [12, 2], [9, 1], [10, 1], [11, 1], [12, 1]]) {
  let ok = 0, t = Date.now(); const N = 20;
  for (let i = 0; i < N; i++) if (Sort._gen(c, e)) ok++;
  console.log(`cols ${c} empties ${e}: ${ok}/${N} generated, ${((Date.now() - t) / N).toFixed(0)}ms avg`);
}
