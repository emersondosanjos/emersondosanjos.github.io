/*
 * Teaching kit: shared building blocks for every lesson deck, printable workbook ("apostila"),
 * and concurso-grade "Disserte sobre..." guide.
 * All HTML/KaTeX equations are pre-rendered at build time.
 * Visual language = the site's Balmer / Pernambuco Ice White theme:
 *   navy #0b2d6b, coral #ff7a59 / #f6a593, ice #dbe7f6, paper #f8fafd, Inter + Martian Mono + Kalam.
 * Node 26 --experimental-strip-types compatible (explicit .ts imports, no enum/param-props).
 */
import katex from 'katex';

export type CourseId = 'thermo' | 'calor' | 'maquinas';

export interface DisserteStep {
  num: string;
  heading: string;
  why: string;
  equation?: string;
  eqTag?: string;
  explanation: string;
  hypotheses?: string;
}

export interface DisserteAnswerParagraph {
  lead?: string;
  text: string;
  equation?: string;
  eqTag?: string;
}

export interface DisserteBlock {
  prompt: string;
  context: string;
  timeEstimate: string;
  outline: string[];
  steps: DisserteStep[];
  modelAnswer?: {
    title?: string;
    paragraphs: DisserteAnswerParagraph[];
  };
  rubric: string[];
  pitfalls: string[];
}

export interface AiStudyPrompt {
  title: string;
  prompt: string;
  check: string;
}

export interface Lesson {
  /** stable slug, e.g. 'thermo-a', 'calor-g', 'maq-ai' */
  id: string;
  /** course key */
  courseId?: CourseId;
  /** syllabus item, e.g. 'a', 'a.i', 'b' */
  code: string;
  /** order inside the course (1..n) */
  num: number;
  title: string;
  /** one-sentence description shown in the catalog */
  summary: string;
  /** sub-topics shown in the catalog */
  topics: string[];
  /** learning objectives */
  objectives?: string[];
  /** bibliographic references used to prepare the lesson */
  refs: string[];
  /** slides, each built with S(...) */
  slides: string[];
  /** printable handout HTML, built with H.* helpers */
  handout: string;
  /** university professor exam-grade dissertation guide */
  disserte?: DisserteBlock;
  /** AI study prompts with physical verification checks */
  aiStudyPrompts?: AiStudyPrompt[];
}

export interface Course {
  id: string;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  lessons: Lesson[];
}

/* ---------- palette (use inside inline SVG figures) ---------- */
export const C = {
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

const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ---------- math ---------- */
/** inline math */
export const m = (tex: string) => `\u2060${katex.renderToString(tex, { throwOnError: false })}\u2060`;
/** display equation, optional tag like '1.4' */
export const M = (tex: string, tag?: string) =>
  `<div class="eq">${katex.renderToString(tex, { displayMode: true, throwOnError: false })}${tag ? `<span class="eq-tag mono">(${tag})</span>` : ''}</div>`;

/* ---------- slide builders ---------- */
type SlideOpts = { title?: string; kind?: 'cover' | 'section' | 'plain' | 'sim' | 'dyn' | 'ai'; note?: string };
/** one widescreen 16:9 slide. Elements wrapped in frag() appear one at a time when advancing. */
export const S = (body: string, o: SlideOpts = {}) =>
  `<section class="slide ${o.kind ?? ''}"${o.note ? ` data-note="${escAttr(o.note)}"` : ''}>${o.title ? `<h2 class="s-title">${o.title}</h2>` : ''}<div class="s-body">${body}</div></section>`;

/** cover slide with persistent author identity (without "Prof.") */
export const cover = (kicker: string, title: string, sub: string, base: string) => {
  const cleanSub = sub.replace(/^(?:Prof\.\s*)?Emerson Barbosa dos Anjos\s*[·•\-]?\s*/i, '').trim();
  const roleLine = cleanSub
    ? `D.Sc. Engenharia Mecânica · ${cleanSub}`
    : 'D.Sc. Engenharia Mecânica · COPPE/UFRJ';
  return S(
    `<p class="s-kicker mono">${kicker}</p><h1>${title}</h1><p class="s-sub">Emerson Barbosa dos Anjos</p><p class="s-author-role">${roleLine}</p><p class="s-base">${base}</p>`,
    { kind: 'cover' },
  );
};

/** section divider slide (big number + title) */
export const section = (n: string, title: string, lead = '') =>
  S(`<p class="sec-n mono">${n}</p><h1 class="sec-t">${title}</h1>${lead ? `<p class="sec-l">${lead}</p>` : ''}`, { kind: 'section' });

/** stamps persistent widescreen footer (author, course/lesson, slide XX / YY) onto every slide */
export function finalizeSlides(courseTitle: string, _lessonCode: string, lessonNum: number, slides: string[]): string[] {
  const total = slides.length;
  return slides.map((slideHtml, i) => {
    if (slideHtml.includes('class="s-chrome"')) return slideHtml;
    const chrome = `<footer class="s-chrome"><span class="s-chrome-author">Emerson Barbosa dos Anjos · D.Sc.</span><span class="s-chrome-course">${courseTitle} · Aula ${String(lessonNum).padStart(2, '0')}</span><span class="s-chrome-num mono">${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span></footer>`;
    const idx = slideHtml.lastIndexOf('</section>');
    if (idx === -1) return slideHtml + chrome;
    return slideHtml.slice(0, idx) + chrome + slideHtml.slice(idx);
  });
}

/** interactive cycle/process simulator mount hydrated in browser */
export const cycleSim = (id: string, title?: string) =>
  `<div class="cycle-sim" data-cycle-sim="${escAttr(id)}"${title ? ` data-sim-title="${escAttr(title)}"` : ''}></div>`;

/** dynamic parametric exercise with "Gerar novos números" + handwritten live KaTeX */
export const dynExercise = (id: string) =>
  `<div class="dyn-ex" data-dyn-ex="${escAttr(id)}"></div>`;

/** AI-assisted study block in native site brush stroke (never a rectangular box) */
export const aiLab = (title: string, prompt: string, check: string) =>
  `<div class="ai-lab brush">
    <div class="ai-lab-head">
      <span class="ai-badge mono">IA + VERIFICAÇÃO FÍSICA</span>
      <strong>${title}</strong>
      <button type="button" class="act ai-copy-btn" data-copy-prompt>Copiar roteiro</button>
    </div>
    <p class="ai-prompt-text">${escHtml(prompt).replace(/\n/g, '<br>')}</p>
    <p class="ai-check"><b>Checagem determinística:</b> ${check}</p>
  </div>`;

/** progressive reveal: shown on the next "advance" press */
export const frag = (html: string) => `<div class="frag">${html}</div>`;

/** two columns */
export const cols = (a: string, b: string, ratio = '1fr 1fr') => `<div class="s-split" style="grid-template-columns:${ratio}"><div>${a}</div><div>${b}</div></div>`;

/** definition card (organic taped / hand-cut tactile frame) */
export const def = (term: string, text: string) =>
  `<div class="k-def"><b>${term}</b>${/^\s*<(?:div|p|ul|ol|table)\b/i.test(text) ? text : `<p>${text}</p>`}</div>`;
/** key idea (highlighter) */
export const idea = (text: string) => `<p class="k-idea">${text}</p>`;
/** common mistake / attention */
export const warn = (text: string) => `<div class="k-warn"><b>Atenção</b><p>${text}</p></div>`;
/** question to the class (native dry-brush navy stroke) */
export const ask = (text: string) => `<div class="k-ask brush"><b>Pergunta</b><p>${text}</p></div>`;
/** figure with caption */
export const fig = (svg: string, caption = '', cls = '') =>
  `<figure class="s-fig${cls ? ` ${cls}` : ''}">${svg}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`;
/** bullet list */
export const list = (items: string[]) => `<ul class="s-list">${items.map((i) => `<li>${i}</li>`).join('')}</ul>`;
/** numbered steps of a worked example; each step is revealed progressively */
export const steps = (items: string[]) => `<ol class="k-steps">${items.map((i) => `<li class="frag">${i}</li>`).join('')}</ol>`;
/** final answer highlight */
export const answer = (html: string) => `<p class="s-answer">${html}</p>`;
/** small source line */
export const src = (text: string) => `<p class="s-src">${text}</p>`;

/* ---------- handout builders ("apostila" + workbook + disserte) ---------- */
export interface HandoutCoverOpts {
  course: string;
  code: string;
  num: number;
  title: string;
  lede: string;
  objectives: string[];
  prereq?: string;
  toc: [string, string][];
}

const CALLOUT_LABELS: Record<'physics' | 'trap' | 'ai', string> = {
  physics: 'Intuição Física',
  trap: 'Armadilha Clássica',
  ai: 'Verificação Conceitual',
};

export const H = {
  head: (kicker: string, title: string, lede: string, toc: [string, string][]) =>
    `<header class="l-head"><p class="l-kicker mono">${kicker}</p><h1>${title}</h1><p class="l-lede">${lede}</p><ol class="l-toc ticked">${toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol></header>`,
  cover: (o: HandoutCoverOpts) =>
    `<header class="l-head l-workbook-head">
      <div class="l-ruler" aria-hidden="true"></div>
      <div class="l-meta-row">
        <span class="l-badge mono">${o.course} · Aula ${String(o.num).padStart(2, '0')}</span>
        <span class="l-author-chip">Emerson Barbosa dos Anjos · D.Sc. Engenharia Mecânica</span>
      </div>
      <h1><span class="l-title-accent">${o.title}</span></h1>
      <p class="l-lede">${o.lede}</p>
      ${o.prereq ? `<p class="l-prereq"><b>Pré-requisitos:</b> ${o.prereq}</p>` : ''}
      <div class="l-objectives ticked">
        <p class="l-obj-title mono">Objetivos de aprendizagem</p>
        <ul>${o.objectives.map((item) => `<li>${item}</li>`).join('')}</ul>
      </div>
      <ol class="l-toc ticked">${o.toc.map(([id, t]) => `<li><a href="#${id}">${t}</a></li>`).join('')}</ol>
    </header>`,
  sec: (id: string, n: string, title: string, html: string) =>
    `<section id="${id}"><h2><span class="n mono">${n}</span> ${title}</h2>${html}</section>`,
  fig: (svg: string, caption: string) => `<figure class="l-fig">${svg}<figcaption>${caption}</figcaption></figure>`,
  note: (html: string) => `<aside class="l-note">${html}</aside>`,
  callout: (kind: 'physics' | 'trap' | 'ai', title: string, html: string) =>
    `<aside class="l-callout l-callout-${kind}"><p class="l-callout-tag mono">${CALLOUT_LABELS[kind]}</p><h3>${title}</h3><div class="l-callout-body">${html}</div></aside>`,
  formulaSheet: (rows: [string, string, string][]) =>
    `<div class="formula-sheet ticked">
      <h3 class="fs-title">Quadro-Resumo de Equações</h3>
      <table>
        <thead><tr><th>Conceito / Lei</th><th>Equação</th><th>Condições de validade</th></tr></thead>
        <tbody>${rows.map(([c, eq, v]) => `<tr><td><b>${c}</b></td><td class="fs-eq">${eq}</td><td>${v}</td></tr>`).join('')}</tbody>
      </table>
    </div>`,
  writeBox: (id: string, prompt: string, lines = 6) => {
    const blanks = Array.from({ length: lines }, () => '<span class="wb-line"></span>').join('');
    return `<div class="write-box" data-write-id="${escAttr(id)}">
      <div class="wb-head">
        <span class="wb-tag mono">Caderno do Aluno</span>
        <span class="wb-status mono" data-wb-status>Anotação local</span>
        <button type="button" class="wb-clear mono" data-wb-clear>Limpar</button>
      </div>
      <p class="wb-prompt">${prompt}</p>
      <div class="wb-paper handwritten-sheet taped" style="--wb-lines:${lines}">
        <textarea rows="${lines}" class="wb-input" placeholder="Escreva aqui seu raciocínio, deduções e unidades (salvo automaticamente no navegador e impresso no PDF)…" aria-label="${escAttr(prompt)}"></textarea>
        <div class="wb-print-mirror" aria-hidden="true"></div>
        <div class="wb-print-lines" aria-hidden="true">${blanks}</div>
      </div>
    </div>`;
  },
  aiBox: (prompts: AiStudyPrompt[]) =>
    `<div class="l-ai-box">
      <p class="l-ai-kicker mono">Estudo Assistido com Verificação Física</p>
      <div class="l-ai-grid">${prompts.map((p) => aiLab(p.title, p.prompt, p.check)).join('')}</div>
    </div>`,
  renderDisserte: (d: DisserteBlock, lessonId: string) =>
    `<article class="disserte-card" id="disserte-${escAttr(lessonId)}">
      <header class="disserte-hero brush">
        <p class="d-kicker mono">Preparatório · Questão Dissertativa (Concurso para Professor Universitário)</p>
        <div class="d-meta">
          <span class="d-chip mono">Tempo sugerido: ${d.timeEstimate}</span>
          <span class="d-chip-soft">${d.context}</span>
        </div>
        <h2 class="d-prompt">${d.prompt}</h2>
      </header>
      <section class="d-outline">
        <h3>Espinha dorsal da dissertação</h3>
        <ol class="ticked">${d.outline.map((item) => `<li>${item}</li>`).join('')}</ol>
      </section>
      <section class="d-steps">
        <h3>Desenvolvimento rigoroso, equação por equação</h3>
        <div class="d-steps-list ticked">
          ${d.steps.map((s) => `
            <div class="d-step">
              <div class="d-step-head">
                <span class="d-step-num mono">${s.num}</span>
                <h4>${s.heading}</h4>
              </div>
              <p class="d-why"><b>Elo lógico:</b> ${s.why}</p>
              ${s.equation ? M(s.equation, s.eqTag) : ''}
              <p class="d-exp">${s.explanation}</p>
              ${s.hypotheses ? `<p class="d-hyp"><b>Hipóteses de validade:</b> ${s.hypotheses}</p>` : ''}
            </div>`).join('')}
        </div>
      </section>
      ${
        d.modelAnswer
          ? `<section class="d-model-answer">
              <h3>${d.modelAnswer.title ?? 'Resposta-Modelo Completa (Caderno Manuscrito · Nota 10)'}</h3>
              <div class="handwritten-sheet taped">
                <p class="hw-margin-head mono">Folha de prova comentada · leitura calma para estudo e prática</p>
                ${d.modelAnswer.paragraphs
                  .map(
                    (p) => `
                  <div class="hw-para">
                    <p>${p.lead ? `<strong class="hw-lead">${p.lead}</strong> ` : ''}${p.text}</p>
                    ${p.equation ? M(p.equation, p.eqTag) : ''}
                  </div>`,
                  )
                  .join('')}
              </div>
            </section>`
          : ''
      }
      <div class="d-rubric-grid">
        <section class="d-rubric">
          <h3>Critérios da Banca (Nota 10)</h3>
          <ul class="ticked">${d.rubric.map((r) => `<li>${r}</li>`).join('')}</ul>
        </section>
        <section class="d-pitfalls">
          <h3>Armadilhas Clássicas a Evitar</h3>
          <ul class="ticked">${d.pitfalls.map((p) => `<li>${p}</li>`).join('')}</ul>
        </section>
      </div>
      <section class="d-checklist">
        <h3>Checklist de autoavaliação antes de entregar a prova</h3>
        <ul class="d-check-list ticked">
          ${d.rubric.map((r, idx) => `<li><label><input type="checkbox" class="d-check" data-check-id="${escAttr(`${lessonId}-chk-${idx}`)}" /> <span>${r}</span></label></li>`).join('')}
        </ul>
      </section>
      ${H.writeBox(`${lessonId}-disserte`, 'Rascunho manuscrito da sua dissertação (organize a sequência lógica, deduza cada equação a partir dos princípios básicos e explique as hipóteses):', 10)}
    </article>`,
  ex: (title: string, html: string, ans: string) => `<div class="ex"><h3>${title}</h3>${html}<p class="ans">${ans}</p></div>`,
  exercises: (items: string[]) => `<ol class="l-ex ticked">${items.map((i) => `<li>${i}</li>`).join('')}</ol>`,
  refs: (items: string[]) => `<footer class="l-ref"><p><b>Referências</b></p><ol>${items.map((i) => `<li>${i}</li>`).join('')}</ol></footer>`,
  wrap: (html: string) => `<article class="lesson">${html}</article>`,
};

/* ---------- standard references for the courses ---------- */
export const REF = {
  moran: 'M. J. Moran, H. N. Shapiro, D. D. Boettner, M. B. Bailey, <em>Fundamentals of Engineering Thermodynamics</em> (8ª ed., Wiley) e <em>Princípios de Termodinâmica para Engenharia</em> (4ª ed., LTC).',
  moran4: 'M. J. Moran, H. N. Shapiro, <em>Princípios de Termodinâmica para Engenharia</em>, 4ª ed., LTC, 2002 (e 8ª ed. Wiley, 2014).',
  cengel: 'Y. A. Çengel, M. A. Boles, <em>Termodinâmica</em>, 5ª/7ª ed., McGraw-Hill.',
  cengel7: 'Y. A. Çengel, M. A. Boles, <em>Termodinâmica</em>, 7ª ed., McGraw-Hill, 2013 (e 5ª ed.).',
  bejan: 'A. Bejan, <em>Advanced Engineering Thermodynamics</em>, 4ª ed., Wiley, 2016.',
  vanwylen: 'G. J. Van Wylen, R. E. Sonntag, C. Borgnakke, <em>Fundamentos da Termodinâmica Clássica</em>, Blucher.',
  vanwylen4: 'G. J. Van Wylen, R. E. Sonntag, C. Borgnakke, <em>Fundamentos da Termodinâmica Clássica</em>, 4ª/5ª/6ª ed., Blucher (e 8ª ed. Wiley).',
  sonntag8: 'C. Borgnakke, R. E. Sonntag, <em>Fundamentos da Termodinâmica</em> (8ª ed.), Blucher / Wiley, 2013.',
  kestin: 'J. Kestin, <em>A Course in Thermodynamics</em>, Hemisphere.',
  callen: 'H. B. Callen, <em>Thermodynamics and an Introduction to Thermostatistics</em>, 2ª ed., Wiley.',
  turns: 'S. R. Turns, <em>Introdução à Combustão: Conceitos e Aplicações</em>, 3ª ed., McGraw-Hill.',
  stoecker: 'W. F. Stoecker, J. W. Jones, <em>Refrigeração e Ar Condicionado</em>, McGraw-Hill.',
  ashrae: 'ASHRAE, <em>Handbook, Fundamentals</em>, Atlanta, GA.',
  szargut: 'J. Szargut, D. R. Morris, F. R. Steward, <em>Exergy Analysis of Thermal, Chemical, and Metallurgical Processes</em>, Hemisphere, 1988.',
  notes: 'Notas de aula de Emerson Barbosa dos Anjos, Termodinâmica Clássica (PEM/COPPE/UFRJ).',
  notesCalor: 'Notas de aula e roteiros técnicos, Tecnologia do Calor.',
  notesMaquinas: 'Notas de aula e roteiros técnicos, Máquinas Térmicas.',
};
