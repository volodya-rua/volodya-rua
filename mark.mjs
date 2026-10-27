// The small signature at the top of my profile (and a matching avatar of its V): my name in Fraunces, outlined to paths
// (an SVG shown through <img> can't load fonts). In dark mode a slow band of light passes through the letters now and
// then and glows onto the black; in light mode it rests, crisp and still.
//   node mark.mjs → assets/mark.svg, out/avatar.svg (and out/avatar.png with SHARP=1)
import * as fontkit from 'fontkit';
import fs from 'node:fs';

const env = (k, d) => (process.env[k] === undefined ? d : +process.env[k]);
const AXES = { opsz: 144, wght: env('WGHT', 560), SOFT: env('SOFT', 100), WONK: 0 };
const font = fontkit.openSync('fonts/Fraunces.ttf').getVariation(AXES);
const r1 = n => String(Math.round(n * 10) / 10);

// outline a word at its place on the line (font units, y up), flipped to SVG (y down); returns path data and ink box
function outline(text) {
  const run = font.layout(text);
  let x = 0, d = '', b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  run.glyphs.forEach((g, i) => {
    const p = run.positions[i], path = g.path.translate(x + p.xOffset, p.yOffset), q = path.bbox;
    b = { minX: Math.min(b.minX, q.minX), maxX: Math.max(b.maxX, q.maxX), minY: Math.min(b.minY, q.minY), maxY: Math.max(b.maxY, q.maxY) };
    d += path.scale(1, -1).toSVG();
    x += p.xAdvance;
  });
  return { d: d.replace(/-?\d+(\.\d+)?(e-?\d+)?/g, n => r1(+n)), b };
}

// the light: a soft band, slanted, sliding left to right; a blurred copy of it, clipped to the letters, glows outward
function svgFor({ text, padX, padTop, padBottom, base, dark, animated, still, displayW }) {
  const { d, b } = outline(text);
  const w = Math.ceil(b.maxX - b.minX + padX * 2), h = Math.ceil(b.maxY - b.minY + padTop + padBottom);
  const tx = padX - b.minX, ty = padTop + b.maxY;
  const band = Math.round(w * 0.3), skew = Math.tan(18 * Math.PI / 180) * h;
  const from = 0, to = Math.round(w + band * 1.1 + skew);           // from fully off the left edge to fully off the right
  const rect = `<rect class="beam" x="${-band - Math.round(skew)}" y="0" width="${band}" height="${h}" fill="url(#g)"${still !== undefined ? ` transform="translate(${Math.round(still * (to - from))} 0)"` : ''}/>`;
  const css = animated ? `
  .n { fill: ${base}; }
  .beam { opacity: 0; }
  @media (prefers-color-scheme: dark) { .n { fill: ${dark}; } }
  @media (prefers-color-scheme: dark) and (prefers-reduced-motion: no-preference) {
    .beam { opacity: 1; animation: pass 8s cubic-bezier(.45, 0, .2, 1) infinite; }
  }
  @keyframes pass { 0%, 18% { transform: translateX(${from}px); } 58%, 100% { transform: translateX(${to}px); } }` : `\n  .n { fill: ${base}; }`;
  const dispH = Math.round(displayW * h / w);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${displayW}" height="${dispH}" role="img" aria-label="${text}">
<title>${text}</title>
<style>${css}
</style>
<defs>
  <path id="n" transform="translate(${r1(tx)} ${r1(ty)})" d="${d}"/>
  <clipPath id="c"><use href="#n"/></clipPath>
  <linearGradient id="g" x1="0" x2="1" y1="0" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
  <filter id="f" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="${Math.round(h * 0.06)}"/></filter>
</defs>
<use href="#n" class="n"/>
<g filter="url(#f)" opacity=".6"><g clip-path="url(#c)"><g transform="skewX(-18)">${rect}</g></g></g>
<g clip-path="url(#c)"><g transform="skewX(-18)">${rect}</g></g>
</svg>
`;
}

fs.mkdirSync('assets', { recursive: true }); fs.mkdirSync('out', { recursive: true });
// the signature: grey that reads on white AND on dark (in case a viewer reports the wrong theme), lighter in dark mode
fs.writeFileSync('assets/mark.svg', svgFor({ text: process.env.NAME || 'Volodya', padX: 420, padTop: 900, padBottom: 520, base: '#59636e', dark: '#c9d1d9', animated: true, displayW: 240 }));
// the avatar: the V alone, on the dark of GitHub's page, with the light frozen mid-pass
const v = svgFor({ text: 'V', padX: 0, padTop: 0, padBottom: 0, base: '#e6edf3', animated: false, still: 0.42, displayW: 100 });
const inner = v.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
const vb = v.match(/viewBox="0 0 (\d+) (\d+)"/), vw = +vb[1], vh = +vb[2], S = 1024, k = (S * 0.5) / vh;
fs.writeFileSync('out/avatar.svg', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">
<rect width="${S}" height="${S}" fill="#0d1117"/>
<radialGradient id="halo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#1b2533"/><stop offset="1" stop-color="#0d1117"/></radialGradient>
<rect width="${S}" height="${S}" fill="url(#halo)"/>
<g transform="translate(${(S - vw * k) / 2 - S * 0.03} ${(S - vh * k) / 2}) scale(${k})">${inner}</g>
</svg>
`);
console.log('mark.svg', fs.statSync('assets/mark.svg').size, 'bytes · avatar.svg written');
if (process.env.SHARP) {
  const sharp = (await import('sharp')).default;
  await sharp('out/avatar.svg').png().toFile('out/avatar.png');
  console.log('avatar.png', fs.statSync('out/avatar.png').size, 'bytes');
}
