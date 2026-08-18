'use strict';
/* Модульные тесты логики очистки текста. Запуск: node tests/pipeline.test.js */

const assert = require('assert');
const path = require('path');
const m = require(path.join(__dirname, '..', 'app.js'));
const P = m.applyPipeline;
const empty = { spaces:false, hyphens:false, paragraphs:false, blank:false, quotes:false, html:false, sort:false, dedupe:false, case:'keep' };
const o = (k) => Object.assign({}, empty, k);

assert.strictEqual(P('  a   b  c ', o({spaces:true})), ' a b c');
assert.strictEqual(P('a  ,  b', o({spaces:true})), 'a, b');
assert.strictEqual(P('a\r\nb', o({spaces:true})), 'a\nb');
console.log('spaces OK');

assert.strictEqual(P('ги-\nпербола', o({hyphens:true})), 'гипербола');
assert.strictEqual(P('строка1\nстрока2', o({hyphens:true})), 'строка1 строка2');
console.log('hyphens OK');

assert.strictEqual(P('a\n\nb\nc\n\n\nd', o({paragraphs:true})), 'a\n\nb c\n\nd');
console.log('paragraphs OK');

assert.strictEqual(P('a\n\n\n  \nb', o({blank:true})), 'a\nb');
console.log('blank OK');

assert.strictEqual(P('<p>Привет <b>мир</b></p> &amp;', o({html:true})), 'Привет мир &');
assert.strictEqual(P('<script>var x</script>текст<script src="a.js"></script>', o({html:true})), 'текст');
console.log('html OK');

const q = P('Слова "тут" и „там" - тире 1990-2000....', o({quotes:true}));
assert.strictEqual(q, 'Слова «тут» и «там» — тире 1990–2000…');
assert.strictEqual(P('слова, "цитата" после', o({quotes:true})), 'слова, «цитата» после');
console.log('quotes OK');

assert.strictEqual(P('Привет МИР', o({case:'lower'})), 'привет мир');
assert.strictEqual(P('привет мир', o({case:'upper'})), 'ПРИВЕТ МИР');
assert.strictEqual(P('привет мир. и снова', o({case:'sentence'})), 'Привет мир. И снова');
assert.strictEqual(P('привет мир-тест', o({case:'title'})), 'Привет Мир-Тест');
console.log('case OK');

assert.strictEqual(P('b\na\nc', o({sort:true})), 'a\nb\nc');
assert.strictEqual(P('x\ny\nx', o({dedupe:true})), 'x\ny');
console.log('lines OK');

assert.strictEqual(m.transliterate('Привет, мир! Ёлка'), 'Privet, mir! Yolka');
assert.strictEqual(m.transliterate('Щука съела Ъ и Ь'), "Shchuka sela  i '");
assert.strictEqual(m.transliterate('АБВГД'), 'ABVGD');
console.log('translit OK');

const md = m.stripMarkdown('# Заголовок\n\n**жирный** и *курсив* и [ссылка](https://x.ru)\n\n- пункт один\n- пункт два\n\nвысота 5 * 6 * 7 см');
assert.strictEqual(md, 'Заголовок\n\nжирный и курсив и ссылка\n\nпункт один\nпункт два\n\nвысота 5 * 6 * 7 см');
assert.strictEqual(m.stripMarkdown('| Имя | Город |\n| --- | --- |\n| Саня | Москва |'), 'Имя Город\n\nСаня Москва');
assert.strictEqual(m.stripMarkdown('> цитата\n`код` ~~зачёркнуто~~'), 'цитата\nкод зачёркнуто');
console.log('markdown OK');

const st = m.formatStats('один два три\nчетыре');
assert.strictEqual(st.words, 4);
assert.strictEqual(st.chars, 19);
assert.strictEqual(st.lines, 2);
assert.strictEqual(st.time, 'менее минуты');
console.log('stats OK:', st.text);

const full = P('  <b>Привет</b>  "мир" - ги-\nпербола\n\nx\nx\n', {
  spaces:true, hyphens:true, paragraphs:true, blank:true, quotes:true, html:true, sort:true, dedupe:true, case:'keep'
});
assert.strictEqual(full, ' Привет «мир» — гипербола\nx x');
console.log('full pipeline OK');

assert.strictEqual(m.formatText('{"b":1,"a":[1,2]}', 'json'), '{\n  "b": 1,\n  "a": [\n    1,\n    2\n  ]\n}');
assert.throws(() => m.formatText('{not json}', 'json'));
assert.strictEqual(m.formatXml('<a><b>x</b><c/></a>'), '<a>\n  <b>\n    x\n  </b>\n  <c/>\n</a>');
assert.strictEqual(m.formatSql('select id, name\nfrom users\nwhere age > 18\nand active = true'),
  'SELECT id, name\nFROM users\nWHERE age > 18\n  AND active = true');
console.log('format OK');

const pii = m.stripPii('почта a@b.ru, тел +7 912 345-67-89, ip 192.168.0.1, карта 1234 5678 9012 3456, снилс 123-456-789 01');
assert.strictEqual(pii, 'почта [email], тел [телефон], ip [IP], карта [карта], снилс [СНИЛС]');
console.log('pii OK');

const d = m.diffLines('a\nb\nc', 'a\nx\nc');
assert.deepStrictEqual(d.map((l) => l.type + ':' + l.text), ['same:a', 'del:b', 'ins:x', 'same:c']);
assert.strictEqual(m.diffLines('a\nb', 'a\nb').every((l) => l.type === 'same'), true);
assert.strictEqual(m.diffLines('x', 'y').map((l) => l.type).join(','), 'del,ins');
console.log('diff OK');

const mdFull = P('## Название\n\n**жирный** текст [ссылка](https://x.ru)\n', { markdown:true, spaces:true, blank:true, quotes:true });
assert.strictEqual(mdFull, 'Название\nжирный текст ссылка');
console.log('markdown pipeline OK');

assert.strictEqual(P('{"a": 1}', { format: 'json' }), '{\n  "a": 1\n}');
assert.throws(() => P('{bad}', { format: 'json' }));
console.log('format pipeline OK');

console.log('ALL TESTS PASSED');