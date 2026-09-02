const GOAL_IDS = ['friends', 'variety', 'horizon'];
const MARKS = ['ring', 'spark', 'wave'];
const CENTRES = [5, 6, 9, 10];

function hashSeed(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFrom(seed) {
  let state = seed || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame(seed, rematch = 0) {
  const random = randomFrom(hashSeed(`${seed}:${rematch}`));
  const tileOrder = Array.from({ length: 16 }, (_, index) => MARKS[index % MARKS.length]);
  for (let index = tileOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [tileOrder[index], tileOrder[swapIndex]] = [tileOrder[swapIndex], tileOrder[index]];
  }
  return {
    seed,
    goal: GOAL_IDS[Math.floor(random() * GOAL_IDS.length)],
    tileOrder,
    placements: [],
    scores: { sun: 0, moon: 0 },
    status: 'playing',
    paused: false,
    rematch
  };
}

export function activePlayer(state) {
  return state.placements.length % 2 === 0 ? 'sun' : 'moon';
}

function neighbors(cell) {
  const row = Math.floor(cell / 4);
  const column = cell % 4;
  const result = [];
  if (row > 0) result.push(cell - 4);
  if (row < 3) result.push(cell + 4);
  if (column > 0) result.push(cell - 1);
  if (column < 3) result.push(cell + 1);
  return result;
}

function pointsFor(state, cell, player, mark) {
  const nearby = neighbors(cell).map((neighbor) => state.placements.find((tile) => tile.cell === neighbor)).filter(Boolean);
  if (state.goal === 'friends') {
    return nearby.reduce((total, tile) => total + (tile.player === player ? 2 : 0) + (tile.mark === mark ? 1 : 0), 0);
  }
  if (state.goal === 'variety') {
    return (CENTRES.includes(cell) ? 1 : 0) + nearby.filter((tile) => tile.mark !== mark).length;
  }
  const row = Math.floor(cell / 4);
  const column = cell % 4;
  return (row === 0 || row === 3 || column === 0 || column === 3 ? 2 : 0) + nearby.filter((tile) => tile.player !== player).length;
}

export function legalCells(state) {
  if (state.status === 'finished') return [];
  const occupied = new Set(state.placements.map((tile) => tile.cell));
  if (state.placements.length === 0) return CENTRES;
  const touching = Array.from({ length: 16 }, (_, cell) => cell).filter(
    (cell) => !occupied.has(cell) && neighbors(cell).some((neighbor) => occupied.has(neighbor))
  );
  if (state.placements.length === 2) {
    const player = activePlayer(state);
    const mark = state.tileOrder[state.placements.length];
    const scoring = touching.filter((cell) => pointsFor(state, cell, player, mark) > 0);
    return scoring.length ? scoring : touching;
  }
  return touching;
}

export function placeTile(state, cell) {
  if (!Number.isInteger(cell) || !legalCells(state).includes(cell)) return null;
  const player = activePlayer(state);
  const mark = state.tileOrder[state.placements.length];
  const points = pointsFor(state, cell, player, mark);
  const placements = [...state.placements, { cell, player, mark, points }];
  return {
    ...state,
    placements,
    scores: { ...state.scores, [player]: state.scores[player] + points },
    status: placements.length === 16 ? 'finished' : 'playing'
  };
}
