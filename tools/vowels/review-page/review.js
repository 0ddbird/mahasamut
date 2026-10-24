/**
 * Interactive frontend logic for Thai Vowel Audio Review.
 */

let state = {
  vowels: [],
  takes: {},
  currentSounds: {},
  review: {},
};

let selectedIndex = 0;
let audioElement = null;
let currentPlayingInfo = null; // { vowelId, type, n }

const container = document.getElementById('vowels-container');
const filterSelect = document.getElementById('filter-status');
const toastEl = document.getElementById('toast');

function showToast(message, duration = 3000) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  setTimeout(() => toastEl.classList.add('hidden'), duration);
}

async function loadData() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state = await res.json();
    render();
  } catch (err) {
    container.innerHTML = `<p class="muted error">Failed to load data: ${err.message}</p>`;
  }
}

function stopAudio() {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    audioElement = null;
  }
  currentPlayingInfo = null;
  document.querySelectorAll('.is-playing').forEach((el) => el.classList.remove('is-playing'));
  document.querySelectorAll('.vowel-row.playing').forEach((el) => el.classList.remove('playing'));
}

function playTrack(url, vowelId, type, n = null, pillElement = null) {
  if (
    currentPlayingInfo &&
    currentPlayingInfo.vowelId === vowelId &&
    currentPlayingInfo.type === type &&
    currentPlayingInfo.n === n
  ) {
    stopAudio();
    return;
  }

  stopAudio();
  audioElement = new Audio(url);
  currentPlayingInfo = { vowelId, type, n };

  if (pillElement) pillElement.classList.add('is-playing');
  const row = document.getElementById(`vowel-row-${vowelId}`);
  if (row) row.classList.add('playing');

  audioElement.onended = () => stopAudio();
  audioElement.onerror = () => {
    showToast(`Failed to play audio from ${url}`);
    stopAudio();
  };
  audioElement.play().catch(() => stopAudio());
}

async function makeDecision(id, decision, take = undefined) {
  try {
    const res = await fetch('/api/decision', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, decision, take }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save decision');

    state.review[id] = data.entry;
    updateVowelRow(id);
    updateStats();
    showToast(`Saved decision for ${id}: ${decision}${take ? ` #${take}` : ''}`);
  } catch (err) {
    showToast(`Error: ${err.message}`);
  }
}

async function generateTakes(id, count = 3, btnElement = null) {
  if (btnElement) {
    btnElement.disabled = true;
    btnElement.textContent = '⏳ Recording...';
  }
  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, count }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Recording failed');

    state.takes = data.takes;
    state.currentSounds = data.currentSounds;
    state.review = data.review;

    if (id) {
      updateVowelRow(id);
      showToast(`Recorded ${data.done} new take(s) for ${id}`);
    } else {
      render();
      showToast(`Recorded ${data.done} takes across all vowels!`);
    }
  } catch (err) {
    showToast(`Generation error: ${err.message}`);
  } finally {
    if (btnElement) {
      btnElement.disabled = false;
      btnElement.textContent = '+ 3 takes';
    }
  }
}

async function publishSingle(id, take) {
  try {
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, take }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Publish failed');

    state.takes = data.takes;
    state.currentSounds = data.currentSounds;
    state.review = data.review;
    updateVowelRow(id);
    updateStats();
    showToast(`🚀 Published take #${take} for "${id}" to public/audio/vowels/`);
  } catch (err) {
    showToast(`Publish error: ${err.message}`);
  }
}

async function publishAllSelected() {
  const decisions = Object.entries(state.review).filter(
    ([, entry]) => entry.decision === 'take' && entry.take !== undefined,
  );
  if (decisions.length === 0) {
    showToast('No validated takes to publish.');
    return;
  }

  if (
    !confirm(
      `Publish ${decisions.length} validated take(s) to public/audio/vowels/? This will overwrite game sounds for these vowels.`,
    )
  ) {
    return;
  }

  try {
    const res = await fetch('/api/publish', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ all: true }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Publish all failed');

    state.takes = data.takes;
    state.currentSounds = data.currentSounds;
    state.review = data.review;
    render();
    showToast(`🎉 Successfully published ${data.published.length} vowel sound(s)!`);
  } catch (err) {
    showToast(`Publish error: ${err.message}`);
  }
}

function updateStats() {
  let validated = 0;
  let current = 0;
  let none = 0;

  for (const v of state.vowels) {
    const dec = state.review[v.id]?.decision;
    if (dec === 'take') validated++;
    else if (dec === 'current') current++;
    else if (dec === 'none') none++;
  }

  const total = state.vowels.length;
  const todo = total - (validated + current + none);

  document.getElementById('stat-total').textContent = `Total: ${total}`;
  document.getElementById('stat-validated').textContent = `Takes chosen: ${validated}`;
  document.getElementById('stat-current').textContent = `Keeping current: ${current}`;
  document.getElementById('stat-none').textContent = `Need takes: ${none}`;
  document.getElementById('stat-todo').textContent = `To review: ${todo}`;
}

function getVowelStatus(vowel) {
  const dec = state.review[vowel.id]?.decision;
  if (dec === 'take') return 'take';
  if (dec === 'current') return 'current';
  if (dec === 'none') return 'none';
  return 'todo';
}

function renderVowelRow(vowel, index) {
  const takes = state.takes[vowel.id] ?? [];
  const currentSound = state.currentSounds[vowel.id];
  const decision = state.review[vowel.id];
  const status = getVowelStatus(vowel);

  const row = document.createElement('div');
  row.className = `vowel-row ${index === selectedIndex ? 'selected' : ''}`;
  row.id = `vowel-row-${vowel.id}`;
  row.dataset.id = vowel.id;
  row.dataset.index = index;

  // Click row to select
  row.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    document
      .querySelectorAll('.vowel-row.selected')
      .forEach((el) => el.classList.remove('selected'));
    row.classList.add('selected');
    selectedIndex = index;
  });

  // Col 1: Identity
  const colIdentity = document.createElement('div');
  colIdentity.className = 'col-identity';
  colIdentity.innerHTML = `
    <div class="thai-open">${vowel.open}</div>
    <div class="identity-meta">
      <div class="vowel-id">${vowel.id}</div>
      <div class="vowel-spoken">${vowel.text}</div>
      <div class="vowel-ipa">/${vowel.ipa}/</div>
      <span class="badge-length">${vowel.length}</span>
    </div>
  `;

  // Col 2: Audio tracks (Current + Takes)
  const colAudio = document.createElement('div');
  colAudio.className = 'col-audio';

  const trackGroup = document.createElement('div');
  trackGroup.className = 'audio-track-group';

  // 1. Current published sound pill
  if (currentSound && currentSound.exists) {
    const isCurrentDecision = decision?.decision === 'current';
    const currentPill = document.createElement('div');
    currentPill.className = `track-pill is-current ${isCurrentDecision ? 'is-active-decision' : ''}`;
    currentPill.title = `Current game audio (MD5: ${currentSound.md5?.slice(0, 8)})`;
    currentPill.innerHTML = `
      <button type="button" class="btn-play-sound" title="Play current sound">▶</button>
      <span class="track-label">Current sound</span>
      <button type="button" class="btn-choose-track" title="Keep this version">${isCurrentDecision ? '✓ Kept' : 'Keep'}</button>
    `;

    currentPill.querySelector('.btn-play-sound').addEventListener('click', (e) => {
      e.stopPropagation();
      playTrack(`/audio/current/${vowel.id}.mp3`, vowel.id, 'current', null, currentPill);
    });

    currentPill.querySelector('.btn-choose-track').addEventListener('click', (e) => {
      e.stopPropagation();
      makeDecision(vowel.id, 'current');
    });

    trackGroup.appendChild(currentPill);
  }

  // 2. Takes pills
  takes.forEach((take) => {
    const isTakeDecision = decision?.decision === 'take' && decision.take === take.n;
    const isSameAsCurrent = currentSound?.md5 && currentSound.md5 === take.md5;

    const takePill = document.createElement('div');
    takePill.className = `track-pill ${isTakeDecision ? 'is-active-decision' : ''}`;
    takePill.title = `Take #${take.n} (recorded: ${take.recordedAt.slice(0, 10)})`;
    takePill.innerHTML = `
      <button type="button" class="btn-play-sound" title="Play Take #${take.n}">▶</button>
      <span class="track-label">Take ${take.n}${isSameAsCurrent ? ' <span class="muted">(same)</span>' : ''}</span>
      <button type="button" class="btn-choose-track" title="Choose this take">${isTakeDecision ? '✓ Winner' : 'Choose'}</button>
    `;

    takePill.querySelector('.btn-play-sound').addEventListener('click', (e) => {
      e.stopPropagation();
      playTrack(`/audio/take/${vowel.id}/${take.n}.mp3`, vowel.id, 'take', take.n, takePill);
    });

    takePill.querySelector('.btn-choose-track').addEventListener('click', (e) => {
      e.stopPropagation();
      makeDecision(vowel.id, 'take', take.n);
    });

    trackGroup.appendChild(takePill);
  });

  // 3. Pill to record 3 more takes
  const moreBtn = document.createElement('button');
  moreBtn.type = 'button';
  moreBtn.className = 'pill-more-takes';
  moreBtn.textContent = '+ 3 takes';
  moreBtn.title = 'Generate 3 additional takes with Google TTS';
  moreBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    generateTakes(vowel.id, 3, moreBtn);
  });
  trackGroup.appendChild(moreBtn);

  colAudio.appendChild(trackGroup);

  // Col 3: Status & Action
  const colStatus = document.createElement('div');
  colStatus.className = 'col-status';

  let statusLabel = 'To review';
  let statusBadgeClass = 'badge-decision-todo';
  if (status === 'take') {
    statusLabel = `✓ Take #${decision.take} chosen`;
    statusBadgeClass = 'badge-decision-take';
  } else if (status === 'current') {
    statusLabel = '✓ Keeping current';
    statusBadgeClass = 'badge-decision-current';
  } else if (status === 'none') {
    statusLabel = '⚠ Need more takes';
    statusBadgeClass = 'badge-decision-none';
  }

  colStatus.innerHTML = `
    <span class="decision-badge ${statusBadgeClass}">${statusLabel}</span>
  `;

  // If a take is chosen, offer direct publish button
  if (status === 'take' && decision?.take !== undefined) {
    const pubBtn = document.createElement('button');
    pubBtn.type = 'button';
    pubBtn.className = 'btn-publish-single';
    pubBtn.textContent = '🚀 Publish this take';
    pubBtn.title = `Copy Take #${decision.take} to public/audio/vowels/${vowel.id}.mp3`;
    pubBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      publishSingle(vowel.id, decision.take);
    });
    colStatus.appendChild(pubBtn);

    if (decision.publishedAt) {
      const pubMeta = document.createElement('span');
      pubMeta.className = 'published-timestamp';
      pubMeta.textContent = `Published: ${new Date(decision.publishedAt).toLocaleTimeString()}`;
      colStatus.appendChild(pubMeta);
    }
  }

  row.appendChild(colIdentity);
  row.appendChild(colAudio);
  row.appendChild(colStatus);

  return row;
}

function updateVowelRow(id) {
  const index = state.vowels.findIndex((v) => v.id === id);
  if (index === -1) return;
  const oldRow = document.getElementById(`vowel-row-${id}`);
  if (!oldRow) return;

  const newRow = renderVowelRow(state.vowels[index], index);
  oldRow.replaceWith(newRow);
}

function render() {
  container.innerHTML = '';
  const filter = filterSelect.value;

  const filteredVowels = state.vowels.filter((v) => {
    if (filter === 'all') return true;
    if (filter === 'sara_koen') return v.pairIndex === 12;
    return getVowelStatus(v) === filter;
  });

  if (filteredVowels.length === 0) {
    container.innerHTML = '<p class="muted loading">No vowels match the selected filter.</p>';
    updateStats();
    return;
  }

  // Group by pairIndex (0..11 for pairs, 12 for Sara Koen)
  const groups = new Map();
  for (const v of filteredVowels) {
    if (!groups.has(v.pairIndex)) groups.set(v.pairIndex, []);
    groups.get(v.pairIndex).push(v);
  }

  for (const [pairIndex, pairVowels] of groups.entries()) {
    const block = document.createElement('div');
    block.className = 'pair-block';

    const header = document.createElement('div');
    header.className = 'pair-header';
    if (pairIndex === 12) {
      header.innerHTML = `<span>Sara Koen (Extra Vowels)</span><span>4 vowels</span>`;
    } else {
      const pairNames = pairVowels.map((v) => v.id).join(' / ');
      header.innerHTML = `<span>Vowel Pair: ${pairNames}</span><span>Short & Long</span>`;
    }
    block.appendChild(header);

    for (const v of pairVowels) {
      const globalIndex = state.vowels.findIndex((item) => item.id === v.id);
      block.appendChild(renderVowelRow(v, globalIndex));
    }

    container.appendChild(block);
  }

  updateStats();
}

// Global Keyboard Shortcuts
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea, select')) return;

  const selectedRow = document.querySelector('.vowel-row.selected');
  const vowelId = selectedRow?.dataset.id;
  const takes = vowelId ? (state.takes[vowelId] ?? []) : [];

  // Space: Toggle play/pause
  if (e.code === 'Space') {
    e.preventDefault();
    if (audioElement && !audioElement.paused) {
      stopAudio();
    } else if (vowelId) {
      // Play first take or current
      const firstTake = takes[0];
      if (firstTake) {
        playTrack(`/audio/take/${vowelId}/${firstTake.n}.mp3`, vowelId, 'take', firstTake.n);
      } else {
        playTrack(`/audio/current/${vowelId}.mp3`, vowelId, 'current');
      }
    }
  }

  // 'C': Play current sound
  if (e.key === 'c' || e.key === 'C') {
    if (vowelId) {
      playTrack(`/audio/current/${vowelId}.mp3`, vowelId, 'current');
    }
  }

  // Numbers 1-6: Play or choose take N
  if (e.key >= '1' && e.key <= '6') {
    const n = Number(e.key);
    const take = takes.find((t) => t.n === n);
    if (take && vowelId) {
      if (e.shiftKey) {
        makeDecision(vowelId, 'take', n);
      } else {
        playTrack(`/audio/take/${vowelId}/${n}.mp3`, vowelId, 'take', n);
      }
    }
  }

  // Arrow navigation / J/K
  if (e.key === 'ArrowDown' || e.key === 'j' || e.key === 'J') {
    e.preventDefault();
    const rows = [...document.querySelectorAll('.vowel-row')];
    const currentIndex = rows.findIndex((r) => r.classList.contains('selected'));
    const nextIndex = (currentIndex + 1) % rows.length;
    rows.forEach((r) => r.classList.remove('selected'));
    rows[nextIndex]?.classList.add('selected');
    rows[nextIndex]?.scrollIntoView({ block: 'nearest' });
  }

  if (e.key === 'ArrowUp' || e.key === 'k' || e.key === 'K') {
    e.preventDefault();
    const rows = [...document.querySelectorAll('.vowel-row')];
    const currentIndex = rows.findIndex((r) => r.classList.contains('selected'));
    const prevIndex = (currentIndex - 1 + rows.length) % rows.length;
    rows.forEach((r) => r.classList.remove('selected'));
    rows[prevIndex]?.classList.add('selected');
    rows[prevIndex]?.scrollIntoView({ block: 'nearest' });
  }
});

// Event listeners for top action buttons
document.getElementById('btn-batch-generate')?.addEventListener('click', () => {
  if (
    confirm(
      'Generate 3 additional takes for all 28 vowels with Google Cloud TTS? (This will record 84 takes and incur Google TTS API costs).',
    )
  ) {
    generateTakes(undefined, 3);
  }
});

document.getElementById('btn-publish-all')?.addEventListener('click', () => {
  publishAllSelected();
});

filterSelect?.addEventListener('change', () => {
  render();
});

// Initial load
loadData();
