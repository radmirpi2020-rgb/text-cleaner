'use strict';

/* ═══════════════════════════════════════════════════════════════
   Чистые функции преобразования
   (работают и в Node — используются для тестов)
   ═══════════════════════════════════════════════════════════════ */

const SENTINEL = '\u0000';

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/* Повторяющиеся пробелы, табы, неразрывные пробелы и пробелы вокруг пунктуации */
function collapseSpaces(t) {
  return t
    .replace(/\r\n?/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/[ \t\u00A0]{2,}/g, ' ')
    .replace(/[ \t\u00A0]+([»)"\],.!?;:…])/g, '$1')
    .replace(/([(\[«…])[ \t\u00A0]+/g, '$1')
    .replace(/[ \t]+$/gm, '');
}

/* Переносы слов на концах строк и одиночные переносы строк (PDF, e-mail) */
function removeHyphens(t) {
  return t
    .replace(/(\p{L})-\n(?=\p{L})/gu, '$1')
    .replace(/\n\n+/g, SENTINEL)
    .replace(/\n/g, ' ')
    .replace(/[ \t\u00A0]{2,}/g, ' ')
    .replace(new RegExp(SENTINEL, 'g'), '\n\n')
    .replace(/^\n+|\n+$/g, '');
}

/* Строки внутри абзацев (разделитель — пустая строка) соединяются в один */
function joinParagraphs(t) {
  return t
    .replace(/\r\n?/g, '\n')
    .replace(/\n\n+/g, SENTINEL)
    .replace(/\n/g, ' ')
    .replace(/[ \t\u00A0]{2,}/g, ' ')
    .replace(new RegExp(SENTINEL, 'g'), '\n\n')
    .replace(/^\n+|\n+$/g, '');
}

function removeBlankLines(t) {
  return t
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .join('\n');
}

/* HTML-теги, script/style и основные сущности */
function stripHtml(t) {
  return t
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&laquo;/gi, '«')
    .replace(/&raquo;/gi, '»')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&#x([0-9a-f]+);/gi, (m, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (m, d) => String.fromCodePoint(Number(d)));
}

/* Кавычки → «ёлочки», тире и многоточия */
function normalizePunct(t) {
  let out = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (ch === '„' || ch === '"' || ch === '“') {
      const prev = i === 0 ? ' ' : t[i - 1];
      out += /\s|«|»|\(|\[|—|–|,/.test(prev) ? '«' : '»';
    } else if (ch === '”' || ch === '»') {
      out += '»';
    } else {
      out += ch;
    }
  }
  return out
    .replace(/(\s)[-–—−]+(\s)/g, '$1—$2')
    .replace(/(\d)\s*[-–—−]\s*(\d)/g, '$1–$2')
    .replace(/\.{3,}/g, '…');
}

function changeCase(t, mode) {
  if (mode === 'lower') return t.toLowerCase();
  if (mode === 'upper') return t.toUpperCase();
  if (mode === 'sentence') {
    return t.replace(/(^|[.!?…]\s+)(\p{L})/gu, (m, p, ch) => p + ch.toUpperCase());
  }
  if (mode === 'title') {
    return t.replace(/(^|[^\p{L}\p{M}])(\p{L})/gu, (m, p, ch) => p + ch.toUpperCase());
  }
  return t;
}

function sortLines(t) {
  return t
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .join('\n');
}

/* Точное совпадение, сохраняется первое вхождение */
function dedupeLines(t) {
  const seen = new Set();
  const out = [];
  for (const line of t.replace(/\r\n?/g, '\n').split('\n')) {
    if (!seen.has(line)) {
      seen.add(line);
      out.push(line);
    }
  }
  return out.join('\n');
}

/* ─── Транслитерация (кириллица → латиница) ─── */
const TRANSLIT_MAP = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l',
  'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
  'т': 't', 'у': 'u', 'ф': 'f', 'х': 'kh', 'ц': 'ts', 'ч': 'ch',
  'ш': 'sh', 'щ': 'shch', 'ъ': '', 'ы': 'y', 'ь': "'", 'э': 'e',
  'ю': 'yu', 'я': 'ya', 'ё': 'yo'
};
const TRANSLIT_CAP = {};
for (const k in TRANSLIT_MAP) {
  const b = TRANSLIT_MAP[k];
  TRANSLIT_CAP[k.toUpperCase()] = b ? b[0].toUpperCase() + b.slice(1) : '';
}

function transliterate(t) {
  let out = '';
  for (const ch of t) {
    const upper = TRANSLIT_CAP[ch];
    const lower = TRANSLIT_MAP[ch];
    if (upper !== undefined) out += upper;
    else if (lower !== undefined) out += lower;
    else out += ch;
  }
  return out;
}

/* ─── Markdown → обычный текст ─── */
function stripMarkdown(t) {
  return t
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[ \t]{0,3}(?:[-*+][ \t]+|\d+[.)][ \t]+)/gm, '')
    .replace(/^\s*[-*_]{3,}\s*$/gm, '')
    .replace(/^\|\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|\s*$/gm, '')
    .replace(/^\|(.+)\|$/gm, (m, r) => r.replace(/\s*\|\s*/g, ' ').trim())
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/\*\*\*([^*\n]+)\*\*\*/g, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/\*([^*\n]*\p{L}[^*\n]*)\*/gu, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/(^|\s)_([^_\n]*\p{L}[^_\n]*)_(?=\s|$)/gu, '$1$2')
    .replace(/~~([^~\n]+)~~/g, '$1');
}

/* ─── Скрытие личных данных ─── */
function stripPii(t) {
  return t
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[email]')
    .replace(/(?:\+7|8)\s?[\s(]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g, '[телефон]')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '[IP]')
    .replace(/\b\d{3}-\d{3}-\d{3}[ -]?\d{2}\b/g, '[СНИЛС]')
    .replace(/\b(?:\d[ -]?){16}\b/g, '[карта]');
}

/* ─── Форматирование JSON / XML / SQL ─── */
function formatText(t, mode) {
  if (mode === 'off' || !mode) return t;
  if (mode === 'json') {
    const s = t.trim();
    if (!s) return t;
    let parsed;
    try {
      parsed = JSON.parse(s);
    } catch (e) {
      throw new Error('некорректный JSON: ' + e.message);
    }
    return JSON.stringify(parsed, null, 2);
  }
  if (mode === 'xml') return formatXml(t);
  if (mode === 'sql') return formatSql(t);
  return t;
}

function formatXml(t) {
  const tokens = t.replace(/>\s+</g, '><').match(/<[^>]+>|[^<]+/g) || [];
  const out = [];
  let depth = 0;
  for (const tok of tokens) {
    const s = tok.trim();
    if (!s) continue;
    if (s.startsWith('<')) {
      const isEnd = /^<\/[^>]+>$/.test(s);
      const isSelfClose = /^<[^>]+\/>$/.test(s);
      const isDecl = /^<\?/.test(s) || /^<!/.test(s);
      if (isEnd) depth = Math.max(0, depth - 1);
      out.push('  '.repeat(depth) + s);
      if (!isEnd && !isSelfClose && !isDecl) depth++;
    } else {
      out.push('  '.repeat(depth) + s);
    }
  }
  return out.join('\n');
}

const SQL_CLAUSE = [
  'LEFT OUTER JOIN', 'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN', 'FULL JOIN',
  'GROUP BY', 'ORDER BY', 'INSERT INTO', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE',
  'DROP TABLE', 'SELECT', 'FROM', 'WHERE', 'HAVING', 'LIMIT', 'JOIN', 'UNION',
  'SET', 'VALUES', 'UPDATE', 'ON', 'AND', 'OR'
];

function formatSql(t) {
  const lines = [];
  for (const raw of t.split('\n')) {
    const s = raw.trim();
    if (!s) continue;
    const up = s.toUpperCase();
    const kw = SQL_CLAUSE.find((k) => up.startsWith(k));
    if (kw) {
      const indent = (kw === 'AND' || kw === 'OR' || kw === 'ON') ? '  ' : '';
      lines.push(indent + s.replace(new RegExp('^' + kw, 'i'), kw));
    } else {
      lines.push('    ' + s);
    }
  }
  return lines.join('\n');
}

/* ─── Построчный дифф (LCS) ─── */
function diffLines(a, b, maxCells) {
  const A = a.split('\n');
  const B = b.split('\n');
  const cap = maxCells || 4000000;
  if (A.length * B.length > cap) return null;
  const n = A.length;
  const m = B.length;
  const dp = new Uint32Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i * (m + 1) + j] = A[i] === B[j]
        ? dp[(i + 1) * (m + 1) + j + 1] + 1
        : Math.max(dp[(i + 1) * (m + 1) + j], dp[i * (m + 1) + j + 1]);
    }
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ type: 'same', text: A[i] });
      i++; j++;
    } else if (dp[(i + 1) * (m + 1) + j] >= dp[i * (m + 1) + j + 1]) {
      out.push({ type: 'del', text: A[i] });
      i++;
    } else {
      out.push({ type: 'ins', text: B[j] });
      j++;
    }
  }
  while (i < n) { out.push({ type: 'del', text: A[i] }); i++; }
  while (j < m) { out.push({ type: 'ins', text: B[j] }); j++; }
  return out;
}

/* Порядок применения операций */
function applyPipeline(text, o) {
  let t = String(text);
  if (o.html) t = stripHtml(t);
  if (o.markdown) t = stripMarkdown(t);
  if (o.quotes) t = normalizePunct(t);
  if (o.spaces) t = collapseSpaces(t);
  if (o.hyphens) t = removeHyphens(t);
  if (o.paragraphs) t = joinParagraphs(t);
  if (o.blank) t = removeBlankLines(t);
  if (o.case && o.case !== 'keep') t = changeCase(t, o.case);
  if (o.pii) t = stripPii(t);
  if (o.translit) t = transliterate(t);
  if (o.sort) t = sortLines(t);
  if (o.dedupe) t = dedupeLines(t);
  t = formatText(t, o.format || 'off');
  return t.replace(/[ \t]+$/gm, '');
}

/* ─── Статистика ────────────────────────────────────────────── */

function countChars(s) { return s.length; }

function countWords(s) {
  const m = s.match(/\S+/g);
  return m ? m.length : 0;
}

function countLines(s) {
  if (s === '') return 0;
  const n = s.split('\n').length;
  return s.endsWith('\n') ? n - 1 : n;
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function readTime(sec) {
  if (sec < 30) return 'менее минуты';
  const m = sec < 60 ? 1 : Math.round(sec / 60);
  return m + ' ' + plural(m, 'минуту', 'минуты', 'минут');
}

function formatStats(text) {
  const chars = countChars(text);
  const words = countWords(text);
  const lines = countLines(text);
  const seconds = (words / 180) * 60;
  return {
    chars,
    words,
    lines,
    time: readTime(seconds),
    text:
      fmt(chars) + ' симв. · ' + fmt(words) + ' ' + plural(words, 'слово', 'слова', 'слов') +
      ' · ' + fmt(lines) + ' ' + plural(lines, 'строка', 'строки', 'строк')
  };
}

function fmt(n) {
  return n.toLocaleString('ru-RU');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    applyPipeline, collapseSpaces, removeHyphens, joinParagraphs, removeBlankLines,
    stripHtml, normalizePunct, changeCase, sortLines, dedupeLines,
    stripMarkdown, transliterate, stripPii, formatText, formatXml, formatSql, diffLines,
    countWords, countLines, formatStats, escapeRegExp
  };
}

/* ═══════════════════════════════════════════════════════════════
   Браузерная часть
   ═══════════════════════════════════════════════════════════════ */

if (typeof document !== 'undefined') {
  const $ = (id) => document.getElementById(id);

  const els = {
    input: $('text-in'),
    output: $('text-out'),
    chips: Array.from(document.querySelectorAll('.chip')),
    caseSelect: $('case-select'),
    file: $('file-btn'),
    fileInput: $('file-input'),
    paste: $('paste-btn'),
    undo: $('undo-btn'),
    clear: $('clear-btn'),
    copy: $('copy-btn'),
    download: $('download-btn'),
    example: $('example-btn'),
    theme: $('theme-btn'),
    find: $('find'),
    replace: $('replace'),
    replaceCase: $('replace-case'),
    replaceRegex: $('replace-regex'),
    replaceBtn: $('replace-btn'),
    profileName: $('profile-name'),
    profileSave: $('profile-save'),
    profileDelete: $('profile-delete'),
    profileSelect: $('profile-select'),
    persist: $('persist-check'),
    formatSelect: $('format-select'),
    diffBtn: $('diff-btn'),
    diffView: $('diff-view'),
    historyBtn: $('history-btn'),
    historyDialog: $('history-dialog'),
    historyList: $('history-list'),
    historyClear: $('history-clear'),
    historyClose: $('history-close'),
    stIn: $('st-in'),
    stOut: $('st-out'),
    toasts: $('toasts'),
    versionBadge: $('version-badge')
  };

  const APP_VERSION = '3.0.0';

  const LS_SETTINGS = 'tc:settings';
  const LS_TEXT = 'tc:lastText';
  const LS_PROFILES = 'tc:profiles';
  const LS_HISTORY = 'tc:history';

  const state = {
    ops: { spaces: false, hyphens: false, paragraphs: false, blank: false, quotes: false, html: false, sort: false, dedupe: false, markdown: false, translit: false, pii: false },
    caseMode: 'keep',
    formatMode: 'off',
    diffOn: false,
    persist: false,
    theme: 'light',
    history: [],
    saveTimer: null,
    pushTimer: null,
    lastResult: null,
    lastError: null
  };

  /* ── Настройки ── */
  function loadSettings() {
    try {
      const raw = localStorage.getItem(LS_SETTINGS);
      if (raw) Object.assign(state, JSON.parse(raw));
    } catch (e) { /* игнорируем */ }
    if (!['light', 'dark'].includes(state.theme)) state.theme = 'light';
    document.documentElement.dataset.theme = state.theme;

    for (const chip of els.chips) {
      const op = chip.dataset.op;
      chip.setAttribute('aria-pressed', String(!!state.ops[op]));
    }
    els.caseSelect.value = state.caseMode;
    els.formatSelect.value = state.formatMode;
    els.diffBtn.setAttribute('aria-pressed', String(state.diffOn));
    if (state.diffOn) renderDiff(els.input.value, state.lastResult || '');
    els.persist.checked = state.persist;
  }

  function saveSettings() {
    try {
      localStorage.setItem(LS_SETTINGS, JSON.stringify({
        ops: state.ops,
        caseMode: state.caseMode,
        formatMode: state.formatMode,
        persist: state.persist,
        theme: state.theme
      }));
    } catch (e) { /* хранилище недоступно */ }
  }

  /* ── Отрисовка ── */
  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function render() {
    let result;
    try {
      result = applyPipeline(els.input.value, {
        ...state.ops,
        case: state.caseMode,
        format: state.formatMode
      });
      state.lastError = null;
    } catch (e) {
      result = state.lastResult !== null ? state.lastResult : els.input.value;
      if (state.lastError !== e.message) {
        state.lastError = e.message;
        toast('Ошибка формата: ' + e.message);
      }
    }
    state.lastResult = result;
    els.output.value = result;
    renderDiff(els.input.value, result);

    const stIn = formatStats(els.input.value);
    const stOut = formatStats(result);
    els.stIn.textContent = 'Исходный: ' + stIn.text;
    els.stOut.textContent = 'Результат: ' + stOut.text + ' · чтение ' + stOut.time;

    if (state.persist) {
      clearTimeout(state.saveTimer);
      state.saveTimer = setTimeout(() => {
        try { localStorage.setItem(LS_TEXT, els.input.value); } catch (e) {}
      }, 400);
    }

    els.undo.disabled = state.history.length === 0;
  }

  function renderDiff(a, b) {
    const view = els.diffView;
    if (!state.diffOn) {
      view.hidden = true;
      els.output.hidden = false;
      return;
    }
    view.hidden = false;
    els.output.hidden = true;
    if (a === b) {
      view.innerHTML = '<div class="diff-empty">Изменений нет — включите операции</div>';
      return;
    }
    const d = diffLines(a, b);
    if (!d) {
      view.innerHTML = '<div class="diff-empty">Текст слишком большой для построчного сравнения</div>';
      return;
    }
    view.innerHTML = d.map((l) => {
      const mark = l.type === 'ins' ? '+' : l.type === 'del' ? '−' : '';
      return '<div class="diff-line diff--' + l.type + '"><span class="diff__mark">' + mark + '</span>' + esc(l.text) + '</div>';
    }).join('');
  }

  /* ── История / отмена ── */
  function pushHistory(v) {
    const current = state.history[state.history.length - 1];
    if (current === v) return;
    state.history.push(v);
    if (state.history.length > 60) state.history.shift();
  }

  function commitHistory() {
    clearTimeout(state.pushTimer);
    state.pushTimer = setTimeout(() => pushHistory(snapshot()), 500);
  }

  function snapshot() { return els.input.value; }

  function doUndo() {
    if (!state.history.length) return;
    const prev = state.history.pop();
    els.input.value = prev;
    render();
    toast('Изменение отменено');
  }

  /* ── События ввода ── */
  els.input.addEventListener('input', () => {
    commitHistory();
    render();
  });

  els.input.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      doUndo();
    }
  });

  /* ── Переключатели операций ── */
  for (const chip of els.chips) {
    chip.addEventListener('click', () => {
      const op = chip.dataset.op;
      state.ops[op] = !state.ops[op];
      chip.setAttribute('aria-pressed', String(state.ops[op]));
      render();
      saveSettings();
    });
  }

  els.caseSelect.addEventListener('change', () => {
    state.caseMode = els.caseSelect.value;
    render();
    saveSettings();
  });

  els.formatSelect.addEventListener('change', () => {
    state.formatMode = els.formatSelect.value;
    render();
    saveSettings();
  });

  els.diffBtn.addEventListener('click', () => {
    state.diffOn = !state.diffOn;
    els.diffBtn.setAttribute('aria-pressed', String(state.diffOn));
    renderDiff(els.input.value, state.lastResult !== null ? state.lastResult : '');
  });

  /* ── Поиск и замена ── */
  els.replaceBtn.addEventListener('click', () => {
    const find = els.find.value;
    if (!find) {
      toast('Введите текст для поиска');
      els.find.focus();
      return;
    }
    const flags = els.replaceCase.checked ? 'g' : 'gi';
    let re;
    if (els.replaceRegex.checked) {
      try {
        re = new RegExp(find, flags);
      } catch (e) {
        toast('Ошибка в выражении: ' + e.message);
        return;
      }
    } else {
      re = new RegExp(escapeRegExp(find), flags);
    }
    const text = els.input.value;
    const matches = text.match(re);
    const next = text.replace(re, els.replace.value);
    if (!matches || matches.length === 0) {
      toast('Совпадений не найдено');
      return;
    }
    pushHistory(text);
    els.input.value = next;
    render();
    toast('Заменено: ' + matches.length);
  });

  /* ── Копировать ── */
  els.copy.addEventListener('click', () => {
    const text = els.output.value;
    if (!text) { toast('Результат пуст'); return; }
    const done = () => {
      saveClip(text);
      toast('Скопировано в буфер');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  });

  function fallbackCopy(text, done) {
    els.output.focus();
    els.output.select();
    try {
      document.execCommand('copy');
      done();
    } catch (e) {
      toast('Не удалось скопировать — выделите текст вручную');
    }
  }

  /* ── Скачать ── */
  els.download.addEventListener('click', () => {
    const text = els.output.value;
    if (!text) { toast('Результат пуст'); return; }
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'text.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('Файл text.txt сохранён');
  });

  /* ── Очистить ── */
  els.clear.addEventListener('click', () => {
    if (!els.input.value) return;
    pushHistory(snapshot());
    els.input.value = '';
    render();
    els.input.focus();
    toast('Текст очищен');
  });

  /* ── Вставить из буфера ── */
  els.paste.addEventListener('click', () => {
    if (navigator.clipboard && navigator.clipboard.readText) {
      navigator.clipboard.readText().then((t) => {
        if (!t) { toast('Буфер обмена пуст'); return; }
        setInput(t);
        toast('Вставлено из буфера');
      }).catch(() => {
        toast('Нет доступа к буферу — нажмите Ctrl+V в поле ввода');
        els.input.focus();
      });
    } else {
      toast('Нажмите Ctrl+V в поле ввода');
      els.input.focus();
    }
  });

  function setInput(v) {
    pushHistory(snapshot());
    els.input.value = v;
    render();
  }

  /* ── Пример ── */
  const EXAMPLE = [
    '  Это   пример   "грязного"    текста ,   скопированного    из   PDF .',
    '',
    '<p>Первая <strong>строка</strong> — с HTML-тегами &amp; спецсимволами.</p>',
    'Это   вторая   строка  того  же  абзаца,   её  надо  соединить  с  первой.',
    '',
    '',
    'Тут перенос слова: ги-',
    'пербола, а также лишние   пустые   строки   выше.',
    '',
    'Повторяющаяся строка',
    'Повторяющаяся строка',
    '',
    '"Кавычки" и „низкие" и «ёлочки»  — тире - и  дефис в словах 1990-2000.',
    '',
    'ЗАГОЛОВОК НАПИСАН   КАПСОМ',
    'после точки идёт    маленькая буква. и снова предложение ....',
    ''
  ].join('\n');

  els.example.addEventListener('click', () => {
    setInput(EXAMPLE);
    if (els.find.value || els.replace.value) {
      els.find.value = '';
      els.replace.value = '';
      els.replaceCase.checked = false;
    }
    toast('Пример загружен — включите операции и смотрите результат');
  });

  /* ── Открыть файл ── */
  els.file.addEventListener('click', () => els.fileInput.click());

  els.fileInput.addEventListener('change', () => {
    const f = els.fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setInput(String(reader.result || ''));
      toast('Загружено: ' + f.name + ' (' + fmt(Math.max(1, Math.round(f.size / 1024))) + ' КБ)');
    };
    reader.onerror = () => toast('Не удалось прочитать файл');
    reader.readAsText(f, 'utf-8');
    els.fileInput.value = '';
  });

  /* ── Сценарии операций ── */
  function loadProfiles() {
    try { return JSON.parse(localStorage.getItem(LS_PROFILES) || '{}'); } catch (e) { return {}; }
  }

  function rebuildProfileSelect(selected) {
    const prof = loadProfiles();
    els.profileSelect.innerHTML = '';
    const emptyOpt = document.createElement('option');
    emptyOpt.value = '';
    emptyOpt.textContent = '— выберите сценарий —';
    els.profileSelect.appendChild(emptyOpt);
    for (const name of Object.keys(prof)) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      els.profileSelect.appendChild(opt);
    }
    els.profileSelect.value = selected || '';
  }

  els.profileSave.addEventListener('click', () => {
    const name = els.profileName.value.trim();
    if (!name) {
      toast('Введите название сценария');
      els.profileName.focus();
      return;
    }
    const prof = loadProfiles();
    prof[name] = { ops: Object.assign({}, state.ops), case: state.caseMode };
    try {
      localStorage.setItem(LS_PROFILES, JSON.stringify(prof));
    } catch (e) {
      toast('Не удалось сохранить сценарий');
      return;
    }
    rebuildProfileSelect(name);
    toast('Сценарий «' + name + '» сохранён');
  });

  els.profileDelete.addEventListener('click', () => {
    const name = els.profileSelect.value;
    if (!name) {
      toast('Выберите сценарий для удаления');
      return;
    }
    const prof = loadProfiles();
    delete prof[name];
    localStorage.setItem(LS_PROFILES, JSON.stringify(prof));
    els.profileName.value = '';
    rebuildProfileSelect('');
    toast('Сценарий удалён');
  });

  els.profileSelect.addEventListener('change', () => {
    const name = els.profileSelect.value;
    if (!name) return;
    const prof = loadProfiles();
    const p = prof[name];
    if (!p) return;
    state.caseMode = p.case || 'keep';
    for (const k of Object.keys(state.ops)) state.ops[k] = !!p.ops[k];
    for (const chip of els.chips) {
      chip.setAttribute('aria-pressed', String(!!state.ops[chip.dataset.op]));
    }
    els.caseSelect.value = state.caseMode;
    render();
    saveSettings();
    toast('Сценарий «' + name + '» применён');
  });

  /* ── История буфера обмена ── */
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY) || '[]'); } catch (e) { return []; }
  }

  function saveClip(text) {
    const h = loadHistory();
    h.unshift({ t: Date.now(), text });
    if (h.length > 20) h.length = 20;
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(h)); } catch (e) {}
  }

  function renderHistoryList() {
    const h = loadHistory();
    els.historyList.innerHTML = '';
    if (!h.length) {
      els.historyList.innerHTML = '<p class="history-empty">История пуста — скопируйте результат, и он появится здесь</p>';
      return;
    }
    for (const item of h) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'history-item';
      const time = new Date(item.t).toLocaleString('ru-RU', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      });
      const preview = item.text.replace(/\s+/g, ' ').slice(0, 90);
      btn.innerHTML = '<span class="history-item__time">' + esc(time) + '</span>' +
                      '<span class="history-item__text">' + esc(preview) + '</span>';
      btn.addEventListener('click', () => {
        setInput(item.text);
        els.historyDialog.close();
        toast('Восстановлено из истории');
      });
      els.historyList.appendChild(btn);
    }
  }

  els.historyBtn.addEventListener('click', () => {
    renderHistoryList();
    els.historyDialog.showModal();
  });

  els.historyClose.addEventListener('click', () => els.historyDialog.close());

  els.historyDialog.addEventListener('click', (e) => {
    if (e.target === els.historyDialog) els.historyDialog.close();
  });

  els.historyClear.addEventListener('click', () => {
    try { localStorage.removeItem(LS_HISTORY); } catch (e) {}
    renderHistoryList();
    toast('История очищена');
  });

  /* ── Сохранение последнего текста ── */
  els.persist.addEventListener('change', () => {
    state.persist = els.persist.checked;
    if (state.persist) {
      try { localStorage.setItem(LS_TEXT, els.input.value); } catch (e) {}
      toast('Текст будет сохраняться автоматически');
    } else {
      try { localStorage.removeItem(LS_TEXT); } catch (e) {}
      toast('Автосохранение выключено');
    }
    saveSettings();
  });

  /* ── Тема ── */
  els.theme.addEventListener('click', () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = state.theme;
    saveSettings();
  });

  /* ── Тосты ── */
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    els.toasts.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  /* ── Инициализация ── */
  els.versionBadge.textContent = 'v' + APP_VERSION;
  loadSettings();
  rebuildProfileSelect('');
  if (state.persist) {
    try {
      const saved = localStorage.getItem(LS_TEXT);
      if (saved) els.input.value = saved;
    } catch (e) {}
  }
  render();
}