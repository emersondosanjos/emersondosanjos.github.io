import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');
const works = JSON.parse(await read('src/data/works.json')).works;
const series = works.filter((work) => work.series);
assert.ok(series.length, 'No papers in the electrolyzer series.');
assert.match(await read('dist/images/brush-stroke-night.svg'), /<svg\b/i, 'The navy brush asset was not built.');

for (const page of ['dist/electrolyzers/index.html', 'dist/pt/electrolyzers/index.html']) {
  const html = await read(page);
  const surfaces = [...html.matchAll(/<section\b([^>]*\bdata-article-summary\b[^>]*)>/g)];
  assert.equal(surfaces.length, series.length, `${page}: every article needs one summary surface.`);

  for (const [, attributes] of surfaces) {
    const classes = attributes.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) ?? [];
    assert.ok(classes.includes('article-brief') && classes.includes('brush'), `${page}: article summaries must use the shared brush surface.`);
  }

  for (const work of series) {
    const id = `paper-${work.series}`;
    const disclosure = [...html.matchAll(/<button\b([^>]*)>/g)]
      .map(([, attributes]) => attributes)
      .find((attributes) => attributes.includes(`aria-controls="${id}"`));
    assert.ok(disclosure && html.includes(`id="${id}"`), `${page}: missing disclosure for ${id}.`);
    const classes = disclosure.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) ?? [];
    assert.ok(classes.includes('act') && classes.includes('solid'), `${page}: the summary button must use the shared solid action style for ${id}.`);
    assert.ok(html.includes(`aria-labelledby="${id}-headline"`), `${page}: missing heading link for ${id}.`);
    const hasCitation = html.includes(`data-copy-citation="${id}-citation"`);
    assert.equal(hasCitation, work.status === 'published' && Boolean(work.doi), `${page}: publication must control citation availability for ${id}.`);
  }
}

console.log(`Article design check passed for ${series.length} summaries in English and Portuguese.`);
