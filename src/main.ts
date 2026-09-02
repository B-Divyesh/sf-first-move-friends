import './styles.css';
import {
  GOALS,
  activePlayer,
  createDemoGame,
  createGame,
  createSeed,
  legalCells,
  nextRematch,
  placeTile,
  tutorialText,
  winnerText,
  type GameState,
  type Player,
  type TileMark
} from './core';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) throw new Error('App root is missing.');
const app: HTMLDivElement = root;

const ROUTE_TITLES: Record<string, string> = {
  '/': 'First Move Friends — Play a guided tile duel',
  '/demo': 'Demo — First Move Friends',
  '/play': 'Play — First Move Friends',
  '/privacy': 'Privacy — First Move Friends',
  '/terms': 'Terms — First Move Friends',
  '/404': 'Page not found — First Move Friends'
};

const META_DESCRIPTIONS: Record<string, string> = {
  '/': 'Play a guided 4×4 lantern duel with a friend. Learn through three opening moves, then finish a match in 6–10 minutes.',
  '/demo': 'Try a guided First Move Friends match with sample moves and an automatic Moon player.',
  '/play': 'Play a private two-player lantern tile match on one shared screen.',
  '/privacy': 'Read how First Move Friends stores game progress on your device.',
  '/terms': 'Read the terms for playing First Move Friends.',
  '/404': 'The requested First Move Friends page was not found.'
};

let botTimer: number | undefined;
let audioContext: AudioContext | undefined;
let lastFrame = performance.now();
let accumulator = 0;
let phase = 0;

function routePath(): string {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return Object.hasOwn(ROUTE_TITLES, path) ? path : '/404';
}

function storageKey(demo: boolean): string {
  return demo ? 'demo:game' : 'real:game';
}

function settingsKey(demo: boolean): string {
  return demo ? 'demo:settings' : 'real:settings';
}

function isGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GameState>;
  return typeof candidate.seed === 'string' && Array.isArray(candidate.placements) && candidate.scores !== undefined;
}

function loadGame(demo: boolean): GameState {
  const saved = localStorage.getItem(storageKey(demo));
  if (saved) {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (isGameState(parsed)) return { ...parsed, paused: false };
    } catch {
      localStorage.removeItem(storageKey(demo));
    }
  }
  if (demo) {
    const sample = createDemoGame();
    localStorage.setItem(storageKey(true), JSON.stringify(sample));
    return sample;
  }
  const querySeed = new URLSearchParams(location.search).get('seed');
  const game = createGame(querySeed?.slice(0, 24) || createSeed());
  localStorage.setItem(storageKey(false), JSON.stringify(game));
  return game;
}

function saveGame(state: GameState, demo: boolean): void {
  localStorage.setItem(storageKey(demo), JSON.stringify(state));
}

function muted(demo: boolean): boolean {
  return localStorage.getItem(settingsKey(demo)) === 'muted';
}

function tone(player: Player, demo: boolean): void {
  if (muted(demo)) return;
  try {
    audioContext ??= new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = player === 'sun' ? 392 : 523.25;
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
    oscillator.connect(gain).connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Audio is optional. The visible placement feedback remains complete.
  }
}

function navigate(path: string): void {
  history.pushState({}, '', path);
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  render(true);
}

function header(): string {
  return `
    <a class="skip-link" href="#main">Skip to game</a>
    <header class="site-header">
      <a class="wordmark" href="/" data-route aria-label="First Move Friends home">
        <span class="wordmark-mark" aria-hidden="true"><i></i><i></i></span>
        <span>First Move Friends</span>
      </a>
      <nav aria-label="Main navigation">
        <a href="/demo" data-route>Demo</a>
        <a href="/play" data-route>Play</a>
        <a href="/privacy" data-route>Privacy</a>
      </nav>
    </header>`;
}

function footer(): string {
  return `
    <footer class="site-footer">
      <p>Play a guided 4×4 lantern duel with a friend.</p>
      <div class="footer-links">
        <a href="/privacy" data-route>Privacy</a>
        <a href="/terms" data-route>Terms</a>
        <a href="https://hello-factory.sociobot.in" target="_blank" rel="noreferrer">Built by Param Factory <span class="sr-only">(opens in a new tab)</span></a>
      </div>
      <p class="build-note">v1.0 · Original generated scene</p>
    </footer>`;
}

function offlineBanner(): string {
  return navigator.onLine ? '' : '<div class="offline-banner" role="status">You are offline. Your saved game still works.</div>';
}

function ownerMark(player: Player): string {
  return player === 'sun' ? '<span class="sun-glyph" aria-hidden="true">✦</span>' : '<span class="moon-glyph" aria-hidden="true">◒</span>';
}

function tileMark(mark: TileMark): string {
  if (mark === 'ring') return '<span class="tile-symbol ring" aria-hidden="true"></span>';
  if (mark === 'spark') return '<span class="tile-symbol spark" aria-hidden="true">✣</span>';
  return '<span class="tile-symbol wave" aria-hidden="true">≈</span>';
}

function boardMarkup(state: GameState, interactive = true): string {
  const legal = new Set(legalCells(state));
  const nextPlayer = activePlayer(state);
  const buttons = Array.from({ length: 16 }, (_, cell) => {
    const tile = state.placements.find((placement) => placement.cell === cell);
    const row = Math.floor(cell / 4) + 1;
    const column = (cell % 4) + 1;
    if (tile) {
      return `<button class="board-cell tile ${tile.player} placed" type="button" disabled aria-label="Row ${row}, column ${column}: ${tile.player} ${tile.mark}, scored ${tile.points}">
        ${ownerMark(tile.player)}${tileMark(tile.mark)}<span class="point-chip">${tile.points > 0 ? `+${tile.points}` : '0'}</span>
      </button>`;
    }
    const canPlace = interactive && legal.has(cell);
    return `<button class="board-cell ${canPlace ? 'legal' : 'empty'}" type="button" data-cell="${cell}" ${canPlace ? '' : 'disabled'} aria-label="Row ${row}, column ${column}${canPlace ? `: place ${nextPlayer} lantern` : ': unavailable'}">
      ${canPlace ? '<span class="place-label">Place</span>' : '<span aria-hidden="true"></span>'}
    </button>`;
  }).join('');
  return `<div class="board-shell">
    <div class="board" role="group" aria-label="Four by four lantern board">${buttons}</div>
    <div class="board-orbit orbit-one" aria-hidden="true"></div>
    <div class="board-orbit orbit-two" aria-hidden="true"></div>
  </div>`;
}

function scoreMarkup(state: GameState): string {
  const current = state.status === 'playing' ? activePlayer(state) : null;
  return `<div class="score-row" aria-label="Score">
    <div class="player-score sun ${current === 'sun' ? 'active' : ''}">${ownerMark('sun')}<span><b>Sun</b><strong>${state.scores.sun}</strong></span></div>
    <div class="turn-count"><span>Turn</span><strong>${Math.min(state.placements.length + 1, 16)}/16</strong></div>
    <div class="player-score moon ${current === 'moon' ? 'active' : ''}">${ownerMark('moon')}<span><b>Moon</b><strong>${state.scores.moon}</strong></span></div>
  </div>`;
}

function gameMarkup(state: GameState, demo: boolean, preview = false): string {
  const goal = GOALS[state.goal];
  const result = state.status === 'finished';
  return `<section class="game-stage ${preview ? 'preview' : ''}" aria-label="Lantern game">
    <div class="game-topline">
      <div class="goal-card">
        <span>Public goal</span>
        <strong>${goal.name}</strong>
        <p>${goal.rule}</p>
      </div>
      ${preview ? '<span class="preview-tag">Live preview</span>' : `<button class="icon-button" type="button" data-action="mute" aria-pressed="${muted(demo)}">${muted(demo) ? 'Sound off' : 'Sound on'}</button>`}
    </div>
    ${scoreMarkup(state)}
    <div class="play-area">
      ${boardMarkup(state, !preview && !result)}
      <aside class="turn-panel" aria-live="polite">
        ${result ? `<span class="eyebrow">Match complete</span><h2>${winnerText(state)}</h2><p>Every lantern is placed. Start a rematch for a new tile order and goal.</p>` : `<span class="eyebrow">Move ${state.placements.length + 1}</span><h2>${preview ? 'The first moves teach the game' : tutorialText(state)}</h2><p>${state.placements.length < 3 ? 'Only useful cells are marked. No rulebook is needed.' : `Next tile: ${state.tileOrder[state.placements.length]}. ${goal.short}.`}</p>`}
        ${preview ? '<a class="button primary compact" href="/demo" data-route>Play this sample</a>' : result ? '<button class="button primary compact" type="button" data-action="rematch">Play a rematch</button>' : '<button class="text-button" type="button" data-action="pause">Pause match</button>'}
      </aside>
    </div>
  </section>`;
}

function landing(): string {
  const preview = createDemoGame();
  return `${header()}
    <main id="main">
      <section class="hero">
        <div class="hero-scene" aria-hidden="true"></div>
        <div class="hero-copy">
          <span class="eyebrow">Two-player browser game</span>
          <h1 tabindex="-1">Play a tile duel you learn together</h1>
          <p class="lede">For pairs who want a short game without accounts or a rulebook wall.</p>
          <div class="hero-actions">
            <a class="button primary" href="/demo" data-route>Try it with sample data</a>
            <span>Starts a guided match against Moon.</span>
          </div>
          <button class="button secondary" type="button" data-action="new-game">Start a two-player game</button>
          <ul class="plain-facts" aria-label="Game facts">
            <li>Works offline after the first visit.</li>
            <li>No account or ads.</li>
            <li>Free to play.</li>
          </ul>
        </div>
        <div class="hero-game">${gameMarkup(preview, true, true)}</div>
      </section>
      <section class="how section-wrap">
        <div class="section-heading"><span class="eyebrow">How it works</span><h2>Finish one board in three steps</h2></div>
        <ol class="steps">
          <li><span>01</span><div><h3>Place the opening lanterns</h3><p>The board marks valid cells during the first three turns.</p></div></li>
          <li><span>02</span><div><h3>Build around one goal</h3><p>The public goal gives points for neighbors, patterns, or edges.</p></div></li>
          <li><span>03</span><div><h3>Fill the board</h3><p>The higher score wins after all 16 lanterns are placed.</p></div></li>
        </ol>
      </section>
      <section class="limits section-wrap">
        <div><span class="eyebrow">Small by design</span><h2>What this game leaves out</h2></div>
        <p>There is no sign-up, chat, public matchmaking, ranking, tracking, or payment. A match stays in this browser.</p>
      </section>
    </main>${footer()}`;
}

function demoBanner(): string {
  return `<div class="demo-banner" role="status"><span><strong>Demo</strong> — sample data, nothing is saved to your real game.</span><div><button type="button" data-action="reset-demo">Reset demo</button><button type="button" data-action="start-real">Start for real</button></div></div>`;
}

function playPage(demo: boolean): string {
  const state = loadGame(demo);
  const headline = demo ? 'Play a guided sample match' : 'Play a lantern duel together';
  return `${demo ? demoBanner() : ''}${header()}
    <main id="main" class="play-page">
      <div class="play-heading">
        <div><span class="eyebrow">${demo ? 'Sample match' : `Setup ${state.seed.toUpperCase()}`}</span><h1 tabindex="-1">${headline}</h1><p>${demo ? 'You place Sun lanterns. Moon answers with an automatic move.' : 'Pass this screen between two players. The board teaches the opening moves.'}</p></div>
        ${demo ? '' : '<button class="button secondary compact" type="button" data-action="copy-setup">Copy setup link</button>'}
      </div>
      ${gameMarkup(state, demo)}
      <p id="copy-status" class="status-line" aria-live="polite"></p>
      <dialog class="pause-dialog" aria-labelledby="pause-title"><div><span class="eyebrow">Match paused</span><h2 id="pause-title">The board is covered</h2><p>Your current turn is saved on this device.</p><button class="button primary" type="button" data-action="resume">Resume match</button></div></dialog>
    </main>${footer()}`;
}

function textPage(kind: 'privacy' | 'terms'): string {
  const privacy = kind === 'privacy';
  return `${header()}<main id="main" class="text-page">
    <span class="eyebrow">${privacy ? 'Privacy' : 'Terms'}</span>
    <h1 tabindex="-1">${privacy ? 'Your game stays in this browser' : 'Play fairly and kindly'}</h1>
    ${privacy ? `
      <p>First Move Friends does not ask for your name, email address, or account.</p>
      <h2>What is stored</h2><p>Your current board, sound choice, and rematch number use local browser storage. Demo data uses separate keys that start with <code>demo:</code>.</p>
      <h2>What is sent</h2><p>The static site receives normal web requests needed to load its files. The game has no analytics, advertising, or third-party scripts.</p>
      <h2>How to remove data</h2><p>Clear this site’s browser storage. Resetting the demo removes only sample progress.</p>` : `
      <p>First Move Friends is a free local game for two people sharing one screen.</p>
      <h2>Use of the game</h2><p>You may play and share setup links for personal use. Do not use the site to disrupt its service or harm other people.</p>
      <h2>No warranty</h2><p>The game is provided as available, without a promise that every browser or device will work.</p>
      <h2>Changes</h2><p>These terms may change when the game changes. The current version appears on this page.</p>`}
    <p class="updated">Last updated: 2 September 2026</p>
  </main>${footer()}`;
}

function notFound(): string {
  return `${header()}<main id="main" class="not-found"><div class="lost-lantern" aria-hidden="true"><span></span></div><span class="eyebrow">404</span><h1 tabindex="-1">This lantern is off the board</h1><p>The page may have moved, or the link may be incomplete.</p><a class="button primary" href="/" data-route>Return to the game</a></main>${footer()}`;
}

function setMetadata(path: string): void {
  document.title = ROUTE_TITLES[path];
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', META_DESCRIPTIONS[path]);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', `https://first-move-friends.sociobot.in${path === '/' ? '/' : path}`);
}

function render(moveFocus = false): void {
  window.clearTimeout(botTimer);
  const path = routePath();
  setMetadata(path);
  if (path === '/') app.innerHTML = offlineBanner() + landing();
  else if (path === '/demo') app.innerHTML = offlineBanner() + playPage(true);
  else if (path === '/play') app.innerHTML = offlineBanner() + playPage(false);
  else if (path === '/privacy') app.innerHTML = offlineBanner() + textPage('privacy');
  else if (path === '/terms') app.innerHTML = offlineBanner() + textPage('terms');
  else app.innerHTML = offlineBanner() + notFound();
  bindActions(path);
  if (moveFocus) document.querySelector<HTMLElement>('h1')?.focus();
  if (path === '/demo') scheduleDemoMove();
}

function scheduleDemoMove(): void {
  const state = loadGame(true);
  if (state.status === 'playing' && activePlayer(state) === 'moon') {
    botTimer = window.setTimeout(() => {
      const current = loadGame(true);
      const choices = legalCells(current);
      if (choices.length === 0) return;
      const best = choices
        .map((cell) => placeTile(current, cell))
        .sort((a, b) => b.scores.moon - a.scores.moon)[0];
      saveGame(best, true);
      tone('moon', true);
      render();
    }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 80 : 520);
  }
}

function handleBoardKey(event: KeyboardEvent, button: HTMLButtonElement): void {
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  const current = Number(button.dataset.cell);
  const delta = event.key === 'ArrowUp' ? -4 : event.key === 'ArrowDown' ? 4 : event.key === 'ArrowLeft' ? -1 : 1;
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-cell]:not(:disabled)'));
  const exact = buttons.find((candidate) => Number(candidate.dataset.cell) === current + delta);
  (exact || buttons[0])?.focus();
}

function bindActions(path: string): void {
  document.querySelectorAll<HTMLAnchorElement>('a[data-route]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || link.target) return;
      event.preventDefault();
      navigate(new URL(link.href).pathname + new URL(link.href).search);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-cell]:not(:disabled)').forEach((button) => {
    button.addEventListener('keydown', (event) => handleBoardKey(event, button));
    button.addEventListener('click', () => {
      const demo = path === '/demo';
      const current = loadGame(demo);
      if (demo && activePlayer(current) !== 'sun') return;
      const next = placeTile(current, Number(button.dataset.cell));
      if (next === current) return;
      saveGame(next, demo);
      tone(activePlayer(current), demo);
      render();
      document.querySelector<HTMLButtonElement>('[data-cell]:not(:disabled)')?.focus();
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      const demo = path === '/demo';
      if (action === 'new-game' || action === 'start-real') {
        if (action === 'start-real') localStorage.removeItem('demo:game');
        const game = createGame(createSeed());
        saveGame(game, false);
        navigate(`/play?seed=${game.seed}`);
      } else if (action === 'reset-demo') {
        localStorage.removeItem('demo:game');
        render();
      } else if (action === 'rematch') {
        const game = nextRematch(loadGame(demo));
        saveGame(game, demo);
        render();
      } else if (action === 'mute') {
        localStorage.setItem(settingsKey(demo), muted(demo) ? 'sound' : 'muted');
        render();
      } else if (action === 'pause') {
        const state = { ...loadGame(demo), paused: true };
        saveGame(state, demo);
        const dialog = document.querySelector<HTMLDialogElement>('.pause-dialog');
        dialog?.showModal();
        dialog?.querySelector<HTMLButtonElement>('[data-action="resume"]')?.focus();
      } else if (action === 'resume') {
        const state = { ...loadGame(demo), paused: false };
        saveGame(state, demo);
        document.querySelector<HTMLDialogElement>('.pause-dialog')?.close();
        render();
      } else if (action === 'copy-setup') {
        const state = loadGame(false);
        const url = `${location.origin}/play?seed=${encodeURIComponent(state.seed)}`;
        try {
          await navigator.clipboard.writeText(url);
          const status = document.querySelector('#copy-status');
          if (status) status.textContent = 'Setup link copied. It opens the same goal and tile order.';
        } catch {
          const status = document.querySelector('#copy-status');
          if (status) status.textContent = `Copy this setup link: ${url}`;
        }
      }
    });
  });

  document.querySelector<HTMLDialogElement>('.pause-dialog')?.addEventListener('cancel', (event) => {
    event.preventDefault();
    const demo = path === '/demo';
    saveGame({ ...loadGame(demo), paused: false }, demo);
    document.querySelector<HTMLDialogElement>('.pause-dialog')?.close();
    render();
  });
}

function animationLoop(now: number): void {
  if (!document.hidden && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const elapsed = Math.min((now - lastFrame) / 1000, 0.1);
    accumulator += elapsed;
    while (accumulator >= 1 / 60) {
      phase = (phase + 1 / 60) % 20;
      accumulator -= 1 / 60;
    }
    // The turn-based simulation stays deterministic; CSS interpolates the quiet scene drift.
  }
  lastFrame = now;
  requestAnimationFrame(animationLoop);
}

window.addEventListener('popstate', () => render(true));
window.addEventListener('online', () => render());
window.addEventListener('offline', () => render());
document.addEventListener('visibilitychange', () => {
  lastFrame = performance.now();
  accumulator = 0;
});

render();
requestAnimationFrame(animationLoop);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => undefined));
}
