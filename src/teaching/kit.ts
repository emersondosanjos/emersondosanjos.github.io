/*
 * Teaching kit: shared building blocks for every lesson deck.
 * A lesson is a list of slides (presented in class) plus a handout (printable "apostila").
 * All HTML is generated at build time; equations are pre-rendered with KaTeX.
 * Visual language = the site's (theme B): navy #0b2d6b, coral #ff7a59, ice #dbe7f6, hand-lettered titles.
 */
import katex from 'katex';

export interface Lesson {
  /** stable slug, e.g. 'tc-a-conceitos' */
  id: string;
  /** syllabus item, e.g. 'a' */
  code: string;
  /** order inside the course (1..n) */
  num: number;
  title: string;
  /** one-sentence description shown in the catalog */
  summary: string;
  /** sub-topics shown in the catalog */
  topics: string[];
  /** bibliographic references used to prepare the lesson */
  refs: string[];
  /** slides, each built with S(...) */
  slides: string[];
  /** printable handout HTML, built with H.* helpers */
  handout: string;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  lessons: Lesson[];
}

/* ---------- palette (use inside inline SVG figures) ---------- */
export const C = {
  navy: '#0b2d6b',
  coral: '#ff7a59',
  coralSoft: '#ffd2c6',
  ice: '#dbe7f6',
  iceDeep: '#b7cdec',
  paper: '#f8fafd',
  muted: '#4d5b7c',
  green: '#23935a',
  red: '#c8102e',
  amber: '#e2ac00',
};

/* ---------- math ---------- */
/** inline math */
export const m = (tex: string) => katex.renderToString(tex, { throwOnError: false });
/** display equation, optional tag like '2.7' */
export const M = (tex: string, tag?: string) =>
  `<div class="eq">${katex.renderToString(tex, { displayMode: true, throwOnError: false })}${tag ? `<span class="eq-tag mono">(${tag})</span>` : ''}</div>`;

/* ---------- slide builders ---------- */
type SlideOpts = { title?: string; kind?: 'cover' | 'section' | 'plain'; note?: string };
/** one slide. Elements wrapped in frag() appear one at a time when the presenter advances. */
export const S = (body: string, o: SlideOpts = {}) =>
  `<section class="slide ${o.kind ?? ''}"${o.note ? ` data-note="${o.note.replace(/"/g, '&quot;')}"` : ''}>${o.title ? `<h2 class="s-title">${o.title}</h2>` : ''}<div class="s-body">${body}</div></section>`;

/** cover slide */
export const cover = (kicker: string, title: string, sub: string, base: string) =>
  S(`<p class="s-kicker mono">${kicker}</p><h1>${title}</h1><p class="s-sub">${sub}</p><p class="s-base">${base}</p>`, { kind: 'cover' });

/** section divider slide (big number + title) */
export const section = (n: string, title: string, lead = '') =>
  S(`<p class="sec-n mono">${n}</p><h1 class="sec-t">${title}</h1>${lead ? `<p class="sec-l">${lead}</p>` : ''}`, { kind: 'section' });

/** progressive reveal: shown on the next "advance" press */
export const frag = (html: string) => `<div class="frag">${html}</div>`;

/** two columns */
export const cols = (a: string, b: string, ratio = '1fr 1fr') => `<div class="s-split" style="grid-template-columns:${ratio}">${a}<div>${b}</div></div>`;

/** definition card */
export const def = (term: string, text: string) => `<div class="k-def"><b>${term}</b><p>${text}</p></div>`;
/** key idea (highlighter) */
export const idea = (text: string) => `<p class="k-idea">${text}</p>`;
/** common mistake / attention */
export const warn = (text: string) => `<div class="k-warn"><b>Atenção</b><p>${text}</p></div>`;
/** question to the class */
export const ask = (text: string) => `<div class="k-ask"><b>Pergunta</b><p>${text}</p></div>`;
/** figure with caption */
export const fig = (svg: string, caption = '') => `<figure class="s-fig">${svg}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
/** bullet list */
export const list = (items: string[]) => `<ul class="s-list">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
/** numbered steps of a worked example; each step is revealed progressively */
export const steps = (items: string[]) => `<ol class="k-steps">${items.map((i) => `<li class="frag">${i}</li>`).join('')}</ol>`;
/** final answer highlight */
export const answer = (html: string) => `<p class="s-answer">${html}</p>`;
/** small source line */
export const src = (text: string) => `<p class="s-src">${text}</p>`;

/* ---------- handout builders ---------- */
export const H = {
  head: (kicker: string, title: string, lede: string, toc: [string, string][]) =>
    `<header class="l-head"><p class="l-kicker mono">${kicker}</p><h1>${title}</h1><p class="l-lede">${lede}</p><ol class="l-toc">${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></header>`,
  sec: (id: string, n: string, title: string, html: string) =>
    `<section id="${id}"><h2><span class="n mono">${n}</span> ${title}</h2>${html}</section>`,
  fig: (svg: string, caption: string) => `<figure class="l-fig">${svg}<figcaption>${caption}</figcaption></figure>`,
  note: (html: string) => `<aside class="l-note">${html}</aside>`,
  ex: (title: string, html: string, ans: string) => `<div class="ex"><h3>${title}</h3>${html}<p class="ans">${ans}</p></div>`,
  exercises: (items: string[]) => `<ol class="l-ex">${items.map((i) => `<li>${i}</li>`).join('')}</ol>`,
  refs: (items: string[]) => `<footer class="l-ref"><p><b>Referências</b></p><ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol></footer>`,
  wrap: (html: string) => `<article class="lesson">${html}</article>`,
};

/* ---------- standard references for the course ---------- */
export const REF = {
  moran: 'M. J. Moran, H. N. Shapiro, D. D. Boettner, M. B. Bailey, <em>Princípios de Termodinâmica para Engenharia</em>, 7ª ed., LTC.',
  cengel: 'Y. A. Çengel, M. A. Boles, <em>Termodinámica</em>, 7ª ed., McGraw-Hill.',
  bejan: 'A. Bejan, <em>Advanced Engineering Thermodynamics</em>, 4ª ed., Wiley, 2016.',
  vanwylen: 'C. Borgnakke, R. E. Sonntag, <em>Fundamentos da Termodinâmica</em> (Van Wylen), Blucher.',
  kestin: 'J. Kestin, <em>A Course in Thermodynamics</em>, Hemisphere.',
  callen: 'H. B. Callen, <em>Thermodynamics and an Introduction to Thermostatistics</em>, 2ª ed., Wiley.',
  notes: 'Notas de aula, Termodinâmica (PEM/COPPE/UFRJ, 2020.1).',
};
