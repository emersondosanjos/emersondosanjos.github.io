/*
 * Interactive teaching engine hydrated inside TeachingView.astro:
 *  1) 15 animated SVG cycle/process simulators (`[data-cycle-sim]`)
 *  2) 23 dynamic parametric exercises (`[data-dyn-ex]`) with "Gerar novos números" + live KaTeX steps
 * Colors strictly track the site's Balmer / Pernambuco Ice White palette.
 */
import katex from 'katex';

/* ---------- site palette ---------- */
const COL = {
  navy: '#0b2d6b',
  blue: '#1d4fa3',
  coral: '#ff7a59',
  coralSoft: '#ffd2c6',
  ice: '#dbe7f6',
  iceDeep: '#b7cdec',
  paper: '#f8fafd',
  muted: '#4d5b7c',
  green: '#17703c',
  red: '#b42323',
  amber: '#a34f00',
};

const RU = 8.31446; // kJ/(kmol·K)
const RUB = 0.0831446; // bar·m³/(kmol·K)

const fmt = (x: number, dec = 2): string => {
  const thr = 0.5 * 10 ** -dec;
  const v = Math.abs(x) < thr ? 0 : x;
  return v.toFixed(dec).replace('.', ',').replace('-', '−');
};

const tnum = (x: number, dec = 2): string => {
  const thr = 0.5 * 10 ** -dec;
  const v = Math.abs(x) < thr ? 0 : x;
  return v.toFixed(dec).replace('.', '{,}');
};

const texDisplay = (tex: string) => katex.renderToString(tex, { displayMode: true, throwOnError: false });
const texInline = (tex: string) => katex.renderToString(tex, { throwOnError: false });

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

function samplePolyline(pts: [number, number][], phase: number): [number, number] {
  if (!pts.length) return [0, 0];
  if (pts.length === 1) return pts[0];
  const lens: number[] = [];
  let tot = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    lens.push(d);
    tot += d;
  }
  if (tot <= 1e-6) return pts[0];
  let target = (((phase % 1) + 1) % 1) * tot;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i] || i === lens.length - 1) {
      const f = lens[i] > 0 ? target / lens[i] : 0;
      return [lerp(pts[i][0], pts[i + 1][0], f), lerp(pts[i][1], pts[i + 1][1], f)];
    }
    target -= lens[i];
  }
  return pts[pts.length - 1];
}

const mkDefs = (p: string) =>
  `<defs>
    <marker id="${p}n" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${COL.navy}"/></marker>
    <marker id="${p}c" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${COL.coral}"/></marker>
    <marker id="${p}m" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${COL.muted}"/></marker>
  </defs>`;

/* ============================================================================
 *  VERIFIED TEXTBOOK PROPERTY TABLES (Moran & Shapiro 8th ed. SI)
 * ========================================================================== */

interface SteamSat {
  pBar: number;
  T: number;
  vf: number; // m³/kg
  vg: number;
  uf: number;
  ug: number;
  hf: number;
  hfg: number;
  hg: number;
  sf: number;
  sg: number;
}

const STEAM_SAT: SteamSat[] = [
  { pBar: 0.08, T: 41.51, vf: 0.0010084, vg: 18.103, uf: 173.87, ug: 2432.2, hf: 173.88, hfg: 2403.1, hg: 2577.0, sf: 0.5926, sg: 8.2287 },
  { pBar: 0.1, T: 45.81, vf: 0.0010102, vg: 14.674, uf: 191.82, ug: 2437.9, hf: 191.83, hfg: 2392.8, hg: 2584.7, sf: 0.6493, sg: 8.1502 },
  { pBar: 0.2, T: 60.06, vf: 0.0010172, vg: 7.649, uf: 251.38, ug: 2456.7, hf: 251.40, hfg: 2358.3, hg: 2609.7, sf: 0.8320, sg: 7.9085 },
  { pBar: 0.5, T: 81.33, vf: 0.0010300, vg: 3.240, uf: 340.44, ug: 2483.9, hf: 340.49, hfg: 2305.4, hg: 2645.9, sf: 1.0910, sg: 7.5939 },
  { pBar: 1.0, T: 99.63, vf: 0.0010432, vg: 1.694, uf: 417.36, ug: 2506.1, hf: 417.46, hfg: 2258.0, hg: 2675.5, sf: 1.3026, sg: 7.3594 },
  { pBar: 2.0, T: 120.2, vf: 0.0010605, vg: 0.8857, uf: 504.49, ug: 2529.5, hf: 504.70, hfg: 2201.9, hg: 2706.7, sf: 1.5301, sg: 7.1271 },
  { pBar: 5.0, T: 151.9, vf: 0.0010926, vg: 0.3749, uf: 639.68, ug: 2561.2, hf: 640.23, hfg: 2108.5, hg: 2748.7, sf: 1.8607, sg: 6.8212 },
  { pBar: 10.0, T: 179.9, vf: 0.0011273, vg: 0.1944, uf: 761.68, ug: 2583.6, hf: 762.81, hfg: 2015.3, hg: 2778.1, sf: 2.1387, sg: 6.5863 },
  { pBar: 20.0, T: 212.4, vf: 0.0011767, vg: 0.09963, uf: 906.44, ug: 2600.3, hf: 908.79, hfg: 1890.7, hg: 2799.5, sf: 2.4474, sg: 6.3409 },
  { pBar: 40.0, T: 250.4, vf: 0.0012522, vg: 0.04978, uf: 1082.3, ug: 2602.3, hf: 1087.3, hfg: 1714.1, hg: 2801.4, sf: 2.7964, sg: 6.0701 },
];

interface SteamSup { pBar: number; T: number; v: number; u: number; h: number; s: number }
const STEAM_SUP: SteamSup[] = [
  { pBar: 20, T: 360, v: 0.1411, u: 2877.0, h: 3159.3, s: 6.9917 },
  { pBar: 20, T: 400, v: 0.1512, u: 2945.2, h: 3247.6, s: 7.1271 },
  { pBar: 20, T: 440, v: 0.1611, u: 3013.4, h: 3335.5, s: 7.2540 },
  { pBar: 30, T: 360, v: 0.0923, u: 2861.7, h: 3138.7, s: 6.7801 },
  { pBar: 30, T: 400, v: 0.0994, u: 2932.8, h: 3230.9, s: 6.9212 },
  { pBar: 30, T: 440, v: 0.1062, u: 3002.9, h: 3321.5, s: 7.0520 },
  { pBar: 40, T: 400, v: 0.07341, u: 2919.9, h: 3213.6, s: 6.7690 },
  { pBar: 40, T: 440, v: 0.07872, u: 2992.2, h: 3307.1, s: 6.9041 },
  { pBar: 40, T: 500, v: 0.08643, u: 3099.5, h: 3445.3, s: 7.0901 },
  { pBar: 60, T: 440, v: 0.05122, u: 2970.0, h: 3277.3, s: 6.6853 },
  { pBar: 60, T: 500, v: 0.05665, u: 3082.2, h: 3422.2, s: 6.8803 },
  { pBar: 80, T: 480, v: 0.04034, u: 3025.7, h: 3348.4, s: 6.6586 },
  { pBar: 80, T: 520, v: 0.04313, u: 3102.7, h: 3447.7, s: 6.7871 },
  { pBar: 100, T: 520, v: 0.03394, u: 3085.6, h: 3425.1, s: 6.6622 },
  { pBar: 100, T: 560, v: 0.03619, u: 3164.1, h: 3526.0, s: 6.7864 },
];

interface R134aSat { pBar: number; T: number; hf: number; hg: number; sf: number; sg: number }
const R134A_SAT: R134aSat[] = [
  { pBar: 1.4, T: -18.80, hf: 25.77, hg: 236.04, sf: 0.1055, sg: 0.9322 },
  { pBar: 1.8, T: -12.73, hf: 33.45, hg: 239.71, sf: 0.1352, sg: 0.9273 },
  { pBar: 2.0, T: -10.09, hf: 36.84, hg: 241.30, sf: 0.1481, sg: 0.9253 },
  { pBar: 2.4, T: -5.37, hf: 42.95, hg: 244.09, sf: 0.1710, sg: 0.9222 },
  { pBar: 8.0, T: 31.33, hf: 93.42, hg: 264.15, sf: 0.3459, sg: 0.9066 },
  { pBar: 9.0, T: 35.53, hf: 99.56, hg: 266.18, sf: 0.3656, sg: 0.9054 },
  { pBar: 10.0, T: 39.39, hf: 105.29, hg: 267.97, sf: 0.3838, sg: 0.9043 },
  { pBar: 12.0, T: 46.32, hf: 115.76, hg: 270.99, sf: 0.4164, sg: 0.9023 },
];

// Table A-12 superheated R-134a points [T, h, s] per pressure (bar)
const R134A_SUP: Record<number, [number, number, number][]> = {
  8.0: [[31.33, 264.15, 0.9066], [40, 273.66, 0.9374], [50, 284.39, 0.9711], [60, 294.98, 1.0034]],
  9.0: [[35.53, 266.18, 0.9054], [40, 271.25, 0.9217], [50, 282.34, 0.9566], [60, 293.21, 0.9897]],
  10.0: [[39.39, 267.97, 0.9043], [40, 268.68, 0.9066], [50, 280.19, 0.9428], [60, 291.36, 0.9768]],
  12.0: [[46.32, 270.99, 0.9023], [50, 275.52, 0.9164], [60, 287.44, 0.9527], [70, 298.96, 0.9868]],
};

function interpR134aSupAtS(pBar: number, sTarget: number): { h: number; T: number } {
  const rows = R134A_SUP[pBar] || R134A_SUP[10.0];
  for (let i = 0; i < rows.length - 1; i++) {
    const [T1, h1, s1] = rows[i];
    const [T2, h2, s2] = rows[i + 1];
    if (sTarget >= s1 && sTarget <= s2) {
      const f = (sTarget - s1) / (s2 - s1);
      return { h: lerp(h1, h2, f), T: lerp(T1, T2, f) };
    }
  }
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const f = (sTarget - prev[2]) / (last[2] - prev[2]);
  return { h: lerp(prev[1], last[1], f), T: lerp(prev[0], last[0], f) };
}

// Table A-23 Ideal gas molar enthalpies (kJ/kmol) at selected T(K)
const A23_TEMPS = [298, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200, 2400, 2600, 2800, 3000];
const A23_H: Record<'CO2' | 'H2O' | 'O2' | 'N2', number[]> = {
  CO2: [9364, 13372, 22280, 32179, 42769, 53848, 65271, 76944, 88806, 100804, 112939, 125152, 137449, 149808, 162226],
  H2O: [9904, 13356, 20402, 27896, 35882, 44380, 53351, 62748, 72513, 82593, 92940, 103508, 114273, 125198, 136264],
  O2: [8682, 11711, 17929, 24523, 31389, 38447, 45648, 52961, 60371, 67881, 75484, 83174, 90956, 98826, 106780],
  N2: [8669, 11640, 17563, 23714, 30129, 36777, 43605, 50571, 57651, 64810, 72040, 79320, 86650, 94014, 101407],
};
const HF0 = { CO2: -393520, H2Og: -241820, H2Ol: -285830, CH4: -74850, C3H8: -103850, C8H18l: -249910, C2H5OHl: -277690, H2: 0 };

function hBarGas(sp: 'CO2' | 'H2O' | 'O2' | 'N2', T: number): number {
  const arr = A23_H[sp];
  if (T <= A23_TEMPS[0]) return arr[0];
  for (let i = 0; i < A23_TEMPS.length - 1; i++) {
    if (T <= A23_TEMPS[i + 1]) {
      const f = (T - A23_TEMPS[i]) / (A23_TEMPS[i + 1] - A23_TEMPS[i]);
      return lerp(arr[i], arr[i + 1], f);
    }
  }
  const n = A23_TEMPS.length;
  const slope = (arr[n - 1] - arr[n - 2]) / (A23_TEMPS[n - 1] - A23_TEMPS[n - 2]);
  return arr[n - 1] + slope * (T - A23_TEMPS[n - 1]);
}

// Psychrometrics helpers (P = 101.325 kPa standard)
function pSatWaterKpa(T_c: number): number {
  const T = T_c + 273.15;
  // Buck / Antoine high-accuracy fit across 0..60 °C (within <0.2% of Moran Table A-2)
  return 0.61078 * Math.exp((17.27 * T_c) / (T_c + 237.3)) * (T > 273.15 ? 1 : 0.998);
}

/* ---------- SVG helpers (mesmo padrão das aulas: subscrito real e partículas SMIL) ---------- */
/** subscrito real em <text> SVG: sb('T', 'H') → T com H subscrito */
const sb = (b: string, s: string, after = '') =>
  `${b}<tspan dy="3.5" font-size="72%">${s}</tspan><tspan dy="-3.5">${after || ' '}</tspan>`;
/** partícula que percorre um caminho, surgindo e sumindo suavemente */
const pulse = (path: string, color: string, dur: string, begin = '0s', r = 3.6) =>
  `<circle r="${r}" fill="${color}" stroke="#fff" stroke-width="1" opacity="0"><animateMotion path="${path}" dur="${dur}" begin="${begin}" repeatCount="indefinite"/><animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.88;1" dur="${dur}" begin="${begin}" repeatCount="indefinite"/></circle>`;
const pulses = (path: string, color: string, dur: number, n = 3, r = 3.6) =>
  Array.from({ length: n }, (_, i) => pulse(path, color, `${dur.toFixed(2)}s`, `${(-(i * dur) / n).toFixed(2)}s`, r)).join('');
/** rotor girando (turbina/compressor/bomba) */
const rotor = (cx: number, cy: number, r: number, dur: number, dir = 1, color = COL.navy) =>
  `<g transform="translate(${cx} ${cy})"><g><circle r="${r}" fill="#fff" stroke="${color}" stroke-width="1.8"/><path d="M0 ${-r + 2} V${r - 2} M${-r + 2} 0 H${r - 2} M${-(r - 3) * 0.7} ${-(r - 3) * 0.7} L${(r - 3) * 0.7} ${(r - 3) * 0.7} M${(r - 3) * 0.7} ${-(r - 3) * 0.7} L${-(r - 3) * 0.7} ${(r - 3) * 0.7}" stroke="${color}" stroke-width="1.5"/><animateTransform attributeName="transform" type="rotate" from="0" to="${360 * dir}" dur="${dur.toFixed(2)}s" repeatCount="indefinite"/></g></g>`;
const pts2str = (pts: [number, number][]) => pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
const pp01 = (ph: number) => 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
/** interpolação linear em tabela ordenada por x */
function interp1(xs: number[], ys: number[], x: number): number {
  const n = xs.length;
  if (x <= xs[0]) return ys[0] + ((ys[1] - ys[0]) / (xs[1] - xs[0])) * (x - xs[0]);
  for (let i = 0; i < n - 1; i++) {
    if (x <= xs[i + 1]) return lerp(ys[i], ys[i + 1], (x - xs[i]) / (xs[i + 1] - xs[i]));
  }
  return ys[n - 2] + ((ys[n - 1] - ys[n - 2]) / (xs[n - 1] - xs[n - 2])) * (x - xs[n - 2]);
}

/* ---------- Água saturada · Moran & Shapiro 8ª ed., Tabela A-3 (pressão) ---------- */
interface WSat { p: number; T: number; vf: number; vg: number; hf: number; hfg: number; hg: number; sf: number; sg: number }
// [p bar, T °C, vf·10³, vg, hf, hfg, hg, sf, sg]
const W_SAT: WSat[] = ([
  [0.04, 28.96, 1.0040, 34.800, 121.46, 2432.9, 2554.4, 0.4226, 8.4746],
  [0.06, 36.16, 1.0064, 23.739, 151.53, 2415.9, 2567.4, 0.5210, 8.3304],
  [0.08, 41.51, 1.0084, 18.103, 173.88, 2403.1, 2577.0, 0.5926, 8.2287],
  [0.10, 45.81, 1.0102, 14.674, 191.83, 2392.8, 2584.7, 0.6493, 8.1502],
  [0.20, 60.06, 1.0172, 7.649, 251.40, 2358.3, 2609.7, 0.8320, 7.9085],
  [0.30, 69.10, 1.0223, 5.229, 289.23, 2336.1, 2625.3, 0.9439, 7.7686],
  [0.40, 75.87, 1.0265, 3.993, 317.58, 2319.2, 2636.8, 1.0259, 7.6700],
  [0.50, 81.33, 1.0300, 3.240, 340.49, 2305.4, 2645.9, 1.0910, 7.5939],
  [0.60, 85.94, 1.0331, 2.732, 359.86, 2293.6, 2653.5, 1.1453, 7.5320],
  [0.70, 89.95, 1.0360, 2.365, 376.70, 2283.3, 2660.0, 1.1919, 7.4797],
  [0.80, 93.50, 1.0380, 2.087, 391.66, 2274.1, 2665.8, 1.2329, 7.4346],
  [0.90, 96.71, 1.0410, 1.869, 405.15, 2265.7, 2670.9, 1.2695, 7.3949],
  [1.00, 99.63, 1.0432, 1.694, 417.46, 2258.0, 2675.5, 1.3026, 7.3594],
  [1.50, 111.4, 1.0528, 1.159, 467.11, 2226.5, 2693.6, 1.4336, 7.2233],
  [2.00, 120.2, 1.0605, 0.8857, 504.70, 2201.9, 2706.7, 1.5301, 7.1271],
  [2.50, 127.4, 1.0672, 0.7187, 535.37, 2181.5, 2716.9, 1.6072, 7.0527],
  [3.00, 133.6, 1.0732, 0.6058, 561.47, 2163.8, 2725.3, 1.6718, 6.9919],
  [3.50, 138.9, 1.0786, 0.5243, 584.33, 2148.1, 2732.4, 1.7275, 6.9405],
  [4.00, 143.6, 1.0836, 0.4625, 604.74, 2133.8, 2738.6, 1.7766, 6.8959],
  [4.50, 147.9, 1.0882, 0.4140, 623.25, 2120.7, 2743.9, 1.8207, 6.8565],
  [5.00, 151.9, 1.0926, 0.3749, 640.23, 2108.5, 2748.7, 1.8607, 6.8212],
  [6.00, 158.9, 1.1006, 0.3157, 670.56, 2086.3, 2756.8, 1.9312, 6.7600],
  [7.00, 165.0, 1.1080, 0.2729, 697.22, 2066.3, 2763.5, 1.9922, 6.7080],
  [8.00, 170.4, 1.1148, 0.2404, 721.11, 2048.0, 2769.1, 2.0462, 6.6628],
  [9.00, 175.4, 1.1212, 0.2150, 742.83, 2031.1, 2773.9, 2.0946, 6.6226],
  [10.0, 179.9, 1.1273, 0.1944, 762.81, 2015.3, 2778.1, 2.1387, 6.5863],
  [15.0, 198.3, 1.1539, 0.1318, 844.84, 1947.3, 2792.2, 2.3150, 6.4448],
  [20.0, 212.4, 1.1767, 0.09963, 908.79, 1890.7, 2799.5, 2.4474, 6.3409],
  [25.0, 224.0, 1.1973, 0.07998, 962.11, 1841.0, 2803.1, 2.5547, 6.2575],
  [30.0, 233.9, 1.2165, 0.06668, 1008.4, 1795.7, 2804.2, 2.6457, 6.1869],
  [40.0, 250.4, 1.2522, 0.04978, 1087.3, 1714.1, 2801.4, 2.7964, 6.0701],
  [50.0, 264.0, 1.2859, 0.03944, 1154.2, 1640.1, 2794.3, 2.9202, 5.9734],
  [60.0, 275.6, 1.3187, 0.03244, 1213.4, 1571.0, 2784.3, 3.0267, 5.8892],
  [80.0, 295.1, 1.3842, 0.02352, 1316.6, 1441.3, 2758.0, 3.2068, 5.7432],
  [100, 311.1, 1.4524, 0.01803, 1407.6, 1317.1, 2724.7, 3.3596, 5.6141],
  [120, 324.8, 1.5267, 0.01426, 1491.3, 1193.6, 2684.9, 3.4962, 5.4924],
  [140, 336.8, 1.6107, 0.01149, 1571.1, 1066.5, 2637.6, 3.6232, 5.3717],
  [160, 347.4, 1.7107, 0.009306, 1650.1, 930.6, 2580.6, 3.7461, 5.2455],
  [180, 357.1, 1.8397, 0.007489, 1732.0, 777.1, 2509.1, 3.8715, 5.1044],
  [200, 365.8, 2.036, 0.005834, 1826.3, 583.4, 2409.7, 4.0139, 4.9269],
  [220.9, 374.1, 3.155, 0.003155, 2099.3, 0, 2099.3, 4.4298, 4.4298],
] as number[][]).map(([p, T, vf, vg, hf, hfg, hg, sf, sg]) => ({ p, T, vf: vf / 1000, vg, hf, hfg, hg, sf, sg }));
const wSat = (p: number): WSat => W_SAT.reduce((a, b) => (Math.abs(b.p - p) < Math.abs(a.p - p) ? b : a));

/* ---------- Vapor superaquecido · Moran & Shapiro, Tabela A-4: linhas [T °C, h kJ/kg, s kJ/(kg·K)], 1ª linha = vapor saturado ---------- */
const W_SUP: Record<number, [number, number, number][]> = {
  3: [[133.6, 2725.3, 6.9919], [160, 2782.3, 7.1276], [200, 2865.5, 7.3115], [240, 2947.3, 7.4774], [280, 3028.6, 7.6299], [320, 3110.1, 7.7722], [360, 3192.2, 7.9061], [400, 3275.0, 8.0330]],
  5: [[151.9, 2748.7, 6.8213], [180, 2812.0, 6.9656], [200, 2855.4, 7.0592], [240, 2939.9, 7.2307], [280, 3022.9, 7.3865], [320, 3105.6, 7.5308], [360, 3188.4, 7.6660], [400, 3271.9, 7.7938], [440, 3356.0, 7.9152]],
  7: [[165.0, 2763.5, 6.7080], [180, 2799.1, 6.7880], [200, 2844.8, 6.8865], [240, 2932.2, 7.0641], [280, 3017.1, 7.2233], [320, 3100.9, 7.3697], [360, 3184.7, 7.5063], [400, 3268.7, 7.6350], [440, 3353.3, 7.7571]],
  10: [[179.9, 2778.1, 6.5865], [200, 2827.9, 6.6940], [240, 2920.4, 6.8817], [280, 3008.2, 7.0465], [320, 3093.9, 7.1962], [360, 3178.9, 7.3349], [400, 3263.9, 7.4651], [440, 3349.3, 7.5883], [500, 3478.5, 7.7622], [540, 3565.6, 7.8720], [600, 3697.9, 8.0290]],
  20: [[212.4, 2799.5, 6.3409], [240, 2876.5, 6.4952], [280, 2976.4, 6.6828], [320, 3069.5, 6.8452], [360, 3159.3, 6.9917], [400, 3247.6, 7.1271], [440, 3335.5, 7.2540], [500, 3467.6, 7.4317], [540, 3556.1, 7.5434], [600, 3690.1, 7.7024]],
  30: [[233.9, 2804.2, 6.1869], [240, 2824.3, 6.2265], [280, 2941.3, 6.4462], [320, 3043.4, 6.6245], [360, 3138.7, 6.7801], [400, 3230.9, 6.9212], [440, 3321.5, 7.0520], [500, 3456.5, 7.2338], [540, 3546.6, 7.3474], [600, 3682.3, 7.5085]],
  40: [[250.4, 2801.4, 6.0701], [280, 2901.8, 6.2568], [320, 3015.4, 6.4553], [360, 3117.2, 6.6215], [400, 3213.6, 6.7690], [440, 3307.1, 6.9041], [500, 3445.3, 7.0901], [540, 3536.9, 7.2056], [600, 3674.4, 7.3688]],
  60: [[275.6, 2784.3, 5.8892], [280, 2804.2, 5.9252], [320, 2952.6, 6.1846], [360, 3071.1, 6.3782], [400, 3177.2, 6.5408], [440, 3277.3, 6.6853], [500, 3422.2, 6.8803], [540, 3517.0, 6.9999], [600, 3658.4, 7.1677]],
  80: [[295.1, 2758.0, 5.7432], [320, 2877.2, 5.9489], [360, 3019.8, 6.1819], [400, 3138.3, 6.3634], [440, 3246.1, 6.5190], [480, 3348.4, 6.6586], [520, 3447.7, 6.7871], [560, 3545.3, 6.9072], [600, 3642.0, 7.0206]],
  100: [[311.1, 2724.7, 5.6141], [320, 2781.3, 5.7103], [360, 2962.1, 6.0060], [400, 3096.5, 6.2120], [440, 3213.2, 6.3805], [480, 3321.4, 6.5282], [520, 3425.1, 6.6622], [560, 3526.0, 6.7864], [600, 3625.3, 6.9029]],
  120: [[324.8, 2684.9, 5.4924], [360, 2895.7, 5.8361], [400, 3051.3, 6.0747], [440, 3178.7, 6.2586], [480, 3293.5, 6.4154], [520, 3401.8, 6.5555], [560, 3506.2, 6.6840], [600, 3608.3, 6.8037]],
  140: [[336.8, 2637.6, 5.3717], [360, 2816.5, 5.6602], [400, 3001.9, 5.9448], [440, 3142.2, 6.1474], [480, 3264.5, 6.3143], [520, 3377.8, 6.4610], [560, 3486.0, 6.5941], [600, 3591.1, 6.7172]],
};
interface WState { p: number; T: number; h: number; s: number; x: number | null }
/** estado do vapor superaquecido a (p, T) por interpolação linear em T na Tab. A-4 */
function wPT(p: number, T: number): WState {
  const rows = W_SUP[p];
  return { p, T, h: interp1(rows.map((r) => r[0]), rows.map((r) => r[1]), T), s: interp1(rows.map((r) => r[0]), rows.map((r) => r[2]), T), x: null };
}
/** estado a (p, s): mistura (Tab. A-3) ou superaquecido (Tab. A-4) */
function wPS(p: number, s: number): WState {
  const st = wSat(p);
  if (s <= st.sg) {
    const x = (s - st.sf) / (st.sg - st.sf);
    return { p, T: st.T, h: st.hf + x * st.hfg, s, x };
  }
  const rows = W_SUP[p];
  const ss = rows.map((r) => r[2]);
  return { p, T: interp1(ss, rows.map((r) => r[0]), s), h: interp1(ss, rows.map((r) => r[1]), s), s, x: null };
}
/** estado a (p, h): mistura (Tab. A-3) ou superaquecido (Tab. A-4) */
function wPH(p: number, h: number): WState {
  const st = wSat(p);
  if (h <= st.hg) {
    const x = (h - st.hf) / st.hfg;
    return { p, T: st.T, h, s: st.sf + x * (st.sg - st.sf), x };
  }
  const rows = W_SUP[p];
  const hs = rows.map((r) => r[1]);
  return { p, T: interp1(hs, rows.map((r) => r[0]), h), h, s: interp1(hs, rows.map((r) => r[2]), h), x: null };
}
/** pontos (s, T) da linha de pressão constante entre o líquido saturado e T (para o diagrama T-s) */
function wIsobarTs(p: number, Tend: number): [number, number][] {
  const st = wSat(p);
  const pts: [number, number][] = [[st.sf, st.T], [st.sg, st.T]];
  if (W_SUP[p]) W_SUP[p].forEach((r) => { if (r[0] > st.T + 0.5 && r[0] < Tend) pts.push([r[2], r[0]]); });
  if (Tend > st.T + 0.5) pts.push([wPT(p, Tend).s, Tend]);
  return pts;
}
/** linha de líquido saturado entre duas temperaturas (aquecimento do líquido comprimido ≈ s_f(T)) */
function wLiqLineTs(T1: number, T2: number): [number, number][] {
  const pts: [number, number][] = [];
  W_SAT.forEach((r) => { if (r.T > T1 && r.T < T2) pts.push([r.sf, r.T]); });
  return pts;
}

/* ---------- Água · Tabela A-2 (temperatura): p_sat (bar), h_f e h_g (kJ/kg) ---------- */
const A2_T = [0.01, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 25, 26, 28, 30, 32, 34, 35, 36, 38, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90];
const A2_P = [0.00611, 0.00813, 0.00935, 0.01072, 0.01228, 0.01402, 0.01598, 0.01818, 0.02064, 0.02339, 0.02645, 0.02985, 0.03169, 0.03363, 0.03782, 0.04246, 0.04759, 0.05324, 0.05628, 0.05947, 0.06632, 0.07384, 0.09593, 0.1235, 0.1576, 0.1994, 0.2503, 0.3119, 0.3858, 0.4739, 0.5783, 0.7014];
const A2_HF = [0.01, 16.78, 25.20, 33.60, 42.01, 50.41, 58.80, 67.19, 75.58, 83.96, 92.33, 100.70, 104.89, 109.07, 117.43, 125.79, 134.15, 142.50, 146.68, 150.86, 159.21, 167.57, 188.45, 209.33, 230.23, 251.13, 272.06, 292.98, 313.93, 334.91, 355.90, 376.92];
const A2_HG = [2501.4, 2508.7, 2512.4, 2516.1, 2519.8, 2523.4, 2527.1, 2530.8, 2534.4, 2538.1, 2541.7, 2545.4, 2547.2, 2549.0, 2552.6, 2556.3, 2559.9, 2563.5, 2565.3, 2567.1, 2570.7, 2574.3, 2583.2, 2592.1, 2600.9, 2609.6, 2618.3, 2626.8, 2635.3, 2643.7, 2651.9, 2660.1];
/** p_sat(T) em kPa, interpolação log-linear na Tabela A-2 */
const pSatA2 = (Tc: number) => 100 * Math.exp(interp1(A2_T, A2_P.map(Math.log), clamp(Tc, 0.01, 90)));
/** T_sat(p) em °C a partir de p em kPa (inversa da anterior) */
const tSatA2 = (pkPa: number) => interp1(A2_P.map(Math.log), A2_T, Math.log(clamp(pkPa, 0.611, 70) / 100));
const hfA2 = (Tc: number) => interp1(A2_T, A2_HF, Tc);
const hgA2 = (Tc: number) => interp1(A2_T, A2_HG, Tc);
/** psicrometria a 1 atm (Moran cap. 12): ω = 0,622 p_v/(p − p_v); h = c_p,a T + ω h_g(T) */
const P_ATM = 101.325;
const omegaOf = (pv: number) => (0.622 * pv) / (P_ATM - pv);
const pvOf = (w: number) => (w * P_ATM) / (0.622 + w);
const hAir = (Tc: number, w: number) => 1.005 * Tc + w * hgA2(Tc);
/** temperatura de bulbo úmido pela saturação adiabática: h1 + (ω_s − ω1) h_f(T_bu) = h_s(T_bu) */
function wetBulb(Tc: number, w: number): number {
  let lo = -5, hi = Tc;
  for (let i = 0; i < 40; i++) {
    const m = 0.5 * (lo + hi);
    const ws = omegaOf(pSatA2(m));
    const f = hAir(Tc, w) + (ws - w) * hfA2(m) - hAir(m, ws);
    if (f > 0) lo = m; else hi = m;
  }
  return 0.5 * (lo + hi);
}

/* ---------- R-134a · Moran & Shapiro, Tabelas A-10, A-11 e A-12 ---------- */
interface RSat { p: number; T: number; hf: number; hfg: number; hg: number; sf: number; sg: number }
// Tabela A-11: [p bar, T °C, hf, hfg, hg, sf, sg]
const R_SAT: RSat[] = ([
  [1.0, -26.43, 16.29, 215.06, 231.35, 0.0678, 0.9395],
  [1.2, -22.36, 21.32, 212.54, 233.86, 0.0879, 0.9354],
  [1.4, -18.80, 25.77, 210.27, 236.04, 0.1055, 0.9322],
  [1.6, -15.62, 29.78, 208.19, 237.97, 0.1211, 0.9295],
  [1.8, -12.73, 33.45, 206.26, 239.71, 0.1352, 0.9273],
  [2.0, -10.09, 36.84, 204.46, 241.30, 0.1481, 0.9253],
  [2.4, -5.37, 42.95, 201.14, 244.09, 0.1710, 0.9222],
  [2.8, -1.23, 48.39, 198.13, 246.52, 0.1911, 0.9197],
  [3.2, 2.48, 53.31, 195.35, 248.66, 0.2089, 0.9177],
  [4.0, 8.93, 62.00, 190.32, 252.32, 0.2399, 0.9145],
  [7.0, 26.72, 86.78, 175.07, 261.85, 0.3242, 0.9080],
  [8.0, 31.33, 93.42, 170.73, 264.15, 0.3459, 0.9066],
  [9.0, 35.53, 99.56, 166.62, 266.18, 0.3656, 0.9054],
  [10.0, 39.39, 105.29, 162.68, 267.97, 0.3838, 0.9043],
  [12.0, 46.32, 115.76, 155.23, 270.99, 0.4164, 0.9023],
  [14.0, 52.43, 125.26, 148.14, 273.40, 0.4453, 0.9003],
  [16.0, 57.92, 134.02, 141.31, 275.33, 0.4714, 0.8982],
] as number[][]).map(([p, T, hf, hfg, hg, sf, sg]) => ({ p, T, hf, hfg, hg, sf, sg }));
const rSat = (p: number): RSat => R_SAT.reduce((a, b) => (Math.abs(b.p - p) < Math.abs(a.p - p) ? b : a));
// Tabela A-12: [T °C, h, s], 1ª linha = vapor saturado
const R_SUP: Record<number, [number, number, number][]> = {
  1.0: [[-26.43, 231.35, 0.9395], [-20, 236.54, 0.9602], [-10, 244.70, 0.9918], [0, 252.99, 1.0227]],
  1.4: [[-18.80, 236.04, 0.9322], [-10, 243.40, 0.9606], [0, 251.86, 0.9922], [10, 260.43, 1.0230]],
  1.8: [[-12.73, 239.71, 0.9273], [-10, 242.06, 0.9362], [0, 250.69, 0.9684], [10, 259.41, 0.9998]],
  2.0: [[-10.09, 241.30, 0.9253], [-10, 241.38, 0.9256], [0, 250.10, 0.9582], [10, 258.89, 0.9898]],
  2.4: [[-5.37, 244.09, 0.9222], [0, 248.89, 0.9399], [10, 257.84, 0.9721], [20, 266.85, 1.0034]],
  2.8: [[-1.23, 246.52, 0.9197], [0, 247.64, 0.9238], [10, 256.76, 0.9566], [20, 265.91, 0.9883]],
  3.2: [[2.48, 248.66, 0.9177], [10, 255.65, 0.9427], [20, 264.95, 0.9749], [30, 274.28, 1.0062]],
  4.0: [[8.93, 252.32, 0.9145], [10, 253.35, 0.9182], [20, 262.96, 0.9515], [30, 272.54, 0.9837]],
  7.0: [[26.72, 261.85, 0.9080], [30, 265.37, 0.9197], [40, 275.93, 0.9539], [50, 286.35, 0.9867], [60, 296.69, 1.0182], [70, 307.01, 1.0487], [80, 317.35, 1.0784], [90, 327.74, 1.1074]],
  8.0: [[31.33, 264.15, 0.9066], [40, 273.66, 0.9374], [50, 284.39, 0.9711], [60, 294.98, 1.0034], [70, 305.50, 1.0345], [80, 316.00, 1.0647], [90, 326.52, 1.0940]],
  9.0: [[35.53, 266.18, 0.9054], [40, 271.25, 0.9217], [50, 282.34, 0.9566], [60, 293.21, 0.9897], [70, 303.94, 1.0214], [80, 314.62, 1.0521], [90, 325.28, 1.0819]],
  10.0: [[39.39, 267.97, 0.9043], [40, 268.68, 0.9066], [50, 280.19, 0.9428], [60, 291.36, 0.9768], [70, 302.34, 1.0093], [80, 313.20, 1.0405], [90, 324.01, 1.0707]],
  12.0: [[46.32, 270.99, 0.9023], [50, 275.52, 0.9164], [60, 287.44, 0.9527], [70, 298.96, 0.9868], [80, 310.24, 1.0192], [90, 321.39, 1.0503], [100, 332.47, 1.0804]],
  14.0: [[52.43, 273.40, 0.9003], [60, 283.10, 0.9297], [70, 295.31, 0.9658], [80, 307.10, 0.9997], [90, 318.63, 1.0319], [100, 330.02, 1.0628]],
  16.0: [[57.92, 275.33, 0.8982], [60, 278.20, 0.9069], [70, 291.33, 0.9457], [80, 303.74, 0.9813], [90, 315.72, 1.0148], [100, 327.46, 1.0467]],
};
const rSupAt = (p: number, key: 'T' | 'h' | 's', v: number) => {
  const rows = R_SUP[p];
  const k = key === 'T' ? 0 : key === 'h' ? 1 : 2;
  const xs = rows.map((r) => r[k]);
  return { T: interp1(xs, rows.map((r) => r[0]), v), h: interp1(xs, rows.map((r) => r[1]), v), s: interp1(xs, rows.map((r) => r[2]), v) };
};
// Tabela A-10 (temperatura): [T °C, p bar, hf, hg] para a cúpula no diagrama P-h e o líquido sub-resfriado
const R_A10: [number, number, number, number][] = [
  [-40, 0.5164, 0.00, 222.88], [-32, 0.7704, 9.52, 227.90], [-24, 1.1160, 19.29, 232.85], [-16, 1.5748, 29.30, 237.74], [-8, 2.1704, 39.54, 242.54],
  [0, 2.9282, 50.02, 247.23], [8, 3.8756, 60.73, 251.80], [16, 5.0416, 71.69, 256.22], [24, 6.4566, 82.90, 260.45], [28, 7.2675, 88.61, 262.50],
  [32, 8.1528, 94.39, 264.48], [36, 9.1168, 100.25, 266.40], [40, 10.164, 106.19, 268.24], [44, 11.299, 112.22, 270.01], [48, 12.526, 118.35, 271.68],
  [52, 13.851, 124.58, 273.24], [56, 15.278, 130.93, 274.68], [60, 16.813, 137.42, 275.99], [70, 21.162, 154.34, 278.43], [80, 26.324, 172.71, 279.12],
  [90, 32.435, 193.69, 276.32], [100, 39.742, 224.74, 259.13],
];
const rHfT = (Tc: number) => interp1(R_A10.map((r) => r[0]), R_A10.map((r) => r[2]), Tc);
/** amostra um ciclo dado por processos (polilinhas), com o mesmo tempo para cada processo */
function cycleSample(procs: [number, number][][], phase: number): [number, number] {
  const p = (((phase % 1) + 1) % 1) * procs.length;
  const i = Math.min(procs.length - 1, Math.floor(p));
  return samplePolyline(procs[i], p - i);
}
const VCR_PE = [1.0, 1.4, 1.8, 2.0, 2.4, 2.8, 3.2, 4.0];
const VCR_PC = [7, 8, 9, 10, 12, 14, 16];


/* ---------- Ciclo Rankine com tabelas A-3/A-4 (convenção do Moran: 1 = entrada da turbina) ---------- */
interface RkPt { s: number; T: number; lab: string; dx: number; dy: number }
interface RkOut { procs: [number, number][][]; pts: RkPt[]; eta: number; wnet: number; qin: number; wt: number; xOut: number | null; y?: number; pR?: number; Tm: number }
function rankineCalc(mode: string, pB: number, Tmax: number, pC: number, eta: number): RkOut {
  const c = wSat(pC);
  const turb = (st: WState, pOut: number) => wPH(pOut, st.h - eta * (st.h - wPS(pOut, st.s).h));
  const pump = (pIn: number, pOut: number) => { const w = wSat(pIn); return { h: w.hf + w.vf * (pOut - pIn) * 100, s: w.sf, T: w.T }; };
  const boilerPath = (sIn: number, TIn: number, p: number): [number, number][] => [[sIn, TIn], ...wLiqLineTs(TIn, wSat(p).T), ...wIsobarTs(p, Tmax)];
  const isobarFrom = (st: WState, p: number): [number, number][] => {
    const sat = wSat(p);
    const pts: [number, number][] = [[st.s, st.T]];
    if (st.x !== null) pts.push([sat.sg, sat.T]);
    W_SUP[p].forEach((r) => { if (r[0] > st.T + 0.5 && r[0] < Tmax && r[2] > st.s) pts.push([r[2], r[0]]); });
    pts.push([wPT(p, Tmax).s, Tmax]);
    return pts;
  };
  const s1 = wPT(pB, Tmax);
  const P = (st: { s: number; T: number }, lab: string, dx: number, dy: number): RkPt => ({ s: st.s, T: st.T, lab, dx, dy });
  if (mode === 'reheat') {
    const pR = [40, 30, 20, 10].find((p) => p <= pB / 3) ?? 10;
    const s2 = turb(s1, pR);
    const s3 = wPT(pR, Tmax);
    const s4 = turb(s3, pC);
    const s6 = pump(pC, pB);
    const wt = (s1.h - s2.h) + (s3.h - s4.h);
    const wp = s6.h - c.hf;
    const qin = (s1.h - s6.h) + (s3.h - s2.h);
    return {
      procs: [[[s1.s, s1.T], [s2.s, s2.T]], isobarFrom(s2, pR), [[s3.s, s3.T], [s4.s, s4.T]], [[s4.s, s4.T], [c.sf, c.T]], boilerPath(c.sf, c.T, pB)],
      pts: [P(s1, '1', -12, -4), P(s2, '2', -12, 12), P(s3, '3', 6, -4), P(s4, '4', 6, 13), P({ s: c.sf, T: c.T }, '5,6', 6, 14)],
      eta: (wt - wp) / qin, wnet: wt - wp, qin, wt, xOut: s4.x, pR, Tm: qin / ((s1.s - s6.s) + (s3.s - s2.s)) + 0,
    };
  }
  if (mode === 'regen') {
    const pE = 7;
    const e = wSat(pE);
    const s2 = turb(s1, pE);
    const s3 = turb(s2, pC);
    const s5 = pump(pC, pE);
    const s7 = pump(pE, pB);
    const y = (e.hf - s5.h) / (s2.h - s5.h);
    const wt = (s1.h - s2.h) + (1 - y) * (s2.h - s3.h);
    const wp = (1 - y) * (s5.h - c.hf) + (s7.h - e.hf);
    const qin = s1.h - s7.h;
    return {
      procs: [[[s1.s, s1.T], [s2.s, s2.T]], [[s2.s, s2.T], [s3.s, s3.T]], [[s3.s, s3.T], [c.sf, c.T]], [[c.sf, c.T], ...wLiqLineTs(c.T, e.T), [e.sf, e.T]], boilerPath(e.sf, e.T, pB)],
      pts: [P(s1, '1', 6, -4), P(s2, '2', 6, 0), P(s3, '3', 6, 13), P({ s: c.sf, T: c.T }, '4,5', 6, 14), P({ s: e.sf, T: e.T }, '6,7', -24, 4)],
      eta: (wt - wp) / qin, wnet: wt - wp, qin, wt, xOut: s3.x, y, Tm: qin / (s1.s - s7.s),
    };
  }
  const s2 = turb(s1, pC);
  const s4 = pump(pC, pB);
  const wt = s1.h - s2.h, wp = s4.h - c.hf, qin = s1.h - s4.h;
  return {
    procs: [[[s1.s, s1.T], [s2.s, s2.T]], [[s2.s, s2.T], [c.sf, c.T]], boilerPath(c.sf, c.T, pB)],
    pts: [P(s1, '1', 6, -4), P(s2, '2', 6, 13), P({ s: c.sf, T: c.T }, '3,4', 6, 14)],
    eta: (wt - wp) / qin, wnet: wt - wp, qin, wt, xOut: s2.x, Tm: qin / (s1.s - s4.s),
  };
}

/* ---------- Balanço de exergia de plantas (fonte a T_H, ambiente a T_0) ---------- */
interface ExItem { name: string; v: number; loss: boolean }
function exergyPlant(mode: string, eta: number, TH: number): { items: ExItem[]; eIn: number; w: number; qin: number; qout: number; res: number; T4?: number } {
  const T0 = 298.15, cp = 1.005, R = 0.287, k = 1.4, e = (k - 1) / k;
  const steam = (pB: number, Tb: number, pC: number) => {
    const c = wSat(pC);
    const s1 = wPT(pB, Tb);
    const s2 = wPH(pC, s1.h - eta * (s1.h - wPS(pC, s1.s).h));
    const h4 = c.hf + c.vf * (pB - pC) * 100;
    return { s1, s2, c, h4, w: (s1.h - s2.h) - (h4 - c.hf) };
  };
  if (mode === 'rankine') {
    const st = steam(100, 520, 0.08);
    const qin = st.s1.h - st.h4;
    const eIn = qin * (1 - T0 / TH);
    const items: ExItem[] = [
      { name: 'caldeira', v: T0 * (st.s1.s - st.c.sf - qin / TH), loss: false },
      { name: 'turbina', v: T0 * (st.s2.s - st.s1.s), loss: false },
      { name: 'condensador', v: (st.s2.h - st.c.hf) - T0 * (st.s2.s - st.c.sf), loss: true },
    ];
    const res = eIn - st.w - items.reduce((a, b) => a + b.v, 0);
    return { items, eIn, w: st.w, qin, qout: st.s2.h - st.c.hf, res };
  }
  const T1 = T0, T3 = 1300, rp = 10;
  const T2 = T1 + (T1 * Math.pow(rp, e) - T1) / eta;
  const T4 = T3 - eta * (T3 - T3 / Math.pow(rp, e));
  const qin = cp * (T3 - T2);
  const wG = cp * (T3 - T4) - cp * (T2 - T1);
  const eIn = qin * (1 - T0 / TH);
  const gas: ExItem[] = [
    { name: 'compressor', v: T0 * (cp * Math.log(T2 / T1) - R * Math.log(rp)), loss: false },
    { name: 'câmara', v: T0 * (cp * Math.log(T3 / T2) - qin / TH), loss: false },
    { name: mode === 'brayton' ? 'turbina' : 'turbina TG', v: T0 * (cp * Math.log(T4 / T3) + R * Math.log(rp)), loss: false },
  ];
  const exStream = (T: number) => cp * (T - T0) - T0 * cp * Math.log(T / T0);
  if (mode === 'brayton') {
    const items = [...gas, { name: 'exaustão', v: exStream(T4), loss: true }];
    const res = eIn - wG - items.reduce((a, b) => a + b.v, 0);
    return { items, eIn, w: wG, qin, qout: cp * (T4 - T1), res, T4 };
  }
  const Tst = 400;
  const st = steam(10, 400, 0.08);
  const ms = (cp * (T4 - Tst)) / (st.s1.h - st.h4);
  const items: ExItem[] = [
    ...gas,
    { name: 'recuperação', v: T0 * (ms * (st.s1.s - st.c.sf) + cp * Math.log(Tst / T4)), loss: false },
    { name: 'turbina vapor', v: T0 * ms * (st.s2.s - st.s1.s), loss: false },
    { name: 'condensador', v: ms * ((st.s2.h - st.c.hf) - T0 * (st.s2.s - st.c.sf)), loss: true },
    { name: 'chaminé', v: exStream(Tst), loss: true },
  ];
  const w = wG + ms * st.w;
  const res = eIn - w - items.reduce((a, b) => a + b.v, 0);
  return { items, eIn, w, qin, qout: cp * (Tst - T1) + ms * (st.s2.h - st.c.hf), res, T4 };
}

/* ============================================================================
 *  PART 1 · 15 ANIMATED INTERACTIVE CYCLE & PROCESS SIMULATORS
 * ========================================================================== */

interface SimParam {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  initial: number;
  /** modos em que o controle aparece (todos, se omitido) */
  modes?: string[];
  /** formatação do valor exibido (sliders de índice sobre tabelas) */
  fmtVal?: (v: number) => string;
}
interface SimKpi { label: string; value: string; accent?: boolean }
interface SimRender {
  svg: string;
  kpis: SimKpi[];
  insight: string;
  trace?: (phase: number) => { x: number; y: number; tag?: string } | null;
  /** optional per-frame hook to animate parts of the SVG (piston, molecules, live readouts) */
  onPhase?: (phase: number, svg: SVGSVGElement) => void;
}
interface SimSpec {
  id: string;
  defaultTitle: string;
  subtitle: string;
  modes?: { id: string; label: string }[];
  params: SimParam[];
  /** start the animation automatically when the simulator is mounted */
  autoplay?: boolean;
  render: (s: Record<string, number>, mode: string) => SimRender;
}

const GAS_PROPS: Record<string, { name: string; M: number; Tc: number; pc: number }> = {
  ch4: { name: 'CH₄ (Metano)', M: 16.04, Tc: 191, pc: 46.4 },
  co2: { name: 'CO₂', M: 44.01, Tc: 304, pc: 73.9 },
  n2: { name: 'N₂', M: 28.01, Tc: 126, pc: 33.9 },
};

const FUELS: Record<string, { label: string; c: number; h: number; o: number; M: number; hf0: number; pcs: number; pci: number }> = {
  ch4: { label: 'CH₄ (Gás natural)', c: 1, h: 4, o: 0, M: 16.04, hf0: -74850, pcs: 55510, pci: 50020 },
  c3h8: { label: 'C₃H₈ (Propano/GLP)', c: 3, h: 8, o: 0, M: 44.09, hf0: -103850, pcs: 50350, pci: 46360 },
  c8h18: { label: 'C₈H₁₈(l) (Octano)', c: 8, h: 18, o: 0, M: 114.22, hf0: -249910, pcs: 47900, pci: 44430 },
  h2: { label: 'H₂ (Hidrogênio)', c: 0, h: 2, o: 0, M: 2.016, hf0: 0, pcs: 141780, pci: 119950 },
};

const SIM_SPECS: SimSpec[] = [
  /* 1. pvt-gas-real */
  {
    id: 'pvt-gas-real',
    defaultTitle: `Equações de Estado: Gás Ideal, van der Waals e Redlich–Kwong`,
    subtitle: `Compare desvios da idealidade via fator de compressibilidade ${texInline(String.raw`Z = \frac{P\bar v}{\bar R T}`)}.`,
    modes: [
      { id: 'ch4', label: 'CH₄' },
      { id: 'co2', label: 'CO₂' },
      { id: 'n2', label: 'N₂' },
    ],
    params: [
      { key: 'T', label: 'Temperatura', unit: 'K', min: 180, max: 600, step: 5, initial: 298 },
      { key: 'vbar', label: `Volume molar ${texInline(String.raw`\bar v`)}`, unit: 'm³/kmol', min: 0.08, max: 0.50, step: 0.01, initial: 0.12 },
    ],
    render: (s, mode) => {
      const g = GAS_PROPS[mode] || GAS_PROPS.ch4;
      const { T, vbar } = s;
      const aVdw = (27 / 64) * ((RUB * g.Tc) ** 2 / g.pc);
      const bVdw = (RUB * g.Tc) / (8 * g.pc);
      const aRk = 0.42748 * ((RUB ** 2 * g.Tc ** 2.5) / g.pc);
      const bRk = 0.08664 * ((RUB * g.Tc) / g.pc);
      const Pideal = (RUB * T) / vbar;
      const Pvdw = (RUB * T) / (vbar - bVdw) - aVdw / (vbar * vbar);
      const Prk = (RUB * T) / (vbar - bRk) - aRk / (vbar * (vbar + bRk) * Math.sqrt(T));
      const Zrk = (Prk * vbar) / (RUB * T);
      const TR = T / g.Tc;
      const pR = Prk / g.pc;

      const x0 = 58, x1 = 414, y0 = 184, y1 = 24;
      const X = (v: number) => x0 + ((v - 0.07) / (0.52 - 0.07)) * (x1 - x0);
      const pMax = Math.max(250, Pideal * 1.15);
      const Y = (p: number) => clamp(y0 - (p / pMax) * (y0 - y1), y1 - 6, y0);
      const curve = (fn: (v: number) => number) => {
        const pts: string[] = [];
        for (let v = 0.08; v <= 0.501; v += 0.015) pts.push(`${X(v).toFixed(1)},${Y(fn(v)).toFixed(1)}`);
        return pts.join(' ');
      };
      const ptsId = curve((v) => (RUB * T) / v);
      const ptsRk = curve((v) => (RUB * T) / (v - bRk) - aRk / (v * (v + bRk) * Math.sqrt(T)));
      const ptsVdw = curve((v) => (RUB * T) / (v - bVdw) - aVdw / (v * v));
      const cx = X(vbar), cyRk = Y(Prk), cyId = Y(Pideal);

      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Isotermas P-v̄ comparando gás ideal, van der Waals e Redlich-Kwong">
          ${mkDefs('s1')}
          <line x1="${x0}" y1="${y0}" x2="${x1 + 12}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s1n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s1n)"/>
          <text x="${x1 - 2}" y="${y0 + 17}" text-anchor="end" font-size="11" fill="${COL.navy}" font-style="italic">v̄ (m³/kmol)</text>
          <text x="10" y="${y1 + 4}" font-size="11" fill="${COL.navy}" font-style="italic">P (bar)</text>
          <polyline points="${ptsId}" fill="none" stroke="${COL.muted}" stroke-width="2" stroke-dasharray="6 4"/>
          <polyline points="${ptsVdw}" fill="none" stroke="${COL.blue}" stroke-width="2.2"/>
          <polyline points="${ptsRk}" fill="none" stroke="${COL.coral}" stroke-width="3"/>
          <line x1="${cx}" y1="${y0}" x2="${cx}" y2="${Math.min(cyRk, cyId)}" stroke="${COL.iceDeep}" stroke-width="1.5" stroke-dasharray="4 3"/>
          <circle cx="${cx}" cy="${cyId}" r="4.5" fill="${COL.muted}"/>
          <circle cx="${cx}" cy="${cyRk}" r="5.5" fill="${COL.coral}" stroke="#fff" stroke-width="2"/>
          <rect x="262" y="18" width="160" height="58" rx="8" fill="#fff" stroke="${COL.iceDeep}"/>
          <line x1="272" y1="30" x2="296" y2="30" stroke="${COL.muted}" stroke-width="2" stroke-dasharray="6 4"/><text x="302" y="34" font-size="11" fill="${COL.muted}">Gás ideal</text>
          <line x1="272" y1="46" x2="296" y2="46" stroke="${COL.blue}" stroke-width="2.2"/><text x="302" y="50" font-size="11" fill="${COL.blue}">van der Waals</text>
          <line x1="272" y1="62" x2="296" y2="62" stroke="${COL.coral}" stroke-width="3"/><text x="302" y="66" font-size="11" font-weight="700" fill="${COL.coral}">Redlich–Kwong</text>
          <text x="64" y="210" font-size="11" fill="${COL.muted}">${g.name}: T<tspan dy="2" font-size="8.5">R</tspan><tspan dy="-2"> = ${fmt(TR, 2)} · p</tspan><tspan dy="2" font-size="8.5">R</tspan><tspan dy="-2"> = ${fmt(pR, 2)}</tspan></text>
        </svg>`,
        kpis: [
          { label: texInline(String.raw`P_{\text{ideal}}`), value: `${fmt(Pideal, 1)} bar` },
          { label: texInline(String.raw`P_{\text{vdW}}`), value: `${fmt(Pvdw, 1)} bar` },
          { label: texInline(String.raw`P_{\text{RK}}`), value: `${fmt(Prk, 1)} bar`, accent: true },
          { label: texInline(String.raw`Z_{\text{RK}}`), value: fmt(Zrk, 3) },
        ],
        insight: Math.abs(Zrk - 1) < 0.05
          ? `Com ${texInline(`T_R = ${tnum(TR, 2)}`)} e ${texInline(`p_R = ${tnum(pR, 2)}`)}, temos ${texInline(`Z \\approx ${tnum(Zrk, 2)}`)}: o modelo de gás ideal apresenta erro inferior a 5%.`
          : Zrk < 1
            ? `${texInline(`Z = ${tnum(Zrk, 3)} < 1`)}: as forças atrativas reduzem a pressão de impacto na parede (desvio ideal de ${texInline(`+${tnum(((Pideal - Prk) / Prk) * 100, 1)}\\%`)}).`
            : `${texInline(`Z = ${tnum(Zrk, 3)} > 1`)}: o volume próprio das moléculas (covolume repulsivo) eleva a pressão acima do modelo ideal.`,
        trace: (phase) => ({ x: cx, y: lerp(cyId, cyRk, 0.5 - 0.5 * Math.cos(phase * Math.PI * 2)), tag: 'ΔP' }),
      };
    },
  },

  /* 2. first-law-closed */
  {
    id: 'first-law-closed',
    defaultTitle: 'Fronteira Móvel em Sistema Fechado: Processo Politrópico PVⁿ = C',
    subtitle: 'Visualize a área ∫ P dV no diagrama P–V enquanto o pistão desloca e o calor Q₁₂ fecha ΔU.',
    autoplay: true,
    params: [
      { key: 'n', label: 'Expoente politrópico n', unit: '', min: 0, max: 1.6, step: 0.1, initial: 1.3 },
      { key: 'ratio', label: 'Razão volumétrica V₂/V₁', unit: '', min: 0.3, max: 2.5, step: 0.1, initial: 1.8 },
      { key: 'p1', label: 'Pressão inicial P₁', unit: 'kPa', min: 100, max: 600, step: 25, initial: 200 },
    ],
    render: (s) => {
      const { n, ratio, p1 } = s;
      const V1 = 0.2;
      const V2 = V1 * ratio;
      const P2 = p1 * ratio ** -n;
      const kAir = 1.4;
      const W = Math.abs(n - 1) < 1e-4 ? p1 * V1 * Math.log(ratio) : (p1 * V1 - P2 * V2) / (n - 1);
      const dU = ((p1 * V1) / (kAir - 1)) * (ratio ** (1 - n) - 1);
      const Q = dU + W;

      const x0 = 52;
      const x1 = 266;
      const y0 = 186;
      const y1 = 24;
      const X = (v: number) => x0 + ((v - 0.04) / (0.54 - 0.04)) * (x1 - x0);
      const pMax = Math.max(700, p1 * 1.15, P2 * 1.15);
      const Y = (p: number) => clamp(y0 - (p / pMax) * (y0 - y1), y1, y0);
      const pathPts: [number, number][] = [];
      const stepsN = 20;
      for (let i = 0; i <= stepsN; i++) {
        const v = lerp(V1, V2, i / stepsN);
        const p = p1 * (v / V1) ** -n;
        pathPts.push([X(v), Y(p)]);
      }
      const polyLine = pathPts.map((pt) => `${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join(' ');
      const gasOf = (v: number) => clamp(44 * (v / V1), 20, 96);
      const gas0 = gasOf(V1);
      const molSeeds: [number, number][] = [[0.12, 0.3], [0.38, 0.72], [0.62, 0.22], [0.85, 0.6], [0.25, 0.55], [0.72, 0.85], [0.5, 0.45]];
      const pingPong = (ph: number) => 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
      const qDir = Q >= 0.05 ? 'entra' : Q <= -0.05 ? 'sai' : 'nulo';
      const qArrow =
        qDir === 'entra'
          ? `<path d="M276,104 H296" stroke="${COL.coral}" stroke-width="2.6" marker-end="url(#s2c)"/><text x="275" y="96" font-size="10" font-weight="700" fill="${COL.coral}">Q</text>`
          : qDir === 'sai'
            ? `<path d="M298,104 H276" stroke="${COL.coral}" stroke-width="2.6" marker-end="url(#s2c)"/><text x="278" y="96" font-size="10" font-weight="700" fill="${COL.coral}">Q</text>`
            : `<text x="276" y="106" font-size="9.5" font-weight="700" fill="${COL.muted}">Q≈0</text>`;
      const wArrow =
        ratio > 1.02
          ? `<path d="M92,-4 V-28" stroke="${COL.navy}" stroke-width="2.6" marker-end="url(#s2n)"/><text x="100" y="-12" font-size="11" font-weight="700" fill="${COL.navy}">W &gt; 0</text>`
          : ratio < 0.98
            ? `<path d="M92,-28 V-4" stroke="${COL.navy}" stroke-width="2.6" marker-end="url(#s2n)"/><text x="100" y="-12" font-size="11" font-weight="700" fill="${COL.navy}">W &lt; 0</text>`
            : '';

      return {
        svg: `<svg viewBox="0 0 448 225" role="img" aria-label="Diagrama P-V e cilindro-pistão sincronizados">
          ${mkDefs('s2')}
          <polygon points="${X(V1).toFixed(1)},${y0} ${polyLine} ${X(V2).toFixed(1)},${y0}" fill="${COL.coralSoft}" opacity="0.65"/>
          <line x1="${x0}" y1="${y0}" x2="${x1 + 10}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s2n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s2n)"/>
          <polyline points="${polyLine}" fill="none" stroke="${COL.coral}" stroke-width="3.2"/>
          <circle cx="${X(V1)}" cy="${Y(p1)}" r="5" fill="${COL.navy}"/><text x="${X(V1) - 14}" y="${Y(p1) - 7}" font-size="11" font-weight="700" fill="${COL.navy}">1</text>
          <circle cx="${X(V2)}" cy="${Y(P2)}" r="5" fill="${COL.coral}"/><text x="${X(V2) + (ratio >= 1 ? 8 : -16)}" y="${Y(P2) - 7}" font-size="11" font-weight="700" fill="${COL.coral}">2</text>
          <text x="${x1}" y="${y0 + 18}" font-size="11" fill="${COL.navy}" font-style="italic">V (m³)</text>
          <text x="${x0 + 8}" y="${y1 + 2}" font-size="11" fill="${COL.navy}" font-style="italic">P (kPa)</text>
          ${qArrow}
          <g transform="translate(302,38)">
            <rect x="0" y="0" width="126" height="126" rx="8" fill="${COL.paper}" stroke="${COL.navy}" stroke-width="2.5"/>
            <rect class="fl-gas" x="4" y="${122 - gas0}" width="118" height="${gas0}" fill="${COL.ice}"/>
            ${molSeeds.map(([fx, fy], i) => `<circle class="fl-mol" data-fx="${fx}" data-fy="${fy}" cx="${(8 + fx * 110).toFixed(1)}" cy="${(122 - fy * gas0).toFixed(1)}" r="2.6" fill="${i % 2 ? COL.coral : COL.blue}"/>`).join('')}
            <rect class="fl-pis" x="3" y="${110 - gas0}" width="120" height="12" fill="${COL.navy}"/>
            <line class="fl-rod" x1="63" y1="${110 - gas0}" x2="63" y2="-10" stroke="${COL.navy}" stroke-width="4.5"/>
            ${wArrow}
            <text x="63" y="146" font-size="11" text-anchor="middle" font-weight="700" fill="${COL.navy}">${ratio >= 1 ? 'Expansão (W > 0)' : 'Compressão (W < 0)'}</text>
            <text class="fl-read" x="63" y="162" font-size="10.5" text-anchor="middle" fill="${COL.muted}">V = 0,20 m³ · P = ${fmt(p1, 0)} kPa</text>
          </g>
        </svg>`,
        kpis: [
          { label: 'Pressão final P₂', value: `${fmt(P2, 1)} kPa` },
          { label: 'Trabalho W₁₂', value: `${fmt(W, 2)} kJ`, accent: true },
          { label: 'Variação ΔU (ar)', value: `${fmt(dU, 2)} kJ` },
          { label: 'Calor Q₁₂', value: `${fmt(Q, 2)} kJ` },
        ],
        insight:
          Math.abs(n - kAir) < 0.05
            ? `Com ${texInline('n \\approx k = 1{,}4')} (ar), ${texInline('Q_{12} \\approx 0')}: o trabalho provém integralmente da energia interna (${texInline('W_{12} \\approx -\\Delta U')}).`
            : n === 0
              ? `Processo isobárico (${texInline('n = 0')}): ${texInline('W_{12} = P(V_2 - V_1)')} e o calor iguala a variação de entalpia (${texInline('Q = \\Delta H')}).`
              : `Para ${texInline(`n = ${tnum(n, 1)}`)}, o trabalho corresponde à área sob a curva (${texInline(`${tnum(W, 2)}\\ \\mathrm{kJ}`)}) e o calor fecha ${texInline(`Q_{12} = \\Delta U + W_{12} = ${tnum(Q, 2)}\\ \\mathrm{kJ}`)}.`,
        trace: (phase) => {
          const v = V1 + (V2 - V1) * pingPong(phase);
          return { x: X(v), y: Y(p1 * (V1 / v) ** n), tag: '1→2' };
        },
        onPhase: (phase, svg) => {
          const v = V1 + (V2 - V1) * pingPong(phase);
          const P = p1 * (V1 / v) ** n;
          const gh = gasOf(v);
          const gas = svg.querySelector('.fl-gas');
          const pis = svg.querySelector('.fl-pis');
          const rod = svg.querySelector('.fl-rod');
          const read = svg.querySelector('.fl-read');
          gas?.setAttribute('y', (122 - gh).toFixed(1));
          gas?.setAttribute('height', gh.toFixed(1));
          pis?.setAttribute('y', (110 - gh).toFixed(1));
          rod?.setAttribute('y1', (110 - gh).toFixed(1));
          svg.querySelectorAll<SVGCircleElement>('.fl-mol').forEach((c, i) => {
            const fx = Number(c.dataset.fx);
            const fy = Number(c.dataset.fy);
            const jx = 3.5 * Math.sin(phase * Math.PI * 2 * (5 + i) + i);
            const jy = 3 * Math.cos(phase * Math.PI * 2 * (4 + i) + 2 * i);
            c.setAttribute('cx', clamp(8 + fx * 110 + jx, 7, 119).toFixed(1));
            c.setAttribute('cy', clamp(122 - fy * (gh - 6) + jy, 124 - gh, 119).toFixed(1));
          });
          if (read) read.textContent = `V = ${fmt(v, 2)} m³ · P = ${fmt(P, 0)} kPa`;
        },
      };
    },
  },

  /* 3. control-volume-steady */
  {
    id: 'control-volume-steady',
    defaultTitle: 'Volume de Controle em Regime Permanente (Dispositivos)',
    subtitle: `Escolha o equipamento e veja como ${texInline('\\dot m')}, ${texInline('\\Delta h')}, ${texInline('\\dot Q')} e ${texInline('\\dot W')} fecham a 1ª Lei.`,
    autoplay: true,
    modes: [
      { id: 'turbina', label: 'Turbina' },
      { id: 'compressor', label: 'Compressor' },
      { id: 'bocal', label: 'Bocal' },
      { id: 'valvula', label: 'Válvula' },
      { id: 'eletrolisador', label: 'Eletrolisador' },
    ],
    params: [
      { key: 'mdot', label: 'Vazão mássica ṁ', unit: 'kg/s', min: 0.5, max: 12, step: 0.5, initial: 5.0 },
      { key: 'dh', label: 'Variação de entalpia |Δh| (no eletrolisador ajusta U)', unit: 'kJ/kg', min: 50, max: 900, step: 25, initial: 500 },
      { key: 'qloss', label: 'Perda de calor Q̇ (sai)', unit: 'kW', min: 0, max: 200, step: 10, initial: 20 },
    ],
    render: (s, mode) => {
      const { mdot, dh, qloss } = s;
      const cx = 205;
      const cy = 105;
      const flowDur = clamp(7 / mdot, 0.55, 4.5);
      let W = 0;
      let extraLabel = 'Potência Ẇ (sai)';
      let extraVal = '';
      let msg = '';
      let icon = '';
      let shaft = '';
      let accel = false;
      let showQ = qloss > 0;
      if (mode === 'turbina') {
        W = mdot * dh - qloss;
        extraVal = `${fmt(W, 1)} kW`;
        msg = `Turbina adiabática ideal entregaria ${texInline(`\\dot m\\,\\Delta h = ${tnum(mdot * dh, 1)}\\ \\mathrm{kW}`)}; a perda térmica reduz a potência: ${texInline(`\\dot W = \\dot m(h_1 - h_2) - \\dot Q_{\\text{sai}} = ${tnum(W, 1)}\\ \\mathrm{kW}`)}.`;
        icon = `<path d="M150 74 L262 52 L262 158 L150 136 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="3"/>`;
      } else if (mode === 'compressor') {
        W = -(mdot * dh + qloss);
        extraLabel = 'Potência consumida |Ẇ|';
        extraVal = `${fmt(Math.abs(W), 1)} kW`;
        msg = `O compressor recebe trabalho (${texInline('\\dot W < 0')}): ${texInline(`|\\dot W| = \\dot m(h_2 - h_1) + \\dot Q_{\\text{sai}} = ${tnum(Math.abs(W), 1)}\\ \\mathrm{kW}`)}. Resfriar o gás durante a compressão diminui ${texInline('h_2')} e o trabalho exigido.`;
        icon = `<path d="M150 52 L262 74 L262 136 L150 158 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="3"/>`;
      } else if (mode === 'bocal') {
        const V2 = Math.sqrt(40 * 40 + 2000 * dh);
        extraLabel = 'Velocidade de saída V₂';
        extraVal = `${fmt(V2, 0)} m/s`;
        accel = true;
        showQ = false;
        msg = `Bocal adiabático (${texInline('\\dot W = 0,\\ \\dot Q \\approx 0')}): a queda de entalpia vira energia cinética, ${texInline(`V_2 = \\sqrt{V_1^2 + 2\\,\\Delta h} = \\sqrt{40^2 + 2(${Math.round(dh)}\\,000)} = ${tnum(V2, 0)}\\ \\mathrm{m/s}`)}.`;
        icon = `<path d="M150 58 L262 92 L262 118 L150 152 Z" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="3"/>`;
      } else if (mode === 'valvula') {
        extraLabel = 'Entalpia de saída';
        extraVal = 'h₂ = h₁';
        showQ = false;
        msg = `Válvula de estrangulamento: ${texInline('\\dot W = 0')}, ${texInline('\\dot Q \\approx 0')} e ${texInline('\\Delta ec \\approx 0')}, logo ${texInline('h_2 = h_1')} (processo isentálpico). A pressão cai e, num líquido saturado, parte vaporiza (flash).`;
        icon = `<path d="M160 70 L250 140 M160 140 L250 70" stroke="${COL.navy}" stroke-width="3.5" fill="none"/><rect x="196" y="40" width="18" height="30" fill="${COL.navy}"/><line x1="174" y1="40" x2="236" y2="40" stroke="${COL.navy}" stroke-width="4"/>`;
      } else {
        const U = clamp(1.25 + (dh / 900) * 0.95, 1.25, 2.2);
        const Wel = -(2 * 96485 * U) / 1000;
        const Qmol = Wel + 285.8;
        extraLabel = `U = ${fmt(U, 2)} V · calor`;
        extraVal = `${fmt(Qmol, 1)} kJ/mol H₂`;
        showQ = Math.abs(U - 1.48) > 0.04;
        msg = `${texInline(`\\dot W_{\\text{el}} = -2FU = ${tnum(Wel, 1)}\\ \\mathrm{kJ/mol}`)} e ${texInline('\\Delta \\bar h_R = +285{,}8\\ \\mathrm{kJ/mol}')}. ` +
          (Math.abs(U - 1.48) < 0.04
            ? 'Tensão termoneutra (1,48 V): o calor trocado é praticamente nulo.'
            : U > 1.48
              ? `Acima de 1,48 V a célula é exotérmica e rejeita ${texInline(`${tnum(Math.abs(Qmol), 1)}\\ \\mathrm{kJ/mol}`)}.`
              : `Abaixo de 1,48 V a célula é endotérmica e absorve ${texInline(`${tnum(Qmol, 1)}\\ \\mathrm{kJ/mol}`)}.`);
        icon = `<rect x="150" y="54" width="112" height="102" rx="12" fill="${COL.paper}" stroke="${COL.navy}" stroke-width="3"/><rect x="168" y="70" width="12" height="74" fill="${COL.coral}"/><rect x="232" y="70" width="12" height="74" fill="${COL.navy}"/>` +
          [0, 0.4, 0.8, 1.2].map((b, i) => `<circle cx="${i % 2 ? 238 : 174}" cy="140" r="3" fill="#fff" stroke="${i % 2 ? COL.navy : COL.coral}" stroke-width="1.4"><animate attributeName="cy" values="140;74" dur="1.6s" begin="${b}s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.6s" begin="${b}s" repeatCount="indefinite"/></circle>`).join('');
      }
      if (mode === 'turbina' || mode === 'compressor') {
        const spin = clamp(12 / (Math.abs(W) / 300 + 1), 0.4, 6);
        icon += `<g transform="translate(${cx} ${cy})"><g><circle r="20" fill="#fff" stroke="${COL.navy}" stroke-width="2.2"/><path d="M0 -18 V18 M-18 0 H18 M-12.7 -12.7 L12.7 12.7 M12.7 -12.7 L-12.7 12.7" stroke="${COL.navy}" stroke-width="2"/><animateTransform attributeName="transform" type="rotate" from="0" to="${mode === 'turbina' ? 360 : -360}" dur="${spin.toFixed(2)}s" repeatCount="indefinite"/></g></g>`;
        shaft = mode === 'turbina'
          ? `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="196" stroke="${COL.navy}" stroke-width="4"/><path d="M${cx + 8},186 H${cx + 60}" stroke="${COL.navy}" stroke-width="2.6" marker-end="url(#s3n)"/><text x="${cx + 64}" y="190" font-size="11" font-weight="700" fill="${COL.navy}">Ẇ (sai)</text>`
          : `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="196" stroke="${COL.navy}" stroke-width="4"/><path d="M${cx + 60},186 H${cx + 8}" stroke="${COL.navy}" stroke-width="2.6" marker-end="url(#s3n)"/><text x="${cx + 64}" y="190" font-size="11" font-weight="700" fill="${COL.navy}">Ẇ (entra)</text>`;
      }
      const qArrow = showQ
        ? `<path d="M${cx - 60},170 V198" stroke="${COL.coral}" stroke-width="2.6" marker-end="url(#s3c)"/><text x="${cx - 54}" y="196" font-size="11" font-weight="700" fill="${COL.coral}">Q̇</text>`
        : '';
      const streamPts: [number, number][] = [[30, cy], [400, cy]];
      const motion = accel
        ? `keyPoints="0;0.45;1" keyTimes="0;0.75;1" calcMode="linear"`
        : '';
      const particles = [0, 0.25, 0.5, 0.75]
        .map((f) => `<circle r="4" fill="${COL.coral}" stroke="#fff" stroke-width="1.2"><animateMotion path="M30,${cy} H400" dur="${flowDur.toFixed(2)}s" begin="${(-f * flowDur).toFixed(2)}s" ${motion} repeatCount="indefinite"/></circle>`)
        .join('');
      return {
        svg: `<svg viewBox="0 0 440 210" role="img" aria-label="Esquema animado do volume de controle selecionado">
          ${mkDefs('s3')}
          <rect x="128" y="32" width="156" height="146" rx="14" fill="none" stroke="${COL.coral}" stroke-width="2" stroke-dasharray="7 5"><animate attributeName="stroke-dashoffset" from="0" to="24" dur="2s" repeatCount="indefinite"/></rect>
          <line x1="28" y1="${cy}" x2="146" y2="${cy}" stroke="${COL.navy}" stroke-width="5"/>
          <line x1="264" y1="${cy}" x2="408" y2="${cy}" stroke="${COL.navy}" stroke-width="5" marker-end="url(#s3n)"/>
          ${icon}
          ${particles}
          ${shaft}
          ${qArrow}
          <text x="${cx}" y="22" font-size="11.5" font-weight="700" text-anchor="middle" fill="${COL.navy}">Fronteira do volume de controle</text>
          <text x="30" y="88" font-size="11" font-weight="700" fill="${COL.navy}">Entrada 1</text>
          <text x="30" y="128" font-size="10.5" fill="${COL.muted}">h<tspan dy="3" font-size="8">1</tspan><tspan dy="-3">, V</tspan><tspan dy="3" font-size="8">1</tspan></text>
          <text x="330" y="88" font-size="11" font-weight="700" fill="${COL.navy}">Saída 2</text>
          <text x="330" y="128" font-size="10.5" fill="${COL.muted}">h<tspan dy="3" font-size="8">2</tspan><tspan dy="-3">, V</tspan><tspan dy="3" font-size="8">2</tspan></text>
        </svg>`,
        kpis: [
          { label: extraLabel, value: extraVal, accent: true },
          { label: 'Vazão ṁ', value: `${fmt(mdot, 1)} kg/s` },
          { label: 'Calor perdido', value: showQ && mode !== 'eletrolisador' ? `${fmt(qloss, 0)} kW` : '≈ 0' },
        ],
        insight: `${msg}<br>${texInline('0 = \\dot Q_{\\text{vc}} - \\dot W_{\\text{vc}} + \\dot m\\left[(h_1 - h_2) + \\tfrac{V_1^2 - V_2^2}{2} + g(z_1 - z_2)\\right]')}`,
        trace: (phase) => {
          const [x, y] = samplePolyline(streamPts, phase);
          return { x, y, tag: 'ṁ' };
        },
      };
    },
  },

  /* 4. pv-dome-quality */
  {
    id: 'pv-dome-quality',
    defaultTitle: 'Substância Pura: Cúpula de Saturação & Regra da Alavanca',
    subtitle: `Escolha a pressão e o título ${texInline('x')}; a animação percorre a vaporização de f (líquido saturado) até g (vapor saturado).`,
    autoplay: true,
    params: [
      { key: 'idx', label: 'Nível de pressão (Tab. A-3, de 0,1 a 40 bar)', unit: '', min: 1, max: 9, step: 1, initial: 4 },
      { key: 'x', label: 'Título mássico x', unit: '', min: 0, max: 1, step: 0.05, initial: 0.45 },
    ],
    render: (s) => {
      const sat = STEAM_SAT[clamp(Math.round(s.idx), 0, STEAM_SAT.length - 1)];
      const x = s.x;
      const v = sat.vf + x * (sat.vg - sat.vf);
      const h = sat.hf + x * sat.hfg;
      const u = sat.uf + x * (sat.ug - sat.uf);
      const vFrac = (x * sat.vg) / v;

      const yT = 186 - ((sat.T - 40) / (374 - 40)) * 140;
      const sF = 110 + (sat.sf / 4.43) * 105;
      const sG = 385 - ((8.3 - sat.sg) / (8.3 - 4.43)) * 170;
      const sX = lerp(sF, sG, x);
      const pp = (ph: number) => 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);

      return {
        svg: `<svg viewBox="0 0 440 220" role="img" aria-label="Diagrama T-s com a linha de saturação e o estado de título x">
          ${mkDefs('s4')}
          <path d="M88,190 C112,115 162,46 215,46 C268,46 340,115 398,190 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2.5"/>
          <line x1="50" y1="194" x2="420" y2="194" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s4n)"/>
          <line x1="50" y1="194" x2="50" y2="20" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s4n)"/>
          <path d="M${(sF - 26).toFixed(1)},${Math.min(yT + 30, 190).toFixed(1)} Q${(sF - 10).toFixed(1)},${(yT + 4).toFixed(1)} ${sF.toFixed(1)},${yT.toFixed(1)} L${sG.toFixed(1)},${yT.toFixed(1)} Q${(sG + 24).toFixed(1)},${(yT - 22).toFixed(1)} ${Math.min(sG + 50, 412).toFixed(1)},${Math.max(yT - 50, 24).toFixed(1)}" fill="none" stroke="${COL.blue}" stroke-width="1.6" stroke-dasharray="5 4"/>
          <line x1="${sF.toFixed(1)}" y1="${yT.toFixed(1)}" x2="${sG.toFixed(1)}" y2="${yT.toFixed(1)}" stroke="${COL.navy}" stroke-width="2.8"/>
          <circle cx="${sF.toFixed(1)}" cy="${yT.toFixed(1)}" r="4.5" fill="${COL.navy}"/><text x="${(sF - 16).toFixed(1)}" y="${(yT + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${COL.navy}">f</text>
          <circle cx="${sG.toFixed(1)}" cy="${yT.toFixed(1)}" r="4.5" fill="${COL.navy}"/><text x="${(sG + 8).toFixed(1)}" y="${(yT + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${COL.navy}">g</text>
          <circle cx="${sX.toFixed(1)}" cy="${yT.toFixed(1)}" r="6.5" fill="${COL.navy}" stroke="#fff" stroke-width="2"/>
          <text class="pd-x" x="${sX.toFixed(1)}" y="${(yT - 12).toFixed(1)}" font-size="11" font-weight="700" text-anchor="middle" fill="${COL.coral}">x = ${fmt(x, 2)}</text>
          <text x="406" y="212" font-size="11" fill="${COL.navy}" font-style="italic">s</text>
          <text x="30" y="30" font-size="11" fill="${COL.navy}" font-style="italic">T</text>
          <text x="215" y="34" font-size="10.5" text-anchor="middle" fill="${COL.muted}">P = ${fmt(sat.pBar, 2)} bar · T<tspan dy="3" font-size="8">sat</tspan><tspan dy="-3"> = ${fmt(sat.T, 1)} °C</tspan></text>
        </svg>`,
        kpis: [
          { label: 'Entalpia h', value: `${fmt(h, 1)} kJ/kg`, accent: true },
          { label: 'Energia interna u', value: `${fmt(u, 1)} kJ/kg` },
          { label: 'Volume específico v', value: `${fmt(v, 4)} m³/kg` },
          { label: 'Fração do volume ocupada pelo vapor', value: `${fmt(vFrac * 100, 1)} %` },
        ],
        insight: `Com ${texInline(`x = ${tnum(x, 2)}`)}, ${texInline(`h = h_f + x\\,h_{fg} = ${tnum(sat.hf, 1)} + ${tnum(x, 2)}(${tnum(sat.hfg, 1)}) = ${tnum(h, 1)}\\ \\mathrm{kJ/kg}`)}. O vapor ocupa ${texInline(`${tnum(vFrac * 100, 1)}\\%`)} do volume porque ${texInline('v_g \\gg v_f')}. Durante a vaporização, ${texInline('T')} e ${texInline('P')} ficam constantes: só o título muda.`,
        trace: (phase) => ({ x: lerp(sF, sG, pp(phase)), y: yT }),
        onPhase: (phase, svg) => {
          const t = svg.querySelector('.pd-x');
          const xx = pp(phase);
          if (t) {
            t.setAttribute('x', lerp(sF, sG, xx).toFixed(1));
            t.textContent = `x = ${fmt(xx, 2)}`;
          }
        },
      };
    },
  },

  /* 5. carnot-engine */
  {
    id: 'carnot-engine',
    defaultTitle: 'Ciclo de Carnot Reversível (Motor, Refrigerador e Bomba de Calor)',
    subtitle: `No plano ${texInline('T\\text{–}S')} o ciclo de Carnot é um retângulo: a área é ${texInline('W_{\\text{ciclo}}')} e a escala termodinâmica de Kelvin impõe ${texInline('Q_H/Q_L = T_H/T_L')}.`,
    autoplay: true,
    modes: [
      { id: 'motor', label: 'Motor Térmico' },
      { id: 'refrig', label: 'Refrigerador' },
      { id: 'bc', label: 'Bomba de Calor' },
    ],
    params: [
      { key: 'TH', label: `Reservatório quente ${texInline('T_H')}`, unit: 'K', min: 350, max: 1200, step: 25, initial: 750 },
      { key: 'TL', label: `Reservatório frio ${texInline('T_L')}`, unit: 'K', min: 230, max: 340, step: 5, initial: 300 },
      { key: 'Q', label: `Calor de referência (${texInline('Q_H')} no motor e na bomba de calor, ${texInline('Q_L')} no refrigerador)`, unit: 'kJ', min: 50, max: 300, step: 10, initial: 100 },
    ],
    render: (s, mode) => {
      const { TH, TL, Q } = s;
      const motor = mode === 'motor';
      const QH = mode === 'refrig' ? (Q * TH) / TL : Q;
      const QL = mode === 'refrig' ? Q : (Q * TL) / TH;
      const dS = QH / TH;
      const W = QH - QL;
      const eta = 1 - TL / TH;
      const etaCA = 1 - Math.sqrt(TL / TH);
      const copR = TL / (TH - TL);
      const copBC = TH / (TH - TL);

      // diagrama T-S em escala real de temperatura
      const x0 = 46, y0 = 188, yTop = 22;
      const Y = (T: number) => y0 - (T / 1250) * (y0 - yTop);
      const yH = Y(TH), yL = Y(TL);
      const sa = 74, sb_ = sa + clamp(34 + 120 * dS, 34, 180);
      const corners: [number, number][] = [[sa, yH], [sb_, yH], [sb_, yL], [sa, yL]];
      // motor: 1→2 isotérmica a T_H, 2→3 adiabática, 3→4 isotérmica a T_L, 4→1 adiabática (horário)
      const procs: [number, number][][] = motor
        ? [[corners[0], corners[1]], [corners[1], corners[2]], [corners[2], corners[3]], [corners[3], corners[0]]]
        : [[corners[3], corners[2]], [corners[2], corners[1]], [corners[1], corners[0]], [corners[0], corners[3]]];
      const procTxt = motor
        ? [`1→2 · expansão isotérmica a ${sb('T', 'H')}: recebe ${sb('Q', 'H')}`, '2→3 · expansão adiabática: T cai até T<tspan dy="3.5" font-size="72%">L</tspan><tspan dy="-3.5"> </tspan>', `3→4 · compressão isotérmica a ${sb('T', 'L')}: rejeita ${sb('Q', 'L')}`, '4→1 · compressão adiabática: volta a T<tspan dy="3.5" font-size="72%">H</tspan>']
        : [`1→2 · expansão isotérmica a ${sb('T', 'L')}: retira ${sb('Q', 'L')}`, '2→3 · compressão adiabática até T<tspan dy="3.5" font-size="72%">H</tspan>', `3→4 · compressão isotérmica a ${sb('T', 'H')}: entrega ${sb('Q', 'H')}`, '4→1 · expansão adiabática até T<tspan dy="3.5" font-size="72%">L</tspan>'];
      const close = yL - yH < 15;
      const yLlab = close ? yH + 15 : yL;
      const wTxtY = yL - yH > 20 ? (yH + yL) / 2 + 4 : yH - 7;
      const wInside = sb_ - sa > 118;
      const labs = motor ? ['1', '2', '3', '4'] : ['4', '3', '2', '1'];

      // esquema de reservatórios à direita
      const cx = 350, cy = 112;
      const wHot = clamp(2 + QH / 45, 2.5, 8);
      const wCold = clamp(2 + QL / 45, 2.5, 8);
      const wW = clamp(2 + W / 45, 2.5, 8);
      const hotPath = motor ? `M${cx},58 V${cy - 30}` : `M${cx},${cy - 30} V58`;
      const coldPath = motor ? `M${cx},${cy + 30} V164` : `M${cx},164 V${cy + 30}`;
      const wPath = motor ? `M${cx + 30},${cy} H428` : `M428,${cy} H${cx + 30}`;
      const dur = (q: number) => clamp(3.2 - q / 120, 0.8, 3.2);
      const tag = motor ? 'MT' : mode === 'refrig' ? 'R' : 'BC';

      const kpis: SimKpi[] = motor
        ? [
            { label: `Rendimento máximo ${texInline(String.raw`\eta_{\text{Carnot}}`)}`, value: `${fmt(eta * 100, 1)} %`, accent: true },
            { label: `Curzon–Ahlborn ${texInline(String.raw`1-\sqrt{T_L/T_H}`)}`, value: `${fmt(etaCA * 100, 1)} %` },
            { label: `Trabalho ${texInline(String.raw`W_{\text{ciclo}}`)}`, value: `${fmt(W, 1)} kJ` },
            { label: `Calor rejeitado ${texInline('Q_L')}`, value: `${fmt(QL, 1)} kJ` },
          ]
        : [
            { label: mode === 'refrig' ? `${texInline(String.raw`\mathrm{COP}_{R,\text{máx}}`)}` : `${texInline(String.raw`\mathrm{COP}_{BC,\text{máx}}`)}`, value: fmt(mode === 'refrig' ? copR : copBC, 2), accent: true },
            { label: `Trabalho mínimo ${texInline(String.raw`W_{\text{mín}}`)}`, value: `${fmt(W, 1)} kJ` },
            { label: mode === 'refrig' ? `Calor entregue ao ambiente ${texInline('Q_H')}` : `Calor retirado do exterior ${texInline('Q_L')}`, value: `${fmt(mode === 'refrig' ? QH : QL, 1)} kJ` },
            { label: `Variação de entropia ${texInline(String.raw`\Delta S = Q_H/T_H`)}`, value: `${fmt(dS, 3)} kJ/K` },
          ];

      return {
        svg: `<svg viewBox="0 0 440 220" role="img" aria-label="Ciclo de Carnot no diagrama T-S e esquema dos reservatórios">
          ${mkDefs('s5')}
          <line x1="${x0}" y1="${y0}" x2="272" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s5n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${yTop - 6}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s5n)"/>
          <text x="262" y="${y0 + 16}" font-size="11" fill="${COL.navy}" font-style="italic">S</text>
          <text x="${x0 + 8}" y="${yTop + 2}" font-size="11" fill="${COL.navy}" font-style="italic">T (K)</text>
          <rect x="${sa}" y="${yL.toFixed(1)}" width="${(sb_ - sa).toFixed(1)}" height="${(y0 - yL).toFixed(1)}" fill="${COL.iceDeep}" opacity="0.5"/>
          <rect x="${sa}" y="${yH.toFixed(1)}" width="${(sb_ - sa).toFixed(1)}" height="${(yL - yH).toFixed(1)}" fill="${COL.coralSoft}" stroke="${COL.navy}" stroke-width="2.4"/>
          <path d="M${((sa + sb_) / 2 - 8).toFixed(1)},${(yH - 0).toFixed(1)} l8,0" stroke="${COL.navy}" stroke-width="2.4" marker-end="url(#s5n)" transform="${motor ? '' : `rotate(180 ${((sa + sb_) / 2).toFixed(1)} ${yH.toFixed(1)})`}"/>
          <text x="${(wInside ? (sa + sb_) / 2 : sb_ + 8).toFixed(1)}" y="${wTxtY.toFixed(1)}" font-size="11.5" font-weight="700" text-anchor="${wInside ? 'middle' : 'start'}" fill="${COL.coral}">${motor ? sb('W', 'ciclo') : sb('W', 'mín')} = ${fmt(W, 1)} kJ</text>
          ${(y0 - yL) > 18 ? `<text x="${(wInside ? (sa + sb_) / 2 : sb_ + 8).toFixed(1)}" y="${((yL + y0) / 2 + 4).toFixed(1)}" font-size="10" text-anchor="${wInside ? 'middle' : 'start'}" fill="${COL.navy}">${sb('Q', 'L')} = ${fmt(QL, 1)} kJ</text>` : ''}
          ${corners.map((c, i) => `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="3.5" fill="${COL.navy}"/><text x="${(c[0] + (i === 0 || i === 3 ? -11 : 5)).toFixed(1)}" y="${(c[1] + (i < 2 ? -5 : 13)).toFixed(1)}" font-size="10.5" font-weight="700" fill="${COL.navy}">${labs[i]}</text>`).join('')}
          <text x="${x0 - 4}" y="${(yH + 4).toFixed(1)}" font-size="10.5" font-weight="700" text-anchor="end" fill="${COL.coral}">${sb('T', 'H')}</text>
          <text x="${x0 - 4}" y="${(yLlab + 4).toFixed(1)}" font-size="10.5" font-weight="700" text-anchor="end" fill="${COL.blue}">${sb('T', 'L')}</text>
          <text x="270" y="${yTop + 8}" font-size="10" text-anchor="end" fill="${COL.muted}">ΔS = ${fmt(dS, 3)} kJ/K</text>
          <text class="cn-proc" x="${x0 + 4}" y="214" font-size="10.5" fill="${COL.navy}">${procTxt[0]}</text>

          <rect x="286" y="26" width="128" height="30" rx="7" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="2"/>
          <text x="350" y="45" font-size="10.5" font-weight="700" text-anchor="middle" fill="${COL.navy}">${sb('T', 'H')} = ${fmt(TH, 0)} K</text>
          <rect x="286" y="166" width="128" height="30" rx="7" fill="${COL.ice}" stroke="${COL.blue}" stroke-width="2"/>
          <text x="350" y="185" font-size="10.5" font-weight="700" text-anchor="middle" fill="${COL.navy}">${sb('T', 'L')} = ${fmt(TL, 0)} K</text>
          <path d="${hotPath}" stroke="${COL.coral}" stroke-width="${wHot.toFixed(1)}" marker-end="url(#s5c)"/>
          <path d="${coldPath}" stroke="${COL.blue}" stroke-width="${wCold.toFixed(1)}" marker-end="url(#s5n)"/>
          <path d="${wPath}" stroke="${COL.navy}" stroke-width="${wW.toFixed(1)}" marker-end="url(#s5n)"/>
          ${pulses(hotPath, COL.coral, dur(QH), 3, 3.4)}${pulses(coldPath, COL.blue, dur(QL), 3, 3.4)}${pulses(wPath, COL.navy, dur(W), 2, 3.2)}
          <circle cx="${cx}" cy="${cy}" r="28" fill="#fff" stroke="${COL.navy}" stroke-width="2.4"/>
          <text x="${cx}" y="${cy + 4}" font-size="12" font-weight="700" text-anchor="middle" fill="${COL.navy}">${tag}</text>
          <text x="${cx - 12}" y="${cy - 40}" font-size="10" font-weight="700" text-anchor="end" fill="${COL.coral}">${sb('Q', 'H')} = ${fmt(QH, 0)} kJ</text>
          <text x="${cx - 12}" y="${cy + 50}" font-size="10" font-weight="700" text-anchor="end" fill="${COL.blue}">${sb('Q', 'L')} = ${fmt(QL, 0)} kJ</text>
          <text x="430" y="${cy - 10}" font-size="10" font-weight="700" text-anchor="end" fill="${COL.navy}">W = ${fmt(W, 0)} kJ</text>
        </svg>`,
        kpis,
        insight: motor
          ? `${texInline(String.raw`\eta_{\text{Carnot}} = 1 - \tfrac{T_L}{T_H} = 1 - \tfrac{${fmt(TL, 0)}}{${fmt(TH, 0)}} = ${tnum(eta * 100, 1)}\%`)}: nenhum motor operando entre esses reservatórios pode superar esse valor (corolário de Carnot). Motores reais ficam próximos do limite de potência máxima de Curzon–Ahlborn, ${texInline(`${tnum(etaCA * 100, 1)}\\%`)}.`
          : `${texInline(String.raw`\mathrm{COP}_{BC,\text{máx}} - \mathrm{COP}_{R,\text{máx}} = ${tnum(copBC, 2)} - ${tnum(copR, 2)} = 1`)} exatamente, porque ${texInline('Q_H = Q_L + W')}. Quanto menor ${texInline('T_H - T_L')}, menor o trabalho mínimo: ${texInline(`W_{\\text{mín}} = Q_L\\,(T_H/T_L - 1) = ${tnum(W, 1)}\\ \\mathrm{kJ}`)}.`,
        trace: (phase) => {
          const [x, y] = cycleSample(procs, phase);
          return { x, y };
        },
        onPhase: (phase, svg) => {
          const el = svg.querySelector('.cn-proc');
          const i = Math.min(3, Math.floor((((phase % 1) + 1) % 1) * 4));
          if (el && el.getAttribute('data-i') !== String(i)) {
            el.setAttribute('data-i', String(i));
            el.innerHTML = procTxt[i];
          }
        },
      };
    },
  },

  /* 6. entropy-exergy */
  {
    id: 'entropy-exergy',
    defaultTitle: 'Geração de Entropia e Teorema de Gouy–Stodola',
    subtitle: `Calor atravessando uma diferença finita de temperatura ou expansão real numa turbina: a exergia destruída é ${texInline(String.raw`\dot I = T_0\,\dot S_{\text{ger}}`)} e a eficiência de 2ª lei compara o útil com o reversível.`,
    autoplay: true,
    modes: [
      { id: 'trocador', label: 'Calor através de ΔT finito' },
      { id: 'turbina', label: 'Turbina adiabática real (ar)' },
    ],
    params: [
      { key: 'T0', label: `Ambiente ${texInline('T_0')}`, unit: 'K', min: 273, max: 313, step: 5, initial: 298 },
      { key: 'TH', label: `Fonte quente ${texInline('T_H')}`, unit: 'K', min: 400, max: 1200, step: 25, initial: 800, modes: ['trocador'] },
      { key: 'TC', label: `Receptor ${texInline('T_C')} (limitado a ${texInline('T_H')})`, unit: 'K', min: 320, max: 1150, step: 10, initial: 400, modes: ['trocador'] },
      { key: 'Qd', label: `Taxa de calor ${texInline(String.raw`\dot Q`)}`, unit: 'kW', min: 50, max: 500, step: 25, initial: 100, modes: ['trocador'] },
      { key: 'T1', label: `Entrada da turbina ${texInline('T_1')}`, unit: 'K', min: 700, max: 1500, step: 50, initial: 1100, modes: ['turbina'] },
      { key: 'rp', label: `Razão de pressões ${texInline('P_1/P_2')}`, unit: '', min: 2, max: 20, step: 1, initial: 8, modes: ['turbina'] },
      { key: 'eta', label: `Eficiência isentrópica ${texInline(String.raw`\eta_t`)}`, unit: '%', min: 60, max: 100, step: 2, initial: 86, modes: ['turbina'] },
    ],
    render: (s, mode) => {
      const { T0 } = s;
      const hx = mode === 'trocador';
      let Sger = 0, I = 0, Wu = 0, Wrev = 0, unitS = 'kW/K', unitE = 'kW';
      let TC = s.TC, T2 = 0, T2s = 0, wS = 0;
      const cp = 1.005, R = 0.287, k = 1.4;
      if (hx) {
        TC = Math.min(s.TC, s.TH);
        Sger = s.Qd * (1 / TC - 1 / s.TH);
        Wrev = s.Qd * (1 - T0 / s.TH);
        Wu = s.Qd * (1 - T0 / TC);
        I = T0 * Sger;
      } else {
        T2s = s.T1 * Math.pow(s.rp, -(k - 1) / k);
        wS = cp * (s.T1 - T2s);
        Wu = (s.eta / 100) * wS;
        T2 = s.T1 - Wu / cp;
        Sger = cp * Math.log(T2 / s.T1) + R * Math.log(s.rp);
        I = T0 * Sger;
        Wrev = Wu + I;
        unitS = 'kJ/(kg·K)';
        unitE = 'kJ/kg';
      }
      const fU = Wrev > 1e-9 ? clamp(Wu / Wrev, 0, 1) : 1;
      const bx = 40, bw = 360;
      const wU = fU * bw, wI = bw - wU;
      const flowDur = hx ? clamp(4 - s.Qd / 150, 0.9, 4) : 1.6;
      const hotFill = hx ? COL.coralSoft : COL.ice;

      const schematic = hx
        ? `<rect x="34" y="28" width="112" height="70" rx="10" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="2"/>
           <text x="90" y="58" font-size="11" font-weight="700" text-anchor="middle" fill="${COL.navy}">Fonte</text>
           <text x="90" y="76" font-size="11" text-anchor="middle" fill="${COL.navy}">${sb('T', 'H')} = ${fmt(s.TH, 0)} K</text>
           <rect x="294" y="28" width="112" height="70" rx="10" fill="${COL.ice}" stroke="${COL.blue}" stroke-width="2"/>
           <text x="350" y="58" font-size="11" font-weight="700" text-anchor="middle" fill="${COL.navy}">Receptor</text>
           <text x="350" y="76" font-size="11" text-anchor="middle" fill="${COL.navy}">${sb('T', 'C')} = ${fmt(TC, 0)} K</text>
           <rect x="214" y="22" width="12" height="82" fill="${COL.muted}" opacity="0.55"/>
           <line x1="150" y1="63" x2="288" y2="63" stroke="${COL.coral}" stroke-width="3" marker-end="url(#s6c)"/>
           ${pulses('M150,63 H286', COL.coral, flowDur, 4, 3.6)}
           <text x="182" y="54" font-size="10.5" font-weight="700" text-anchor="middle" fill="${COL.coral}">Q̇ = ${fmt(s.Qd, 0)} kW</text>
           <text x="258" y="54" font-size="10" text-anchor="middle" fill="${COL.muted}">parede</text>`
        : `<line x1="40" y1="64" x2="146" y2="64" stroke="${COL.navy}" stroke-width="5"/>
           <line x1="294" y1="64" x2="404" y2="64" stroke="${COL.navy}" stroke-width="5" marker-end="url(#s6n)"/>
           <path d="M146 44 L294 24 L294 104 L146 84 Z" fill="${hotFill}" stroke="${COL.navy}" stroke-width="2.4"/>
           ${rotor(220, 64, 17, clamp(3.4 - Wu / 220, 0.6, 3.4), 1)}
           ${pulses('M40,64 H402', COL.coral, 2.2, 4, 3.6)}
           <text x="44" y="50" font-size="10.5" fill="${COL.navy}">${sb('T', '1')} = ${fmt(s.T1, 0)} K</text>
           <text x="300" y="50" font-size="10.5" fill="${COL.navy}">${sb('T', '2')} = ${fmt(T2, 0)} K</text>
           <text x="300" y="86" font-size="10" fill="${COL.muted}">${sb('T', '2s')} = ${fmt(T2s, 0)} K</text>
           <text x="44" y="86" font-size="10" fill="${COL.muted}">${sb('P', '1')}/${sb('P', '2')} = ${fmt(s.rp, 0)}</text>
           <line x1="220" y1="81" x2="220" y2="110" stroke="${COL.navy}" stroke-width="3"/>
           <path d="M226,108 H262" stroke="${COL.navy}" stroke-width="2.4" marker-end="url(#s6n)"/>
           <text x="266" y="112" font-size="10.5" font-weight="700" fill="${COL.navy}">w = ${fmt(Wu, 1)} kJ/kg</text>`;

      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Destruição de exergia: esquema do processo e barra de exergia útil e destruída">
          ${mkDefs('s6')}
          ${schematic}
          <text x="${bx}" y="136" font-size="11" font-weight="700" fill="${COL.navy}">${hx ? `Exergia que sai da fonte: Q̇(1 − ${sb('T', '0')}/${sb('T', 'H')}) = ${fmt(Wrev, 1)} kW` : `Trabalho reversível ${sb('w', 'rev')} = ${sb('ψ', '1')} − ${sb('ψ', '2')} = ${fmt(Wrev, 1)} kJ/kg`}</text>
          <rect x="${bx}" y="144" width="${wU.toFixed(1)}" height="30" rx="4" fill="${COL.navy}"/>
          <rect x="${(bx + wU).toFixed(1)}" y="144" width="${wI.toFixed(1)}" height="30" rx="4" fill="${COL.coral}"><animate attributeName="opacity" values="1;0.65;1" dur="2.4s" repeatCount="indefinite"/></rect>
          ${wU > 92 ? `<text x="${(bx + wU / 2).toFixed(1)}" y="163" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">${hx ? 'chega ao receptor' : 'útil'} ${fmt(fU * 100, 0)}%</text>` : ''}
          ${wI > 74 ? `<text x="${(bx + wU + wI / 2).toFixed(1)}" y="163" font-size="10.5" font-weight="700" text-anchor="middle" fill="#fff">destruída ${fmt((1 - fU) * 100, 0)}%</text>` : ''}
          <text x="${bx}" y="198" font-size="10.5" fill="${COL.muted}">Gouy–Stodola: İ = ${sb('T', '0')}${sb('Ṡ', 'ger')} = ${fmt(T0, 0)} × ${fmt(Sger, 4)} = ${fmt(I, 1)} ${unitE}</text>
          ${hx ? `<text x="${bx}" y="214" font-size="10" fill="${COL.muted}">${sb('Ṡ', 'ger')} = Q̇(1/${sb('T', 'C')} − 1/${sb('T', 'H')}): some se ${sb('T', 'C')} → ${sb('T', 'H')}</text>` : `<text x="${bx}" y="214" font-size="10" fill="${COL.muted}">${sb('s', '2')} − ${sb('s', '1')} = ${sb('c', 'p')} ln(${sb('T', '2')}/${sb('T', '1')}) − R ln(${sb('P', '2')}/${sb('P', '1')}) = ${fmt(Sger, 4)} kJ/(kg·K)</text>`}
        </svg>`,
        kpis: [
          { label: hx ? `Entropia gerada ${texInline(String.raw`\dot S_{\text{ger}} = \dot Q(1/T_C - 1/T_H)`)}` : `Entropia gerada ${texInline(String.raw`s_{\text{ger}} = s_2 - s_1`)}`, value: `${fmt(Sger, 4)} ${unitS}`, accent: true },
          { label: `Exergia destruída ${texInline(String.raw`\dot I = T_0\dot S_{\text{ger}}`)}`, value: `${fmt(I, 1)} ${unitE}` },
          { label: hx ? `Exergia entregue ${texInline(String.raw`\dot Q(1 - T_0/T_C)`)}` : `Trabalho real ${texInline('w')}`, value: `${fmt(Wu, 1)} ${unitE}` },
          { label: `Eficiência de 2ª lei ${texInline(String.raw`\eta_{II}`)}`, value: `${fmt(fU * 100, 1)} %` },
        ],
        insight: hx
          ? `O calor ${texInline(String.raw`\dot Q`)} é o mesmo dos dois lados da parede, mas sua exergia cai de ${texInline(`${tnum(Wrev, 1)}`)} para ${texInline(`${tnum(Wu, 1)}\\ \\mathrm{kW}`)}: a diferença é exatamente ${texInline(`T_0\\dot S_{\\text{ger}} = ${tnum(I, 1)}\\ \\mathrm{kW}`)}. ${TC >= s.TH ? 'Com T_C = T_H a transferência seria reversível (e infinitamente lenta).' : 'Trocadores com ΔT pequeno destroem menos exergia, ao custo de mais área.'}`
          : `Atenção: o trabalho reversível não é o trabalho isentrópico. Aqui ${texInline(`w_s = ${tnum(wS, 1)}`)}, mas ${texInline(`w_{\\text{rev}} = w + T_0 s_{\\text{ger}} = ${tnum(Wrev, 1)}\\ \\mathrm{kJ/kg}`)}, porque o ar sai mais quente que na expansão isentrópica e ainda guarda exergia. Assim, ${texInline(`\\eta_{II} = ${tnum(fU * 100, 1)}\\% > \\eta_t = ${tnum(s.eta, 0)}\\%`)}.`,
        trace: (phase) => (hx ? { x: 150 + 136 * phase, y: 63 } : { x: 40 + 362 * phase, y: 64 }),
      };
    },
  },

  /* 7. ideal-gas-mixture */
  {
    id: 'ideal-gas-mixture',
    defaultTitle: 'Misturas de Gases Ideais: Amagat (Volumes) e Dalton (Pressões)',
    subtitle: `Cada gás começa no próprio compartimento a ${texInline('T')} e ${texInline('P')} (volumes de Amagat ${texInline('V_i = y_i V')}); retirada a divisória, cada um ocupa todo o volume com a pressão parcial de Dalton ${texInline('p_i = y_i P')}.`,
    autoplay: true,
    params: [
      { key: 'yN2', label: `Fração molar ${texInline(String.raw`y_{\mathrm{N_2}}`)}`, unit: '%', min: 10, max: 85, step: 5, initial: 70 },
      { key: 'yO2', label: `Fração molar ${texInline(String.raw`y_{\mathrm{O_2}}`)} (o restante é ${texInline(String.raw`\mathrm{CO_2}`)})`, unit: '%', min: 5, max: 50, step: 5, initial: 20 },
      { key: 'P', label: `Pressão total ${texInline('P')}`, unit: 'kPa', min: 100, max: 800, step: 50, initial: 200 },
    ],
    render: (s) => {
      const yN = s.yN2 / 100;
      const yO = Math.min(s.yO2 / 100, 0.95 - yN);
      const yC = 1 - yN - yO;
      const ys = [yN, yO, yC];
      const Ms = [28.01, 32.0, 44.01];
      const cps = [1.039, 0.918, 0.846]; // Tab. A-20, 300 K
      const names = ['N₂', 'O₂', 'CO₂'];
      const cols = [COL.navy, COL.blue, COL.coral];
      const Mm = ys.reduce((a, y, i) => a + y * Ms[i], 0);
      const Rm = RU / Mm;
      const mfs = ys.map((y, i) => (y * Ms[i]) / Mm);
      const cpM = mfs.reduce((a, mf, i) => a + mf * cps[i], 0);
      const dSmix = -RU * ys.reduce((a, y) => a + (y > 0 ? y * Math.log(y) : 0), 0);

      // caixa: 30 moléculas distribuídas pelas frações molares
      const bx = 22, by = 34, bw = 200, bh = 140;
      const N = 30;
      const counts = [Math.round(yN * N), Math.round(yO * N)];
      counts.push(N - counts[0] - counts[1]);
      const walls: number[] = [];
      let acc = 0;
      ys.forEach((y, i) => { if (i < 2) { acc += y; walls.push(bx + acc * bw); } });
      const mols: { sx: number; sy: number; mx: number; my: number; c: string }[] = [];
      let seed = 7;
      const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
      let x0c = bx;
      counts.forEach((n, i) => {
        const w = ys[i] * bw;
        const cols_ = Math.max(1, Math.round(Math.sqrt((n * w) / bh)));
        for (let j = 0; j < n; j++) {
          const cx = x0c + ((j % cols_) + 0.5) * (w / cols_);
          const cy = by + ((Math.floor(j / cols_) + 0.5) * bh) / Math.ceil(n / cols_);
          mols.push({ sx: cx, sy: cy, mx: bx + 8 + rnd() * (bw - 16), my: by + 8 + rnd() * (bh - 16), c: cols[i] });
        }
        x0c += w;
      });
      const barX = 262, barW = 160;
      const stack = (vals: number[], y: number) => {
        let x = barX;
        return vals.map((v, i) => { const r = `<rect x="${x.toFixed(1)}" y="${y}" width="${(v * barW).toFixed(1)}" height="20" fill="${cols[i]}"/>`; x += v * barW; return r; }).join('');
      };
      const smooth = (t: number) => t * t * (3 - 2 * t);
      const mixOf = (ph: number) => { const p = ((ph % 1) + 1) % 1; return p < 0.22 ? 0 : p < 0.62 ? smooth((p - 0.22) / 0.4) : p < 0.9 ? 1 : 1 - smooth((p - 0.9) / 0.1); };

      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Mistura de três gases: compartimentos de Amagat que se misturam, frações molares e mássicas">
          <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="${COL.paper}" stroke="${COL.navy}" stroke-width="2.4"/>
          ${walls.map((w) => `<line class="gm-wall" x1="${w.toFixed(1)}" y1="${by}" x2="${w.toFixed(1)}" y2="${by + bh}" stroke="${COL.navy}" stroke-width="2.2"/>`).join('')}
          ${mols.map((m, i) => `<circle class="gm-mol" data-i="${i}" cx="${m.sx.toFixed(1)}" cy="${m.sy.toFixed(1)}" r="3.6" fill="${m.c}" stroke="#fff" stroke-width="0.8"/>`).join('')}
          <text class="gm-lab" x="${bx + bw / 2}" y="24" font-size="11" font-weight="700" text-anchor="middle" fill="${COL.navy}">Amagat: cada gás em ${sb('V', 'i')} = ${sb('y', 'i')}V a T e P</text>
          <text x="${bx + bw / 2}" y="192" font-size="10.5" text-anchor="middle" fill="${COL.muted}">T = 300 K · P = ${fmt(s.P, 0)} kPa</text>
          <text x="${bx + bw / 2}" y="208" font-size="10.5" text-anchor="middle" fill="${COL.coral}">Δs̄ de mistura = ${fmt(dSmix, 3)} kJ/(kmol·K) &gt; 0</text>
          <text x="${barX}" y="44" font-size="11" font-weight="700" fill="${COL.navy}">Frações molares ${sb('y', 'i')}</text>
          ${stack(ys, 50)}
          <text x="${barX}" y="94" font-size="11" font-weight="700" fill="${COL.navy}">Frações mássicas ${sb('m', 'f,i')}</text>
          ${stack(mfs, 100)}
          ${names.map((n, i) => `<rect x="${barX}" y="${132 + i * 28}" width="10" height="10" rx="2" fill="${cols[i]}"/><text x="${barX + 15}" y="${141 + i * 28}" font-size="10" fill="${COL.navy}">${n}: y = ${fmt(ys[i], 2)} · ${sb('m', 'f')} = ${fmt(mfs[i], 3)}</text><text x="${barX + 15}" y="${153 + i * 28}" font-size="10" fill="${COL.muted}">${sb('p', 'i')} = ${sb('y', 'i')}P = ${fmt(ys[i] * s.P, 1)} kPa</text>`).join('')}
        </svg>`,
        kpis: [
          { label: `Massa molar aparente ${texInline('M')}`, value: `${fmt(Mm, 2)} kg/kmol`, accent: true },
          { label: `Constante da mistura ${texInline(String.raw`R = \bar R/M`)}`, value: `${fmt(Rm, 4)} kJ/(kg·K)` },
          { label: `${texInline(String.raw`c_p = \sum m_{f,i}\,c_{p,i}`)} (300 K)`, value: `${fmt(cpM, 4)} kJ/(kg·K)` },
          { label: `${texInline(String.raw`\Delta \bar s_{\text{mist}} = -\bar R\sum y_i\ln y_i`)}`, value: `${fmt(dSmix, 3)} kJ/(kmol·K)` },
        ],
        insight: `Frações molares coincidem com as de pressão (Dalton) e de volume (Amagat), mas não com as mássicas: o ${texInline(String.raw`\mathrm{CO_2}`)} tem ${texInline(`y = ${tnum(yC, 2)}`)} e ${texInline(`m_f = ${tnum(mfs[2], 3)}`)}. A mistura a ${texInline('T')} e ${texInline('P')} constantes gera ${texInline(`\\Delta \\bar s = ${tnum(dSmix, 3)}\\ \\mathrm{kJ/(kmol\\cdot K)}`)}, ou ${texInline(`${tnum(dSmix / Mm, 4)}\\ \\mathrm{kJ/(kg\\cdot K)}`)}: separar os gases exigiria trabalho.`,
        trace: () => null,
        onPhase: (phase, svg) => {
          const f = mixOf(phase);
          svg.querySelectorAll<SVGLineElement>('.gm-wall').forEach((w) => w.setAttribute('opacity', (1 - clamp(f * 3, 0, 1)).toFixed(2)));
          svg.querySelectorAll<SVGCircleElement>('.gm-mol').forEach((c) => {
            const m = mols[Number(c.dataset.i)];
            const j = Number(c.dataset.i);
            const jx = 2.2 * Math.sin(phase * Math.PI * 2 * (7 + (j % 5)) + j);
            const jy = 2.2 * Math.cos(phase * Math.PI * 2 * (6 + (j % 4)) + 2 * j);
            c.setAttribute('cx', clamp(lerp(m.sx, m.mx, f) + jx, bx + 4, bx + bw - 4).toFixed(1));
            c.setAttribute('cy', clamp(lerp(m.sy, m.my, f) + jy, by + 4, by + bh - 4).toFixed(1));
          });
          const lab = svg.querySelector('.gm-lab');
          const st = f < 0.5 ? 'A' : 'D';
          if (lab && lab.getAttribute('data-st') !== st) {
            lab.setAttribute('data-st', st);
            lab.innerHTML = st === 'A' ? `Amagat: cada gás em ${sb('V', 'i')} = ${sb('y', 'i')}V a T e P` : `Dalton: cada gás em V, com ${sb('p', 'i')} = ${sb('y', 'i')}P`;
          }
        },
      };
    },
  },

  /* 8. combustion-flame */
  {
    id: 'combustion-flame',
    defaultTitle: 'Combustão, Poder Calorífico e Temperatura Adiabática de Chama',
    subtitle: `Balanço ${texInline(String.raw`H_P(T_{ad}) = H_R`)} resolvido com as Tabelas A-23 e A-25 (combustão completa, sem dissociação). O excesso de ar dilui os produtos e o preaquecimento do ar devolve energia à chama.`,
    autoplay: true,
    modes: [
      { id: 'ch4', label: 'CH₄' },
      { id: 'c3h8', label: 'C₃H₈' },
      { id: 'c8h18', label: 'C₈H₁₈(l)' },
      { id: 'h2', label: 'H₂' },
    ],
    params: [
      { key: 'exc', label: 'Excesso de ar', unit: '%', min: 0, max: 200, step: 10, initial: 20 },
      { key: 'TR', label: `Temperatura do ar de combustão ${texInline('T_{\\text{ar}}')}`, unit: 'K', min: 298, max: 800, step: 25, initial: 298 },
    ],
    render: (s, mode) => {
      const f = FUELS[mode] || FUELS.ch4;
      const aTh = f.c + f.h / 4 - f.o / 2;
      const nCO2 = f.c, nH2O = f.h / 2;
      const solveTad = (exc: number) => {
        const l = 1 + exc / 100;
        const aA = l * aTh, nO = (l - 1) * aTh, nN = 3.76 * aA;
        const hR = f.hf0 + aA * ((hBarGas('O2', s.TR) - 8682) + 3.76 * (hBarGas('N2', s.TR) - 8669));
        let lo = 400, hi = 3400;
        for (let k = 0; k < 32; k++) {
          const mid = 0.5 * (lo + hi);
          const hp = nCO2 * (HF0.CO2 + hBarGas('CO2', mid) - 9364) + nH2O * (HF0.H2Og + hBarGas('H2O', mid) - 9904) + nO * (hBarGas('O2', mid) - 8682) + nN * (hBarGas('N2', mid) - 8669);
          if (hp < hR) lo = mid; else hi = mid;
        }
        return 0.5 * (lo + hi);
      };
      const lam = 1 + s.exc / 100;
      const aAct = lam * aTh;
      const nO2 = (lam - 1) * aTh, nN2 = 3.76 * aAct;
      const AF = (4.76 * aAct * 28.97) / f.M;
      const Tad = solveTad(s.exc);
      const curve: [number, number][] = [];
      for (let e = 0; e <= 200; e += 10) curve.push([e, solveTad(e)]);
      const x0 = 50, x1 = 288, y0 = 184, y1 = 42;
      const X = (e: number) => x0 + (e / 200) * (x1 - x0);
      const Y = (T: number) => clamp(y0 - ((T - 800) / (2800 - 800)) * (y0 - y1), y1 - 6, y0);
      const curvePx: [number, number][] = curve.map(([e, T]) => [X(e), Y(T)]);
      const cx = X(s.exc), cy = Y(Tad);
      const flameH = (T: number) => clamp(18 + ((T - 900) / 1900) * 70, 16, 90);
      const fh = flameH(Tad);
      const prodTxt = `${nCO2 ? `${nCO2} CO₂ + ` : ''}${fmt(nH2O, 0)} H₂O + ${fmt(nO2, 2)} O₂ + ${fmt(nN2, 2)} N₂`;
      const flamePath = (h: number) => `M372,170 C352,${(170 - h * 0.45).toFixed(1)} 366,${(170 - h * 0.7).toFixed(1)} 372,${(170 - h).toFixed(1)} C378,${(170 - h * 0.7).toFixed(1)} 392,${(170 - h * 0.45).toFixed(1)} 372,170 Z`;

      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Temperatura adiabática de chama em função do excesso de ar e queimador animado">
          ${mkDefs('s8')}
          <line x1="${x0}" y1="${y0}" x2="${x1 + 10}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s8n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 10}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s8n)"/>
          ${[1000, 1500, 2000, 2500].map((T) => `<line x1="${x0}" y1="${Y(T).toFixed(1)}" x2="${x1}" y2="${Y(T).toFixed(1)}" stroke="${COL.ice}" stroke-width="1"/><text x="${x0 - 4}" y="${(Y(T) + 4).toFixed(1)}" font-size="9.5" text-anchor="end" fill="${COL.muted}">${T}</text>`).join('')}
          ${[0, 50, 100, 150, 200].map((e) => `<text x="${X(e).toFixed(1)}" y="${y0 + 13}" font-size="9.5" text-anchor="middle" fill="${COL.muted}">${e}</text>`).join('')}
          <polyline points="${pts2str(curvePx)}" fill="none" stroke="${COL.coral}" stroke-width="3"/>
          <line x1="${cx.toFixed(1)}" y1="${y0}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}" stroke="${COL.iceDeep}" stroke-dasharray="4 3"/>
          <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5" fill="${COL.navy}" stroke="#fff" stroke-width="2"/>
          <text x="${(cx + (s.exc > 140 ? -8 : 8)).toFixed(1)}" y="${(cy - 9).toFixed(1)}" font-size="11" font-weight="700" text-anchor="${s.exc > 140 ? 'end' : 'start'}" fill="${COL.navy}">${sb('T', 'ad')} = ${fmt(Tad, 0)} K</text>
          <text x="${x1}" y="${y0 + 28}" font-size="10.5" text-anchor="end" fill="${COL.navy}">excesso de ar (%)</text>
          <text x="${x0 + 6}" y="${y1 - 10}" font-size="10.5" fill="${COL.navy}">${sb('T', 'ad')} (K)</text>
          <text x="${x0 - 30}" y="14" font-size="10" fill="${COL.muted}">Produtos: ${prodTxt}</text>
          <rect x="330" y="170" width="84" height="16" rx="4" fill="${COL.navy}"/>
          <text x="372" y="204" font-size="10" text-anchor="middle" fill="${COL.muted}">ar a ${fmt(s.TR, 0)} K</text>
          <path class="cf-flame" d="${flamePath(fh)}" fill="${COL.coral}" opacity="0.9"><animate attributeName="opacity" values="0.95;0.7;0.95" dur="0.9s" repeatCount="indefinite"/></path>
          <path d="${flamePath(fh * 0.55)}" fill="#ffd36e" opacity="0.95"><animateTransform attributeName="transform" type="scale" values="1 1;1.04 0.93;1 1" dur="0.7s" repeatCount="indefinite" additive="sum"/></path>
          ${[0, 1, 2, 3].map((i) => pulse(`M${360 + i * 8},${(160 - fh).toFixed(0)} V30`, i % 2 ? COL.muted : COL.blue, '2.4s', `${(-i * 0.6).toFixed(1)}s`, 3)).join('')}
          <text class="cf-read" x="380" y="14" font-size="10.5" font-weight="700" text-anchor="middle" fill="${COL.coral}">${fmt(Tad, 0)} K</text>
        </svg>`,
        kpis: [
          { label: `Temperatura adiabática ${texInline('T_{ad}')}`, value: `${fmt(Tad, 0)} K (${fmt(Tad - 273.15, 0)} °C)`, accent: true },
          { label: `Razão ar–combustível ${texInline(String.raw`AF`)}`, value: `${fmt(AF, 2)} kg ar/kg comb.` },
          { label: 'PCS / PCI (Tab. A-25)', value: `${fmt(f.pcs / 1000, 2)} / ${fmt(f.pci / 1000, 2)} MJ/kg` },
          { label: `${texInline(String.raw`T_{ad}`)} estequiométrica`, value: `${fmt(curve[0][1], 0)} K` },
        ],
        insight: `${s.exc > 0 ? `Os ${texInline(`${tnum(nO2 + nN2 - 3.76 * aTh, 2)}\\ \\mathrm{kmol}`)} de ar em excesso só absorvem energia: ${texInline('T_{ad}')} cai de ${texInline(`${tnum(curve[0][1], 0)}`)} para ${texInline(`${tnum(Tad, 0)}\\ \\mathrm{K}`)}.` : 'Com ar teórico a chama atinge o maior valor possível sem preaquecimento.'} ${s.TR > 300 ? `O preaquecimento do ar a ${texInline(`${tnum(s.TR, 0)}\\ \\mathrm{K}`)} eleva ${texInline('H_R')} e, portanto, ${texInline('T_{ad}')}. ` : ''}Na chama real a dissociação de ${texInline(String.raw`\mathrm{CO_2}`)} e ${texInline(String.raw`\mathrm{H_2O}`)} reduz esses valores acima de cerca de ${texInline(String.raw`2\,000\ \mathrm{K}`)}.`,
        trace: (phase) => {
          const [x, y] = samplePolyline(curvePx, pp01(phase));
          return { x, y };
        },
        onPhase: (phase, svg) => {
          const e = 200 * pp01(phase);
          const T = interp1(curve.map((c) => c[0]), curve.map((c) => c[1]), e);
          const fl = svg.querySelector('.cf-flame');
          if (fl) fl.setAttribute('d', flamePath(flameH(T)));
          const rd = svg.querySelector('.cf-read');
          if (rd) rd.textContent = `${fmt(e, 0)}% → ${fmt(T, 0)} K`;
        },
      };
    },
  },

  /* 9. psychrometrics */
  {
    id: 'psychrometrics',
    defaultTitle: 'Carta Psicrométrica Interativa: Processos com Ar Úmido a 1 atm',
    subtitle: `Propriedades com ${texInline(String.raw`\omega = 0{,}622\,p_v/(p - p_v)`)} e ${texInline(String.raw`h = c_{p,a}T + \omega\,h_g(T)`)}, usando ${texInline(String.raw`p_{\text{sat}}`)} e ${texInline('h_g')} da Tabela A-2.`,
    autoplay: true,
    modes: [
      { id: 'resf-desum', label: 'Resfriar e desumidificar' },
      { id: 'aquec', label: 'Aquecimento sensível' },
      { id: 'evap', label: 'Resfriamento evaporativo' },
    ],
    params: [
      { key: 'T1', label: `Temperatura de bulbo seco ${texInline('T_1')}`, unit: '°C', min: 15, max: 42, step: 1, initial: 32 },
      { key: 'phi1', label: `Umidade relativa ${texInline(String.raw`\phi_1`)}`, unit: '%', min: 20, max: 90, step: 5, initial: 60 },
      { key: 'T2', label: `Temperatura de saída ${texInline('T_2')}`, unit: '°C', min: 8, max: 45, step: 1, initial: 14 },
    ],
    render: (s, mode) => {
      const pv1 = (s.phi1 / 100) * pSatA2(s.T1);
      const w1 = omegaOf(pv1);
      const h1 = hAir(s.T1, w1);
      const Tpo = tSatA2(pv1);
      const Tbu = wetBulb(s.T1, w1);
      let T2 = s.T2, w2 = w1, note = '', cond = 0, q = 0;
      let path: [number, number][] = [];
      if (mode === 'aquec') {
        T2 = Math.max(s.T1 + 1, s.T2);
        w2 = w1;
        q = hAir(T2, w2) - h1;
        path = [[s.T1, w1], [T2, w2]];
        note = `Aquecimento sensível: ${texInline(String.raw`\omega`)} fica constante e ${texInline(String.raw`\phi`)} cai porque ${texInline(String.raw`p_{\text{sat}}(T)`)} cresce.`;
      } else if (mode === 'resf-desum') {
        T2 = Math.min(s.T1 - 1, s.T2);
        if (T2 < Tpo) {
          w2 = omegaOf(pSatA2(T2));
          cond = w1 - w2;
          path = [[s.T1, w1], [Tpo, w1]];
          for (let t = Tpo - 1; t > T2; t -= 1) path.push([t, omegaOf(pSatA2(t))]);
          path.push([T2, w2]);
          note = `Abaixo do ponto de orvalho (${texInline(`T_{po} = ${tnum(Tpo, 1)}\\ ^\\circ\\mathrm{C}`)}) o vapor condensa: ${texInline(`\\dot m_w/\\dot m_a = \\omega_1 - \\omega_2 = ${tnum(cond * 1000, 2)}\\ \\mathrm{g/kg}`)}.`;
        } else {
          w2 = w1;
          path = [[s.T1, w1], [T2, w2]];
          note = `${texInline(`T_2 > T_{po} = ${tnum(Tpo, 1)}\\ ^\\circ\\mathrm{C}`)}: resfriamento apenas sensível, sem condensação.`;
        }
        q = hAir(T2, w2) - h1 + cond * hfA2(T2);
      } else {
        T2 = clamp(s.T2, Tbu + 0.3, s.T1 - 1);
        const hw = hfA2(Tbu);
        w2 = (h1 - w1 * hw - 1.005 * T2) / (hgA2(T2) - hw);
        path = [[s.T1, w1], [T2, w2]];
        note = `Saturação adiabática: a água evapora usando o calor sensível do ar, e ${texInline('T_2')} não pode descer abaixo do bulbo úmido ${texInline(`T_{bu} = ${tnum(Tbu, 1)}\\ ^\\circ\\mathrm{C}`)}.`;
      }
      const h2 = hAir(T2, w2);
      const phi2 = clamp((pvOf(w2) / pSatA2(T2)) * 100, 0, 100);

      const x0 = 44, x1 = 396, y0 = 192, y1 = 24;
      const X = (t: number) => x0 + (t / 46) * (x1 - x0);
      const Y = (w: number) => clamp(y0 - (w / 0.034) * (y0 - y1), y1, y0);
      const sat = (mult: number) => {
        const pts: [number, number][] = [];
        for (let t = 0; t <= 46; t += 1) { const w = omegaOf(mult * pSatA2(t)); if (w <= 0.0345) pts.push([X(t), Y(w)]); }
        return pts;
      };
      const pathPx: [number, number][] = path.map(([t, w]) => [X(t), Y(w)]);
      const devTxt = mode === 'aquec' ? 'aquecedor' : mode === 'evap' ? 'aspersores' : 'serpentina fria';
      const coil = mode === 'aquec'
        ? `<path d="M118,48 l6,-8 l6,16 l6,-16 l6,16 l6,-8" stroke="${COL.coral}" stroke-width="2" fill="none"><animate attributeName="opacity" values="1;0.5;1" dur="1.2s" repeatCount="indefinite"/></path>`
        : mode === 'evap'
          ? [0, 1, 2].map((i) => `<circle cx="${122 + i * 10}" cy="38" r="2" fill="${COL.blue}"><animate attributeName="cy" values="38;62" dur="1s" begin="${(i * 0.3).toFixed(1)}s" repeatCount="indefinite"/></circle>`).join('')
          : `<path d="M120,36 v24 M130,36 v24 M140,36 v24 M150,36 v24" stroke="${COL.blue}" stroke-width="2.4"/>${cond > 0 ? `<circle cx="135" cy="64" r="2.2" fill="${COL.blue}"><animate attributeName="cy" values="64;76" dur="0.9s" repeatCount="indefinite"/></circle>` : ''}`;

      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Carta psicrométrica com curva de saturação e o processo 1-2">
          ${mkDefs('s9')}
          <line x1="${x0}" y1="${y0}" x2="${x1 + 8}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s9n)"/>
          <line x1="${x1}" y1="${y0}" x2="${x1}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s9n)"/>
          ${[10, 20, 30, 40].map((t) => `<text x="${X(t).toFixed(1)}" y="${y0 + 12}" font-size="9.5" text-anchor="middle" fill="${COL.muted}">${t}</text>`).join('')}
          ${[0.01, 0.02, 0.03].map((w) => `<line x1="${x0}" y1="${Y(w).toFixed(1)}" x2="${x1}" y2="${Y(w).toFixed(1)}" stroke="${COL.ice}" stroke-width="1"/><text x="${x1 + 4}" y="${(Y(w) + 4).toFixed(1)}" font-size="9.5" fill="${COL.muted}">${fmt(w, 2)}</text>`).join('')}
          <polyline points="${pts2str(sat(1))}" fill="none" stroke="${COL.navy}" stroke-width="2.4"/>
          <polyline points="${pts2str(sat(0.5))}" fill="none" stroke="${COL.iceDeep}" stroke-width="1.5" stroke-dasharray="5 4"/>
          <text x="${(X(31) - 6).toFixed(1)}" y="${(Y(omegaOf(pSatA2(31))) - 4).toFixed(1)}" font-size="10" text-anchor="end" fill="${COL.navy}">φ = 100%</text>
          <text x="${(X(42) + 2).toFixed(1)}" y="${(Y(omegaOf(0.5 * pSatA2(42))) - 6).toFixed(1)}" font-size="10" text-anchor="end" fill="${COL.muted}">50%</text>
          <polyline points="${pts2str(pathPx)}" fill="none" stroke="${COL.coral}" stroke-width="3" marker-end="url(#s9c)"/>
          <circle cx="${X(s.T1).toFixed(1)}" cy="${Y(w1).toFixed(1)}" r="5" fill="${COL.navy}"/><text x="${(X(s.T1) + 7).toFixed(1)}" y="${(Y(w1) + 4).toFixed(1)}" font-size="11" font-weight="700" fill="${COL.navy}">1</text>
          <circle cx="${X(T2).toFixed(1)}" cy="${Y(w2).toFixed(1)}" r="5" fill="${COL.coral}"/><text x="${(X(T2) + (mode === 'aquec' ? 7 : -8)).toFixed(1)}" y="${(Y(w2) + (mode === 'aquec' ? 4 : 14)).toFixed(1)}" font-size="11" font-weight="700" text-anchor="${mode === 'aquec' ? 'start' : 'end'}" fill="${COL.coral}">2</text>
          ${mode === 'resf-desum' && T2 < Tpo ? `<circle cx="${X(Tpo).toFixed(1)}" cy="${Y(w1).toFixed(1)}" r="3.5" fill="#fff" stroke="${COL.navy}" stroke-width="1.6"/><text x="${(X(Tpo) - 6).toFixed(1)}" y="${(Y(w1) - 7).toFixed(1)}" font-size="10" text-anchor="end" fill="${COL.navy}">${sb('T', 'po')}</text>` : ''}
          <text x="${x1 - 4}" y="${y0 + 26}" font-size="10.5" text-anchor="end" fill="${COL.navy}">T (°C)</text>
          <text x="${x1 - 6}" y="${y1 - 10}" font-size="10.5" text-anchor="end" fill="${COL.navy}">ω (kg/kg ar seco)</text>
          <rect x="56" y="30" width="150" height="38" rx="6" fill="${COL.paper}" stroke="${COL.navy}" stroke-width="1.6"/>
          ${coil}
          ${pulses('M58,50 H204', COL.muted, 2.6, 3, 2.8)}
          <text x="131" y="82" font-size="9.5" text-anchor="middle" fill="${COL.muted}">duto: 1 → ${devTxt} → 2</text>
          <text class="ps-read" x="58" y="100" font-size="10" fill="${COL.navy}">T = ${fmt(s.T1, 1)} °C · ω = ${fmt(w1 * 1000, 1)} g/kg</text>
        </svg>`,
        kpis: [
          { label: `Umidade absoluta ${texInline(String.raw`\omega_1 \to \omega_2`)}`, value: `${fmt(w1 * 1000, 1)} → ${fmt(w2 * 1000, 1)} g/kg`, accent: true },
          { label: `Entalpia ${texInline(String.raw`h_1 \to h_2`)}`, value: `${fmt(h1, 1)} → ${fmt(h2, 1)} kJ/kg ar seco` },
          { label: `Umidade relativa final ${texInline(String.raw`\phi_2`)}`, value: `${fmt(phi2, 0)} %` },
          { label: mode === 'evap' ? `Água evaporada ${texInline(String.raw`\omega_2-\omega_1`)}` : `Calor ${texInline(String.raw`q`)} (${q >= 0 ? 'fornecido' : 'removido'})`, value: mode === 'evap' ? `${fmt((w2 - w1) * 1000, 2)} g/kg` : `${fmt(Math.abs(q), 1)} kJ/kg ar seco` },
        ],
        insight: `${note} Estado 1: ${texInline(`T_{po,1} = ${tnum(Tpo, 1)}\\ ^\\circ\\mathrm{C}`)} e ${texInline(`T_{bu,1} = ${tnum(Tbu, 1)}\\ ^\\circ\\mathrm{C}`)}.`,
        trace: (phase) => {
          const [x, y] = samplePolyline(pathPx, pp01(phase));
          return { x, y };
        },
        onPhase: (phase, svg) => {
          const [x, y] = samplePolyline(pathPx, pp01(phase));
          const t = ((x - x0) / (x1 - x0)) * 46;
          const w = ((y0 - y) / (y0 - y1)) * 0.034;
          const rd = svg.querySelector('.ps-read');
          if (rd) rd.textContent = `T = ${fmt(t, 1)} °C · ω = ${fmt(w * 1000, 1)} g/kg`;
        },
      };
    },
  },

  /* 10. vcr-cycle */
  {
    id: 'vcr-cycle',
    defaultTitle: 'Refrigeração por Compressão de Vapor com R-134a (Diagrama P–h)',
    subtitle: `Estados obtidos das Tabelas A-11 e A-12 do Moran: compressão real com ${texInline(String.raw`h_2 = h_1 + (h_{2s} - h_1)/\eta_c`)}, válvula isentálpica ${texInline('h_4 = h_3')} e ${texInline(String.raw`\mathrm{COP}_R = (h_1 - h_4)/(h_2 - h_1)`)}.`,
    autoplay: true,
    modes: [
      { id: 'padrao', label: 'Ciclo padrão (vapor e líquido saturados)' },
      { id: 'subsuper', label: 'Superaquecimento 5 °C e sub-resfriamento 5 °C' },
    ],
    params: [
      { key: 'ie', label: `Evaporador ${texInline(String.raw`T_{\text{evap}}\ (P_{\text{evap}})`)}`, unit: '', min: 0, max: 7, step: 1, initial: 3, fmtVal: (v) => { const r = rSat(VCR_PE[clamp(Math.round(v), 0, 7)]); return `${fmt(r.T, 1)} °C (${fmt(r.p, 1)} bar)`; } },
      { key: 'ic', label: `Condensador ${texInline(String.raw`T_{\text{cond}}\ (P_{\text{cond}})`)}`, unit: '', min: 0, max: 6, step: 1, initial: 3, fmtVal: (v) => { const r = rSat(VCR_PC[clamp(Math.round(v), 0, 6)]); return `${fmt(r.T, 1)} °C (${fmt(r.p, 0)} bar)`; } },
      { key: 'etac', label: `Eficiência isentrópica ${texInline(String.raw`\eta_c`)}`, unit: '%', min: 60, max: 100, step: 5, initial: 80 },
    ],
    render: (s, mode) => {
      const pe = VCR_PE[clamp(Math.round(s.ie), 0, 7)];
      const pc = VCR_PC[clamp(Math.round(s.ic), 0, 6)];
      const ev = rSat(pe), cd = rSat(pc);
      const sup = mode === 'subsuper' ? 5 : 0;
      const st1 = sup ? rSupAt(pe, 'T', ev.T + sup) : { T: ev.T, h: ev.hg, s: ev.sg };
      const st2s = rSupAt(pc, 's', st1.s);
      const wc = (st2s.h - st1.h) / (s.etac / 100);
      const h2 = st1.h + wc;
      const T2 = rSupAt(pc, 'h', h2).T;
      const h3 = sup ? rHfT(cd.T - 5) : cd.hf;
      const h4 = h3;
      const x4 = (h4 - ev.hf) / ev.hfg;
      const qL = st1.h - h4;
      const qH = h2 - h3;
      const cop = qL / wc;
      const copC = (ev.T + 273.15) / (cd.T - ev.T);

      const x0 = 44, x1 = 286, y0 = 188, y1 = 24;
      const X = (h: number) => x0 + (h / 340) * (x1 - x0);
      const Y = (p: number) => y0 - (Math.log(p / 0.5) / Math.log(45 / 0.5)) * (y0 - y1);
      const domeL = R_A10.map((r) => [X(r[2]), Y(r[1])] as [number, number]);
      const domeR = R_A10.map((r) => [X(r[3]), Y(r[1])] as [number, number]).reverse();
      const dome = [...domeL, [X(242), Y(40.59)] as [number, number], ...domeR];
      const P1: [number, number] = [X(st1.h), Y(pe)], P2: [number, number] = [X(h2), Y(pc)], P3: [number, number] = [X(h3), Y(pc)], P4: [number, number] = [X(h4), Y(pe)];
      const procs: [number, number][][] = [[P1, P2], [P2, [X(cd.hg), Y(pc)], [X(cd.hf), Y(pc)], P3], [P3, P4], [P4, [X(ev.hg), Y(pe)], P1]];
      const loop = 'M420,182 V38 H330 V182 H420';
      const dur = clamp(5.5 - cop * 0.6, 2.2, 5.5);

      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Ciclo de refrigeração no diagrama P-h do R-134a e esquema do circuito">
          ${mkDefs('s10')}
          <polygon points="${pts2str(dome)}" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="1.8"/>
          <line x1="${x0}" y1="${y0}" x2="${x1 + 8}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s10n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s10n)"/>
          ${[1, 2, 5, 10, 20, 40].map((p) => `<text x="${x0 - 4}" y="${(Y(p) + 4).toFixed(1)}" font-size="9.5" text-anchor="end" fill="${COL.muted}">${p}</text>`).join('')}
          ${[100, 200, 300].map((h) => `<text x="${X(h).toFixed(1)}" y="${y0 + 12}" font-size="9.5" text-anchor="middle" fill="${COL.muted}">${h}</text>`).join('')}
          <polyline points="${pts2str([P1, P2, P3, P4, P1])}" fill="none" stroke="${COL.coral}" stroke-width="3"/>
          ${[[P1, '1', 7, 13], [P2, '2', 6, -5], [P3, '3', -12, -5], [P4, '4', -12, 13]].map(([p, l, dx, dy]) => `<circle cx="${(p as number[])[0].toFixed(1)}" cy="${(p as number[])[1].toFixed(1)}" r="4" fill="${COL.navy}"/><text x="${((p as number[])[0] + (dx as number)).toFixed(1)}" y="${((p as number[])[1] + (dy as number)).toFixed(1)}" font-size="11" font-weight="700" fill="${COL.navy}">${l}</text>`).join('')}
          <text x="${x1}" y="${y0 + 26}" font-size="10.5" text-anchor="end" fill="${COL.navy}">h (kJ/kg)</text>
          <text x="${x0 + 6}" y="${y1 - 10}" font-size="10.5" fill="${COL.navy}">P (bar, escala log)</text>
          <text x="${x1}" y="${y1 + 12}" font-size="10" font-weight="700" text-anchor="end" fill="${COL.muted}">R-134a</text>

          <path d="${loop}" fill="none" stroke="${COL.iceDeep}" stroke-width="3"/>
          ${pulses(loop, COL.coral, dur, 5, 3.4)}
          <rect x="346" y="28" width="60" height="20" rx="5" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="1.8"/>
          <rect x="346" y="172" width="60" height="20" rx="5" fill="${COL.ice}" stroke="${COL.blue}" stroke-width="1.8"/>
          ${rotor(420, 110, 13, 1.2, -1)}
          <path d="M322,102 L338,118 M322,118 L338,102" stroke="${COL.navy}" stroke-width="2.6"/>
          <path d="M376,26 V8" stroke="${COL.coral}" stroke-width="2.4" marker-end="url(#s10c)"/>
          <path d="M376,214 V196" stroke="${COL.blue}" stroke-width="2.4" marker-end="url(#s10n)"/>
          <text x="382" y="16" font-size="9.5" font-weight="700" fill="${COL.coral}">${sb('q', 'H')} = ${fmt(qH, 0)}</text>
          <text x="382" y="212" font-size="9.5" font-weight="700" fill="${COL.blue}">${sb('q', 'L')} = ${fmt(qL, 0)}</text>
          <text x="376" y="66" font-size="9.5" text-anchor="middle" fill="${COL.muted}">condensador</text>
          <text x="376" y="162" font-size="9.5" text-anchor="middle" fill="${COL.muted}">evaporador</text>
          <text x="404" y="138" font-size="9.5" text-anchor="end" fill="${COL.muted}">compressor</text>
          <text x="342" y="96" font-size="9.5" fill="${COL.muted}">válvula</text>
          <text x="404" y="90" font-size="9.5" font-weight="700" text-anchor="end" fill="${COL.navy}">${sb('w', 'c')} = ${fmt(wc, 1)}</text>
        </svg>`,
        kpis: [
          { label: `${texInline(String.raw`\mathrm{COP}_R`)} (Carnot: ${fmt(copC, 2)})`, value: fmt(cop, 2), accent: true },
          { label: `Efeito refrigerante ${texInline('q_L = h_1 - h_4')}`, value: `${fmt(qL, 1)} kJ/kg` },
          { label: `Trabalho do compressor ${texInline('w_c')}`, value: `${fmt(wc, 1)} kJ/kg` },
          { label: `Descarga ${texInline('T_2')} · título ${texInline('x_4')}`, value: `${fmt(T2, 1)} °C · ${fmt(x4, 3)}` },
        ],
        insight: mode === 'subsuper'
          ? `Sub-resfriar o líquido reduz ${texInline('h_3 = h_4')} e o título ${texInline(`x_4 = ${tnum(x4, 3)}`)}, aumentando ${texInline('q_L')}; o superaquecimento útil também aumenta ${texInline('q_L')}, mas eleva ${texInline(`T_2 = ${tnum(T2, 1)}\\ ^\\circ\\mathrm{C}`)}. Eficiência de 2ª lei: ${texInline(`\\mathrm{COP}_R/\\mathrm{COP}_{\\text{Carnot}} = ${tnum((cop / copC) * 100, 1)}\\%`)}.`
          : `Razão de pressões ${texInline(`P_{\\text{cond}}/P_{\\text{evap}} = ${tnum(pc / pe, 2)}`)}: baixar ${texInline(String.raw`T_{\text{evap}}`)} ou subir ${texInline(String.raw`T_{\text{cond}}`)} aumenta ${texInline('w_c')} e derruba o COP. O estrangulamento deixa ${texInline(`x_4 = ${tnum(x4, 3)}`)} de vapor que não refrigera. ${texInline(`\\eta_{II} = ${tnum((cop / copC) * 100, 1)}\\%`)}.`,
        trace: (phase) => {
          const [x, y] = cycleSample(procs, phase);
          return { x, y };
        },
      };
    },
  },

  /* 11. absorption-cycle */
  {
    id: 'absorption-cycle',
    defaultTitle: 'Refrigeração por Absorção: o Compressor Térmico',
    subtitle: `O limite da 2ª lei para três reservatórios é ${texInline(String.raw`\mathrm{COP}_{\text{rev}} = \left(1 - \tfrac{T_0}{T_G}\right)\tfrac{T_E}{T_0 - T_E}`)}; o COP real vem do equipamento (catálogo ou balanço do par absorvente).`,
    autoplay: true,
    modes: [
      { id: 'libr', label: 'H₂O–LiBr (água gelada)' },
      { id: 'nh3', label: 'NH₃–H₂O (baixa temperatura)' },
    ],
    params: [
      { key: 'TG', label: `Temperatura do gerador ${texInline('T_G')}`, unit: '°C', min: 75, max: 160, step: 5, initial: 95 },
      { key: 'T0', label: `Rejeição (condensador e absorvedor) ${texInline('T_0')}`, unit: '°C', min: 25, max: 42, step: 1, initial: 32 },
      { key: 'TE', label: `Evaporador ${texInline('T_E')}`, unit: '°C', min: -15, max: 12, step: 1, initial: 5 },
      { key: 'cop', label: `COP térmico real ${texInline(String.raw`\dot Q_E/\dot Q_G`)}`, unit: '', min: 0.3, max: 1.0, step: 0.02, initial: 0.7 },
    ],
    render: (s, mode) => {
      const TE = mode === 'libr' ? Math.max(4, s.TE) : s.TE;
      const TGk = s.TG + 273.15, T0k = s.T0 + 273.15, TEk = TE + 273.15;
      const copRev = (1 - T0k / TGk) * (TEk / (T0k - TEk));
      const QE = 100;
      const QG = QE / s.cop;
      const Qrej = QG + QE;
      const Sger = Qrej / T0k - QG / TGk - QE / TEk;
      const I = T0k * Sger;
      const ExG = QG * (1 - T0k / TGk);
      const ExE = QE * (T0k / TEk - 1);
      const viol = s.cop > copRev;
      const refr = mode === 'libr' ? 'H₂O' : 'NH₃';
      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Circuito do ciclo de absorção com gerador, condensador, evaporador, absorvedor, bomba de solução e válvulas">
          ${mkDefs('s11')}
          <rect x="40" y="34" width="112" height="40" rx="8" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="2.2"/>
          <text x="96" y="58" font-size="11" font-weight="700" text-anchor="middle" fill="${COL.navy}">Gerador</text>
          <rect x="296" y="34" width="112" height="40" rx="8" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2.2"/>
          <text x="352" y="58" font-size="11" font-weight="700" text-anchor="middle" fill="${COL.navy}">Condensador</text>
          <rect x="296" y="150" width="112" height="40" rx="8" fill="${COL.ice}" stroke="${COL.blue}" stroke-width="2.2"/>
          <text x="352" y="174" font-size="11" font-weight="700" text-anchor="middle" fill="${COL.navy}">Evaporador</text>
          <rect x="40" y="150" width="112" height="40" rx="8" fill="${COL.paper}" stroke="${COL.navy}" stroke-width="2.2"/>
          <text x="96" y="174" font-size="11" font-weight="700" text-anchor="middle" fill="${COL.navy}">Absorvedor</text>
          <path d="M152,54 H292" stroke="${COL.coral}" stroke-width="2.6" marker-end="url(#s11c)"/>
          <path d="M352,74 V146" stroke="${COL.navy}" stroke-width="2.6" marker-end="url(#s11n)"/>
          <path d="M342,104 L362,120 M342,120 L362,104" stroke="${COL.navy}" stroke-width="2.4"/>
          <path d="M296,170 H156" stroke="${COL.blue}" stroke-width="2.6" marker-end="url(#s11n)"/>
          <path d="M70,150 V78" stroke="${COL.muted}" stroke-width="2.4" marker-end="url(#s11m)"/>
          <path d="M122,74 V146" stroke="${COL.muted}" stroke-width="2.4" stroke-dasharray="5 3" marker-end="url(#s11m)"/>
          <path d="M112,104 L132,120 M112,120 L132,104" stroke="${COL.muted}" stroke-width="2"/>
          ${rotor(70, 112, 10, 1.4, 1, COL.muted)}
          ${pulses('M152,54 H292', COL.coral, 2.2, 3, 3.2)}${pulses('M352,74 V146', COL.navy, 2.0, 3, 3.2)}${pulses('M296,170 H156', COL.blue, 2.2, 3, 3.2)}
          ${pulses('M70,150 V78', COL.muted, 2.4, 3, 3)}${pulses('M122,74 V146', COL.muted, 2.4, 3, 3)}
          <text x="222" y="46" font-size="10" text-anchor="middle" fill="${COL.coral}">vapor de ${refr} (alta P)</text>
          <text x="222" y="186" font-size="10" text-anchor="middle" fill="${COL.blue}">vapor de ${refr} (baixa P)</text>
          <text x="58" y="126" font-size="9.5" text-anchor="end" fill="${COL.muted}">bomba</text>
          <text x="138" y="100" font-size="9.5" fill="${COL.muted}">solução pobre</text>
          <text x="368" y="116" font-size="9.5" fill="${COL.muted}">válvula</text>
          <path d="M96,6 V30" stroke="${COL.coral}" stroke-width="2.6" marker-end="url(#s11c)"/>
          <text x="104" y="18" font-size="10" font-weight="700" fill="${COL.coral}">${sb('Q̇', 'G')} = ${fmt(QG, 1)} kW (${fmt(s.TG, 0)} °C)</text>
          <path d="M352,30 V6" stroke="${COL.navy}" stroke-width="2.4" marker-end="url(#s11n)"/>
          <text x="344" y="18" font-size="10" text-anchor="end" fill="${COL.navy}">${sb('Q̇', 'cond')}</text>
          <path d="M352,216 V194" stroke="${COL.blue}" stroke-width="2.6" marker-end="url(#s11n)"/>
          <text x="344" y="212" font-size="10" font-weight="700" text-anchor="end" fill="${COL.blue}">${sb('Q̇', 'E')} = 100 kW (${fmt(TE, 0)} °C)</text>
          <path d="M96,194 V216" stroke="${COL.navy}" stroke-width="2.4" marker-end="url(#s11n)"/>
          <text x="104" y="212" font-size="10" fill="${COL.navy}">${sb('Q̇', 'abs')} (${fmt(s.T0, 0)} °C)</text>
        </svg>`,
        kpis: [
          { label: `${texInline(String.raw`\mathrm{COP}_{\text{rev}}`)} (limite da 2ª lei)`, value: fmt(copRev, 2) },
          { label: `Calor no gerador ${texInline(String.raw`\dot Q_G`)} (100 kW de frio)`, value: `${fmt(QG, 1)} kW`, accent: true },
          { label: `Eficiência de 2ª lei ${texInline(String.raw`\mathrm{COP}/\mathrm{COP}_{\text{rev}}`)}`, value: viol ? 'impossível' : `${fmt((s.cop / copRev) * 100, 1)} %` },
          { label: `Exergia destruída ${texInline(String.raw`\dot I = T_0\dot S_{\text{ger}}`)}`, value: `${fmt(I, 1)} kW` },
        ],
        insight: viol
          ? `${texInline(`\\mathrm{COP} = ${tnum(s.cop, 2)} > \\mathrm{COP}_{\\text{rev}} = ${tnum(copRev, 2)}`)}: daria ${texInline(String.raw`\dot S_{\text{ger}} < 0`)}, o que viola a 2ª lei. Aumente ${texInline('T_G')}, reduza ${texInline('T_0')} ou aceite um COP menor.`
          : `Balanço global: ${texInline(`\\dot Q_{\\text{rej}} = \\dot Q_G + \\dot Q_E = ${tnum(Qrej, 1)}\\ \\mathrm{kW}`)} (a bomba de solução é desprezível). Exergia recebida ${texInline(`${tnum(ExG, 1)}\\ \\mathrm{kW}`)}, exergia do frio ${texInline(`${tnum(ExE, 1)}\\ \\mathrm{kW}`)} e ${texInline(`\\dot I = ${tnum(I, 1)}\\ \\mathrm{kW}`)}. ${mode === 'libr' ? 'Com água como refrigerante, T_E fica acima de 0 °C (aqui limitada a 4 °C).' : 'O par NH₃–H₂O permite T_E abaixo de 0 °C, mas exige retificador para secar o vapor de amônia.'}`,
        trace: (phase) => {
          const [x, y] = samplePolyline([[152, 54], [352, 54], [352, 170], [96, 170], [70, 150], [70, 60], [152, 54]], phase);
          return { x, y };
        },
      };
    },
  },

  /* 12. gas-cycles */
  {
    id: 'gas-cycles',
    defaultTitle: 'Ciclos a Gás de Ar-Padrão Frio: Otto, Diesel, Stirling e Brayton',
    subtitle: `Ar como gás ideal com ${texInline(String.raw`c_p = 1{,}005`)}, ${texInline(String.raw`c_v = 0{,}718\ \mathrm{kJ/(kg\cdot K)}`)} e ${texInline('k = 1{,}4')}; estado 1 a ${texInline(String.raw`300\ \mathrm{K}`)} e ${texInline(String.raw`100\ \mathrm{kPa}`)}. O ponto percorre o ciclo e o pistão ou as turbomáquinas acompanham.`,
    autoplay: true,
    modes: [
      { id: 'otto', label: 'Otto' },
      { id: 'diesel', label: 'Diesel' },
      { id: 'stirling', label: 'Stirling' },
      { id: 'brayton', label: 'Brayton' },
      { id: 'brayton-reg', label: 'Brayton regenerativo' },
    ],
    params: [
      { key: 'r', label: `Razão de compressão ${texInline('r = v_1/v_2')}`, unit: '', min: 4, max: 22, step: 1, initial: 10, modes: ['otto', 'diesel', 'stirling'] },
      { key: 'rp', label: `Razão de pressões ${texInline('r_p = P_2/P_1')}`, unit: '', min: 4, max: 24, step: 1, initial: 10, modes: ['brayton', 'brayton-reg'] },
      { key: 'T3', label: `Temperatura máxima do ciclo ${texInline('T_{\\text{máx}}')}`, unit: 'K', min: 1000, max: 2200, step: 50, initial: 1600 },
      { key: 'eps', label: `Efetividade do regenerador ${texInline(String.raw`\varepsilon`)}`, unit: '%', min: 0, max: 100, step: 5, initial: 80, modes: ['brayton-reg'] },
    ],
    render: (s, mode) => {
      const cp = 1.005, cv = 0.718, k = 1.4, R = 0.287, T1 = 300, P1 = 100;
      const v1 = (R * T1) / P1;
      const brayton = mode.startsWith('brayton');
      let eta = 0, wNet = 0, qIn = 0, extraLbl = '', extraVal = '', note = '';
      let procs: [number, number][][] = []; // espaço de dados: (v, P) ou (s, T)
      let labels: string[] = ['1', '2', '3', '4'];
      let regenPts: [number, number][][] = [];
      let Tmax = s.T3;
      const iso = (va: number, Pa: number, vb: number, n = 14): [number, number][] => Array.from({ length: n + 1 }, (_, i) => { const v = lerp(va, vb, i / n); return [v, Pa * Math.pow(va / v, k)]; });
      const isoT = (va: number, vb: number, T: number, n = 14): [number, number][] => Array.from({ length: n + 1 }, (_, i) => { const v = lerp(va, vb, i / n); return [v, (R * T) / v]; });
      if (mode === 'otto' || mode === 'diesel' || mode === 'stirling') {
        const r = s.r, v2 = v1 / r;
        const T2 = mode === 'stirling' ? T1 : T1 * Math.pow(r, k - 1);
        if (Tmax < T2 + 50) { Tmax = T2 + 50; note = `${texInline('T_{\\text{máx}}')} foi elevada a ${texInline(`${tnum(Tmax, 0)}\\ \\mathrm{K}`)} para ficar acima de ${texInline('T_2')}. `; }
        const P2 = mode === 'stirling' ? (R * T1) / v2 : P1 * Math.pow(r, k);
        if (mode === 'otto') {
          const P3 = (P2 * Tmax) / T2;
          const T4 = Tmax * Math.pow(r, -(k - 1));
          qIn = cv * (Tmax - T2);
          wNet = qIn - cv * (T4 - T1);
          eta = wNet / qIn;
          procs = [iso(v1, P1, v2), [[v2, P2], [v2, P3]], iso(v2, P3, v1), [[v1, (P1 * T4) / T1], [v1, P1]]];
          note += `Calor a volume constante: ${texInline(String.raw`\eta = 1 - r^{1-k}`)} = ${texInline(`${tnum(eta * 100, 1)}\\%`)}, independente de ${texInline('T_{\\text{máx}}')}. Na prática, ${texInline('r')} é limitado pela detonação (gasolina: 8 a 12).`;
        } else if (mode === 'diesel') {
          const rc = Tmax / T2;
          const v3 = rc * v2;
          const T4 = Tmax * Math.pow(v3 / v1, k - 1);
          qIn = cp * (Tmax - T2);
          wNet = qIn - cv * (T4 - T1);
          eta = wNet / qIn;
          procs = [iso(v1, P1, v2), [[v2, P2], [v3, P2]], iso(v3, P2, v1), [[v1, (P1 * T4) / T1], [v1, P1]]];
          note += `Calor a pressão constante com razão de corte ${texInline(`r_c = T_3/T_2 = ${tnum(rc, 2)}`)}: ${texInline(String.raw`\eta = 1 - \tfrac{1}{r^{k-1}}\tfrac{r_c^k - 1}{k(r_c - 1)}`)} = ${texInline(`${tnum(eta * 100, 1)}\\%`)}, menor que o Otto de mesmo ${texInline('r')} (${texInline(`${tnum((1 - Math.pow(r, 1 - k)) * 100, 1)}\\%`)}).`;
        } else {
          qIn = R * Tmax * Math.log(r);
          wNet = R * (Tmax - T1) * Math.log(r);
          eta = wNet / qIn;
          procs = [isoT(v1, v2, T1), [[v2, (R * T1) / v2], [v2, (R * Tmax) / v2]], isoT(v2, v1, Tmax), [[v1, (R * Tmax) / v1], [v1, P1]]];
          note += `Com regenerador ideal o calor dos dois processos isocóricos é trocado internamente e ${texInline(String.raw`\eta = 1 - T_L/T_H`)} = ${texInline(`${tnum(eta * 100, 1)}\\%`)}, o rendimento de Carnot.`;
        }
        extraLbl = `Pressão média efetiva ${texInline(String.raw`\mathrm{PME} = w/(v_1 - v_2)`)}`;
        extraVal = `${fmt(wNet / (v1 - v2), 0)} kPa`;
      } else {
        const rp = s.rp, e = (k - 1) / k;
        const T2 = T1 * Math.pow(rp, e);
        if (Tmax < T2 + 50) { Tmax = T2 + 50; note = `${texInline('T_3')} foi elevada a ${texInline(`${tnum(Tmax, 0)}\\ \\mathrm{K}`)}. `; }
        const T4 = Tmax / Math.pow(rp, e);
        const wc = cp * (T2 - T1), wt = cp * (Tmax - T4);
        wNet = wt - wc;
        const s3 = cp * Math.log(Tmax / T2);
        const isoP = (Ta: number, sa: number, sb_: number, n = 14): [number, number][] => Array.from({ length: n + 1 }, (_, i) => { const ss = lerp(sa, sb_, i / n); return [ss, Ta * Math.exp((ss - sa) / cp)]; });
        procs = [[[0, T1], [0, T2]], isoP(T2, 0, s3), [[s3, Tmax], [s3, T4]], isoP(T4, s3, 0)];
        let Tx = T2;
        if (mode === 'brayton-reg' && T4 > T2) {
          Tx = T2 + (s.eps / 100) * (T4 - T2);
          const Ty = T4 - (Tx - T2);
          regenPts = [isoP(T2, 0, cp * Math.log(Tx / T2), 8), isoP(T4, s3, s3 - cp * Math.log(T4 / Ty), 8)];
        }
        qIn = cp * (Tmax - Tx);
        eta = wNet / qIn;
        extraLbl = `Razão de trabalho reverso ${texInline(String.raw`\mathrm{bwr} = w_c/w_t`)}`;
        extraVal = `${fmt((wc / wt) * 100, 1)} %`;
        if (mode === 'brayton') {
          note += `${texInline(String.raw`\eta = 1 - r_p^{(1-k)/k}`)} = ${texInline(`${tnum(eta * 100, 1)}\\%`)}; o compressor consome ${texInline(`${tnum((wc / wt) * 100, 1)}\\%`)} do trabalho da turbina, muito mais que a bomba de um ciclo Rankine.`;
        } else {
          note += T4 > T2
            ? `Como ${texInline(`T_4 = ${tnum(T4, 0)}\\ \\mathrm{K} > T_2 = ${tnum(T2, 0)}\\ \\mathrm{K}`)}, o regenerador preaquece o ar até ${texInline(`T_x = ${tnum(Tx, 0)}\\ \\mathrm{K}`)} e o calor da câmara cai para ${texInline(`${tnum(qIn, 1)}\\ \\mathrm{kJ/kg}`)} sem mudar ${texInline('w_{\\text{líq}}')}.`
            : `Com ${texInline(`r_p = ${tnum(rp, 0)}`)}, ${texInline(`T_4 = ${tnum(T4, 0)}\\ \\mathrm{K} \\le T_2 = ${tnum(T2, 0)}\\ \\mathrm{K}`)}: o regenerador esfriaria o ar e foi desativado. A regeneração só compensa em razões de pressão baixas.`;
        }
      }
      // escalas
      const x0 = 46, x1 = 276, y0 = 186, y1 = 24;
      const all = procs.flat();
      const xMax = Math.max(...all.map((p) => p[0])) * 1.1;
      const yMax = Math.max(...all.map((p) => p[1])) * 1.08;
      const yMin = brayton ? 200 : 0;
      const X = (v: number) => x0 + 10 + (v / xMax) * (x1 - x0 - 10);
      const Y = (p: number) => y0 - ((p - yMin) / (yMax - yMin)) * (y0 - y1);
      const toPx = (pp: [number, number][]) => pp.map(([a, b]) => [X(a), Y(b)] as [number, number]);
      const procsPx = procs.map(toPx);
      const corners = procs.map((p) => toPx([p[0]])[0]);
      const cxm = corners.reduce((a, c) => a + c[0], 0) / 4, cym = corners.reduce((a, c) => a + c[1], 0) / 4;
      const pathD = procsPx.map((p, i) => (i === 0 ? 'M' : 'L') + p.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' L')).join(' ') + ' Z';
      const piston = !brayton;
      const vMin = Math.min(...all.map((p) => p[0]));
      const gasH = (v: number) => 20 + ((v - vMin) / (v1 - vMin)) * 104;
      const panel = piston
        ? `<rect x="326" y="34" width="84" height="150" rx="4" fill="none" stroke="${COL.navy}" stroke-width="2.6"/>
           <rect class="gc-gas" x="329" y="37" width="78" height="${gasH(v1).toFixed(1)}" fill="${COL.ice}"/>
           <rect class="gc-pis" x="328" y="${(37 + gasH(v1)).toFixed(1)}" width="80" height="12" fill="${COL.navy}"/>
           <line class="gc-rod" x1="368" y1="${(49 + gasH(v1)).toFixed(1)}" x2="368" y2="214" stroke="${COL.navy}" stroke-width="4"/>
           <circle class="gc-spark" cx="368" cy="44" r="7" fill="${COL.coral}" opacity="0"/>
           <text class="gc-st" x="362" y="22" font-size="9.5" font-weight="700" text-anchor="middle" fill="${COL.navy}">1→2 compressão</text>`
        : `<path d="M300 80 L328 66 L328 118 L300 104 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2"/>
           <rect x="340" y="70" width="40" height="44" rx="8" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="2"/>
           <path d="M360,104 C352,96 356,88 360,80 C364,88 368,96 360,104 Z" fill="${COL.coral}"><animate attributeName="opacity" values="1;0.6;1" dur="0.8s" repeatCount="indefinite"/></path>
           <path d="M392 66 L420 80 L420 104 L392 118 Z" fill="${COL.coralSoft}" stroke="${COL.navy}" stroke-width="2"/>
           <line x1="314" y1="92" x2="406" y2="92" stroke="${COL.navy}" stroke-width="2" opacity="0.35"/>
           ${rotor(314, 92, 9, 0.9, -1)}${rotor(406, 92, 9, 0.9, 1)}
           ${pulses('M292,92 H312 M328,92', COL.blue, 1.6, 2, 3)}
           ${pulses('M328,86 H392', COL.coral, 1.4, 3, 3)}
           ${pulses('M420,92 H436', COL.muted, 1.4, 2, 3)}
           <text x="314" y="132" font-size="9.5" text-anchor="middle" fill="${COL.muted}">compressor</text>
           <text x="360" y="62" font-size="9.5" text-anchor="middle" fill="${COL.muted}">câmara</text>
           <text x="406" y="132" font-size="9.5" text-anchor="middle" fill="${COL.muted}">turbina</text>
           ${mode === 'brayton-reg' ? `<rect x="320" y="150" width="80" height="26" rx="6" fill="${COL.ice}" stroke="${COL.blue}" stroke-width="1.8"/><text x="360" y="167" font-size="9.5" text-anchor="middle" fill="${COL.navy}">regenerador</text>${pulses('M400,163 H320', COL.coral, 2, 2, 2.8)}${pulses('M320,158 H400', COL.blue, 2, 2, 2.8)}` : ''}
           <text class="gc-st" x="362" y="30" font-size="9.5" font-weight="700" text-anchor="middle" fill="${COL.navy}">1→2 compressão</text>`;
      const stageTxt = brayton
        ? ['1→2 compressão isentrópica', '2→3 adição de calor (P cte.)', '3→4 expansão isentrópica', '4→1 rejeição de calor (P cte.)']
        : mode === 'otto'
          ? ['1→2 compressão isentrópica', '2→3 combustão a v constante', '3→4 expansão isentrópica', '4→1 rejeição a v constante']
          : mode === 'diesel'
            ? ['1→2 compressão isentrópica', '2→3 combustão a P constante', '3→4 expansão isentrópica', '4→1 rejeição a v constante']
            : ['1→2 compressão isotérmica', '2→3 regenerador (v cte.)', '3→4 expansão isotérmica', '4→1 regenerador (v cte.)'];

      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Ciclo a gás no diagrama ${brayton ? 'T-s' : 'P-v'} com animação do pistão ou das turbomáquinas">
          ${mkDefs('s12')}
          <line x1="${x0}" y1="${y0}" x2="${x1 + 8}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s12n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s12n)"/>
          <path d="${pathD}" fill="${COL.ice}" stroke="${COL.coral}" stroke-width="3" stroke-linejoin="round"/>
          ${regenPts.map((p) => `<polyline points="${pts2str(toPx(p))}" fill="none" stroke="${COL.blue}" stroke-width="5" opacity="0.6"/>`).join('')}
          ${corners.map((c, i) => { const near = i === 3 && Math.hypot(c[0] - corners[0][0], c[1] - corners[0][1]) < 16; return `<circle cx="${c[0].toFixed(1)}" cy="${c[1].toFixed(1)}" r="4" fill="${COL.navy}"/><text x="${(c[0] + (c[0] >= cxm ? 7 : -13)).toFixed(1)}" y="${(c[1] + (near ? -9 : c[1] >= cym ? 14 : -5)).toFixed(1)}" font-size="11" font-weight="700" fill="${COL.navy}">${labels[i]}</text>`; }).join('')}
          <text x="${x1}" y="${y0 + 16}" font-size="11" text-anchor="end" fill="${COL.navy}" font-style="italic">${brayton ? 's' : 'v'}</text>
          <text x="${x0 + 8}" y="${y1 - 10}" font-size="11" fill="${COL.navy}" font-style="italic">${brayton ? 'T' : 'P'}</text>
          <text x="${(x0 + x1) / 2}" y="${y0 + 30}" font-size="10" text-anchor="middle" fill="${COL.muted}">${brayton ? `${sb('r', 'p')} = ${fmt(s.rp, 0)}` : `r = ${fmt(s.r, 0)}`} · ${sb('T', 'máx')} = ${fmt(Tmax, 0)} K · η = ${fmt(eta * 100, 1)} %</text>
          ${panel}
        </svg>`,
        kpis: [
          { label: `Rendimento térmico ${texInline(String.raw`\eta`)}`, value: `${fmt(eta * 100, 1)} %`, accent: true },
          { label: `Trabalho líquido ${texInline(String.raw`w_{\text{líq}}`)}`, value: `${fmt(wNet, 1)} kJ/kg` },
          { label: `Calor fornecido ${texInline(String.raw`q_{\text{ent}}`)}`, value: `${fmt(qIn, 1)} kJ/kg` },
          { label: extraLbl, value: extraVal },
        ],
        insight: note,
        trace: (phase) => {
          const [x, y] = cycleSample(procsPx, phase);
          return { x, y };
        },
        onPhase: (phase, svg) => {
          const i = Math.min(3, Math.floor((((phase % 1) + 1) % 1) * 4));
          const st = svg.querySelector('.gc-st');
          if (st && st.textContent !== stageTxt[i]) st.textContent = stageTxt[i];
          if (!piston) return;
          const [v] = cycleSample(procs, phase);
          const h = gasH(v);
          svg.querySelector('.gc-gas')?.setAttribute('height', h.toFixed(1));
          svg.querySelector('.gc-gas')?.setAttribute('fill', i === 1 || i === 2 ? COL.coralSoft : COL.ice);
          svg.querySelector('.gc-pis')?.setAttribute('y', (37 + h).toFixed(1));
          svg.querySelector('.gc-rod')?.setAttribute('y1', (49 + h).toFixed(1));
          svg.querySelector('.gc-spark')?.setAttribute('opacity', i === 1 && mode !== 'stirling' ? '0.9' : '0');
        },
      };
    },
  },

  /* 13. rankine-cycle */
  {
    id: 'rankine-cycle',
    defaultTitle: 'Ciclos a Vapor: Rankine Simples, com Reaquecimento e Regenerativo (T–s)',
    subtitle: `Estados das Tabelas A-3 e A-4 do Moran (interpolação linear), bombas isentrópicas ${texInline(String.raw`w_b = v_f\,\Delta P`)} e turbinas com eficiência isentrópica ${texInline(String.raw`\eta_t`)}.`,
    autoplay: true,
    modes: [
      { id: 'simples', label: 'Simples com superaquecimento' },
      { id: 'reheat', label: 'Com reaquecimento' },
      { id: 'regen', label: 'Regenerativo (aquecedor aberto a 7 bar)' },
    ],
    params: [
      { key: 'pCald', label: `Pressão da caldeira ${texInline(String.raw`P_{\text{cald}}`)}`, unit: 'bar', min: 40, max: 140, step: 20, initial: 100 },
      { key: 'Tmax', label: `Temperatura na entrada da turbina ${texInline('T_1')}`, unit: '°C', min: 400, max: 600, step: 40, initial: 520 },
      { key: 'pCond', label: `Pressão do condensador ${texInline(String.raw`P_{\text{cond}}`)}`, unit: 'bar', min: 0.04, max: 0.1, step: 0.02, initial: 0.08 },
      { key: 'etat', label: `Eficiência isentrópica das turbinas ${texInline(String.raw`\eta_t`)}`, unit: '%', min: 70, max: 100, step: 2, initial: 86 },
    ],
    render: (s, mode) => {
      const pB = clamp(Math.round(s.pCald / 20) * 20, 40, 140);
      const c = wSat(s.pCond);
      const r = rankineCalc(mode, pB, s.Tmax, c.p, s.etat / 100);
      const x0 = 44, x1 = 290, y0 = 190, y1 = 22;
      const X = (sv: number) => x0 + (sv / 9) * (x1 - x0);
      const Y = (T: number) => y0 - (T / 640) * (y0 - y1);
      const dome = [...W_SAT.map((w) => [X(w.sf), Y(w.T)] as [number, number]), ...W_SAT.slice().reverse().map((w) => [X(w.sg), Y(w.T)] as [number, number])];
      const procsPx = r.procs.map((p) => p.map(([sv, T]) => [X(sv), Y(T)] as [number, number]));
      const loopA = 'M330,180 V40 H420 V180';
      const loopB = 'M420,180 H330';
      const spin = clamp(2.6 - r.wt / 900, 0.7, 2.6);
      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Ciclo Rankine no diagrama T-s com cúpula de saturação e esquema da planta">
          ${mkDefs('s13')}
          <polygon points="${pts2str(dome)}" fill="${COL.ice}" stroke="${COL.iceDeep}" stroke-width="1.8"/>
          <line x1="${x0}" y1="${y0}" x2="${x1 + 8}" y2="${y0}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s13n)"/>
          <line x1="${x0}" y1="${y0}" x2="${x0}" y2="${y1 - 8}" stroke="${COL.navy}" stroke-width="2" marker-end="url(#s13n)"/>
          ${[100, 200, 300, 400, 500, 600].map((T) => `<text x="${x0 - 4}" y="${(Y(T) + 4).toFixed(1)}" font-size="9.5" text-anchor="end" fill="${COL.muted}">${T}</text>`).join('')}
          ${[2, 4, 6, 8].map((v) => `<text x="${X(v).toFixed(1)}" y="${y0 + 12}" font-size="9.5" text-anchor="middle" fill="${COL.muted}">${v}</text>`).join('')}
          ${procsPx.map((p) => `<polyline points="${pts2str(p)}" fill="none" stroke="${COL.coral}" stroke-width="2.8" stroke-linejoin="round"/>`).join('')}
          ${r.pts.map((p) => `<circle cx="${X(p.s).toFixed(1)}" cy="${Y(p.T).toFixed(1)}" r="3.6" fill="${COL.navy}"/><text x="${(X(p.s) + p.dx).toFixed(1)}" y="${(Y(p.T) + p.dy).toFixed(1)}" font-size="10.5" font-weight="700" fill="${COL.navy}">${p.lab}</text>`).join('')}
          <text x="${x1}" y="${y0 + 26}" font-size="10.5" text-anchor="end" fill="${COL.navy}">s (kJ/(kg·K))</text>
          <text x="${x0 + 6}" y="${y1 - 8}" font-size="10.5" fill="${COL.navy}">T (°C)</text>
          <text x="${x0 + 4}" y="${y0 + 26}" font-size="10" fill="${COL.muted}">${sb('P', 'cald')} = ${pB} bar · ${sb('P', 'cond')} = ${fmt(c.p, 2)} bar${r.pR ? ` · ${sb('P', 'reaq')} = ${r.pR} bar` : ''}</text>
          <path d="${loopA}" fill="none" stroke="${COL.coralSoft}" stroke-width="3"/>
          <path d="${loopB}" fill="none" stroke="${COL.ice}" stroke-width="3"/>
          ${pulses(loopA, COL.coral, 3.2, 4, 3.2)}${pulses(loopB + ' V130', COL.blue, 2.2, 3, 3.2)}
          <rect x="316" y="66" width="28" height="80" rx="6" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="2"/>
          <path d="M330,142 C324,134 327,126 330,118 C333,126 336,134 330,142 Z" fill="${COL.coral}"><animate attributeName="opacity" values="1;0.55;1" dur="0.8s" repeatCount="indefinite"/></path>
          <path d="M408 58 L432 70 L432 112 L408 124 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2"/>
          ${rotor(420, 91, 9, spin, 1)}
          <rect x="350" y="172" width="54" height="16" rx="4" fill="${COL.ice}" stroke="${COL.blue}" stroke-width="1.8"/>
          ${rotor(330, 180, 8, 1.2, -1, COL.blue)}
          <text x="350" y="104" font-size="9.5" fill="${COL.muted}">caldeira</text>
          <text x="402" y="140" font-size="9.5" text-anchor="end" fill="${COL.muted}">turbina</text>
          <text x="377" y="166" font-size="9.5" text-anchor="middle" fill="${COL.muted}">condensador</text>
          <text x="346" y="204" font-size="9.5" text-anchor="middle" fill="${COL.muted}">bomba</text>
          <text x="375" y="30" font-size="10" font-weight="700" text-anchor="middle" fill="${COL.navy}">η = ${fmt(r.eta * 100, 1)} %</text>
        </svg>`,
        kpis: [
          { label: `Rendimento térmico ${texInline(String.raw`\eta`)}`, value: `${fmt(r.eta * 100, 1)} %`, accent: true },
          { label: `Trabalho líquido ${texInline(String.raw`w_{\text{líq}} = w_t - w_b`)}`, value: `${fmt(r.wnet, 1)} kJ/kg` },
          { label: `Calor na caldeira ${texInline(String.raw`q_{\text{ent}}`)}`, value: `${fmt(r.qin, 1)} kJ/kg` },
          { label: r.y !== undefined ? `Fração extraída ${texInline('y')} · título de saída` : 'Título na saída da turbina', value: `${r.y !== undefined ? `${fmt(r.y, 4)} · ` : ''}${r.xOut === null ? 'superaquecido' : fmt(r.xOut, 3)}` },
        ],
        insight: `${r.xOut !== null && r.xOut < 0.88 ? `Título de saída ${texInline(`x = ${tnum(r.xOut, 3)} < 0{,}88`)}: gotas erodem as últimas palhetas; o reaquecimento resolve. ` : ''}${mode === 'reheat' ? `Reaquecimento a ${texInline(`${r.pR}\\ \\mathrm{bar}`)} eleva o título de saída e o trabalho por kg (${texInline(`${tnum(r.wnet, 1)}\\ \\mathrm{kJ/kg}`)}); o ganho de rendimento é pequeno. ` : mode === 'regen' ? `A extração ${texInline(`y = ${tnum(r.y ?? 0, 4)}`)} aquece a água de alimentação até ${texInline(String.raw`165\ ^\circ\mathrm{C}`)}, elevando a temperatura média de adição de calor. ` : ''}Temperatura média de adição de calor ${texInline(String.raw`\bar T_{\text{ent}} = q_{\text{ent}}/\Delta s`)} = ${texInline(`${tnum(r.Tm - 273.15, 0)}\\ ^\\circ\\mathrm{C}`)} contra rejeição a ${texInline(`${tnum(c.T, 1)}\\ ^\\circ\\mathrm{C}`)}.`,
        trace: (phase) => {
          const [x, y] = cycleSample(procsPx, phase);
          return { x, y };
        },
      };
    },
  },

  /* 14. combined-cogeneration */
  {
    id: 'combined-cogeneration',
    defaultTitle: 'Ciclo Combinado (Brayton–Rankine) e Cogeração',
    subtitle: `Turbina a gás em ar-padrão frio com ${texInline(String.raw`\eta_c = 0{,}86`)} e ${texInline(String.raw`\eta_t = 0{,}89`)}; os gases de exaustão são resfriados na caldeira de recuperação até a chaminé. Valores por kg de ar.`,
    autoplay: true,
    modes: [
      { id: 'cc', label: 'Ciclo combinado' },
      { id: 'chp', label: 'Cogeração (calor de processo)' },
    ],
    params: [
      { key: 'rp', label: `Razão de pressões ${texInline('r_p')}`, unit: '', min: 6, max: 24, step: 2, initial: 14 },
      { key: 'T3', label: `Entrada da turbina a gás ${texInline('T_3')}`, unit: 'K', min: 1200, max: 1700, step: 50, initial: 1500 },
      { key: 'Ts', label: `Gases na chaminé ${texInline(String.raw`T_{\text{ch}}`)}`, unit: 'K', min: 360, max: 480, step: 10, initial: 380 },
      { key: 'etaV', label: `Rendimento do ciclo a vapor ${texInline(String.raw`\eta_V`)} (sobre o calor recuperado)`, unit: '%', min: 24, max: 40, step: 1, initial: 33, modes: ['cc'] },
      { key: 'Tp', label: `Temperatura do calor de processo ${texInline('T_p')}`, unit: '°C', min: 100, max: 250, step: 10, initial: 150, modes: ['chp'] },
    ],
    render: (s, mode) => {
      const cp = 1.005, k = 1.4, T1 = 300, T0 = 298.15, e = (k - 1) / k;
      const T2 = T1 + (T1 * Math.pow(s.rp, e) - T1) / 0.86;
      const T4 = s.T3 - 0.89 * (s.T3 - s.T3 / Math.pow(s.rp, e));
      const qin = cp * (s.T3 - T2);
      const wG = cp * (s.T3 - T4) - cp * (T2 - T1);
      const etaG = wG / qin;
      const Qrec = Math.max(0, cp * (T4 - s.Ts));
      const stack = qin - wG - Qrec;
      const cc = mode === 'cc';
      const wV = cc ? (s.etaV / 100) * Qrec : 0;
      const Qp = cc ? 0 : Qrec;
      const cond = cc ? Qrec - wV : 0;
      const etaCC = (wG + wV) / qin;
      const epsU = (wG + Qp) / qin;
      const Tpk = s.Tp + 273.15;
      const etaII = (wG + Qp * (1 - T0 / Tpk)) / (1.04 * qin);
      const segs = cc
        ? [{ v: wG, c: COL.navy, n: `${sb('w', 'TG')}` }, { v: wV, c: COL.coral, n: `${sb('w', 'V')}` }, { v: cond, c: COL.iceDeep, n: 'condens.' }, { v: stack, c: COL.muted, n: 'chaminé' }]
        : [{ v: wG, c: COL.navy, n: `${sb('w', 'TG')}` }, { v: Qp, c: COL.coral, n: `${sb('q', 'p')}` }, { v: stack, c: COL.muted, n: 'chaminé' }];
      let xc = 40;
      const bw = 360;
      const bar = segs.map((g) => {
        const w = (g.v / qin) * bw;
        const out = `<rect x="${xc.toFixed(1)}" y="150" width="${Math.max(0, w).toFixed(1)}" height="24" fill="${g.c}" stroke="#fff" stroke-width="1"/>` +
          (w > 46 ? `<text x="${(xc + w / 2).toFixed(1)}" y="166" font-size="10" font-weight="700" text-anchor="middle" fill="${g.c === COL.iceDeep ? COL.navy : '#fff'}">${fmt((g.v / qin) * 100, 0)}%</text>` : '') +
          `<text x="${(xc + w / 2).toFixed(1)}" y="190" font-size="9.5" text-anchor="middle" fill="${COL.navy}">${w > 34 ? g.n : ''}</text>`;
        xc += w;
        return out;
      }).join('');
      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Esquema de turbina a gás com caldeira de recuperação e balanço de energia">
          ${mkDefs('s14')}
          <path d="M40 56 L70 42 L70 98 L40 84 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2"/>
          <rect x="82" y="50" width="40" height="40" rx="8" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="2"/>
          <path d="M102,82 C94,74 98,66 102,58 C106,66 110,74 102,82 Z" fill="${COL.coral}"><animate attributeName="opacity" values="1;0.55;1" dur="0.8s" repeatCount="indefinite"/></path>
          <path d="M134 42 L164 56 L164 84 L134 98 Z" fill="${COL.coralSoft}" stroke="${COL.navy}" stroke-width="2"/>
          ${rotor(55, 70, 9, 0.9, -1)}${rotor(149, 70, 9, 0.9, 1)}
          <line x1="55" y1="104" x2="149" y2="104" stroke="${COL.navy}" stroke-width="3"/>
          <rect x="196" y="36" width="60" height="70" rx="6" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2"/>
          <path d="M206,96 C220,86 232,58 246,46" stroke="${COL.blue}" stroke-width="2" fill="none"/>
          <rect x="268" y="10" width="14" height="40" fill="${COL.muted}" opacity="0.6"/>
          ${pulses('M20,70 H40 M70,70 H82', COL.blue, 1.4, 2, 3)}${pulses('M122,70 H134', COL.coral, 0.6, 1, 3)}
          ${pulses('M164,70 H196 V60 H256 V30 H275 V4', COL.coral, 3, 4, 3)}
          ${cc
            ? `<path d="M256,90 H300" stroke="${COL.coral}" stroke-width="2.4" marker-end="url(#s14c)"/><path d="M304 74 L328 84 L328 112 L304 122 Z" fill="${COL.ice}" stroke="${COL.navy}" stroke-width="2"/>${rotor(316, 98, 8, 1.2, 1)}<rect x="344" y="88" width="56" height="20" rx="5" fill="${COL.ice}" stroke="${COL.blue}" stroke-width="1.6"/>${pulses('M256,90 H304 M328,98 H344', COL.coral, 1.8, 2, 2.8)}<text x="372" y="128" font-size="9.5" text-anchor="middle" fill="${COL.muted}">condensador</text><text x="316" y="72" font-size="9.5" text-anchor="middle" fill="${COL.muted}">turbina a vapor</text>`
            : `<path d="M256,90 H330" stroke="${COL.coral}" stroke-width="2.4" marker-end="url(#s14c)"/><rect x="334" y="74" width="76" height="34" rx="8" fill="${COL.coralSoft}" stroke="${COL.coral}" stroke-width="1.8"/><text x="372" y="95" font-size="10" text-anchor="middle" fill="${COL.navy}">processo ${fmt(s.Tp, 0)} °C</text>${pulses('M256,90 H332', COL.coral, 1.6, 2, 2.8)}`}
          <text x="55" y="122" font-size="9.5" text-anchor="middle" fill="${COL.muted}">compressor</text>
          <text x="102" y="40" font-size="9.5" text-anchor="middle" fill="${COL.muted}">câmara</text>
          <text x="149" y="122" font-size="9.5" text-anchor="middle" fill="${COL.muted}">turbina</text>
          <text x="226" y="120" font-size="9.5" text-anchor="middle" fill="${COL.muted}">recuperação</text>
          <text x="290" y="26" font-size="9.5" fill="${COL.muted}">${sb('T', 'ch')} = ${fmt(s.Ts, 0)} K</text>
          <text x="196" y="30" font-size="9.5" fill="${COL.navy}">${sb('T', '4')} = ${fmt(T4, 0)} K</text>
          <text x="40" y="142" font-size="10.5" font-weight="700" fill="${COL.navy}">Destino do calor fornecido ${sb('q', 'ent')} = ${fmt(qin, 0)} kJ/kg</text>
          ${bar}
          <text x="40" y="210" font-size="10" fill="${COL.muted}">${cc ? `${sb('η', 'CC')} = ${sb('η', 'TG')} + ${sb('η', 'V')}${sb('f', 'rec')}(1 − ${sb('η', 'TG')}), com ${sb('f', 'rec')} = ${fmt(Qrec / (qin - wG), 3)}` : `${sb('ε', 'u')} conta ${sb('q', 'p')} pela 1ª lei; ${sb('η', 'II')} o pondera por (1 − ${sb('T', '0')}/${sb('T', 'p')}) = ${fmt(1 - T0 / Tpk, 3)}`}</text>
        </svg>`,
        kpis: cc
          ? [
              { label: `Rendimento combinado ${texInline(String.raw`\eta_{CC}`)}`, value: `${fmt(etaCC * 100, 1)} %`, accent: true },
              { label: `Turbina a gás isolada ${texInline(String.raw`\eta_{TG}`)}`, value: `${fmt(etaG * 100, 1)} %` },
              { label: `Calor recuperado ${texInline(String.raw`q_{\text{rec}} = c_p(T_4 - T_{\text{ch}})`)}`, value: `${fmt(Qrec, 1)} kJ/kg` },
              { label: `Potência a vapor / a gás ${texInline(String.raw`w_V/w_{TG}`)}`, value: fmt(wV / wG, 2) },
            ]
          : [
              { label: `Fator de utilização ${texInline(String.raw`\varepsilon_u = (w_{TG} + q_p)/q_{\text{ent}}`)}`, value: `${fmt(epsU * 100, 1)} %`, accent: true },
              { label: `Eficiência exergética ${texInline(String.raw`\eta_{II}`)}`, value: `${fmt(etaII * 100, 1)} %` },
              { label: `Rendimento elétrico ${texInline(String.raw`\eta_{TG}`)}`, value: `${fmt(etaG * 100, 1)} %` },
              { label: `Relação calor/potência ${texInline(String.raw`q_p/w_{TG}`)}`, value: fmt(Qp / wG, 2) },
            ],
        insight: cc
          ? `A exaustão sai a ${texInline(`T_4 = ${tnum(T4, 0)}\\ \\mathrm{K}`)}, quente o bastante para gerar vapor: o ciclo de fundo acrescenta ${texInline(`${tnum((wV / qin) * 100, 1)}`)} pontos percentuais e o conjunto chega a ${texInline(`\\eta_{CC} = ${tnum(etaCC * 100, 1)}\\%`)}. ${s.rp > 16 ? 'Razões de pressão altas esfriam a exaustão e reduzem o calor recuperável.' : 'Razões de pressão moderadas mantêm T₄ alta, o que favorece o ciclo combinado.'}`
          : `Pela 1ª lei a planta aproveita ${texInline(`${tnum(epsU * 100, 1)}\\%`)} do combustível, mas pela 2ª lei só ${texInline(`${tnum(etaII * 100, 1)}\\%`)}: calor a ${texInline(`${tnum(s.Tp, 0)}\\ ^\\circ\\mathrm{C}`)} vale ${texInline(`${tnum(1 - T0 / Tpk, 3)}`)} kJ de trabalho por kJ. A exergia química do gás natural foi tomada como ${texInline(String.raw`1{,}04\,\mathrm{PCI}`)} (Szargut).`,
        trace: (phase) => {
          const [x, y] = samplePolyline([[20, 70], [164, 70], [196, 70], [196, 60], [256, 60], [256, 30], [275, 30], [275, 6]], phase);
          return { x, y };
        },
      };
    },
  },

  /* 15. thermal-machines-exergy */
  {
    id: 'thermal-machines-exergy',
    defaultTitle: 'Diagrama de Grassmann: Onde se Destrói Exergia em Máquinas Térmicas',
    subtitle: `Fonte térmica a ${texInline('T_H')} e ambiente a ${texInline(String.raw`T_0 = 298{,}15\ \mathrm{K}`)}. A faixa começa com a exergia do calor ${texInline(String.raw`q_{\text{ent}}(1 - T_0/T_H)`)} e perde, componente a componente, ${texInline(String.raw`T_0 s_{\text{ger}}`)}; o que chega ao fim é trabalho líquido.`,
    autoplay: true,
    modes: [
      { id: 'rankine', label: 'Usina Rankine' },
      { id: 'brayton', label: 'Turbina a gás' },
      { id: 'combinado', label: 'Ciclo combinado' },
    ],
    params: [
      { key: 'etat', label: `Eficiência isentrópica das turbomáquinas ${texInline(String.raw`\eta`)}`, unit: '%', min: 75, max: 95, step: 2, initial: 87 },
      { key: 'TH', label: `Temperatura da fonte ${texInline('T_H')}`, unit: 'K', min: 1400, max: 2200, step: 100, initial: 1800 },
    ],
    render: (s, mode) => {
      const ex = exergyPlant(mode, s.etat / 100, s.TH);
      const eIn = ex.eIn;
      const x0 = 30, xEnd = 410, yTop = 40, H = 92;
      const n = ex.items.length;
      const step = (xEnd - x0 - 40) / n;
      let thick = H, xs = x0;
      const parts: string[] = [];
      const labs: string[] = [];
      ex.items.forEach((it, i) => {
        const xb = x0 + 20 + (i + 0.5) * step;
        parts.push(`<rect x="${xs.toFixed(1)}" y="${yTop}" width="${(xb - xs + 0.5).toFixed(1)}" height="${thick.toFixed(1)}" fill="${COL.navy}" opacity="0.9"/>`);
        const d = (it.v / eIn) * H;
        thick -= d;
        const bx = xb - Math.max(d, 1.2);
        parts.push(`<rect x="${bx.toFixed(1)}" y="${(yTop + thick).toFixed(1)}" width="${Math.max(d, 1.2).toFixed(1)}" height="${(150 - yTop - thick).toFixed(1)}" fill="${it.loss ? COL.muted : COL.coral}" opacity="0.9"/>`);
        if (d > 2.5) parts.push(pulse(`M${(xb - d / 2).toFixed(1)},${(yTop + thick + d / 2).toFixed(1)} V150`, '#fff', '1.8s', `${(-i * 0.3).toFixed(1)}s`, 2.2));
        const ly = i % 2 ? 182 : 166;
        const lx = xb - Math.max(d, 1.2) / 2;
        labs.push(`<line x1="${lx.toFixed(1)}" y1="152" x2="${lx.toFixed(1)}" y2="${ly - 9}" stroke="${COL.iceDeep}"/><text x="${lx.toFixed(1)}" y="${ly}" font-size="9.5" text-anchor="middle" fill="${COL.navy}">${it.name}</text><text x="${lx.toFixed(1)}" y="${ly + 11}" font-size="9.5" font-weight="700" text-anchor="middle" fill="${it.loss ? COL.muted : COL.coral}">${fmt((it.v / eIn) * 100, 1)}%</text>`);
        xs = xb;
      });
      parts.push(`<rect x="${xs.toFixed(1)}" y="${yTop}" width="${(xEnd - xs).toFixed(1)}" height="${thick.toFixed(1)}" fill="${COL.navy}" opacity="0.9"/>`);
      parts.push(`<path d="M${xEnd},${yTop - 4} L${xEnd + 18},${(yTop + thick / 2).toFixed(1)} L${xEnd},${(yTop + thick + 4).toFixed(1)} Z" fill="${COL.navy}"/>`);
      const flow = pulses(`M${x0},${(yTop + 10).toFixed(1)} H${xEnd}`, '#fff', 3, 4, 2.2) + pulses(`M${x0},${(yTop + Math.max(12, thick - 10)).toFixed(1)} H${xEnd}`, '#fff', 3.6, 3, 2.2);
      const biggest = ex.items.filter((i) => !i.loss).reduce((a, b) => (b.v > a.v ? b : a));
      const loss = ex.items.filter((i) => i.loss).reduce((a, b) => a + b.v, 0);
      return {
        svg: `<svg viewBox="0 0 440 222" role="img" aria-label="Diagrama de Grassmann da exergia ao longo da planta">
          <text x="${x0}" y="22" font-size="10.5" font-weight="700" fill="${COL.navy}">Exergia do calor: ${fmt(eIn, 0)} kJ/kg ${mode === 'rankine' ? 'de vapor' : 'de ar'} (100%)</text>
          ${parts.join('')}
          ${flow}
          <text x="${xEnd - 4}" y="${(yTop + thick / 2 + 4).toFixed(1)}" font-size="10" font-weight="700" text-anchor="end" fill="#fff">${thick > 13 ? `${sb('w', 'líq')} ${fmt((ex.w / eIn) * 100, 1)}%` : ''}</text>
          ${labs.join('')}
          <text x="${x0}" y="214" font-size="9.5" fill="${COL.muted}">coral: destruição ${sb('T', '0')}${sb('s', 'ger')} · cinza: exergia perdida para o ambiente · fecha com erro de ${fmt(ex.res, 2)} kJ/kg</text>
        </svg>`,
        kpis: [
          { label: `Eficiência exergética ${texInline(String.raw`\varepsilon = w_{\text{líq}}/e_Q`)}`, value: `${fmt((ex.w / eIn) * 100, 1)} %`, accent: true },
          { label: `Rendimento térmico ${texInline(String.raw`\eta = w_{\text{líq}}/q_{\text{ent}}`)}`, value: `${fmt((ex.w / ex.qin) * 100, 1)} %` },
          { label: 'Maior destruição', value: `${biggest.name} (${fmt((biggest.v / eIn) * 100, 1)} %)` },
          { label: 'Energia rejeitada / exergia perdida', value: `${fmt((ex.qout / ex.qin) * 100, 0)} % / ${fmt((loss / eIn) * 100, 1)} %` },
        ],
        insight: mode === 'rankine'
          ? `O condensador recebe ${texInline(`${tnum((ex.qout / ex.qin) * 100, 0)}\\%`)} da energia, mas só ${texInline(`${tnum((loss / eIn) * 100, 1)}\\%`)} da exergia, porque rejeita calor perto de ${texInline('T_0')}. A grande destruição está na caldeira: o salto de ${texInline(`${tnum(s.TH, 0)}\\ \\mathrm{K}`)} até a água a no máximo ${texInline(String.raw`520\ ^\circ\mathrm{C}`)}.`
          : mode === 'brayton'
            ? `A exaustão a ${texInline(`${tnum(ex.T4 ?? 0, 0)}\\ \\mathrm{K}`)} leva ${texInline(`${tnum((loss / eIn) * 100, 1)}\\%`)} da exergia para a atmosfera: é essa a justificativa termodinâmica do ciclo combinado.`
            : `A caldeira de recuperação aproveita a exaustão e a perda para o ambiente cai a ${texInline(`${tnum((loss / eIn) * 100, 1)}\\%`)}; a eficiência exergética sobe para ${texInline(`${tnum((ex.w / eIn) * 100, 1)}\\%`)}. O ΔT entre gases e vapor na recuperação ainda destrói ${texInline(`${tnum(((ex.items.find((i) => i.name === 'recuperação')?.v ?? 0) / eIn) * 100, 1)}\\%`)}.`,
        trace: (phase) => ({ x: x0 + (xEnd - x0) * phase, y: yTop + 4 }),
      };
    },
  },
];

const SIM_MAP = new Map<string, SimSpec>(SIM_SPECS.map((s) => [s.id, s]));
export const CYCLE_SIM_IDS: readonly string[] = SIM_SPECS.map((s) => s.id);

export function hydrateCycleSims(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>('[data-cycle-sim]').forEach((host) => {
    const id = host.dataset.cycleSim || '';
    const spec = SIM_MAP.get(id);
    if (!spec) {
      host.innerHTML = `<p class="sim-missing">Simulador "${id}" não encontrado.</p>`;
      return;
    }
    const title = host.dataset.simTitle || spec.defaultTitle;
    let mode = spec.modes?.[0]?.id ?? '';
    const state: Record<string, number> = {};
    spec.params.forEach((p) => { state[p.key] = p.initial; });
    let playing = false;
    let phase = 0;
    let rafId = 0;
    let lastTs = 0;

    host.innerHTML = `
      <div class="sim-head">
        <div>
          <span class="sim-badge mono">SIMULADOR INTERATIVO</span>
          <h4>${title}</h4>
          <p class="sim-sub">${spec.subtitle}</p>
        </div>
        <div class="sim-actions">
          <button type="button" class="act solid sim-play" aria-pressed="false">▶ Animar</button>
          <button type="button" class="act sim-reset">Restaurar</button>
        </div>
      </div>
      ${spec.modes ? `<div class="sim-modes" role="group" aria-label="Modo">${spec.modes.map((m, i) => `<button type="button" class="sim-mode-btn${i === 0 ? ' active' : ''}" data-mode="${m.id}">${m.label}</button>`).join('')}</div>` : ''}
      <div class="sim-grid">
        <div class="sim-svg-box"></div>
        <div class="sim-ctrl-box">
          <div class="sim-sliders">${spec.params.map((p) => `
            <label class="sim-param" data-pkey="${p.key}">
              <span><b>${p.label}</b><output data-out="${p.key}"></output></span>
              <input type="range" data-key="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.initial}" />
            </label>`).join('')}</div>
          <dl class="sim-kpis"></dl>
        </div>
      </div>
      <p class="sim-insight"></p>
    `;

    const svgBox = host.querySelector<HTMLElement>('.sim-svg-box')!;
    const kpiBox = host.querySelector<HTMLElement>('.sim-kpis')!;
    const insightBox = host.querySelector<HTMLElement>('.sim-insight')!;
    const playBtn = host.querySelector<HTMLButtonElement>('.sim-play')!;
    let currentTrace: ((p: number) => { x: number; y: number; tag?: string } | null) | undefined;
    let currentOnPhase: ((p: number, svg: SVGSVGElement) => void) | undefined;

    function updateTracer() {
      const svg = svgBox.querySelector('svg');
      if (!svg || !currentTrace) return;
      if (currentOnPhase) currentOnPhase(phase, svg as SVGSVGElement);
      const pt = currentTrace(phase);
      let g = svg.querySelector<SVGGElement>('.sim-tracer');
      if (!pt) { if (g) g.remove(); return; }
      if (!g) {
        g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'sim-tracer');
        g.innerHTML = `<circle r="9" fill="${COL.coral}" opacity="0.25"/><circle r="5" fill="${COL.coral}" stroke="#fff" stroke-width="2"/>`;
        svg.appendChild(g);
      }
      g.setAttribute('transform', `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
    }

    function renderNow() {
      spec!.params.forEach((p) => {
        const out = host.querySelector<HTMLElement>(`[data-out="${p.key}"]`);
        const dec = p.step < 0.1 ? 2 : p.step < 1 ? 1 : 0;
        if (out) out.textContent = p.fmtVal ? p.fmtVal(state[p.key]) : `${fmt(state[p.key], dec)}${p.unit ? ` ${p.unit}` : ''}`;
        const lab = host.querySelector<HTMLElement>(`[data-pkey="${p.key}"]`);
        if (lab) lab.hidden = !!p.modes && !p.modes.includes(mode);
      });
      const res = spec!.render(state, mode);
      svgBox.innerHTML = res.svg;
      currentTrace = res.trace;
      currentOnPhase = res.onPhase;
      playBtn.hidden = !currentTrace;
      if (!playing && currentOnPhase && phase > 0) updateTracer();
      if (playing && currentTrace) updateTracer();
      else if (playing && !currentTrace) {
        playing = false;
        playBtn.setAttribute('aria-pressed', 'false');
        playBtn.textContent = '▶ Animar';
        if (rafId) cancelAnimationFrame(rafId);
      }
      kpiBox.innerHTML = res.kpis.map((k) => `<div class="${k.accent ? 'accent' : ''}"><dt>${k.label}</dt><dd>${k.value}</dd></div>`).join('');
      insightBox.innerHTML = res.insight;
    }

    function tick(ts: number) {
      if (!playing || !host.isConnected) { playing = false; return; }
      if (lastTs) phase = (phase + (ts - lastTs) / 4200) % 1;
      lastTs = ts;
      updateTracer();
      rafId = requestAnimationFrame(tick);
    }

    playBtn.addEventListener('click', () => {
      playing = !playing;
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.textContent = playing ? '⏸ Pausar' : '▶ Animar';
      if (playing) {
        lastTs = 0;
        rafId = requestAnimationFrame(tick);
      } else if (rafId) {
        cancelAnimationFrame(rafId);
      }
    });

    host.querySelectorAll<HTMLButtonElement>('.sim-mode-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        mode = btn.dataset.mode || '';
        host.querySelectorAll('.sim-mode-btn').forEach((b) => b.classList.toggle('active', b === btn));
        renderNow();
      });
    });

    host.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((inp) => {
      inp.addEventListener('input', () => {
        state[inp.dataset.key!] = inp.valueAsNumber;
        renderNow();
      });
    });

    host.querySelector('.sim-reset')!.addEventListener('click', () => {
      spec.params.forEach((p) => {
        state[p.key] = p.initial;
        const inp = host.querySelector<HTMLInputElement>(`input[data-key="${p.key}"]`);
        if (inp) inp.value = String(p.initial);
      });
      renderNow();
    });

    renderNow();
    if (spec.autoplay && currentTrace && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      playing = true;
      playBtn.setAttribute('aria-pressed', 'true');
      playBtn.textContent = '⏸ Pausar';
      lastTs = 0;
      rafId = requestAnimationFrame(tick);
    }
  });
}

/* ============================================================================
 *  PART 2 · 23 DYNAMIC PARAMETRIC EXERCISES ("Gerar novos números")
 * ========================================================================== */

interface DynParam {
  key: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  base: number;
  choices?: number[];
  /** formatação do valor exibido (sliders de índice sobre tabelas) */
  fmtVal?: (v: number) => string;
}
interface DynStep { label: string; tex: string; note?: string }
interface DynSolution { statement: string; steps: DynStep[]; answer: string; check: string }
interface DynExSpec {
  id: string;
  title: string;
  tag: string;
  params: DynParam[];
  solve: (p: Record<string, number>) => DynSolution;
}

const DYN_SPECS: DynExSpec[] = [
  /* 1. thermo-a-gnv */
  {
    id: 'thermo-a-gnv',
    title: 'Gás Ideal, van der Waals e Redlich–Kwong (Cilindro de GNV)',
    tag: 'Exemplo Dinâmico · Aula 01',
    params: [
      { key: 'm', label: `Massa de ${texInline(String.raw`\mathrm{CH_4}`)}`, unit: 'kg', min: 4, max: 12, step: 1, base: 8, choices: [5, 6, 8, 9, 10, 12] },
      { key: 'V', label: 'Volume do cilindro', unit: 'L', min: 40, max: 100, step: 10, base: 60, choices: [40, 50, 60, 80, 100] },
      { key: 'Tc', label: 'Temperatura', unit: '°C', min: 15, max: 65, step: 5, base: 25, choices: [15, 25, 35, 50, 65] },
    ],
    solve: ({ m, V, Tc }) => {
      const T = Tc + 273.15, M = 16.04, Tcrit = 191, pcrit = 46.4;
      const n = m / M, Vm3 = V / 1000, vbar = Vm3 / n;
      const aV = 2.293, bV = 0.0428, aR = 32.11, bR = 0.02965;
      const RT = RUB * T;
      const P_id = RT / vbar;
      const P_vdw = RT / (vbar - bV) - aV / (vbar * vbar);
      const P_rk = RT / (vbar - bR) - aR / (vbar * (vbar + bR) * Math.sqrt(T));
      const Zrk = (P_rk * vbar) / RT;
      return {
        statement: `Um cilindro rígido de <b>${V} L</b> armazena <b>${m} kg</b> de metano (${texInline(String.raw`\mathrm{CH_4}`)}) a <b>${Tc} °C</b>. Determine a pressão pelos modelos de Gás Ideal, van der Waals e Redlich–Kwong, sabendo que ${texInline(String.raw`M = 16{,}04\ \mathrm{kg/kmol}`)}, ${texInline(String.raw`T_c = 191\ \mathrm{K}`)} e ${texInline(String.raw`P_c = 46{,}4\ \mathrm{bar}`)}.`,
        steps: [
          { label: 'Número de mols e volume específico molar', tex: String.raw`n = \frac{${tnum(m, 1)}}{16{,}04} = ${tnum(n, 4)}\ \mathrm{kmol},\qquad \bar v = \frac{${tnum(Vm3, 3)}}{${tnum(n, 4)}} = ${tnum(vbar, 4)}\ \mathrm{m^3/kmol}` },
          { label: 'Pressão pelo modelo de Gás Ideal', tex: String.raw`P_{\text{ideal}} = \frac{\bar R T}{\bar v} = \frac{${tnum(RT, 2)}}{${tnum(vbar, 4)}} = ${tnum(P_id, 1)}\ \mathrm{bar}` },
          { label: `Equação de van der Waals (${texInline(String.raw`a = 2{,}293,\ b = 0{,}0428`)})`, tex: String.raw`P_{\text{vdW}} = \frac{${tnum(RT, 2)}}{${tnum(vbar, 4)} - 0{,}0428} - \frac{2{,}293}{${tnum(vbar, 4)}^2} = ${tnum(P_vdw, 1)}\ \mathrm{bar}` },
          { label: `Equação de Redlich–Kwong (${texInline(String.raw`a = 32{,}11,\ b = 0{,}02965`)})`, tex: String.raw`P_{\text{RK}} = \frac{${tnum(RT, 2)}}{${tnum(vbar, 4)} - 0{,}02965} - \frac{32{,}11}{${tnum(vbar, 4)}(${tnum(vbar, 4)} + 0{,}02965)\sqrt{${tnum(T, 2)}}} = ${tnum(P_rk, 1)}\ \mathrm{bar}` },
        ],
        answer: `${texInline(`P_{\\text{ideal}} = ${tnum(P_id, 1)}\\ \\mathrm{bar}`)} · ${texInline(`P_{\\text{vdW}} = ${tnum(P_vdw, 1)}\\ \\mathrm{bar}`)} · ${texInline(`P_{\\text{RK}} = ${tnum(P_rk, 1)}\\ \\mathrm{bar}`)} (${texInline(`Z_{\\text{RK}} = ${tnum(Zrk, 3)}`)})`,
        check: `Desvio do modelo ideal em relação a Redlich–Kwong: ${texInline(`+${tnum(((P_id - P_rk) / P_rk) * 100, 1)}\\%`)} (com ${texInline(`T_R = ${tnum(T / Tcrit, 2)}`)} e ${texInline(`p_R = ${tnum(P_rk / pcrit, 2)}`)}).`,
      };
    },
  },

  /* 2. thermo-b-polytropic */
  {
    id: 'thermo-b-polytropic',
    title: 'Trabalho de Fronteira Móvel em Processo Politrópico (P Vⁿ = C)',
    tag: 'Exemplo Dinâmico · Aula 02',
    params: [
      { key: 'P1', label: 'Pressão inicial P₁', unit: 'kPa', min: 200, max: 1000, step: 100, base: 800, choices: [400, 600, 800, 1000] },
      { key: 'V1', label: 'Volume inicial V₁', unit: 'm³', min: 0.04, max: 0.12, step: 0.02, base: 0.06, choices: [0.04, 0.05, 0.06, 0.08, 0.10] },
      { key: 'n', label: 'Expoente politrópico n', unit: '', min: 0, max: 1.5, step: 0.1, base: 1.3, choices: [0, 0.8, 1.0, 1.2, 1.3, 1.4] },
    ],
    solve: ({ P1, V1, n }) => {
      const V2 = V1 * 3;
      const P2 = P1 * Math.pow(V1 / V2, n);
      const isIso = Math.abs(n - 1) < 1e-4;
      const W = isIso ? P1 * V1 * Math.log(V2 / V1) : (P2 * V2 - P1 * V1) / (1 - n);
      const Wiso = P1 * V1 * Math.log(3);
      return {
        statement: `Um gás dentro de um conjunto cilindro e pistão expande-se de ${texInline(`V_1 = ${tnum(V1, 2)}\\ \\mathrm{m^3}`)} e ${texInline(`P_1 = ${P1}\\ \\mathrm{kPa}`)} até triplicar o volume (${texInline(`V_2 = ${tnum(V2, 2)}\\ \\mathrm{m^3}`)}) segundo um processo politrópico quase-estático com ${texInline(`n = ${tnum(n, 1)}`)}. Determine ${texInline('P_2')} e o trabalho de fronteira ${texInline('{}_1W_2')}.`,
        steps: [
          {
            label: 'Pressão final pela relação politrópica PVⁿ = const.',
            tex: String.raw`P_2 = P_1\left(\frac{V_1}{V_2}\right)^n = ${P1}\left(\frac{1}{3}\right)^{${tnum(n, 1)}} = ${tnum(P2, 1)}\ \mathrm{kPa}`,
          },
          {
            label: isIso ? 'Integração no caso isotérmico de gás ideal (n = 1)' : 'Integração da fronteira móvel (n ≠ 1)',
            tex: isIso
              ? String.raw`{}_1W_2 = P_1 V_1 \ln\!\left(\frac{V_2}{V_1}\right) = ${P1}(${tnum(V1, 2)})\ln(3) = ${tnum(W, 2)}\ \mathrm{kJ}`
              : String.raw`{}_1W_2 = \frac{P_2 V_2 - P_1 V_1}{1 - n} = \frac{${tnum(P2, 1)}(${tnum(V2, 2)}) - ${P1}(${tnum(V1, 2)})}{1 - ${tnum(n, 1)}} = ${tnum(W, 2)}\ \mathrm{kJ}`,
          },
          {
            label: 'Comparação com caminho isotérmico (n = 1) e unidades',
            tex: String.raw`W_{\text{iso}} = P_1 V_1 \ln 3 = ${tnum(Wiso, 2)}\ \mathrm{kJ}, \qquad 1\ \mathrm{kPa\cdot m^3} = 1\ \mathrm{kJ}`,
          },
        ],
        answer: `${texInline(`P_2 = ${tnum(P2, 1)}\\ \\mathrm{kPa}`)} · ${texInline(`{}_1W_2 = +${tnum(W, 2)}\\ \\mathrm{kJ}`)} (trabalho realizado pelo gás sobre o pistão)`,
        check: `Na expansão (${texInline('V_2 > V_1')}), ${texInline('{}_1W_2 > 0')} e diminui monotonicamente conforme ${texInline('n')} aumenta (para ${texInline('n = 0')} daria ${texInline(`${tnum(P1 * (V2 - V1), 1)}\\ \\mathrm{kJ}`)}; para ${texInline('n = 1')}, ${texInline(`${tnum(Wiso, 2)}\\ \\mathrm{kJ}`)}).`,
      };
    },
  },

  /* 3. thermo-c-turbine */
  {
    id: 'thermo-c-turbine',
    title: 'Balanço de Energia em Turbina a Vapor (Tabelas A-3 e A-4)',
    tag: 'Exemplo Dinâmico · Aula 03',
    params: [
      { key: 'p1', label: 'Pressão de entrada P₁', unit: 'bar', min: 20, max: 40, step: 10, base: 30, choices: [20, 30, 40] },
      { key: 'T1', label: 'Temperatura de entrada T₁', unit: '°C', min: 400, max: 440, step: 40, base: 400, choices: [400, 440] },
      { key: 'mdot', label: 'Vazão mássica ṁ', unit: 'kg/s', min: 5, max: 20, step: 5, base: 10, choices: [5, 10, 15, 20] },
    ],
    solve: ({ p1, T1, mdot }) => {
      const sup = STEAM_SUP.find((r) => r.pBar === p1 && r.T === T1) || STEAM_SUP[4];
      const sat2 = STEAM_SAT[1];
      const x2 = 0.9;
      const h2 = sat2.hf + x2 * sat2.hfg;
      const V1 = 50;
      const V2 = 120;
      const dEc = (V1 * V1 - V2 * V2) / 2000;
      const Wdot = mdot * (sup.h - h2 + dEc);
      return {
        statement: `Vapor d’água entra numa turbina adiabática a ${texInline(`P_1 = ${p1}\\ \\mathrm{bar}`)}, ${texInline(`T_1 = ${T1}\\ ^\\circ\\mathrm{C}`)} e ${texInline('V_1 = 50\\ \\mathrm{m/s}')}, com ${texInline(`\\dot m = ${mdot}\\ \\mathrm{kg/s}`)}. Sai a ${texInline('P_2 = 0{,}10\\ \\mathrm{bar}')} com título ${texInline('x_2 = 0{,}90')} e ${texInline('V_2 = 120\\ \\mathrm{m/s}')}. Desprezando ${texInline('\\Delta ep')}, calcule a potência.`,
        steps: [
          { label: 'Entalpias: entrada superaquecida (A-4) e saída bifásica (A-3)', tex: String.raw`h_1 = ${tnum(sup.h, 1)}\ \mathrm{kJ/kg},\qquad h_2 = h_f + x_2 h_{fg} = 191{,}83 + 0{,}90(2\,392{,}8) = ${tnum(h2, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Variação de energia cinética por unidade de massa', tex: String.raw`\frac{V_1^2 - V_2^2}{2} = \frac{50^2 - 120^2}{2\,000} = ${tnum(dEc, 2)}\ \mathrm{kJ/kg}` },
          { label: 'Balanço em regime permanente (Q̇ = 0)', tex: String.raw`\dot W_{\text{vc}} = \dot m\left[(h_1 - h_2) + \frac{V_1^2 - V_2^2}{2}\right] = ${mdot}\left[${tnum(sup.h - h2, 1)} ${dEc < 0 ? '-' : '+'} ${tnum(Math.abs(dEc), 2)}\right] = ${tnum(Wdot, 0)}\ \mathrm{kW}` },
        ],
        answer: `${texInline(`\\dot W_{\\text{vc}} = ${tnum(Wdot, 0)}\\ \\mathrm{kW} = ${tnum(Wdot / 1000, 2)}\\ \\mathrm{MW}`)}`,
        check: `A parcela cinética é só ${texInline(`${tnum((Math.abs(dEc) / (sup.h - h2)) * 100, 2)}\\%`)} da queda de entalpia: por isso costuma ser desprezada em turbinas.`,
      };
    },
  },

  /* 4. thermo-d-steam */
  {
    id: 'thermo-d-steam',
    title: 'Localização do Estado e Título em Mistura Saturada (Tabela A-3)',
    tag: 'Exemplo Dinâmico · Aula 04',
    params: [
      { key: 'p', label: 'Pressão da água P', unit: 'bar', min: 1, max: 20, step: 1, base: 5, choices: [1, 2, 5, 10, 20] },
      { key: 'x', label: 'Título real x', unit: '', min: 0.2, max: 0.85, step: 0.15, base: 0.5, choices: [0.2, 0.35, 0.5, 0.65, 0.8] },
    ],
    solve: ({ p, x }) => {
      const sat = STEAM_SAT.find((r) => r.pBar === p) || STEAM_SAT[6];
      const v = sat.vf + x * (sat.vg - sat.vf);
      const h = sat.hf + x * sat.hfg;
      const u = sat.uf + x * (sat.ug - sat.uf);
      const s = sat.sf + x * (sat.sg - sat.sf);
      return {
        statement: `Um recipiente contém água a ${texInline(`P = ${p}\\ \\mathrm{bar}`)} com volume específico médio ${texInline(`v = ${tnum(v, 4)}\\ \\mathrm{m^3/kg}`)}. Identifique a região, calcule o título ${texInline('x')}, a entalpia ${texInline('h')}, a energia interna ${texInline('u')} e a entropia ${texInline('s')} (Moran, Tab. A-3).`,
        steps: [
          { label: `Teste de região a ${fmt(p, 0)} bar (temperatura de saturação ${fmt(sat.T, 1)} °C)`, tex: String.raw`v_f = ${tnum(sat.vf, 5)} < v = ${tnum(v, 4)} < v_g = ${tnum(sat.vg, 4)}\ \mathrm{m^3/kg} \;\Rightarrow\; \text{mistura saturada},\ T = T_{\text{sat}} = ${tnum(sat.T, 1)}\ ^\circ\mathrm{C}` },
          { label: 'Título pela regra da alavanca', tex: String.raw`x = \frac{v - v_f}{v_g - v_f} = \frac{${tnum(v, 4)} - ${tnum(sat.vf, 5)}}{${tnum(sat.vg, 4)} - ${tnum(sat.vf, 5)}} = ${tnum(x, 3)}` },
          { label: 'Propriedades da mistura', tex: String.raw`\begin{gathered} h = h_f + x\,h_{fg} = ${tnum(sat.hf, 1)} + ${tnum(x, 2)}(${tnum(sat.hfg, 1)}) = ${tnum(h, 1)}\ \mathrm{kJ/kg} \\ u = u_f + x(u_g - u_f) = ${tnum(u, 1)}\ \mathrm{kJ/kg}, \qquad s = s_f + x(s_g - s_f) = ${tnum(s, 4)}\ \mathrm{kJ/(kg\cdot K)} \end{gathered}` },
        ],
        answer: `Mistura saturada a ${texInline(`${tnum(sat.T, 1)}\\ ^\\circ\\mathrm{C}`)} · ${texInline(`x = ${tnum(x, 2)}`)} · ${texInline(`h = ${tnum(h, 1)}\\ \\mathrm{kJ/kg}`)} · ${texInline(`u = ${tnum(u, 1)}\\ \\mathrm{kJ/kg}`)} · ${texInline(`s = ${tnum(s, 4)}\\ \\mathrm{kJ/(kg\\cdot K)}`)}`,
        check: `Verificação física: ${texInline(`h_f = ${tnum(sat.hf, 1)} < h = ${tnum(h, 1)} < h_g = ${tnum(sat.hg, 1)}\\ \\mathrm{kJ/kg}`)}.`,
      };
    },
  },

  /* 5. thermo-e-compressor */
  {
    id: 'thermo-e-compressor',
    title: 'Eficiência Isentrópica e Geração de Entropia em Compressor de Ar',
    tag: 'Exemplo Dinâmico · Aula 05',
    params: [
      { key: 'rp', label: `Razão de pressões ${texInline('P_2/P_1')}`, unit: '', min: 4, max: 12, step: 2, base: 8, choices: [4, 6, 8, 10, 12] },
      { key: 'T1', label: `Temperatura de admissão ${texInline('T_1')}`, unit: 'K', min: 280, max: 320, step: 10, base: 300, choices: [280, 290, 300, 310, 320] },
      { key: 'etac', label: `Eficiência isentrópica ${texInline(String.raw`\eta_c`)}`, unit: '%', min: 75, max: 90, step: 5, base: 80, choices: [75, 80, 85, 90] },
    ],
    solve: ({ rp, T1, etac }) => {
      const k = 1.4, cp = 1.005;
      const e = etac / 100;
      const T2s = T1 * Math.pow(rp, (k - 1) / k);
      const ws = cp * (T2s - T1);
      const w = ws / e;
      const T2 = T1 + w / cp;
      const sger = cp * Math.log(T2 / T2s);
      const T0 = 298.15;
      return {
        statement: `Ar, tratado como gás ideal com ${texInline(String.raw`c_p = 1{,}005\ \mathrm{kJ/(kg\cdot K)}`)} e ${texInline('k = 1{,}4')} constantes, entra num compressor adiabático em regime permanente a ${texInline(`T_1 = ${T1}\\ \\mathrm{K}`)} e é comprimido até ${texInline(`P_2/P_1 = ${rp}`)}. A eficiência isentrópica é ${texInline(`\\eta_c = ${etac}\\%`)}. Desprezando as variações de energias cinética e potencial, determine ${texInline('T_2')}, o trabalho consumido por kg e a entropia gerada ${texInline(String.raw`s_{\text{ger}}`)}.`,
        steps: [
          { label: `Estado de referência isentrópico 2s (${texInline(String.raw`s_{2s} = s_1`)})`, tex: String.raw`T_{2s} = T_1\left(\frac{P_2}{P_1}\right)^{(k-1)/k} = ${T1}\,(${rp})^{0{,}2857} = ${tnum(T2s, 1)}\ \mathrm{K}` },
          { label: 'Trabalho isentrópico e trabalho real pela definição de eficiência', tex: String.raw`w_s = c_p\,(T_{2s} - T_1) = ${tnum(ws, 1)}\ \mathrm{kJ/kg},\qquad w_c = \frac{w_s}{\eta_c} = \frac{${tnum(ws, 1)}}{${tnum(e, 2)}} = ${tnum(w, 1)}\ \mathrm{kJ/kg}` },
          { label: `Temperatura real de saída pelo balanço de energia (${texInline(String.raw`\dot Q = 0`)})`, tex: String.raw`T_2 = T_1 + \frac{w_c}{c_p} = ${T1} + \frac{${tnum(w, 1)}}{1{,}005} = ${tnum(T2, 1)}\ \mathrm{K}` },
          { label: 'Balanço de entropia: compressor adiabático, logo toda a variação é geração', tex: String.raw`s_{\text{ger}} = s_2 - s_1 = s_2 - s_{2s} = c_p\ln\frac{T_2}{T_{2s}} = 1{,}005\,\ln\frac{${tnum(T2, 1)}}{${tnum(T2s, 1)}} = ${tnum(sger, 4)}\ \mathrm{kJ/(kg\cdot K)}`, note: `Como 2 e 2s estão na mesma pressão ${texInline('P_2')}, o termo ${texInline(String.raw`R\ln(P_2/P_1)`)} se cancela.` },
        ],
        answer: `${texInline(`T_2 = ${tnum(T2, 1)}\\ \\mathrm{K}`)} · ${texInline(`w_c = ${tnum(w, 1)}\\ \\mathrm{kJ/kg}`)} · ${texInline(`s_{\\text{ger}} = ${tnum(sger, 4)}\\ \\mathrm{kJ/(kg\\cdot K)}`)}`,
        check: `${texInline(String.raw`s_{\text{ger}} > 0`)}, como exige a 2ª lei para um processo adiabático irreversível. As irreversibilidades aumentam o consumo em ${texInline(`${tnum(((w - ws) / ws) * 100, 1)}\\%`)}; a ${texInline(String.raw`T_0 = 298{,}15\ \mathrm{K}`)} isso equivale a destruir ${texInline(`T_0 s_{\\text{ger}} = ${tnum(T0 * sger, 1)}\\ \\mathrm{kJ/kg}`)} de exergia.`,
      };
    },
  },

  /* 6. thermo-f-heatpump */
  {
    id: 'thermo-f-heatpump',
    title: 'Bomba de Calor contra Aquecedor Resistivo e o Limite da 2ª Lei',
    tag: 'Exemplo Dinâmico · Aula 06',
    params: [
      { key: 'QHkjh', label: `Carga térmica ${texInline(String.raw`\dot Q_H`)}`, unit: 'kJ/h', min: 45000, max: 120000, step: 15000, base: 75000, choices: [45000, 60000, 75000, 90000, 105000, 120000] },
      { key: 'cop', label: `COP da bomba de calor`, unit: '', min: 2.5, max: 4.5, step: 0.5, base: 3.0, choices: [2.5, 3.0, 3.5, 4.0, 4.5] },
      { key: 'Text', label: `Temperatura externa ${texInline('T_L')}`, unit: '°C', min: -10, max: 15, step: 5, base: 0, choices: [-10, -5, 0, 5, 10, 15] },
    ],
    solve: ({ QHkjh, cop, Text }) => {
      const QH = QHkjh / 3600;
      const W = QH / cop;
      const QL = QH - W;
      const TH = 293.15, TL = Text + 273.15;
      const copMax = TH / (TH - TL);
      const Wmin = QH / copMax;
      return {
        statement: `Uma casa mantida a ${texInline(String.raw`20\ ^\circ\mathrm{C}`)} perde ${texInline(`${tnum(QHkjh / 1000, 0)}\\,000\\ \\mathrm{kJ/h}`)} para o exterior a ${texInline(`${Text}\\ ^\\circ\\mathrm{C}`)}. Uma bomba de calor com ${texInline(`\\mathrm{COP}_{BC} = ${tnum(cop, 1)}`)} supre essa carga. Determine a potência elétrica, o calor retirado do ar externo e compare com o limite reversível e com um aquecedor resistivo.`,
        steps: [
          { label: 'Carga térmica em kW', tex: String.raw`\dot Q_H = \frac{${QHkjh}\ \mathrm{kJ/h}}{3\,600\ \mathrm{s/h}} = ${tnum(QH, 2)}\ \mathrm{kW}` },
          { label: 'Potência elétrica e calor da fonte fria (1ª lei no ciclo)', tex: String.raw`\dot W = \frac{\dot Q_H}{\mathrm{COP}_{BC}} = \frac{${tnum(QH, 2)}}{${tnum(cop, 1)}} = ${tnum(W, 2)}\ \mathrm{kW},\qquad \dot Q_L = \dot Q_H - \dot W = ${tnum(QL, 2)}\ \mathrm{kW}` },
          { label: 'Limite da 2ª lei (temperaturas absolutas)', tex: String.raw`\mathrm{COP}_{BC,\text{máx}} = \frac{T_H}{T_H - T_L} = \frac{293{,}15}{293{,}15 - ${tnum(TL, 2)}} = ${tnum(copMax, 2)} \;\Rightarrow\; \dot W_{\text{mín}} = \frac{\dot Q_H}{\mathrm{COP}_{BC,\text{máx}}} = ${tnum(Wmin, 3)}\ \mathrm{kW}` },
          { label: 'Eficiência de 2ª lei', tex: String.raw`\eta_{II} = \frac{\mathrm{COP}_{BC}}{\mathrm{COP}_{BC,\text{máx}}} = \frac{\dot W_{\text{mín}}}{\dot W} = ${tnum((cop / copMax) * 100, 1)}\%` },
        ],
        answer: `${texInline(`\\dot W = ${tnum(W, 2)}\\ \\mathrm{kW}`)} (o aquecedor resistivo consumiria ${texInline(`${tnum(QH, 2)}\\ \\mathrm{kW}`)}) · ${texInline(`\\dot Q_L = ${tnum(QL, 2)}\\ \\mathrm{kW}`)} · ${texInline(`\\eta_{II} = ${tnum((cop / copMax) * 100, 1)}\\%`)}`,
        check: `${texInline(`\\mathrm{COP}_{BC} = ${tnum(cop, 1)} < ${tnum(copMax, 2)}`)}: o enunciado de Clausius é respeitado. A economia de energia elétrica é ${texInline(`1 - 1/\\mathrm{COP} = ${tnum((1 - 1 / cop) * 100, 1)}\\%`)}, porque o trabalho apenas bombeia ${texInline(`${tnum(QL, 2)}\\ \\mathrm{kW}`)} já disponíveis no ar externo.`,
      };
    },
  },

  /* 7. thermo-g-carnot */
  {
    id: 'thermo-g-carnot',
    title: 'Ciclo de Carnot com Água e a Escala Termodinâmica (Tabela A-2)',
    tag: 'Exemplo Dinâmico · Aula 07',
    params: [
      { key: 'THc', label: `Temperatura da caldeira ${texInline('T_H')}`, unit: '°C', min: 150, max: 300, step: 50, base: 250, choices: [150, 200, 250, 300] },
      { key: 'TLc', label: `Temperatura do condensador ${texInline('T_L')}`, unit: '°C', min: 25, max: 55, step: 5, base: 40, choices: [25, 30, 35, 40, 45, 50, 55] },
    ],
    solve: ({ THc, TLc }) => {
      const tab: Record<number, { hfg: number; sf: number; sg: number }> = {
        150: { hfg: 2114.3, sf: 1.8418, sg: 6.8379 },
        200: { hfg: 1940.7, sf: 2.3309, sg: 6.4323 },
        250: { hfg: 1716.2, sf: 2.7927, sg: 6.0730 },
        300: { hfg: 1404.9, sf: 3.2534, sg: 5.7045 },
      };
      const key = clamp(Math.round(THc / 50) * 50, 150, 300);
      const d = tab[key];
      const TH = key + 273.15, TL = TLc + 273.15;
      const ds = d.hfg / TH;
      const qL = TL * ds;
      const w = d.hfg - qL;
      const eta = w / d.hfg;
      const etaCA = 1 - Math.sqrt(TL / TH);
      return {
        statement: `Água percorre um ciclo de Carnot: na caldeira passa de líquido saturado a vapor saturado a ${texInline(`T_H = ${key}\\ ^\\circ\\mathrm{C}`)} (Tab. A-2: ${texInline(`h_{fg} = ${tnum(d.hfg, 1)}\\ \\mathrm{kJ/kg}`)}, ${texInline(`s_f = ${tnum(d.sf, 4)}`)}, ${texInline(`s_g = ${tnum(d.sg, 4)}\\ \\mathrm{kJ/(kg\\cdot K)}`)}) e rejeita calor isotermicamente a ${texInline(`T_L = ${TLc}\\ ^\\circ\\mathrm{C}`)}. Determine ${texInline(String.raw`q_H`)}, ${texInline(String.raw`q_L`)}, o trabalho líquido e o rendimento.`,
        steps: [
          { label: 'Calor recebido e variação de entropia na vaporização isotérmica', tex: String.raw`q_H = h_{fg} = ${tnum(d.hfg, 1)}\ \mathrm{kJ/kg},\qquad \Delta s = \frac{q_H}{T_H} = \frac{${tnum(d.hfg, 1)}}{${tnum(TH, 2)}} = ${tnum(ds, 4)}\ \mathrm{kJ/(kg\cdot K)}`, note: `Conferência com a tabela: ${texInline(`s_g - s_f = ${tnum(d.sg - d.sf, 4)}\\ \\mathrm{kJ/(kg\\cdot K)}`)}.` },
          { label: `Calor rejeitado: a mesma ${texInline(String.raw`\Delta s`)} percorrida a ${texInline('T_L')} (processos adiabáticos reversíveis)`, tex: String.raw`q_L = T_L\,\Delta s = ${tnum(TL, 2)}\,(${tnum(ds, 4)}) = ${tnum(qL, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Trabalho líquido e rendimento (escala de Kelvin)', tex: String.raw`w = q_H - q_L = ${tnum(w, 1)}\ \mathrm{kJ/kg},\qquad \eta = \frac{w}{q_H} = 1 - \frac{T_L}{T_H} = 1 - \frac{${tnum(TL, 2)}}{${tnum(TH, 2)}} = ${tnum(eta * 100, 1)}\%` },
        ],
        answer: `${texInline(`q_H = ${tnum(d.hfg, 1)}`)}, ${texInline(`q_L = ${tnum(qL, 1)}`)}, ${texInline(`w = ${tnum(w, 1)}\\ \\mathrm{kJ/kg}`)} · ${texInline(`\\eta_{\\text{Carnot}} = ${tnum(eta * 100, 1)}\\%`)}`,
        check: `${texInline(`q_H/q_L = ${tnum(d.hfg / qL, 4)} = T_H/T_L`)}, exatamente a definição da escala termodinâmica. Operando na potência máxima (Curzon–Ahlborn), o rendimento seria ${texInline(`1 - \\sqrt{T_L/T_H} = ${tnum(etaCA * 100, 1)}\\%`)}.`,
      };
    },
  },

  /* 8. thermo-h-hx-irrev */
  {
    id: 'thermo-h-hx-irrev',
    title: 'Irreversibilidade em Trocador de Calor Contracorrente (Gouy–Stodola)',
    tag: 'Exemplo Dinâmico · Aula 08',
    params: [
      { key: 'mq', label: `Vazão de água quente ${texInline(String.raw`\dot m_q`)}`, unit: 'kg/s', min: 1, max: 2, step: 0.5, base: 1, choices: [1, 1.5, 2] },
      { key: 'Tq1', label: `Entrada quente ${texInline('T_{q1}')}`, unit: '°C', min: 70, max: 95, step: 5, base: 90, choices: [70, 75, 80, 85, 90, 95] },
      { key: 'mf', label: `Vazão de água fria ${texInline(String.raw`\dot m_f`)}`, unit: 'kg/s', min: 1.5, max: 5, step: 0.5, base: 2, choices: [1.5, 2, 2.5, 3, 4, 5] },
    ],
    solve: ({ mq, Tq1, mf }) => {
      const c = 4.18, T0 = 298.15, Tq2 = 50, Tf1 = 20;
      const K = (t: number) => t + 273.15;
      const Q = mq * c * (Tq1 - Tq2);
      const Tf2 = Tf1 + Q / (mf * c);
      const dSq = mq * c * Math.log(K(Tq2) / K(Tq1));
      const dSf = mf * c * Math.log(K(Tf2) / K(Tf1));
      const Sger = dSq + dSf;
      const I = T0 * Sger;
      const exQ = mq * c * ((Tq1 - Tq2) - T0 * Math.log(K(Tq1) / K(Tq2)));
      const exF = mf * c * ((Tf2 - Tf1) - T0 * Math.log(K(Tf2) / K(Tf1)));
      return {
        statement: `Num trocador contracorrente adiabático, ${texInline(`${tnum(mq, 1)}\\ \\mathrm{kg/s}`)} de água entram a ${texInline(`${Tq1}\\ ^\\circ\\mathrm{C}`)} e saem a ${texInline(String.raw`50\ ^\circ\mathrm{C}`)}, aquecendo ${texInline(`${tnum(mf, 1)}\\ \\mathrm{kg/s}`)} de água que entram a ${texInline(String.raw`20\ ^\circ\mathrm{C}`)}. Com ${texInline(String.raw`c = 4{,}18\ \mathrm{kJ/(kg\cdot K)}`)} constante e ${texInline(String.raw`T_0 = 25\ ^\circ\mathrm{C}`)}, calcule ${texInline(String.raw`\dot S_{\text{ger}}`)}, a exergia destruída ${texInline(String.raw`\dot I`)} e a eficiência de 2ª lei do trocador.`,
        steps: [
          { label: 'Balanço de energia e temperatura de saída da água fria', tex: String.raw`\dot Q = \dot m_q c\,(T_{q1} - T_{q2}) = ${tnum(Q, 1)}\ \mathrm{kW} \;\Rightarrow\; T_{f2} = 20 + \frac{${tnum(Q, 1)}}{${tnum(mf, 1)}\,(4{,}18)} = ${tnum(Tf2, 1)}\ ^\circ\mathrm{C}`, note: `Contracorrente viável: ${texInline(`T_{f2} = ${tnum(Tf2, 1)} < T_{q1} = ${Tq1}\\ ^\\circ\\mathrm{C}`)} e ${texInline(String.raw`T_{q2} = 50 > T_{f1} = 20\ ^\circ\mathrm{C}`)}.` },
          { label: 'Balanço de entropia no trocador (adiabático, regime permanente)', tex: String.raw`\dot S_{\text{ger}} = \dot m_q c\ln\frac{323{,}15}{${tnum(K(Tq1), 2)}} + \dot m_f c\ln\frac{${tnum(K(Tf2), 2)}}{293{,}15} = (${tnum(dSq, 4)}) + ${tnum(dSf, 4)} = ${tnum(Sger, 4)}\ \mathrm{kW/K}` },
          { label: 'Teorema de Gouy–Stodola', tex: String.raw`\dot I = T_0\,\dot S_{\text{ger}} = 298{,}15 \times ${tnum(Sger, 4)} = ${tnum(I, 2)}\ \mathrm{kW}` },
          { label: 'Exergia cedida pela água quente e recebida pela fria', tex: String.raw`\begin{gathered}\Delta\dot E_q = \dot m_q c\left[(T_{q1} - T_{q2}) - T_0\ln\frac{T_{q1}}{T_{q2}}\right] = ${tnum(exQ, 2)}\ \mathrm{kW},\quad \Delta\dot E_f = ${tnum(exF, 2)}\ \mathrm{kW} \\ \eta_{II} = \frac{\Delta\dot E_f}{\Delta\dot E_q} = ${tnum((exF / exQ) * 100, 1)}\%,\qquad \Delta\dot E_q - \Delta\dot E_f = ${tnum(exQ - exF, 2)}\ \mathrm{kW} = \dot I\end{gathered}` },
        ],
        answer: `${texInline(`T_{f2} = ${tnum(Tf2, 1)}\\ ^\\circ\\mathrm{C}`)} · ${texInline(`\\dot S_{\\text{ger}} = ${tnum(Sger, 4)}\\ \\mathrm{kW/K}`)} · ${texInline(`\\dot I = ${tnum(I, 2)}\\ \\mathrm{kW}`)} · ${texInline(`\\eta_{II} = ${tnum((exF / exQ) * 100, 1)}\\%`)}`,
        check: `As duas contas da exergia destruída coincidem (${texInline(`${tnum(I, 2)}\\ \\mathrm{kW}`)}): a energia ${texInline(`${tnum(Q, 1)}\\ \\mathrm{kW}`)} se conserva, mas parte do seu potencial de trabalho se perde no ${texInline(String.raw`\Delta T`)} finito entre as correntes.`,
      };
    },
  },

  /* 9. thermo-i-rankine-exergy */
  {
    id: 'thermo-i-rankine-exergy',
    title: 'Balanço de Exergia de um Ciclo Rankine (Destruição por Componente)',
    tag: 'Exemplo Dinâmico · Aula 09',
    params: [
      { key: 'p1', label: `Pressão da caldeira ${texInline('P_1')}`, unit: 'bar', min: 40, max: 100, step: 20, base: 60, choices: [40, 60, 80, 100] },
      { key: 'etat', label: `Eficiência isentrópica da turbina ${texInline(String.raw`\eta_t`)}`, unit: '%', min: 75, max: 95, step: 5, base: 85, choices: [75, 80, 85, 90, 95] },
    ],
    solve: ({ p1, etat }) => {
      const T0 = 298.15, TH = 1500, T1 = 440;
      const pB = clamp(Math.round(p1 / 20) * 20, 40, 100);
      const c = wSat(0.1);
      const st1 = wPT(pB, T1);
      const st2s = wPS(0.1, st1.s);
      const h2 = st1.h - (etat / 100) * (st1.h - st2s.h);
      const st2 = wPH(0.1, h2);
      const wb = c.vf * (pB - 0.1) * 100;
      const h4 = c.hf + wb;
      const qin = st1.h - h4;
      const wt = st1.h - h2;
      const wnet = wt - wb;
      const eQ = qin * (1 - T0 / TH);
      const edC = T0 * (st1.s - c.sf - qin / TH);
      const edT = T0 * (st2.s - st1.s);
      const elC = (h2 - c.hf) - T0 * (st2.s - c.sf);
      const res = eQ - wnet - edC - edT - elC;
      return {
        statement: `Num ciclo Rankine o vapor entra na turbina a ${texInline(`P_1 = ${pB}\\ \\mathrm{bar}`)} e ${texInline(String.raw`T_1 = 440\ ^\circ\mathrm{C}`)} (Tab. A-4: ${texInline(`h_1 = ${tnum(st1.h, 1)}\\ \\mathrm{kJ/kg}`)}, ${texInline(`s_1 = ${tnum(st1.s, 4)}\\ \\mathrm{kJ/(kg\\cdot K)}`)}) e o condensador opera a ${texInline(String.raw`0{,}10\ \mathrm{bar}`)}. A turbina tem ${texInline(`\\eta_t = ${etat}\\%`)} e a bomba é isentrópica. O calor vem de uma fonte a ${texInline(String.raw`T_H = 1\,500\ \mathrm{K}`)} e ${texInline(String.raw`T_0 = 298{,}15\ \mathrm{K}`)}. Faça o balanço de exergia por kg de vapor.`,
        steps: [
          { label: 'Expansão isentrópica de referência e expansão real (Tab. A-3 a 0,10 bar)', tex: String.raw`\begin{gathered} x_{2s} = \frac{${tnum(st1.s, 4)} - 0{,}6493}{7{,}5009} = ${tnum(st2s.x ?? 1, 4)},\quad h_{2s} = ${tnum(st2s.h, 1)}\ \mathrm{kJ/kg} \\ h_2 = h_1 - \eta_t\,(h_1 - h_{2s}) = ${tnum(h2, 1)}\ \mathrm{kJ/kg},\quad x_2 = ${tnum(st2.x ?? 1, 4)},\quad s_2 = ${tnum(st2.s, 4)}\ \mathrm{kJ/(kg\cdot K)} \end{gathered}` },
          { label: 'Bomba, calor fornecido e rendimento térmico', tex: String.raw`w_b = v_f\,\Delta P = ${tnum(wb, 2)}\ \mathrm{kJ/kg},\quad q_{\text{ent}} = h_1 - h_4 = ${tnum(qin, 1)}\ \mathrm{kJ/kg},\quad \eta = \frac{w_t - w_b}{q_{\text{ent}}} = \frac{${tnum(wnet, 1)}}{${tnum(qin, 1)}} = ${tnum((wnet / qin) * 100, 1)}\%` },
          { label: 'Exergia fornecida com o calor da fonte', tex: String.raw`e_Q = q_{\text{ent}}\left(1 - \frac{T_0}{T_H}\right) = ${tnum(qin, 1)}\left(1 - \frac{298{,}15}{1\,500}\right) = ${tnum(eQ, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Destruição (Gouy–Stodola) e perda no condensador', tex: String.raw`\begin{gathered} e_{d,\text{cald}} = T_0\left(s_1 - s_4 - \frac{q_{\text{ent}}}{T_H}\right) = ${tnum(edC, 1)},\qquad e_{d,\text{turb}} = T_0\,(s_2 - s_1) = ${tnum(edT, 1)} \\ e_{p,\text{cond}} = (h_2 - h_3) - T_0\,(s_2 - s_3) = ${tnum(elC, 1)}\ \mathrm{kJ/kg} \end{gathered}`, note: `Bomba isentrópica: ${texInline('s_4 = s_3 = s_f')} e não há destruição nela.` },
          { label: 'Fechamento do balanço e eficiência exergética', tex: String.raw`e_Q = w_{\text{líq}} + \sum e_d + e_p:\ ${tnum(eQ, 1)} = ${tnum(wnet, 1)} + ${tnum(edC, 1)} + ${tnum(edT, 1)} + ${tnum(elC, 1)}\ (\text{resíduo } ${tnum(res, 2)}),\qquad \varepsilon = \frac{w_{\text{líq}}}{e_Q} = ${tnum((wnet / eQ) * 100, 1)}\%` },
        ],
        answer: `${texInline(`\\eta = ${tnum((wnet / qin) * 100, 1)}\\%`)} · ${texInline(`\\varepsilon = ${tnum((wnet / eQ) * 100, 1)}\\%`)} · caldeira ${texInline(`${tnum((edC / eQ) * 100, 1)}\\%`)}, turbina ${texInline(`${tnum((edT / eQ) * 100, 1)}\\%`)} e condensador ${texInline(`${tnum((elC / eQ) * 100, 1)}\\%`)} de ${texInline('e_Q')}`,
        check: `O condensador rejeita ${texInline(`${tnum(((h2 - c.hf) / qin) * 100, 0)}\\%`)} da energia, mas só ${texInline(`${tnum((elC / eQ) * 100, 1)}\\%`)} da exergia; a caldeira domina a destruição por causa do salto entre ${texInline(String.raw`1\,500\ \mathrm{K}`)} e o vapor a no máximo ${texInline(String.raw`713\ \mathrm{K}`)}.`,
      };
    },
  },

  /* 10. thermo-j-clapeyron */
  {
    id: 'thermo-j-clapeyron',
    title: 'Equação de Clapeyron: Entalpia de Vaporização a partir de Dados P–v–T',
    tag: 'Exemplo Dinâmico · Aula 10',
    params: [
      { key: 'T', label: `Temperatura de saturação ${texInline(String.raw`T_{\text{sat}}`)}`, unit: '°C', min: 100, max: 190, step: 10, base: 120, choices: [100, 120, 140, 150, 160, 180, 190] },
    ],
    solve: ({ T }) => {
      // Tabela A-2: T (°C), p (bar), vf·10³, vg (m³/kg), hfg (kJ/kg)
      const TT = [90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200];
      const PP = [0.7014, 1.014, 1.433, 1.985, 2.701, 3.613, 4.758, 6.178, 7.917, 10.02, 12.54, 15.54];
      const VF = [1.0360, 1.0435, 1.0516, 1.0603, 1.0697, 1.0797, 1.0905, 1.1020, 1.1143, 1.1274, 1.1414, 1.1565];
      const VG = [2.361, 1.673, 1.210, 0.8919, 0.6685, 0.5089, 0.3928, 0.3071, 0.2428, 0.1941, 0.1565, 0.1274];
      const HFG = [2283.2, 2257.0, 2230.2, 2202.6, 2174.2, 2144.7, 2114.3, 2082.6, 2049.5, 2015.0, 1978.8, 1940.7];
      const i = clamp(Math.round((T - 90) / 10), 1, 10);
      const Tc = TT[i], Tk = Tc + 273.15;
      const dPdT = ((PP[i + 1] - PP[i - 1]) * 100) / 20; // kPa/K
      const vfg = VG[i] - VF[i] / 1000;
      const hfg = Tk * vfg * dPdT;
      const err = ((hfg - HFG[i]) / HFG[i]) * 100;
      const Rw = 0.4615;
      const dlnP = Math.log(PP[i + 1] / PP[i - 1]) / 20;
      const hCC = Rw * Tk * Tk * dlnP;
      const errCC = ((hCC - HFG[i]) / HFG[i]) * 100;
      return {
        statement: `Usando somente dados ${texInline('P')}, ${texInline('v')} e ${texInline('T')} da Tabela A-2 em torno de ${texInline(`T_{\\text{sat}} = ${Tc}\\ ^\\circ\\mathrm{C}`)} (${texInline(`P_{\\text{sat}}(${Tc - 10}\\ ^\\circ\\mathrm{C}) = ${tnum(PP[i - 1], 4)}`)} e ${texInline(`P_{\\text{sat}}(${Tc + 10}\\ ^\\circ\\mathrm{C}) = ${tnum(PP[i + 1], 3)}\\ \\mathrm{bar}`)}; ${texInline(`v_f = ${tnum(VF[i] / 1000, 6)}`)}, ${texInline(`v_g = ${tnum(VG[i], 4)}\\ \\mathrm{m^3/kg}`)}), estime ${texInline('h_{fg}')} pela equação de Clapeyron e pela aproximação de Clausius–Clapeyron, e compare com o valor tabelado.`,
        steps: [
          { label: 'Inclinação da curva de saturação por diferença central (passo de 10 °C)', tex: String.raw`\left(\frac{dP}{dT}\right)_{\text{sat}} \approx \frac{P(${Tc + 10}) - P(${Tc - 10})}{20\ \mathrm{K}} = \frac{(${tnum(PP[i + 1], 3)} - ${tnum(PP[i - 1], 4)})\times 100\ \mathrm{kPa}}{20\ \mathrm{K}} = ${tnum(dPdT, 3)}\ \mathrm{kPa/K}` },
          { label: 'Equação de Clapeyron (exata para a mudança de fase)', tex: String.raw`h_{fg} = T\,v_{fg}\left(\frac{dP}{dT}\right)_{\text{sat}} = ${tnum(Tk, 2)}\,(${tnum(vfg, 5)})\,(${tnum(dPdT, 3)}) = ${tnum(hfg, 1)}\ \mathrm{kJ/kg}` },
          { label: `Clausius–Clapeyron (${texInline(String.raw`v_g \gg v_f`)} e vapor como gás ideal, ${texInline(String.raw`R = 0{,}4615\ \mathrm{kJ/(kg\cdot K)}`)})`, tex: String.raw`h_{fg} \approx R\,T^2\,\frac{d\ln P}{dT} = 0{,}4615\,(${tnum(Tk, 2)})^2\,\frac{\ln(${tnum(PP[i + 1], 3)}/${tnum(PP[i - 1], 4)})}{20} = ${tnum(hCC, 1)}\ \mathrm{kJ/kg}` },
        ],
        answer: `Clapeyron: ${texInline(`h_{fg} = ${tnum(hfg, 1)}\\ \\mathrm{kJ/kg}`)} (desvio ${texInline(`${err >= 0 ? '+' : ''}${tnum(err, 2)}\\%`)}) · Clausius–Clapeyron: ${texInline(`${tnum(hCC, 1)}\\ \\mathrm{kJ/kg}`)} (desvio ${texInline(`${errCC >= 0 ? '+' : ''}${tnum(errCC, 2)}\\%`)}) · tabelado ${texInline(`${tnum(HFG[i], 1)}\\ \\mathrm{kJ/kg}`)}`,
        check: `Clapeyron só depende da diferença finita e fica a menos de ${texInline(String.raw`1\%`)}; Clausius–Clapeyron erra mais e o erro cresce com ${texInline('T')}, porque o vapor se afasta do gás ideal (${texInline(`Pv_g/RT = ${tnum(((PP[i] * 100) * VG[i]) / (Rw * Tk), 3)}`)}). Assim, uma propriedade calórica (${texInline('h_{fg}')}) sai de medidas ${texInline('P')}, ${texInline('v')}, ${texInline('T')}.`,
      };
    },
  },

  /* 11. calor-a-mix */
  {
    id: 'calor-a-mix',
    title: 'Mistura de Gases Ideais: Massa Molar, Pressões Parciais e ΔS_mist',
    tag: 'Exemplo Dinâmico · Tec. Calor A',
    params: [
      { key: 'nCO2', label: 'Mols de CO₂', unit: 'kmol', min: 1, max: 5, step: 1, base: 2, choices: [1, 2, 3, 4] },
      { key: 'nN2', label: 'Mols de N₂', unit: 'kmol', min: 2, max: 10, step: 2, base: 6, choices: [2, 4, 6, 8] },
      { key: 'P', label: 'Pressão da mistura', unit: 'kPa', min: 100, max: 500, step: 50, base: 300, choices: [150, 200, 300, 450] },
    ],
    solve: ({ nCO2, nN2, P }) => {
      const nO2 = 2;
      const nTot = nCO2 + nO2 + nN2;
      const yC = nCO2 / nTot, yO = nO2 / nTot, yN = nN2 / nTot;
      const Mm = yC * 44.01 + yO * 32.0 + yN * 28.01;
      const Rm = RU / Mm;
      const dSmix = -nTot * RU * (yC * Math.log(yC) + yO * Math.log(yO) + yN * Math.log(yN));
      return {
        statement: `Uma mistura gasosa a <b>${P} kPa</b> e 300 K contém <b>${nCO2} kmol de CO₂</b>, <b>2 kmol de O₂</b> e <b>${nN2} kmol de N₂</b>. Determine M<sub>m</sub>, R<sub>m</sub>, a pressão parcial do CO₂ e a entropia gerada na mistura adiabática isobárica-isotérmica.`,
        steps: [
          { label: 'Frações molares e massa molar aparente', tex: String.raw`y_{\mathrm{CO_2}}=${tnum(yC, 3)},\ \ y_{\mathrm{O_2}}=${tnum(yO, 3)},\ \ y_{\mathrm{N_2}}=${tnum(yN, 3)} \;\Rightarrow\; M_m = ${tnum(Mm, 2)}\ \mathrm{kg/kmol}` },
          { label: 'Constante do gás e pressão parcial de Dalton', tex: String.raw`R_m = \frac{8{,}3145}{${tnum(Mm, 2)}} = ${tnum(Rm, 4)}\ \mathrm{kJ/(kg{\cdot}K)},\qquad P_{\mathrm{CO_2}} = y_{\mathrm{CO_2}} P = ${tnum(yC * P, 1)}\ \mathrm{kPa}` },
          { label: 'Entropia de mistura', tex: String.raw`\Delta S_{\text{mist}} = -\bar R\sum n_i\ln y_i = ${tnum(dSmix, 2)}\ \mathrm{kJ/K}` },
        ],
        answer: `M_m = ${fmt(Mm, 2)} kg/kmol · R_m = ${fmt(Rm, 4)} kJ/(kg·K) · P_CO₂ = ${fmt(yC * P, 1)} kPa · ΔS_mist = ${fmt(dSmix, 2)} kJ/K`,
        check: `Como M_m está entre 28,01 e 44,01 kg/kmol (${fmt(Mm, 2)}), o resultado satisfaz os limites dos componentes.`,
      };
    },
  },

  /* 12. calor-b-stoich */
  {
    id: 'calor-b-stoich',
    title: 'Estequiometria de Combustão, Excesso de Ar e Ponto de Orvalho',
    tag: 'Exemplo Dinâmico · Tec. Calor B',
    params: [
      { key: 'exc', label: 'Excesso de ar', unit: '%', min: 0, max: 100, step: 20, base: 40, choices: [0, 20, 40, 60, 80] },
      { key: 'P', label: 'Pressão dos produtos', unit: 'kPa', min: 100, max: 200, step: 25, base: 101.3, choices: [100, 125, 150, 200] },
    ],
    solve: ({ exc, P }) => {
      const aTh = 5; // Propano C3H8: a_th = 3 + 8/4 = 5
      const a = (1 + exc / 100) * aTh;
      const nProd = 3 + 4 + (a - 5) + 3.76 * a;
      const AF = (4.76 * a * 28.97) / 44.09;
      const yH2O = 4 / nProd;
      const Pv = yH2O * P;
      let Tpo = 40;
      for (let t = 15; t <= 85; t += 0.25) { if (pSatWaterKpa(t) >= Pv) { Tpo = t; break; } }
      return {
        statement: `Propano gasoso (C₃H₈) é queimado completamente com <b>${exc}% de excesso de ar</b> a <b>${fmt(P, 1)} kPa</b>. Escreva a reação balanceada, calcule a razão ar–combustível (AF) e a temperatura de ponto de orvalho dos gases.`,
        steps: [
          { label: 'Balanço atômico de C, H, O e N (ar = O₂ + 3,76 N₂)', tex: String.raw`\mathrm{C_3H_8} + ${tnum(a, 1)}(\mathrm{O_2} + 3{,}76\,\mathrm{N_2}) \to 3\,\mathrm{CO_2} + 4\,\mathrm{H_2O} + ${tnum(a - 5, 1)}\,\mathrm{O_2} + ${tnum(3.76 * a, 2)}\,\mathrm{N_2}` },
          { label: 'Razão ar–combustível mássica', tex: String.raw`AF = \frac{${tnum(4.76 * a, 2)} \times 28{,}97}{44{,}09} = ${tnum(AF, 2)}\ \mathrm{kg\ ar/kg\ comb}` },
          { label: 'Pressão parcial do vapor d’água e ponto de orvalho', tex: String.raw`P_v = y_{\mathrm{H_2O}} P = \frac{4}{${tnum(nProd, 2)}}(${tnum(P, 1)}) = ${tnum(Pv, 2)}\ \mathrm{kPa} \;\Rightarrow\; T_{po} \approx ${tnum(Tpo, 1)}\ ^\circ\mathrm{C}` },
        ],
        answer: `AF = ${fmt(AF, 2)} kg/kg · P_v = ${fmt(Pv, 2)} kPa · T_orvalho = ${fmt(Tpo, 1)} °C`,
        check: `Abaixo de ${fmt(Tpo, 1)} °C ocorre condensação ácida na chaminé (excesso de ar reduz y_H₂O e baixa T_po).`,
      };
    },
  },

  /* 13. calor-c-hcomb */
  {
    id: 'calor-c-hcomb',
    title: 'Entalpia de Combustão via Entalpias de Formação (Tabela A-25)',
    tag: 'Exemplo Dinâmico · Tec. Calor C',
    params: [
      { key: 'fuelIdx', label: 'Combustível (1=CH₄, 2=C₃H₈, 3=Etanol(l))', unit: '', min: 1, max: 3, step: 1, base: 1, choices: [1, 2, 3] },
    ],
    solve: ({ fuelIdx }) => {
      const fList = [
        { name: 'Metano CH₄(g)', c: 1, h: 4, hf: -74850, M: 16.04 },
        { name: 'Propano C₃H₈(g)', c: 3, h: 8, hf: -103850, M: 44.09 },
        { name: 'Etanol C₂H₅OH(l)', c: 2, h: 6, hf: -277690, M: 46.07 },
      ];
      const f = fList[fuelIdx - 1] || fList[0];
      const nW = f.h / 2;
      const hRPLiq = f.c * HF0.CO2 + nW * HF0.H2Ol - f.hf;
      const hRPGas = f.c * HF0.CO2 + nW * HF0.H2Og - f.hf;
      return {
        statement: `Usando as entalpias padrão de formação a 25 °C e 1 atm (Moran, Tab. A-25: CO₂ = −393 520; H₂O(l) = −285 830; H₂O(g) = −241 820 kJ/kmol), calcule a entalpia de combustão molar de <b>${f.name}</b> para água líquida e gasosa.`,
        steps: [
          { label: 'Definição de entalpia de combustão h̄_RP = H_P° − H_R°', tex: String.raw`\bar h_{RP} = ${f.c}\,\bar h_{f,\mathrm{CO_2}}^\circ + ${nW}\,\bar h_{f,\mathrm{H_2O}}^\circ - (1)\,\bar h_{f,\text{comb}}^\circ` },
          { label: 'Com água líquida nos produtos (base PCS)', tex: String.raw`\bar h_{RP,\text{liq}} = ${f.c}(-393\,520) + ${nW}(-285\,830) - (${f.hf}) = ${tnum(hRPLiq, 0)}\ \mathrm{kJ/kmol}` },
          { label: 'Com vapor d’água nos produtos (base PCI)', tex: String.raw`\bar h_{RP,\text{vap}} = ${f.c}(-393\,520) + ${nW}(-241\,820) - (${f.hf}) = ${tnum(hRPGas, 0)}\ \mathrm{kJ/kmol}` },
        ],
        answer: `h̄_RP(H₂O l) = ${fmt(hRPLiq, 0)} kJ/kmol · h̄_RP(H₂O g) = ${fmt(hRPGas, 0)} kJ/kmol`,
        check: `Diferença = ${nW} × 44 010 = ${fmt(nW * 44010, 0)} kJ/kmol (exatamente n_H₂O · h̄_fg a 25 °C).`,
      };
    },
  },

  /* 14. calor-d-react1st */
  {
    id: 'calor-d-react1st',
    title: 'I Lei em Câmara de Combustão em Regime Permanente',
    tag: 'Exemplo Dinâmico · Tec. Calor D',
    params: [
      { key: 'Tp', label: 'Temperatura dos produtos T_P', unit: 'K', min: 600, max: 1400, step: 200, base: 1000, choices: [600, 800, 1000, 1200] },
      { key: 'exc', label: 'Excesso de ar', unit: '%', min: 20, max: 100, step: 20, base: 40, choices: [20, 40, 60, 100] },
    ],
    solve: ({ Tp, exc }) => {
      // CH4(g) at 298 K + air at 298 K -> products at Tp
      const a = 2 * (1 + exc / 100), nO2 = a - 2, nN2 = 3.76 * a;
      const HR = HF0.CH4;
      const HP = (HF0.CO2 + hBarGas('CO2', Tp) - 9364) + 2 * (HF0.H2Og + hBarGas('H2O', Tp) - 9904) + nO2 * (hBarGas('O2', Tp) - 8682) + nN2 * (hBarGas('N2', Tp) - 8669);
      const Q = HP - HR; // negative = rejected
      return {
        statement: `Metano (CH₄) e ar entram a 25 °C (298 K) numa caldeira em regime permanente com <b>${exc}% de excesso de ar</b>. Os gases saem a <b>${Tp} K</b> (Moran, Tab. A-23 e A-25). Calcule o calor transferido por kmol de CH₄ e por kg de CH₄.`,
        steps: [
          { label: 'Entalpia dos reagentes a 298 K', tex: String.raw`\bar H_R = \bar h_{f,\mathrm{CH_4}}^\circ = -74\,850\ \mathrm{kJ/kmol\ CH_4}` },
          { label: `Entalpia dos produtos a ${Tp} K (CO₂ + 2 H₂O + ${fmt(nO2, 1)} O₂ + ${fmt(nN2, 2)} N₂)`, tex: String.raw`\bar H_P(${Tp}\ \mathrm{K}) = \sum n_e\left(\bar h_f^\circ + \Delta\bar h\right)_e = ${tnum(HP, 0)}\ \mathrm{kJ/kmol\ CH_4}` },
          { label: 'Calor útil transferido na caldeira (Ẇ_vc = 0)', tex: String.raw`\bar Q_{vc} = \bar H_P - \bar H_R = ${tnum(Q, 0)}\ \mathrm{kJ/kmol} = ${tnum(Q / 16.04, 0)}\ \mathrm{kJ/kg\ CH_4}` },
        ],
        answer: `Calor cedido ao fluido de trabalho: ${fmt(Math.abs(Q), 0)} kJ/kmol CH₄ (${fmt(Math.abs(Q) / 16.04, 0)} kJ/kg)`,
        check: `Rendimento de combustão em relação ao PCI (802 360 kJ/kmol): ${fmt((Math.abs(Q) / 802360) * 100, 1)}%.`,
      };
    },
  },

  /* 15. calor-e-hhv */
  {
    id: 'calor-e-hhv',
    title: 'Conversão Exata entre PCS (HHV) e PCI (LHV)',
    tag: 'Exemplo Dinâmico · Tec. Calor E',
    params: [
      { key: 'idx', label: 'Combustível (1=CH₄, 2=C₈H₁₈, 3=H₂)', unit: '', min: 1, max: 3, step: 1, base: 1, choices: [1, 2, 3] },
    ],
    solve: ({ idx }) => {
      const data = [
        { name: 'Metano (CH₄)', M: 16.04, nW: 2, pcs: 55510 },
        { name: 'Octano líquido (C₈H₁₈)', M: 114.22, nW: 9, pcs: 47900 },
        { name: 'Hidrogênio (H₂)', M: 2.016, nW: 1, pcs: 141780 },
      ][idx - 1];
      const hfg = 2442.3; // Water at 25 °C (Tab. A-2)
      const mW = (data.nW * 18.015) / data.M;
      const pci = data.pcs - mW * hfg;
      return {
        statement: `O Poder Calorífico Superior de <b>${data.name}</b> é <b>PCS = ${data.pcs.toLocaleString('pt-BR')} kJ/kg</b> (M = ${fmt(data.M, 2)} kg/kmol). Sabendo que 1 kmol gera <b>${data.nW} kmol de H₂O</b> e que h<sub>fg</sub>(25 °C) = 2442,3 kJ/kg, deduza o PCI.`,
        steps: [
          { label: 'Massa de água formada por kg de combustível', tex: String.raw`\frac{m_{\mathrm{H_2O}}}{m_{\text{comb}}} = \frac{${data.nW} \times 18{,}015}{${tnum(data.M, 2)}} = ${tnum(mW, 3)}\ \mathrm{kg\ H_2O/kg\ comb}` },
          { label: 'Relação termodinâmica PCS − PCI', tex: String.raw`\mathrm{PCI} = \mathrm{PCS} - \frac{m_{\mathrm{H_2O}}}{m_{\text{comb}}}\,h_{fg} = ${data.pcs} - ${tnum(mW, 3)}(2442{,}3) = ${tnum(pci, 0)}\ \mathrm{kJ/kg}` },
        ],
        answer: `PCI = ${fmt(pci, 0)} kJ/kg (diferença latente = ${fmt(((data.pcs - pci) / data.pcs) * 100, 1)}% do PCS)`,
        check: `Conferência na Tabela A-25 de Moran & Shapiro: valores nominais batem a < 0,2%.`,
      };
    },
  },

  /* 16. calor-f-tad */
  {
    id: 'calor-f-tad',
    title: 'Cálculo Iterativo da Temperatura Adiabática de Chama (Tabela A-23)',
    tag: 'Exemplo Dinâmico · Tec. Calor F',
    params: [
      { key: 'exc', label: 'Excesso de ar', unit: '%', min: 0, max: 150, step: 25, base: 50, choices: [0, 25, 50, 100, 150] },
    ],
    solve: ({ exc }) => {
      const a = 2 * (1 + exc / 100), nO = a - 2, nN = 3.76 * a;
      const HR = HF0.CH4;
      const HP = (T: number) =>
        (HF0.CO2 + hBarGas('CO2', T) - 9364) +
        2 * (HF0.H2Og + hBarGas('H2O', T) - 9904) +
        nO * (hBarGas('O2', T) - 8682) +
        nN * (hBarGas('N2', T) - 8669);
      let lo = 600, hi = 2800;
      for (let i = 0; i < 30; i++) { const mid = 0.5 * (lo + hi); if (HP(mid) < HR) lo = mid; else hi = mid; }
      const Tad = 0.5 * (lo + hi);
      return {
        statement: `Metano gasoso (CH₄) a 25 °C queima em regime permanente e câmara perfeitamente adiabática com ar a 25 °C e <b>${exc}% de excesso</b>. Resolva H<sub>P</sub>(T<sub>ad</sub>) = H<sub>R</sub> usando a Tabela A-23.`,
        steps: [
          { label: 'Balanço de energia adiabático (Q̇ = 0, Ẇ = 0)', tex: String.raw`H_P(T_{ad}) = H_R(298\ \mathrm{K}) = -74\,850\ \mathrm{kJ/kmol\ CH_4}` },
          { label: 'Equação implícita das entalpias sensíveis dos produtos', tex: String.raw`\Delta\bar h_{\mathrm{CO_2}} + 2\Delta\bar h_{\mathrm{H_2O}} + ${tnum(nO, 1)}\Delta\bar h_{\mathrm{O_2}} + ${tnum(nN, 2)}\Delta\bar h_{\mathrm{N_2}} = 802\,360\ \mathrm{kJ}` },
          { label: 'Raiz por interpolação na Tabela A-23', tex: String.raw`T_{ad} = ${tnum(Tad, 0)}\ \mathrm{K}\;\;(${tnum(Tad - 273.15, 0)}\ ^\circ\mathrm{C})` },
        ],
        answer: `T_ad = ${fmt(Tad, 0)} K (${fmt(Tad - 273.15, 0)} °C)`,
        check: `Para ar estequiométrico (0% excesso), T_ad ≈ 2328 K; com ${exc}% de excesso, cai para ${fmt(Tad, 0)} K.`,
      };
    },
  },

  /* 17. calor-g-psychro */
  {
    id: 'calor-g-psychro',
    title: 'Resfriamento com Desumidificação & Condensado (Psicrometria)',
    tag: 'Exemplo Dinâmico · Tec. Calor G',
    params: [
      { key: 'T1', label: 'Temp. entrada T₁', unit: '°C', min: 26, max: 36, step: 2, base: 30, choices: [28, 30, 32, 34] },
      { key: 'phi1', label: 'Umidade relativa φ₁', unit: '%', min: 50, max: 80, step: 10, base: 70, choices: [50, 60, 70, 80] },
      { key: 'T2', label: 'Saída da serpentina T₂', unit: '°C', min: 10, max: 16, step: 2, base: 14, choices: [10, 12, 14, 16] },
    ],
    solve: ({ T1, phi1, T2 }) => {
      const P = 101.325, Vdot = 2.0; // m³/s ar úmido
      const pv1 = (phi1 / 100) * pSatWaterKpa(T1);
      const w1 = 0.622 * (pv1 / (P - pv1));
      const h1 = 1.005 * T1 + w1 * (2501 + 1.86 * T1);
      const Ra = 0.287, v1 = (Ra * (T1 + 273.15)) / (P - pv1);
      const ma = Vdot / v1;
      const pv2 = pSatWaterKpa(T2);
      const w2 = 0.622 * (pv2 / (P - pv2));
      const h2 = 1.005 * T2 + w2 * (2501 + 1.86 * T2);
      const mw = ma * Math.max(0, w1 - w2);
      const Q = ma * ((h1 - h2) - Math.max(0, w1 - w2) * (4.18 * T2));
      return {
        statement: `Ar úmido entra numa serpentina a <b>${T1} °C</b>, <b>φ₁ = ${phi1}%</b>, 101,325 kPa e vazão de <b>2,0 m³/s</b>, saindo saturado a <b>${T2} °C</b>. Determine a vazão mássica de ar seco, o condensado removido e a taxa de calor removida.`,
        steps: [
          { label: 'Umidade absoluta ω₁, volume específico e vazão de ar seco', tex: String.raw`\omega_1 = ${tnum(w1, 5)},\quad v_1 = ${tnum(v1, 4)}\ \mathrm{m^3/kg_{as}} \;\Rightarrow\; \dot m_a = \frac{2{,}0}{${tnum(v1, 4)}} = ${tnum(ma, 3)}\ \mathrm{kg_{as}/s}` },
          { label: 'Umidade na saída saturada (φ₂ = 100%) e condensado', tex: String.raw`\omega_2 = ${tnum(w2, 5)} \;\Rightarrow\; \dot m_w = \dot m_a(\omega_1 - \omega_2) = ${tnum(mw * 3600, 2)}\ \mathrm{kg/h}` },
          { label: 'Capacidade de refrigeração da serpentina', tex: String.raw`\dot Q_{\text{sai}} = \dot m_a(h_1 - h_2) - \dot m_w h_{f,2} = ${tnum(Q, 2)}\ \mathrm{kW}\;\;(${tnum(Q / 3.517, 1)}\ \mathrm{TR})` },
        ],
        answer: `ṁ_a = ${fmt(ma, 3)} kg_as/s · Condensado = ${fmt(mw * 3600, 1)} kg/h · Q̇_sai = ${fmt(Q, 2)} kW`,
        check: `Como T₂ (${T2} °C) < T_po,1, ω₂ < ω₁ e há desumidificação real.`,
      };
    },
  },

  /* 18. calor-h-vcr */
  {
    id: 'calor-h-vcr',
    title: 'Ciclo de Refrigeração R-134a (Tabelas A-10/A-11/A-12)',
    tag: 'Exemplo Dinâmico · Tec. Calor H',
    params: [
      { key: 'pe', label: 'Pressão evaporador P_evap', unit: 'bar', min: 1.4, max: 2.4, step: 0.2, base: 1.8, choices: [1.4, 1.8, 2.0, 2.4] },
      { key: 'pc', label: 'Pressão condensador P_cond', unit: 'bar', min: 8, max: 12, step: 1, base: 10, choices: [8, 9, 10, 12] },
      { key: 'etac', label: 'Eficiência compressor η_c', unit: '%', min: 75, max: 95, step: 5, base: 80, choices: [75, 80, 85, 90] },
    ],
    solve: ({ pe, pc, etac }) => {
      const ev = R134A_SAT.find((r) => Math.abs(r.pBar - pe) < 0.05) || R134A_SAT[1];
      const cd = R134A_SAT.find((r) => Math.abs(r.pBar - pc) < 0.05) || R134A_SAT[6];
      const h1 = ev.hg, s1 = ev.sg;
      const st2s = interpR134aSupAtS(cd.pBar, s1);
      const ws = st2s.h - h1;
      const w = ws / (etac / 100);
      const h2 = h1 + w;
      const h3 = cd.hf, h4 = h3;
      const qL = h1 - h4;
      const cop = qL / w;
      const copMax = (ev.T + 273.15) / (cd.T - ev.T);
      return {
        statement: `Refrigerador com R-134a opera entre <b>${fmt(ev.pBar, 1)} bar (T_evap = ${fmt(ev.T, 1)} °C)</b> e <b>${fmt(cd.pBar, 0)} bar (T_cond = ${fmt(cd.T, 1)} °C)</b> com vapor saturado na sucção, líquido saturado na saída do condensador e <b>η_c = ${etac}%</b> (Tabs. A-11/A-12).`,
        steps: [
          { label: 'Estados 1 (vapor sat.), 2s (isentrópico Tab. A-12) e 3/4 (líq. sat.)', tex: String.raw`h_1=${tnum(h1, 2)},\ \ s_1=${tnum(s1, 4)}\ \Rightarrow\ h_{2s}=${tnum(st2s.h, 2)},\ \ h_3=h_4=${tnum(h3, 2)}\ \mathrm{kJ/kg}` },
          { label: 'Trabalho real de compressão e efeito refrigerante', tex: String.raw`w_c = \frac{h_{2s}-h_1}{\eta_c} = \frac{${tnum(ws, 2)}}{${tnum(etac / 100, 2)}} = ${tnum(w, 2)}\ \mathrm{kJ/kg},\qquad q_L = h_1 - h_4 = ${tnum(qL, 2)}\ \mathrm{kJ/kg}` },
          { label: 'Coeficiente de desempenho (COP)', tex: String.raw`\mathrm{COP}_R = \frac{q_L}{w_c} = ${tnum(cop, 2)}\qquad (\mathrm{COP}_{\text{Carnot}} = ${tnum(copMax, 2)})` },
        ],
        answer: `h₂ = ${fmt(h2, 1)} kJ/kg · w_c = ${fmt(w, 2)} kJ/kg · q_L = ${fmt(qL, 2)} kJ/kg · COP_R = ${fmt(cop, 2)}`,
        check: `Eficiência de 2ª Lei do ciclo: COP_R / COP_Carnot = ${fmt((cop / copMax) * 100, 1)}% (< 100% conforme esperado).`,
      };
    },
  },

  /* 19. calor-i-abs */
  {
    id: 'calor-i-abs',
    title: 'Ciclo de Absorção H₂O–LiBr: COP Reversível, Real e Irreversibilidade',
    tag: 'Exemplo Dinâmico · Tec. Calor I',
    params: [
      { key: 'TG', label: 'Temperatura gerador T_G', unit: '°C', min: 85, max: 140, step: 5, initial: 100, base: 100, choices: [85, 100, 115, 130] } as any,
      { key: 'TE', label: 'Temperatura evaporador T_E', unit: '°C', min: 4, max: 10, step: 2, base: 6, choices: [4, 6, 8, 10] },
      { key: 'QE', label: 'Capacidade frigorífica Q̇_E', unit: 'kW', min: 100, max: 500, step: 100, base: 200, choices: [100, 200, 300, 500] },
    ],
    solve: ({ TG, TE, QE }) => {
      const T0 = 30 + 273.15, TGk = TG + 273.15, TEk = TE + 273.15;
      const copRev = ((1 - T0 / TGk) * TEk) / (T0 - TEk);
      const copReal = 0.72;
      const QG = QE / copReal;
      const Q0 = QG + QE;
      const Sger = Q0 / T0 - QG / TGk - QE / TEk;
      const I = T0 * Sger;
      return {
        statement: `Um chiller por absorção H₂O–LiBr produz <b>${QE} kW</b> de água gelada a <b>${TE} °C</b> recebendo calor residual a <b>${TG} °C</b> e rejeitando calor para torre a <b>T₀ = 30 °C</b>, com <b>COP<sub>real</sub> = 0,72</b>. Calcule COP<sub>rev</sub>, Ṡ<sub>ger</sub> e a destruição de exergia total.`,
        steps: [
          { label: 'COP máximo reversível (motor de Carnot + refrigerador de Carnot)', tex: String.raw`\mathrm{COP}_{\text{rev}} = \left(1-\frac{T_0}{T_G}\right)\left(\frac{T_E}{T_0-T_E}\right) = \left(1-\frac{303{,}15}{${tnum(TGk, 2)}}\right)\left(\frac{${tnum(TEk, 2)}}{${tnum(T0 - TEk, 1)}}\right) = ${tnum(copRev, 2)}` },
          { label: 'Taxas de calor no gerador e rejeição combinada (condensador + absorvedor)', tex: String.raw`\dot Q_G = \frac{${QE}}{0{,}72} = ${tnum(QG, 1)}\ \mathrm{kW},\qquad \dot Q_{\text{rej}} = \dot Q_G + \dot Q_E = ${tnum(Q0, 1)}\ \mathrm{kW}` },
          { label: 'Geração de entropia global e destruição de exergia', tex: String.raw`\dot S_{\text{ger}} = \frac{\dot Q_{\text{rej}}}{T_0} - \frac{\dot Q_G}{T_G} - \frac{\dot Q_E}{T_E} = ${tnum(Sger, 4)}\ \mathrm{kW/K} \;\Rightarrow\; \dot I = T_0\dot S_{\text{ger}} = ${tnum(I, 2)}\ \mathrm{kW}` },
        ],
        answer: `COP_rev = ${fmt(copRev, 2)} · Q̇_G = ${fmt(QG, 1)} kW · İ_total = ${fmt(I, 2)} kW (η_II = ${fmt((copReal / copRev) * 100, 1)}%)`,
        check: `Como COP_real (${copReal}) < COP_rev (${fmt(copRev, 2)}), resulta Ṡ_ger > 0 e İ > 0.`,
      };
    },
  },

  /* 20. maq-ai-gas */
  {
    id: 'maq-ai-gas',
    title: 'Ciclo Brayton Real com Regeneração (Turbinas a Gás)',
    tag: 'Exemplo Dinâmico · Máq. Térmicas A.i',
    params: [
      { key: 'rp', label: 'Razão de pressão r_p', unit: '', min: 6, max: 14, step: 2, base: 10, choices: [6, 8, 10, 12, 14] },
      { key: 'T3', label: 'Temp. entrada turbina T₃', unit: 'K', min: 1100, max: 1500, step: 100, base: 1300, choices: [1100, 1200, 1300, 1400, 1500] },
      { key: 'eps', label: 'Efetividade regenerador ε', unit: '%', min: 0, max: 85, step: 15, base: 75, choices: [0, 60, 75, 85] },
    ],
    solve: ({ rp, T3, eps }) => {
      const k = 1.4, cp = 1.005, T1 = 300, etac = 0.85, etat = 0.88;
      const T2s = T1 * Math.pow(rp, (k - 1) / k);
      const T2 = T1 + (T2s - T1) / etac;
      const T4s = T3 / Math.pow(rp, (k - 1) / k);
      const T4 = T3 - etat * (T3 - T4s);
      const Tx = T4 > T2 ? T2 + (eps / 100) * (T4 - T2) : T2;
      const wc = cp * (T2 - T1), wt = cp * (T3 - T4), wNet = wt - wc, qIn = cp * (T3 - Tx);
      const eta = wNet / qIn;
      return {
        statement: `Ciclo Brayton com ar-padrão (T₁ = 300 K, η<sub>c</sub> = 85%, η<sub>t</sub> = 88%) opera com <b>r_p = ${rp}</b>, <b>T₃ = ${T3} K</b> e regenerador de efetividade <b>ε = ${eps}%</b>. Determine o trabalho líquido, BWR e rendimento térmico.`,
        steps: [
          { label: 'Compressor e turbina reais', tex: String.raw`T_2 = ${tnum(T2, 1)}\ \mathrm{K},\qquad T_4 = ${tnum(T4, 1)}\ \mathrm{K},\qquad w_{\text{líq}} = c_p[(T_3-T_4)-(T_2-T_1)] = ${tnum(wNet, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Regenerador e calor adicionado na câmara de combustão', tex: String.raw`T_x = T_2 + \varepsilon(T_4-T_2) = ${tnum(Tx, 1)}\ \mathrm{K},\qquad q_{\text{in}} = c_p(T_3 - T_x) = ${tnum(qIn, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Rendimento térmico e razão de trabalho reverso (BWR)', tex: String.raw`\eta = \frac{w_{\text{líq}}}{q_{\text{in}}} = ${tnum(eta * 100, 1)}\%,\qquad \mathrm{BWR} = \frac{w_c}{w_t} = ${tnum((wc / wt) * 100, 1)}\%` },
        ],
        answer: `w_líq = ${fmt(wNet, 1)} kJ/kg · η = ${fmt(eta * 100, 1)}% · BWR = ${fmt((wc / wt) * 100, 1)}%`,
        check: T4 > T2 ? `Regeneração possível porque T₄ (${fmt(T4, 0)} K) > T₂ (${fmt(T2, 0)} K).` : 'Atenção: T₄ ≤ T₂; regeneração desativada.',
      };
    },
  },

  /* 21. maq-aii-rankine */
  {
    id: 'maq-aii-rankine',
    title: 'Ciclo Rankine com Variações (Regenerativo com Aquecedor Aberto)',
    tag: 'Exemplo Dinâmico · Máq. Térmicas A.ii',
    params: [
      { key: 'pCald', label: 'Pressão caldeira P_cald', unit: 'bar', min: 40, max: 100, step: 20, base: 80, choices: [40, 60, 80, 100] },
      { key: 'pExt', label: 'Pressão extração (AAM)', unit: 'bar', min: 2, max: 10, step: 1, base: 5, choices: [2, 5, 10] },
    ],
    solve: ({ pCald, pExt }) => {
      const supMap: Record<number, { T: number; h: number; s: number }> = {
        40: { T: 440, h: 3307.1, s: 6.9041 },
        60: { T: 440, h: 3277.3, s: 6.6853 },
        80: { T: 480, h: 3348.4, s: 6.6586 },
        100: { T: 520, h: 3425.1, s: 6.6622 },
      };
      const st5 = supMap[pCald] || supMap[80];
      const cond = STEAM_SAT[1]; // 0.10 bar
      const ext = STEAM_SAT.find((r) => r.pBar === pExt) || STEAM_SAT[6];
      const x6 = clamp((st5.s - ext.sf) / (ext.sg - ext.sf), 0, 1.05);
      const h6 = x6 <= 1 ? ext.hf + x6 * ext.hfg : ext.hg + (x6 - 1) * 450;
      const x7 = (st5.s - cond.sf) / (cond.sg - cond.sf);
      const h7 = cond.hf + x7 * cond.hfg;
      const h2 = cond.hf + cond.vf * (pExt - 0.10) * 100;
      const h3 = ext.hf;
      const h4 = h3 + ext.vf * (pCald - pExt) * 100;
      const y = (h3 - h2) / (h6 - h2);
      const wt = (st5.h - h6) + (1 - y) * (h6 - h7);
      const wb = (1 - y) * (h2 - cond.hf) + (h4 - h3);
      const wNet = wt - wb;
      const qIn = st5.h - h4;
      const etaReg = wNet / qIn;
      const etaSimp = ((st5.h - h7) - cond.vf * (pCald - 0.10) * 100) / (st5.h - (cond.hf + cond.vf * (pCald - 0.10) * 100));
      return {
        statement: `Ciclo Rankine regenerativo ideal (1 aquecedor de mistura aberto a <b>${pExt} bar</b>) opera entre <b>${pCald} bar, ${st5.T} °C</b> e <b>0,10 bar</b>. Calcule a fração de vapor extraída <b>y</b> e o ganho de rendimento sobre o Rankine simples.`,
        steps: [
          { label: 'Balanço de energia no aquecedor aberto (AAM)', tex: String.raw`y\,h_6 + (1-y)\,h_2 = h_3 \;\Rightarrow\; y = \frac{${tnum(h3, 1)} - ${tnum(h2, 1)}}{${tnum(h6, 1)} - ${tnum(h2, 1)}} = ${tnum(y, 4)}` },
          { label: 'Trabalho líquido por kg na caldeira e calor adicionado', tex: String.raw`w_{\text{líq}} = (h_5-h_6) + (1-y)(h_6-h_7) - w_b = ${tnum(wNet, 1)}\ \mathrm{kJ/kg},\qquad q_{\text{in}} = h_5 - h_4 = ${tnum(qIn, 1)}\ \mathrm{kJ/kg}` },
          { label: 'Comparação com o ciclo Rankine simples', tex: String.raw`\eta_{\text{reg}} = ${tnum(etaReg * 100, 1)}\%\quad\text{vs}\quad \eta_{\text{simples}} = ${tnum(etaSimp * 100, 1)}\%` },
        ],
        answer: `Fração extraída y = ${fmt(y * 100, 1)}% · η_reg = ${fmt(etaReg * 100, 1)}% (ganho de +${fmt((etaReg - etaSimp) * 100, 1)} p.p.)`,
        check: `A regeneração eleva T_entrada na caldeira (${fmt(ext.T, 1)} °C vs 45,8 °C), aumentando a temperatura média de adição de calor.`,
      };
    },
  },

  /* 22. maq-aiii-cc */
  {
    id: 'maq-aiii-cc',
    title: 'Acoplamento Ciclo Combinado (HRSG) & Fator de Utilização CHP',
    tag: 'Exemplo Dinâmico · Máq. Térmicas A.iii',
    params: [
      { key: 'Wg', label: 'Potência turbina a gás Ẇ_G', unit: 'MW', min: 40, max: 160, step: 20, base: 80, choices: [40, 60, 80, 120, 160] },
      { key: 'etaG', label: 'Eficiência Brayton η_G', unit: '%', min: 30, max: 40, step: 2, base: 34, choices: [30, 32, 34, 36, 38] },
      { key: 'etaV', label: 'Eficiência fundo Rankine η_V', unit: '%', min: 28, max: 36, step: 2, base: 32, choices: [28, 30, 32, 36] },
    ],
    solve: ({ Wg, etaG, etaV }) => {
      const eG = etaG / 100, eV = etaV / 100;
      const Qcomb = Wg / eG;
      const Qexh = Qcomb - Wg;
      const Wv = eV * Qexh;
      const Wtot = Wg + Wv;
      const etaCC = Wtot / Qcomb;
      const checkFormula = eG + eV - eG * eV;
      return {
        statement: `Num ciclo combinado ideal sem queima suplementar, a turbina a gás entrega <b>${Wg} MW</b> com rendimento <b>η_G = ${etaG}%</b>. Os gases de exaustão alimentam integralmente uma caldeira de recuperação (HRSG) ligada a um ciclo Rankine de rendimento <b>η_V = ${etaV}%</b>.`,
        steps: [
          { label: 'Calor do combustível e energia térmica na exaustão da TG', tex: String.raw`\dot Q_{\text{comb}} = \frac{${Wg}}{${tnum(eG, 2)}} = ${tnum(Qcomb, 1)}\ \mathrm{MW},\qquad \dot Q_{\text{exaust}} = \dot Q_{\text{comb}} - \dot W_G = ${tnum(Qexh, 1)}\ \mathrm{MW}` },
          { label: 'Potência do ciclo a vapor e potência total da usina', tex: String.raw`\dot W_V = \eta_V\,\dot Q_{\text{exaust}} = ${tnum(eV, 2)}(${tnum(Qexh, 1)}) = ${tnum(Wv, 1)}\ \mathrm{MW},\qquad \dot W_{\text{total}} = ${tnum(Wtot, 1)}\ \mathrm{MW}` },
          { label: 'Verificação pela fórmula analítica acoplada', tex: String.raw`\eta_{CC} = \frac{\dot W_{\text{total}}}{\dot Q_{\text{comb}}} = ${tnum(etaCC * 100, 2)}\%\;\;=\;\; \eta_G + \eta_V - \eta_G\eta_V = ${tnum(checkFormula * 100, 2)}\%` },
        ],
        answer: `Ẇ_V = ${fmt(Wv, 1)} MW · Ẇ_total = ${fmt(Wtot, 1)} MW · η_CC = ${fmt(etaCC * 100, 1)}%`,
        check: `As duas vias (balanço de potência e fórmula acoplada η_G + η_V − η_G·η_V) dão o resultado idêntico ${fmt(etaCC * 100, 2)}%.`,
      };
    },
  },

  /* 23. maq-b-exergy */
  {
    id: 'maq-b-exergy',
    title: 'Análise Exergética em Cogeração (1ª Lei vs 2ª Lei)',
    tag: 'Exemplo Dinâmico · Máq. Térmicas B',
    params: [
      { key: 'W', label: 'Potência elétrica gerada Ẇ', unit: 'MW', min: 15, max: 60, step: 5, base: 30, choices: [15, 20, 30, 45, 60] },
      { key: 'Qp', label: 'Calor útil de processo Q̇_p', unit: 'MW', min: 30, max: 100, step: 10, base: 60, choices: [30, 45, 60, 80, 100] },
      { key: 'Tp', label: 'Temperatura do processo T_p', unit: '°C', min: 110, max: 230, step: 20, base: 150, choices: [110, 130, 150, 190, 230] },
    ],
    solve: ({ W, Qp, Tp }) => {
      const T0 = 298.15, Tpk = Tp + 273.15;
      const Qcomb = (W + Qp) / 0.82; // assume 82% first-law utilization factor
      const ExFuel = 1.04 * Qcomb;
      const util = (W + Qp) / Qcomb;
      const carnotF = 1 - T0 / Tpk;
      const ExQ = Qp * carnotF;
      const etaII = (W + ExQ) / ExFuel;
      const Ed = ExFuel - (W + ExQ);
      return {
        statement: `Uma planta de cogeração consome <b>${fmt(Qcomb, 1)} MW</b> térmicos de gás natural (exergia do combustível = 1,04·Q̇<sub>comb</sub>) para entregar <b>${W} MW</b> de eletricidade e <b>${Qp} MW</b> de vapor de processo a <b>${Tp} °C</b> (T₀ = 25 °C). Compare o Fator de Utilização (1ª Lei) e a Eficiência Exergética (2ª Lei).`,
        steps: [
          { label: 'Fator de utilização energética (1ª Lei)', tex: String.raw`\varepsilon_u = \frac{\dot W + \dot Q_p}{\dot Q_{\text{comb}}} = \frac{${W} + ${Qp}}{${tnum(Qcomb, 1)}} = ${tnum(util * 100, 1)}\%` },
          { label: 'Exergia associada ao calor de processo a T_p', tex: String.raw`\dot E_{Q,p} = \dot Q_p\left(1 - \frac{298{,}15}{${tnum(Tpk, 2)}}\right) = ${Qp}(${tnum(carnotF, 4)}) = ${tnum(ExQ, 2)}\ \mathrm{MW}` },
          { label: 'Eficiência exergética e exergia destruída/perdida', tex: String.raw`\eta_{II} = \frac{\dot W + \dot E_{Q,p}}{\dot E_{\text{comb}}} = \frac{${W} + ${tnum(ExQ, 2)}}{${tnum(ExFuel, 1)}} = ${tnum(etaII * 100, 1)}\%,\qquad \dot E_D + \dot E_L = ${tnum(Ed, 1)}\ \mathrm{MW}` },
        ],
        answer: `1ª Lei (ε_u) = ${fmt(util * 100, 1)}% · 2ª Lei (η_II) = ${fmt(etaII * 100, 1)}% · Ė_Q,processo = ${fmt(ExQ, 1)} MW`,
        check: `Elevar T_p aumenta o valor termodinâmico (exergia) do vapor entregue, aproximando η_II do rendimento de 1ª Lei.`,
      };
    },
  },
];

const DYN_MAP = new Map<string, DynExSpec>(DYN_SPECS.map((d) => [d.id, d]));
export const DYNAMIC_EX_IDS: readonly string[] = DYN_SPECS.map((d) => d.id);

export function hydrateDynamicExercises(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>('[data-dyn-ex]').forEach((host) => {
    const id = host.dataset.dynEx || '';
    const spec = DYN_MAP.get(id);
    if (!spec) {
      host.innerHTML = `<p class="dyn-missing">Exercício dinâmico "${id}" não encontrado.</p>`;
      return;
    }
    const vals: Record<string, number> = {};
    spec.params.forEach((p) => { vals[p.key] = p.base; });
    let shownSteps = 1;

    host.innerHTML = `
      <div class="dyn-split">
        <div class="dyn-left">
          <div class="dyn-head">
            <span class="dyn-badge mono">${spec.tag}</span>
            <h4>${spec.title}</h4>
          </div>
          <div class="dyn-actions">
            <button type="button" class="act solid dyn-rand">🎲 Gerar novos números</button>
            <button type="button" class="act dyn-reset">Base</button>
          </div>
          <div class="dyn-params">
            ${spec.params.map((p) => {
              const dec = p.step < 0.1 ? 2 : p.step < 1 ? 1 : 0;
              return `<label class="dyn-chip">
                <span>${p.label}</span>
                <input type="range" data-dyn-key="${p.key}" min="${p.min}" max="${p.max}" step="${p.step}" value="${p.base}" />
                <b data-dyn-val="${p.key}">${p.fmtVal ? p.fmtVal(p.base) : `${fmt(p.base, dec)}${p.unit ? ` ${p.unit}` : ''}`}</b>
              </label>`;
            }).join('')}
          </div>
          <p class="dyn-stmt"></p>
        </div>
        <div class="dyn-right handwritten-sheet taped">
          <div class="dyn-sol-head">
            <span class="dyn-sol-title">Resolução comentada à mão</span>
            <div class="dyn-step-bar">
              <button type="button" class="act dyn-step-next">+ Passo</button>
              <button type="button" class="act dyn-step-all">Tudo</button>
              <button type="button" class="act dyn-step-hide">Ocultar</button>
            </div>
          </div>
          <ol class="dyn-steps"></ol>
          <div class="dyn-ans"></div>
          <p class="dyn-check"></p>
        </div>
      </div>
    `;

    const stmtEl = host.querySelector<HTMLElement>('.dyn-stmt')!;
    const stepsEl = host.querySelector<HTMLElement>('.dyn-steps')!;
    const ansEl = host.querySelector<HTMLElement>('.dyn-ans')!;
    const checkEl = host.querySelector<HTMLElement>('.dyn-check')!;
    let totalSteps = 1;

    function renderSolution() {
      spec!.params.forEach((p) => {
        const dec = p.step < 0.1 ? 2 : p.step < 1 ? 1 : 0;
        const b = host.querySelector<HTMLElement>(`[data-dyn-val="${p.key}"]`);
        if (b) b.textContent = p.fmtVal ? p.fmtVal(vals[p.key]) : `${fmt(vals[p.key], dec)}${p.unit ? ` ${p.unit}` : ''}`;
        const inp = host.querySelector<HTMLInputElement>(`input[data-dyn-key="${p.key}"]`);
        if (inp) inp.value = String(vals[p.key]);
      });
      const sol = spec!.solve(vals);
      totalSteps = sol.steps.length;
      shownSteps = clamp(shownSteps, 0, totalSteps);
      stmtEl.innerHTML = sol.statement;
      stepsEl.innerHTML = sol.steps.slice(0, shownSteps).map((st) => `
        <li>
          <span class="dyn-st-lbl">${st.label}</span>
          <div class="eq">${texDisplay(st.tex)}</div>
          ${st.note ? `<p class="dyn-st-note">${st.note}</p>` : ''}
        </li>`).join('');
      const done = shownSteps >= totalSteps;
      ansEl.hidden = !done;
      checkEl.hidden = !done;
      if (done) {
        ansEl.innerHTML = `<strong>Resultado:</strong> ${sol.answer}`;
        checkEl.innerHTML = `<b>Verificação física:</b> ${sol.check}`;
      }
      void texInline;
    }

    host.querySelector('.dyn-rand')!.addEventListener('click', () => {
      spec.params.forEach((p) => {
        if (p.choices && p.choices.length > 1) {
          const other = p.choices.filter((c) => Math.abs(c - vals[p.key]) > 1e-6);
          vals[p.key] = other[Math.floor(Math.random() * other.length)];
        } else {
          const count = Math.max(1, Math.round((p.max - p.min) / p.step));
          vals[p.key] = Number((p.min + Math.floor(Math.random() * (count + 1)) * p.step).toFixed(4));
        }
      });
      shownSteps = totalSteps;
      renderSolution();
    });

    host.querySelector('.dyn-reset')!.addEventListener('click', () => {
      spec.params.forEach((p) => { vals[p.key] = p.base; });
      shownSteps = 1;
      renderSolution();
    });

    host.querySelector('.dyn-step-next')!.addEventListener('click', () => {
      shownSteps = Math.min(totalSteps, shownSteps + 1);
      renderSolution();
    });
    host.querySelector('.dyn-step-all')!.addEventListener('click', () => {
      shownSteps = totalSteps;
      renderSolution();
    });
    host.querySelector('.dyn-step-hide')!.addEventListener('click', () => {
      shownSteps = 0;
      renderSolution();
    });

    host.querySelectorAll<HTMLInputElement>('input[data-dyn-key]').forEach((inp) => {
      inp.addEventListener('input', () => {
        vals[inp.dataset.dynKey!] = inp.valueAsNumber;
        shownSteps = totalSteps;
        renderSolution();
      });
    });

    renderSolution();
  });
}
