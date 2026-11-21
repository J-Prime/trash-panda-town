/* =====================================================================
   Mossy Hollow: the second region, unlocked by finishing the alley.
   ===================================================================== */
const FOREST = [
  { id: 'hollow', name: 'Hollow door', cost: 8, k: 'stack', ask: 'The storm split the old oak\'s hollow wide open. Let\'s patch it with a proper round door before the rain comes back.', thanks: 'Snug and dry. Willow says it\'s the best door the oak has ever had.' },
  { id: 'jars', name: 'Firefly jars', cost: 9, k: 'sort', ask: 'The fireflies here are shinier than anything in the city! Jars on the branch would let them glow there, and they can fly off whenever they like.', thanks: 'Living lights! I left the lids loose so they can come and go.' },
  { id: 'stools', name: 'Mushroom stools', cost: 10, k: 'pop', ask: 'Moss says the storm squashed all the mushroom stools. We need new ones for snack time!', thanks: 'Spotty, squishy and just the right height for snacking.' },
  { id: 'berries', name: 'Berry bushes', cost: 10, k: 'merge', ask: 'No bins out here means no leftovers. If we plant berry bushes I can still cook for everyone.', thanks: 'Blueberries and raspberries. Forest pie is back on the menu.' },
  { id: 'hammock', name: 'Leaf hammock', cost: 11, k: 'bingo', ask: 'My old bones miss the crate sofa. A leafy hammock between those two birches would suit me nicely.', thanks: 'Ahh. I might never get up again, dear. Wake me for bingo.' },
  { id: 'stones', name: 'Stepping stones', cost: 12, k: 'pop', ask: 'The creek is too wide to jump. Stepping stones, so I can get across without a bath!', thanks: 'Hop, hop, hop... dry paws! Well, mostly dry.' },
  { id: 'table', name: 'Log table', cost: 13, k: 'merge', ask: 'A proper log table, so we can all eat together instead of off our laps.', thanks: 'Pie for everyone! Moss has already spilled his.' },
  { id: 'swing', name: 'Rope swing', cost: 14, k: 'pop', ask: 'That branch is PERFECT for a rope swing. Willow said she had one when she was little!', thanks: 'Wheeeee! I can nearly touch the leaves!' },
  { id: 'flowers', name: 'Wildflower patch', cost: 15, k: 'sort', ask: 'The storm flattened every wildflower. Let\'s plant new ones in every colour.', thanks: 'Red, yellow, purple and blue. It\'s like a jar of trinkets, but growing.' },
  { id: 'lookout', name: 'Treetop lookout', cost: 16, k: 'stack', ask: 'In the city I watched for the garbage truck. Out here I\'ll watch for storms. I need a lookout up in the oak.', thanks: 'I can see clouds coming from miles away. Nobody gets caught in the rain on my watch.' },
  { id: 'oven', name: 'Clay oven', cost: 17, k: 'merge', ask: 'Berries are lovely, but I need an oven. A clay one, with a chimney. Then I can bake.', thanks: 'Fresh bread in the forest. Smell that, everyone!' },
  { id: 'glowcaps', name: 'Glowcap path', cost: 18, k: 'bingo', ask: 'These old eyes can\'t see the path at night. Willow knows a mushroom that glows. Could we plant a row?', thanks: 'A glowing path, right to the door. I\'ll never trip on a root again.' },
  { id: 'wheel', name: 'Waterwheel', cost: 19, k: 'stack', ask: 'A waterwheel on the creek could grind acorns into flour for Rosie. Work smarter, not harder.', thanks: 'Round and round. Rosie has more flour than she knows what to do with.' },
  { id: 'chimes', name: 'Wind chimes', cost: 20, k: 'sort', ask: 'I\'ve saved my shiniest spoons and keys. Hung on a branch, they\'d sing every time the wind blows.', thanks: 'Listen! Tink, tink, tinkle. The whole forest can hear my collection now.' },
  { id: 'skylanterns', name: 'Lantern festival', cost: 22, k: 'bingo', ask: 'One last thing, dear. A lantern festival, so the city crew and the forest crew can celebrate together.', thanks: 'Look at them float. Two homes, one big family. Thank you, for everything.' },
];

function forestSVG(freshId) {
  const ink = '#2a2640', has = id => built(id), cls = id => `pj${id === freshId ? ' new' : ''}`;
  const bark = '#6b4a33', leaf = '#2c6743', leaf2 = '#3a7f52';
  let s = `<svg viewBox="0 0 360 230" role="img" aria-label="Mossy Hollow: ${builtIn(FOREST)} of ${FOREST.length} projects built">
  <defs>
    <linearGradient id="fsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1d22"/><stop offset="1" stop-color="#16382f"/></linearGradient>
    <radialGradient id="ffly"><stop offset="0" stop-color="#e9ff8f" stop-opacity=".85"/><stop offset="1" stop-color="#e9ff8f" stop-opacity="0"/></radialGradient>
    <radialGradient id="fwarm"><stop offset="0" stop-color="#ffb547" stop-opacity=".5"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient>
    <radialGradient id="fcyan"><stop offset="0" stop-color="#7ff0e6" stop-opacity=".55"/><stop offset="1" stop-color="#7ff0e6" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="360" height="230" fill="url(#fsky)"/>
  ${[[22, 18], [64, 10], [120, 6], [262, 12], [286, 40], [340, 58], [12, 62]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 2 ? 1.1 : 1.6}" fill="#fff3d6" class="tw"/>`).join('')}
  <circle cx="318" cy="28" r="15" fill="#fff3d6"/><circle cx="325" cy="23" r="13" fill="#0c1f23"/>`;
  // Two rows of pines behind the clearing.
  let far = '', near = '';
  for (let x = -10, i = 0; x < 370; x += 22, i++) far += `<path d="M${x} 150 L${x + 14} ${92 + (i * 37) % 26} L${x + 28} 150Z"/>`;
  for (let x = -20, i = 0; x < 370; x += 30, i++) near += `<path d="M${x} 168 L${x + 18} ${108 + (i * 53) % 30} L${x + 36} 168Z"/>`;
  s += `<g fill="#12302a">${far}</g><g fill="#173d31">${near}</g>`;
  s += `<path d="M0 174 Q90 166 180 172 T360 170 V230 H0Z" fill="#1f4a36"/><path d="M0 206 Q100 198 200 206 T360 204 V230 H0Z" fill="#1a3f2e"/>
    <path d="M160 176 Q150 200 176 230 L204 230 Q182 200 184 176Z" fill="#3a5a3a" opacity=".7"/>
    <path d="M246 230 Q268 204 312 198 T360 186 V204 Q330 210 304 216 T282 230Z" fill="#3f7fb0"/><path d="M276 222 Q290 210 312 207 M318 202 Q336 198 352 193" stroke="#b9d6ff" stroke-width="1.6" fill="none" opacity=".6"/>`;
  // Two young birches on the right hold the hammock.
  s += `<rect x="296" y="92" width="7" height="88" fill="#e9e2d0" stroke="${ink}" stroke-width="1.5"/><rect x="343" y="86" width="7" height="92" fill="#e9e2d0" stroke="${ink}" stroke-width="1.5"/>
    <path d="M297 110h4M297 132h5M344 104h4M344 126h5M344 150h4M297 156h4" stroke="${ink}" stroke-width="1.5"/>
    <circle cx="300" cy="84" r="18" fill="${leaf}"/><circle cx="292" cy="94" r="11" fill="${leaf2}"/><circle cx="347" cy="78" r="18" fill="${leaf}"/><circle cx="356" cy="90" r="11" fill="${leaf2}"/>`;
  // The great oak.
  s += `<path d="M66 74 Q110 80 150 92 L148 104 Q108 90 66 82Z" fill="${bark}" stroke="${ink}" stroke-width="2"/><path d="M190 86 Q232 72 282 66 L282 74 Q234 82 192 100Z" fill="${bark}" stroke="${ink}" stroke-width="2"/>
    <path d="M130 190 Q146 176 148 130 L146 58 L194 58 L192 130 Q194 176 210 190Z" fill="${bark}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M158 70 Q156 100 160 120 M182 74 Q186 96 182 112 M160 168 Q164 180 156 188" stroke="#553a28" stroke-width="2" fill="none"/>
    ${[[108, 34, 32], [150, 22, 36], [196, 20, 36], [240, 34, 30], [170, 50, 28], [78, 56, 20], [266, 56, 20], [126, 58, 20], [218, 56, 22]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${leaf}"/>`).join('')}
    ${[[100, 26, 14], [146, 12, 15], [198, 10, 15], [242, 26, 12], [82, 50, 8], [262, 50, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${leaf2}"/>`).join('')}
    <ellipse cx="170" cy="150" rx="14" ry="20" fill="#1a120c"/>`;
  if (has('hollow')) s += `<g class="${cls('hollow')}"><ellipse cx="170" cy="150" rx="15" ry="21" fill="#b07a45" stroke="${ink}" stroke-width="2.2"/><path d="M162 132V168M170 129V171M178 132V168" stroke="#8a5a30" stroke-width="1.6"/><circle cx="170" cy="142" r="4.5" fill="#ffd486" stroke="${ink}" stroke-width="1.5"/><circle cx="179" cy="154" r="2" fill="#ffd23f" stroke="${ink}" stroke-width="1"/></g>`;
  else s += `<path d="M162 118 L170 130 L166 136 L174 146 M178 112 L176 126" stroke="#1a120c" stroke-width="2.5" fill="none"/><path d="M12 200 L56 191 L57 197 L14 206Z" fill="${bark}" stroke="${ink}" stroke-width="2"/><circle cx="20" cy="196" r="7" fill="${leaf}"/><circle cx="30" cy="192" r="5" fill="${leaf2}"/>`;
  if (has('lookout')) s += `<g class="${cls('lookout')}"><path d="M226 40 L250 22 L274 40Z" fill="#c46a4a" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/><rect x="230" y="40" width="40" height="24" fill="#a8743f" stroke="${ink}" stroke-width="2"/><rect x="243" y="45" width="14" height="11" rx="2" fill="#ffd486" stroke="${ink}" stroke-width="1.5"/><rect x="224" y="63" width="52" height="5" rx="1.5" fill="#8a5a30" stroke="${ink}" stroke-width="1.5"/>
    <path d="M196 68 V124 M204 68 V124 M196 78H204M196 90H204M196 102H204M196 114H204" stroke="#c9a06a" stroke-width="1.8"/></g>`;
  if (has('swing')) s += `<g class="${cls('swing')}"><g class="sway"><path d="M234 78 V138 M252 76 V138" stroke="#c9a06a" stroke-width="1.8"/><rect x="228" y="136" width="30" height="5" rx="2" fill="#8a5a30" stroke="${ink}" stroke-width="1.5"/></g></g>`;
  if (has('jars')) s += `<g class="${cls('jars')}">${[[84, 94], [104, 98], [124, 100]].map(([x, y], i) => `<path d="M${x} ${y - 16}V${y - 8}" stroke="#c9a06a" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="14" fill="url(#ffly)" class="tw" style="animation-delay:${i * .5}s"/><rect x="${x - 5}" y="${y - 8}" width="10" height="14" rx="3" fill="rgba(233,255,143,.35)" stroke="#e9e2d0" stroke-width="1.5"/><rect x="${x - 4}" y="${y - 10}" width="8" height="3" rx="1" fill="#8d95ab"/><circle cx="${x}" cy="${y}" r="2" fill="#f4ffb8"/>`).join('')}</g>`;
  if (has('chimes')) s += `<g class="${cls('chimes')}"><g class="sway" style="animation-delay:-.7s;transform-origin:70px 80px"><path d="M70 80V88M62 88H78" stroke="#c9a06a" stroke-width="1.5"/>${[[63, 14], [67.5, 20], [72, 16], [76.5, 11]].map(([x, l]) => `<path d="M${x} 88V${88 + l}" stroke="#e9e2d0" stroke-width="2.4" stroke-linecap="round"/>`).join('')}<path d="M70 88 V112" stroke="#c9a06a" stroke-width="1"/><path d="M70 110l2.4 4.8 5.2.7-3.8 3.6.9 5.2-4.7-2.5-4.7 2.5.9-5.2-3.8-3.6 5.2-.7z" fill="#ffd23f" stroke="${ink}" stroke-width="1" transform="translate(0 -3) scale(1)"/></g></g>`;
  if (has('hammock')) s += `<g class="${cls('hammock')}"><path d="M300 116 Q322 148 346 112 Q322 136 300 116Z" fill="#79c27a" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/><path d="M306 122 Q322 140 340 120" stroke="#4aa86a" stroke-width="1.5" fill="none"/></g>`;
  if (has('berries')) s += `<g class="${cls('berries')}"><circle cx="20" cy="170" r="17" fill="#2f7a4a" stroke="${ink}" stroke-width="2"/><circle cx="44" cy="174" r="14" fill="#3a8a55" stroke="${ink}" stroke-width="2"/><circle cx="8" cy="180" r="10" fill="#357f4e" stroke="${ink}" stroke-width="2"/>
    ${[[14, 164, '#5b6cff'], [24, 172, '#ff4f6a'], [30, 160, '#5b6cff'], [42, 168, '#ff4f6a'], [50, 178, '#5b6cff'], [10, 176, '#ff4f6a'], [36, 180, '#5b6cff']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${c}"/>`).join('')}</g>`;
  if (has('table')) s += `<g class="${cls('table')}"><rect x="70" y="178" width="7" height="14" fill="#8a5a30" stroke="${ink}" stroke-width="1.5"/><rect x="120" y="178" width="7" height="14" fill="#8a5a30" stroke="${ink}" stroke-width="1.5"/><ellipse cx="98" cy="176" rx="34" ry="7" fill="#c9a06a" stroke="${ink}" stroke-width="2"/><ellipse cx="98" cy="176" rx="22" ry="4" fill="none" stroke="#a8743f" stroke-width="1.2"/><text x="90" y="176" text-anchor="middle" font-size="12">🥧</text><text x="112" y="175" text-anchor="middle" font-size="9">🫖</text></g>`;
  if (has('oven')) s += `<g class="${cls('oven')}"><ellipse cx="272" cy="176" rx="28" ry="16" fill="url(#fwarm)"/><path d="M250 188 Q250 152 272 150 Q294 152 294 188Z" fill="#c4774a" stroke="${ink}" stroke-width="2"/><path d="M262 188 Q262 172 272 171 Q282 172 282 188Z" fill="#ff9a5c" stroke="${ink}" stroke-width="1.5"/><path d="M266 188 Q268 180 272 179 Q276 180 278 188Z" fill="#ffd23f"/><rect x="282" y="140" width="7" height="14" fill="#a8603a" stroke="${ink}" stroke-width="1.5"/>
    <g class="smoke"><circle cx="286" cy="132" r="4" fill="#e9e2d0" opacity=".35"/><circle cx="290" cy="122" r="5" fill="#e9e2d0" opacity=".22"/></g></g>`;
  if (has('stools')) s += `<g class="${cls('stools')}">${[[214, 184, 12], [238, 188, 10]].map(([x, y, r]) => `<rect x="${x - 4}" y="${y - 8}" width="8" height="10" rx="2" fill="#f1e6d2" stroke="${ink}" stroke-width="1.5"/><path d="M${x - r} ${y - 7} Q${x} ${y - 7 - r * 1.4} ${x + r} ${y - 7}Z" fill="#e2483d" stroke="${ink}" stroke-width="1.8"/><circle cx="${x - r * .4}" cy="${y - 11}" r="1.8" fill="#fff"/><circle cx="${x + r * .35}" cy="${y - 13}" r="1.5" fill="#fff"/>`).join('')}</g>`;
  if (has('stones')) s += `<g class="${cls('stones')}">${[[272, 220, 8], [292, 211, 7.5], [314, 205, 7], [336, 198, 6.5]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * .5}" fill="#9aa3b5" stroke="${ink}" stroke-width="1.5"/>`).join('')}</g>`;
  if (has('wheel')) s += `<g class="${cls('wheel')}"><rect x="352" y="176" width="8" height="28" fill="#8a5a30" stroke="${ink}" stroke-width="1.5"/><g class="spin"><circle cx="340" cy="196" r="16" fill="none" stroke="#a8743f" stroke-width="4"/>${[0, 45, 90, 135].map(a => `<path d="M340 196 m${(16 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(16 * Math.sin(a * Math.PI / 180)).toFixed(1)} L${(340 - 16 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(196 - 16 * Math.sin(a * Math.PI / 180)).toFixed(1)}" stroke="#a8743f" stroke-width="2.5"/>`).join('')}<circle cx="340" cy="196" r="3" fill="${ink}"/></g></g>`;
  if (has('flowers')) s += `<g class="${cls('flowers')}">${[[8, 214], [22, 222], [34, 210], [48, 220], [62, 213], [76, 223], [92, 214], [108, 222], [122, 212], [136, 222]].map(([x, y], i) => `<path d="M${x} 230 V${y}" stroke="#4aa86a" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="3.6" fill="${['#ff7096', '#ffd23f', '#b994ff', '#6fa8ff', '#ff9a5c'][i % 5]}"/><circle cx="${x}" cy="${y}" r="1.2" fill="#fff3d6"/>`).join('')}</g>`;
  if (has('glowcaps')) s += `<g class="${cls('glowcaps')}">${[[154, 190], [196, 188], [148, 206], [208, 204], [144, 222], [218, 222]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="10" fill="url(#fcyan)" class="tw" style="animation-delay:${i * .3}s"/><rect x="${x - 1.2}" y="${y - 2}" width="2.4" height="6" fill="#d9fff9"/><path d="M${x - 5} ${y - 1} Q${x} ${y - 9} ${x + 5} ${y - 1}Z" fill="#7ff0e6" stroke="#2f8c84" stroke-width="1"/>`).join('')}</g>`;
  if (has('skylanterns')) {
    s += `<g class="${cls('skylanterns')}">${[[40, 40, 0], [92, 70, 1.4], [236, 30, .7], [270, 78, 2.1], [150, 14, 2.8], [330, 110, 1.1], [20, 96, 3.3]].map(([x, y, d]) =>
      `<g class="float" style="animation-delay:-${d}s"><ellipse cx="${x}" cy="${y + 6}" rx="12" ry="14" fill="url(#fwarm)"/><path d="M${x - 5} ${y} h10 l-1.5 12 h-7z" fill="#ff9a5c" stroke="#b8501c" stroke-width="1"/><rect x="${x - 3}" y="${y + 9}" width="6" height="3" fill="#ffd23f"/></g>`).join('')}</g>`;
  }
  if (has('jars')) s += [[30, 130], [240, 110], [130, 120]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2" fill="#f4ffb8" class="tw" style="animation-delay:${i * .8}s"/>`).join('');
  // The crew, plus Willow and Moss who live here.
  const pos = {
    sort: [12, 124, 38], merge: [62, 136, 38], stack: has('lookout') ? [234, 4, 30] : [108, 140, 40],
    pop: has('swing') ? [224, 104, 36] : [206, 138, 40], bingo: has('hammock') ? [304, 94, 38] : [300, 146, 38],
  };
  for (const k of ['sort', 'merge', 'stack', 'pop', 'bingo']) { const [x, y, z] = pos[k]; s += coonSVG(CREW[k].fur, CREW[k].acc, z, x, y); }
  s += coonSVG(CREW.willow.fur, 'flower', 36, 112, 186) + coonSVG(CREW.moss.fur, 'acorn', 32, 226, 192);
  if (!has('hollow')) s += `<rect width="360" height="230" fill="#05100c" opacity=".3"/>`;
  return s + '</svg>';
}

/* ---------- the trip from the alley to the forest ---------- */
function tripCity(forest) {
  // A walking shot: the background pans left while the crew bobs along to the right.
  const sky = forest ? ['#0b1d22', '#1b4436'] : ['#15122f', '#3a2f6b'];
  let back = '';
  if (!forest) {
    for (let x = 0, i = 0; x < 760; x += 34, i++) {
      const hgt = 60 + (i * 47) % 70, top = 176 - hgt;
      back += `<rect x="${x}" y="${top}" width="30" height="${hgt}" fill="${i % 2 ? '#241f4a' : '#2c2657'}"/>`;
      for (let wy = top + 8; wy < 166; wy += 14) for (let wx = x + 5; wx < x + 26; wx += 9) if ((wx * 7 + wy * 3 + i) % 5 < 2) back += `<rect x="${wx}" y="${wy}" width="5" height="6" fill="#ffd486" opacity=".8"/>`;
    }
    back += [140, 420, 700].map(x => `<rect x="${x}" y="110" width="4" height="70" fill="#5a5486"/><path d="M${x + 2} 112 q0 -8 10 -8" stroke="#5a5486" stroke-width="4" fill="none"/><ellipse cx="${x + 14}" cy="106" rx="4" ry="2.4" fill="#ffd486"/><ellipse cx="${x + 14}" cy="150" rx="30" ry="40" fill="url(#tglow)"/>`).join('');
    // The last few city blocks give way to trees at the far end of the pan.
    for (let x = 560, i = 0; x < 780; x += 26, i++) back += `<path d="M${x} 178 L${x + 14} ${118 + (i * 31) % 24} L${x + 28} 178Z" fill="#1c3b34" opacity="${Math.min(1, (x - 540) / 200)}"/>`;
  } else {
    for (let x = -10, i = 0; x < 780; x += 22, i++) back += `<path d="M${x} 176 L${x + 14} ${96 + (i * 37) % 30} L${x + 28} 176Z" fill="#12302a"/>`;
    for (let x = -20, i = 0; x < 780; x += 34, i++) back += `<path d="M${x} 182 L${x + 20} ${110 + (i * 53) % 34} L${x + 40} 182Z" fill="#183f32"/>`;
    for (let i = 0; i < 18; i++) back += `<circle cx="${(i * 97) % 760}" cy="${90 + (i * 41) % 80}" r="2" fill="#f4ffb8" class="tw" style="animation-delay:${(i % 6) * .4}s"/>`;
    back += `<path d="M0 214 Q120 204 240 212 T480 210 T760 212 V230 H0Z" fill="#3f7fb0" opacity=".85"/>`;
  }
  const road = forest ? '#2a4a34' : '#201c40', crew = ['bingo', 'sort', 'pop', 'merge', 'stack'];
  let walkers = crew.map((k, i) => `<g class="bob" style="animation-delay:${i * .13}s">${coonSVG(CREW[k].fur, CREW[k].acc, 40, 40 + i * 46, 146)}</g>`).join('');
  // Bandit pushes the shopping cart with everything they own in it.
  walkers += `<g class="bob" style="animation-delay:.3s"><path d="M268 150 h62 l-8 32 h-48z" fill="none" stroke="#c9cfe0" stroke-width="2.5"/><path d="M272 160h56M274 170h50M286 150v32M300 150v32M314 150v32" stroke="#c9cfe0" stroke-width="1.2"/>
    <path d="M268 150 l-10 -6" stroke="#c9cfe0" stroke-width="3" stroke-linecap="round"/><circle cx="280" cy="188" r="5" fill="${'#2a2640'}"/><circle cx="318" cy="188" r="5" fill="#2a2640"/>
    <text x="272" y="160" font-size="20">🧺</text><text x="292" y="156" font-size="22">🛋️</text><text x="312" y="160" font-size="17">🍳</text><text x="284" y="138" font-size="13">✨</text></g>`;
  return `<svg viewBox="0 0 360 230" role="img" aria-label="${forest ? 'The crew walks along a forest path' : 'The crew walks out of the city'}">
    <defs><linearGradient id="tsky${forest ? 'f' : 'c'}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <radialGradient id="tglow"><stop offset="0" stop-color="#ffb547" stop-opacity=".3"/><stop offset="1" stop-color="#ffb547" stop-opacity="0"/></radialGradient></defs>
    <rect width="360" height="230" fill="url(#tsky${forest ? 'f' : 'c'})"/>
    ${forest ? '<circle cx="300" cy="40" r="14" fill="#fff3d6"/><circle cx="307" cy="35" r="12" fill="#0d2024"/>' : '<circle cx="300" cy="40" r="15" fill="#fff3d6"/><circle cx="300" cy="40" r="26" fill="#fff3d6" opacity=".1"/>'}
    <g class="pan">${back}</g>
    <rect x="0" y="178" width="360" height="52" fill="${road}"/>${forest ? '<path d="M0 196 Q180 188 360 196 V214 Q180 206 0 214Z" fill="#4a4630" opacity=".7"/>' : '<g class="pan"><path d="M0 204 H760" stroke="#5a5486" stroke-width="3" stroke-dasharray="18 16"/></g>'}
    ${walkers}</svg>`;
}
function pigeonSVG() {
  return `<g class="flyin"><ellipse cx="134" cy="52" rx="9" ry="6" fill="#9aa3b5" stroke="#2a2640" stroke-width="1.5"/><circle cx="142" cy="46" r="4.5" fill="#8d95ab" stroke="#2a2640" stroke-width="1.5"/><path d="M146 46 l4 1.4 -4 1.4z" fill="#ffb547"/><circle cx="143" cy="45" r="1" fill="#2a2640"/>
    <path d="M128 50 q6 -10 12 -2" fill="#c9cfe0" stroke="#2a2640" stroke-width="1.2"/><path d="M148 47 q8 2 6 8 q-6 -2 -6 -8z" fill="#79c27a" stroke="#2a2640" stroke-width="1"/></g>`;
}
function playTrip(onDone) {
  const alley = () => sceneSVG(null);
  const shots = [
    { k: 'bingo', bg: '#1b1836', art: alley, text: 'Look at this place. A lamp, a red door, a fire to sit around. This alley is a real home now.' },
    { k: 'stack', bg: '#1b1836', art: () => alley().replace(/<\/svg>$/, pigeonSVG() + '</svg>'), text: 'Hold on. A pigeon just landed on the lamp. It\'s got a leaf in its beak, with writing scratched on it.' },
    { k: 'sort', bg: '#1d2238', art: () => `<div class="letter"><p>Dear city cousins,</p><p>A big storm blew through Mossy Hollow. The old oak cracked open, our stools and swing blew away, and the little ones are scared.</p><p>We hear you are good at fixing things. Could you come?</p><p class="sig">Love, Willow 🍂</p></div>`, bare: true, text: 'It\'s from cousin Willow in the forest! And look, she drew a map on the back.' },
    { k: 'stack', bg: '#1f2440', art: () => tripCity(false), text: 'Everyone pack your things. Rosie, bring snacks. We leave tonight.' },
    { k: 'pop', bg: '#12302a', art: () => tripCity(true), text: 'We followed the creek past the last streetlamp, and now there are trees everywhere! Are we nearly there?' },
    { k: 'willow', bg: '#102620', art: () => forestSVG(null), text: 'You came! Welcome to Mossy Hollow. It\'s a mess after the storm, but I know we can fix it together.' },
  ];
  playCine(shots, 'Tap to move in', onDone);
}
