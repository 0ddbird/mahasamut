/**
 * The word review page: fifty words at a time, each with its takes to listen
 * to, and a decision one click (or one key) away. It talks only to the local
 * server that serves it (tools/words/review-server.ts), through relative URLs.
 *
 * The state lives in `state` (what the server sent, kept up to date with the
 * decisions it confirmed). The list `visible` is a snapshot of the words that
 * match the filters, taken when the filters change or the data is reloaded: a
 * word decided under the "To do" filter stays on its page until then.
 */

const TONE_CONTOURS = {
  // Pitch levels from 1 (lowest) to 5, at the start and at the end of the tone.
  mid: [3, 3],
  low: [2, 1],
  falling: [5, 1],
  high: [4, 5],
  rising: [2, 5],
};

const MARK_NAMES = {
  none: 'no mark',
  eek: 'mai eek',
  thoo: 'mai tho',
  trii: 'mai trii',
  djattawaa: 'mai djattawaa',
};

const FILTER_NAMES = [
  'status',
  'takes',
  'tone',
  'consonantClass',
  'liveness',
  'vowelLength',
  'mark',
];

const SAVED_MESSAGE_MS = 2500;
const ADVANCE_KEY = 'word-review-advance';

const state = { candidates: [], takes: {}, review: {}, orphans: [], pageSize: 50 };
/** The candidates that match the filters, in order. */
let visible = [];
let page = 0;
/** The rows of the page on screen. */
let rows = [];
let current = -1;
/** Notes typed for words that have no decision yet, by text. */
const drafts = new Map();
/** The last save of each word, so that its saves go one after the other. */
const saves = new Map();

const $ = (id) => document.getElementById(id);
const filtersForm = $('filters');
const advanceBox = $('advance');

/** An element with attributes (`class`, `on<event>` listeners, others as given) and children. */
function el(tag, attributes = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) {
    if (name === 'class') node.className = value;
    else if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
    else if (value === true) node.setAttribute(name, '');
    else if (value !== false && value != null) node.setAttribute(name, value);
  }
  node.append(...children);
  return node;
}

// ---------------------------------------------------------------- server

/** Calls the server and returns its JSON; throws an Error with a sentence to show. */
async function api(path, options) {
  let response;
  try {
    response = await fetch(path, options);
  } catch {
    throw new Error('The review server does not answer. Is `npm run words:review` still running?');
  }
  let body = null;
  try {
    body = await response.json();
  } catch {
    // A body that is not JSON is reported by its status below.
  }
  if (!response.ok) throw new Error(body?.error ?? `The server answered ${response.status}.`);
  return body;
}

function showBanner(message) {
  const banner = $('banner');
  banner.textContent = message ?? '';
  banner.hidden = !message;
}

/** The words whose last save failed, with the sentence to show for each. */
const failedSaves = new Map();
/** Whether the banner currently shows a failed save, not a load error. */
let saveBannerShown = false;

/**
 * Shows the banner while a save is failing, so that a run of key decisions
 * (the page moves on to the next word after each) cannot go on unnoticed with
 * a server that is gone. Each success clears its own word; the banner goes
 * when no word is left that failed.
 */
function updateSaveBanner() {
  if (failedSaves.size === 0) {
    if (saveBannerShown) showBanner('');
    saveBannerShown = false;
    return;
  }
  const [lastMessage] = [...failedSaves.values()].slice(-1);
  const count = failedSaves.size === 1 ? '' : ` (${failedSaves.size} words)`;
  const hint = lastMessage.includes('words:review')
    ? ''
    : ' Is `npm run words:review` still running?';
  showBanner(`Not saved${count}: ${lastMessage}${hint}`);
  saveBannerShown = true;
}

async function loadState() {
  const data = await api('api/state');
  Object.assign(state, data);
  return data;
}

// ---------------------------------------------------------------- words

function statusOf(entry) {
  switch (entry?.decision) {
    case 'take':
      return 'validated';
    case 'none':
      return 'none';
    case 'remove':
      return 'removed';
    default:
      return 'todo';
  }
}

function badgeText(entry) {
  switch (statusOf(entry)) {
    case 'validated':
      return `Validated · take ${entry.take}`;
    case 'none':
      return 'No good take';
    case 'removed':
      return 'Removed';
    default:
      return 'To do';
  }
}

function toneCaseInWords({ consonantClass, liveness, vowelLength, mark }) {
  return [consonantClass, liveness, vowelLength, MARK_NAMES[mark] ?? mark].join(' · ');
}

function takesOf(text) {
  return state.takes[text] ?? [];
}

function matchesFilters(candidate, filters) {
  const { text, tone, toneCase } = candidate;
  const wanted = (name, value) => filters[name] === 'all' || filters[name] === value;
  const takeCount = takesOf(text).length;
  return (
    wanted('status', statusOf(state.review[text])) &&
    wanted('takes', takeCount > 0 ? 'with' : 'without') &&
    wanted('tone', tone) &&
    wanted('consonantClass', toneCase.consonantClass) &&
    wanted('liveness', toneCase.liveness) &&
    wanted('vowelLength', toneCase.vowelLength) &&
    wanted('mark', toneCase.mark)
  );
}

function readFilters() {
  return Object.fromEntries(FILTER_NAMES.map((name) => [name, filtersForm.elements[name].value]));
}

function pageCount() {
  return Math.max(1, Math.ceil(visible.length / state.pageSize));
}

// ---------------------------------------------------------------- audio

const player = { audio: new Audio(), token: 0, playing: null };

function setPlaying(playing) {
  const mark = (value, on) => {
    if (!value) return;
    const button = rows.find((row) => row.text === value.text)?.playButtons.get(value.n);
    if (!button) return;
    button.classList.toggle('playing', on);
    button.firstElementChild.textContent = on ? '■' : '▶';
  };
  mark(player.playing, false);
  player.playing = playing;
  mark(playing, true);
}

function stopPlayback() {
  player.token += 1;
  player.audio.pause();
  setPlaying(null);
}

/** Plays the takes one after the other; any playing take stops first. */
function playTakes(text, takes) {
  stopPlayback();
  const { token } = player;
  let next = 0;
  const step = () => {
    if (token !== player.token) return;
    if (next >= takes.length) return setPlaying(null);
    const take = takes[next++];
    const failed = () => {
      if (token !== player.token) return;
      stopPlayback();
      setFeedback(
        rows.find((row) => row.text === text),
        `Take ${take.n} cannot be played.`,
        'error',
      );
    };
    player.audio.onended = step;
    player.audio.onerror = failed;
    player.audio.src = `takes/${encodeURIComponent(take.file)}`;
    setPlaying({ text, n: take.n });
    player.audio.play().catch(failed);
  };
  step();
}

/** The play button of a take: plays it alone, or stops it if it is the one playing. */
function togglePlay(text, take) {
  if (player.playing?.text === text && player.playing.n === take.n) stopPlayback();
  else playTakes(text, [take]);
}

/** The Space key: plays the word's takes in turn, or stops them. */
function togglePlayAll(row) {
  if (player.playing?.text === row.text) stopPlayback();
  else if (takesOf(row.text).length > 0) playTakes(row.text, takesOf(row.text));
}

// ---------------------------------------------------------------- decisions

function setFeedback(row, message, kind) {
  if (!row) return;
  clearTimeout(row.feedbackTimer);
  row.feedback.textContent = message;
  row.feedback.dataset.kind = kind;
  if (kind === 'ok')
    row.feedbackTimer = setTimeout(() => {
      row.feedback.textContent = '';
      row.feedback.dataset.kind = '';
    }, SAVED_MESSAGE_MS);
}

/**
 * Sends the decision, with the note as it is in the field. A note typed for a
 * word without decision is kept in `drafts` until a decision saves it.
 */
function decide(row, decision, take) {
  const { text } = row;
  const body = { text, decision, note: row.note.value };
  if (decision === 'take') body.take = take;
  setFeedback(row, 'Saving…', 'busy');

  const previous = saves.get(text) ?? Promise.resolve();
  const save = previous.then(async () => {
    try {
      const entry = await api('api/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      state.review[text] = entry;
      if (drafts.get(text) === body.note) drafts.delete(text);
      updateRow(row);
      updateProgress();
      setFeedback(row, 'Saved', 'ok');
      failedSaves.delete(text);
    } catch (error) {
      setFeedback(row, `Not saved: ${error.message}`, 'error');
      failedSaves.delete(text);
      failedSaves.set(text, error.message);
    }
    updateSaveBanner();
  });
  saves.set(text, save);
  return save;
}

function chooseTake(row, n) {
  const entry = state.review[row.text];
  if (entry?.decision === 'take' && entry.take === n) return;
  decide(row, 'take', n);
}

function chooseKind(row, decision) {
  if (state.review[row.text]?.decision === decision) return;
  decide(row, decision);
}

/** The note field lost focus: a decided word saves it with its current decision. */
function saveNote(row) {
  const entry = state.review[row.text];
  if (!entry) return;
  if (row.note.value === entry.note) return;
  decide(row, entry.decision, entry.take);
}

// ---------------------------------------------------------------- rows

function contour(tone) {
  const levels = TONE_CONTOURS[tone];
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 28 20');
  svg.setAttribute('class', 'contour');
  svg.setAttribute('aria-hidden', 'true');
  if (!levels) return svg;
  const y = (level) => 18 - (level - 1) * 4;
  const line = document.createElementNS(ns, 'polyline');
  line.setAttribute('points', `3,${y(levels[0])} 25,${y(levels[1])}`);
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', 'currentColor');
  line.setAttribute('stroke-width', '3');
  line.setAttribute('stroke-linecap', 'round');
  svg.append(line);
  return svg;
}

/** Keeps the click's focus off the button, so that Space keeps playing the row. */
const onClick = (handler) => (event) => {
  handler(event);
  event.currentTarget.blur();
};

function buildRow(candidate) {
  const { text, frequency, tone, toneCase, analyses } = candidate;
  const takes = takesOf(text);
  const row = {
    text,
    playButtons: new Map(),
    chooseButtons: new Map(),
    feedbackTimer: undefined,
  };

  const otherTones = [...new Set((analyses ?? []).map((analysis) => analysis.tone))].filter(
    (other) => other !== tone,
  );

  const takeControls =
    takes.length === 0
      ? [el('span', { class: 'no-take' }, 'No take yet')]
      : takes.map((take) => {
          const play = el(
            'button',
            {
              type: 'button',
              class: 'play',
              'aria-label': `Play take ${take.n}`,
              title: `Play take ${take.n} (Shift+${take.n})`,
              onclick: onClick(() => togglePlay(text, take)),
            },
            el('span', { 'aria-hidden': 'true' }, '▶'),
            ` ${take.n}`,
          );
          const choose = el(
            'button',
            {
              type: 'button',
              class: 'choose',
              title: `This take says the word right (${take.n})`,
              onclick: onClick(() => chooseTake(row, take.n)),
            },
            `Take ${take.n}`,
            el('kbd', {}, String(take.n)),
          );
          row.playButtons.set(take.n, play);
          row.chooseButtons.set(take.n, choose);
          return el('span', { class: 'take' }, play, choose);
        });

  row.noneButton = el(
    'button',
    { type: 'button', class: 'kind none', onclick: onClick(() => chooseKind(row, 'none')) },
    'None right',
    el('kbd', {}, 'N'),
  );
  row.removeButton = el(
    'button',
    { type: 'button', class: 'kind remove', onclick: onClick(() => chooseKind(row, 'remove')) },
    'Remove',
    el('kbd', {}, 'R'),
  );

  row.badge = el('span', { class: 'badge' });
  row.feedback = el('span', { class: 'feedback', role: 'status' });
  row.hint = el(
    'p',
    { class: 'hint' },
    'This note is kept here until you decide: the decision saves it.',
  );
  row.note = el('input', {
    type: 'text',
    class: 'note',
    placeholder: 'Note',
    'aria-label': `Note for ${text}`,
    autocomplete: 'off',
    onfocus: () => setCurrent(rows.indexOf(row), { scroll: false }),
    oninput: () => {
      if (state.review[text]) drafts.delete(text);
      else drafts.set(text, row.note.value);
      updateRow(row);
    },
    onblur: () => saveNote(row),
    onkeydown: (event) => {
      if (event.key === 'Enter') row.note.blur();
      else if (event.key === 'Escape') {
        row.note.value = state.review[text]?.note ?? '';
        drafts.delete(text);
        row.note.blur();
      }
    },
  });
  row.note.value = drafts.get(text) ?? state.review[text]?.note ?? '';

  row.li = el(
    'li',
    {
      class: 'row',
      onpointerdown: () => setCurrent(rows.indexOf(row), { scroll: false }),
    },
    el(
      'div',
      { class: 'word-cell' },
      el('span', { class: 'word', lang: 'th', translate: 'no' }, text),
      el(
        'span',
        { class: 'freq muted', title: 'Frequency in the corpus' },
        frequency.toLocaleString('en'),
      ),
    ),
    el(
      'div',
      { class: 'tone-cell' },
      el(
        'span',
        { class: `expected tone-${tone}`, title: 'Expected tone: what the ear checks' },
        contour(tone),
        el('span', { class: 'expected-name' }, tone),
      ),
      el('span', { class: 'case' }, toneCaseInWords(toneCase)),
      otherTones.length > 0
        ? el('span', { class: 'case muted' }, `also reads: ${otherTones.join(', ')}`)
        : '',
    ),
    el('div', { class: 'decide-cell' }, ...takeControls, row.noneButton, row.removeButton),
    el(
      'div',
      { class: 'side-cell' },
      el('div', { class: 'status-line' }, row.badge, row.feedback),
      row.note,
      row.hint,
    ),
  );
  updateRow(row);
  return row;
}

/** Brings a row's status, choice buttons and hint up to date with the state. */
function updateRow(row) {
  const entry = state.review[row.text];
  const status = statusOf(entry);
  row.li.dataset.status = status;
  row.badge.textContent = badgeText(entry);
  for (const [n, button] of row.chooseButtons) {
    const chosen = entry?.decision === 'take' && entry.take === n;
    button.classList.toggle('chosen', chosen);
    button.setAttribute('aria-pressed', String(chosen));
  }
  for (const [button, decision] of [
    [row.noneButton, 'none'],
    [row.removeButton, 'remove'],
  ]) {
    button.classList.toggle('chosen', entry?.decision === decision);
    button.setAttribute('aria-pressed', String(entry?.decision === decision));
  }
  row.hint.hidden = !(status === 'todo' && row.note.value.trim() !== '');
}

function setCurrent(index, { scroll = true } = {}) {
  if (rows.length === 0) return;
  const next = Math.min(Math.max(index, 0), rows.length - 1);
  if (player.playing && player.playing.text !== rows[next].text) stopPlayback();
  rows[current]?.li.classList.remove('current');
  current = next;
  rows[current].li.classList.add('current');
  if (scroll) rows[current].li.scrollIntoView({ block: 'nearest' });
}

// ---------------------------------------------------------------- page

function renderOrphans() {
  const section = $('orphans');
  section.replaceChildren();
  section.hidden = state.orphans.length === 0;
  if (section.hidden) return;
  section.append(
    el(
      'p',
      {},
      `${state.orphans.length} decision${state.orphans.length === 1 ? '' : 's'} in review.json no longer match a level 1 word: `,
      ...state.orphans.flatMap((text, i) => [
        i > 0 ? ', ' : '',
        el('span', { lang: 'th', class: 'orphan' }, text),
      ]),
      '.',
    ),
  );
}

function updateProgress() {
  const total = state.candidates.length;
  const counts = { validated: 0, none: 0, removed: 0 };
  for (const { text } of state.candidates) {
    const status = statusOf(state.review[text]);
    if (status !== 'todo') counts[status] += 1;
  }
  const decided = counts.validated + counts.none + counts.removed;
  $('progress-text').textContent =
    `${decided.toLocaleString('en')} decided of ${total.toLocaleString('en')}`;
  $('progress-bar').max = Math.max(total, 1);
  $('progress-bar').value = decided;
  $('progress-detail').textContent =
    `${counts.validated.toLocaleString('en')} validated · ${counts.none.toLocaleString('en')} no good take · ${counts.removed.toLocaleString('en')} removed`;
}

function renderPagers() {
  const count = pageCount();
  const first = visible.length === 0 ? 0 : page * state.pageSize + 1;
  const last = Math.min((page + 1) * state.pageSize, visible.length);
  for (const id of ['pager-top', 'pager-bottom']) {
    $(id).replaceChildren(
      el(
        'button',
        { type: 'button', disabled: page === 0, onclick: () => goToPage(page - 1) },
        '← Prev',
      ),
      el(
        'label',
        { class: 'page-jump' },
        'Page ',
        el('input', {
          type: 'number',
          min: '1',
          max: String(count),
          value: String(page + 1),
          'aria-label': 'Page number',
          onchange: (event) => goToPage(Number(event.target.value) - 1),
        }),
        ` of ${count}`,
      ),
      el(
        'button',
        { type: 'button', disabled: page >= count - 1, onclick: () => goToPage(page + 1) },
        'Next →',
      ),
      el(
        'span',
        { class: 'muted range' },
        visible.length === 0
          ? 'no word'
          : `words ${first.toLocaleString('en')}–${last.toLocaleString('en')} of ${visible.length.toLocaleString('en')}`,
      ),
    );
  }
}

function renderRows() {
  stopPlayback();
  const start = page * state.pageSize;
  rows = visible.slice(start, start + state.pageSize).map(buildRow);
  $('rows').replaceChildren(...rows.map((row) => row.li));
  $('empty').hidden = rows.length > 0;
  current = -1;
  const firstTodo = rows.findIndex((row) => statusOf(state.review[row.text]) === 'todo');
  setCurrent(firstTodo === -1 ? 0 : firstTodo, { scroll: false });
  renderPagers();
}

function goToPage(index) {
  const next = Number.isFinite(index) ? Math.min(Math.max(index, 0), pageCount() - 1) : page;
  page = next;
  renderRows();
  window.scrollTo(0, 0);
}

/** Takes the snapshot of the words that match the filters, and shows the given page of it. */
function applyFilters(pageIndex) {
  const filters = readFilters();
  visible = state.candidates.filter((candidate) => matchesFilters(candidate, filters));
  page = Math.min(Math.max(pageIndex, 0), pageCount() - 1);
  renderRows();
}

// ---------------------------------------------------------------- keys

function onKeyDown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.matches('input, select, textarea, button')) return;
  const row = rows[current];
  if (!row) return;

  // A held key repeats: moving may repeat, deciding and playing must not.
  const handled = () => event.preventDefault();
  const decided = () => {
    if (advanceBox.checked) setCurrent(current + 1);
  };

  const digit = /^(?:Digit|Numpad)([1-9])$/.exec(event.code)?.[1];
  if (digit) {
    const take = takesOf(row.text).find(({ n }) => n === Number(digit));
    if (!take) return;
    handled();
    if (event.repeat) return;
    if (event.shiftKey) togglePlay(row.text, take);
    else {
      chooseTake(row, take.n);
      decided();
    }
    return;
  }

  switch (event.key) {
    case 'ArrowDown':
    case 'j':
    case 'J':
      handled();
      return setCurrent(current + 1);
    case 'ArrowUp':
    case 'k':
    case 'K':
      handled();
      return setCurrent(current - 1);
    case 'ArrowRight':
      handled();
      return goToPage(page + 1);
    case 'ArrowLeft':
      handled();
      return goToPage(page - 1);
    case ' ':
    case 'p':
    case 'P':
      handled();
      if (event.repeat) return;
      return togglePlayAll(row);
    case 'n':
    case 'N':
      handled();
      if (event.repeat) return;
      chooseKind(row, 'none');
      return decided();
    case 'r':
    case 'R':
      handled();
      if (event.repeat) return;
      chooseKind(row, 'remove');
      return decided();
    case 'e':
    case 'E':
      handled();
      return row.note.focus();
  }
}

// ---------------------------------------------------------------- start

async function start() {
  try {
    advanceBox.checked = localStorage.getItem(ADVANCE_KEY) !== 'off';
  } catch {
    // Storage may be blocked: the box keeps its default.
  }
  advanceBox.addEventListener('change', () => {
    advanceBox.blur();
    try {
      localStorage.setItem(ADVANCE_KEY, advanceBox.checked ? 'on' : 'off');
    } catch {
      // The choice then lasts until the page is closed.
    }
  });
  // A filter or a button keeps the focus after use; the keys would then act on it, not on the row.
  filtersForm.addEventListener('change', (event) => {
    event.target.blur();
    applyFilters(0);
  });
  filtersForm.addEventListener('submit', (event) => event.preventDefault());
  $('reload').addEventListener('click', async (event) => {
    event.currentTarget.blur();
    try {
      showBanner('');
      failedSaves.clear();
      saveBannerShown = false;
      await loadState();
      renderOrphans();
      updateProgress();
      applyFilters(page);
    } catch (error) {
      showBanner(error.message);
    }
  });
  document.addEventListener('keydown', onKeyDown);

  try {
    await loadState();
  } catch (error) {
    $('progress-text').textContent = 'Not loaded';
    showBanner(error.message);
    return;
  }
  renderOrphans();
  updateProgress();
  applyFilters(state.firstPendingPage);
}

start();
