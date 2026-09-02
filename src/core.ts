export type Player = 'sun' | 'moon';
export type TileMark = 'ring' | 'spark' | 'wave';
export type GoalId = 'friends' | 'variety' | 'horizon';

export interface Placement {
  cell: number;
  player: Player;
  mark: TileMark;
  points: number;
}

export interface GameState {
  seed: string;
  goal: GoalId;
  tileOrder: TileMark[];
  placements: Placement[];
  scores: Record<Player, number>;
  status: 'playing' | 'finished';
  paused: boolean;
  rematch: number;
}

export const GOALS: Record<GoalId, { name: string; short: string; rule: string }> = {
  friends: {
    name: 'Friendly light',
    short: 'Own neighbors score 2',
    rule: 'Score 2 points for each side touching one of your lanterns. Matching marks add 1 point.'
  },
  variety: {
    name: 'Mixed patterns',
    short: 'Different marks score 1',
    rule: 'Score 1 point for each neighboring lantern with a different mark. Centre cells add 1 point.'
  },
  horizon: {
    name: 'Edge glow',
    short: 'Edges and rivals score',
    rule: 'Score 2 points on an outside edge. Each neighboring rival adds 1 point.'
  }
};

const MARKS: TileMark[] = ['ring', 'spark', 'wave'];
const CENTRES = [5, 6, 9, 10];

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFrom(seed: number): () => number {
  let state = seed || 0x6d2b79f5;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeed(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, '0')).join('').slice(0, 8);
}

export function createGame(seed: string, rematch = 0): GameState {
  const random = randomFrom(hashSeed(`${seed}:${rematch}`));
  const tileOrder = Array.from({ length: 16 }, (_, index) => MARKS[index % MARKS.length]);
  for (let index = tileOrder.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [tileOrder[index], tileOrder[swapIndex]] = [tileOrder[swapIndex], tileOrder[index]];
  }
  const goals = Object.keys(GOALS) as GoalId[];
  return {
    seed,
    goal: goals[Math.floor(random() * goals.length)],
    tileOrder,
    placements: [],
    scores: { sun: 0, moon: 0 },
    status: 'playing',
    paused: false,
    rematch
  };
}

export function activePlayer(state: GameState): Player {
  return state.placements.length % 2 === 0 ? 'sun' : 'moon';
}

export function neighbors(cell: number): number[] {
  const row = Math.floor(cell / 4);
  const column = cell % 4;
  const result: number[] = [];
  if (row > 0) result.push(cell - 4);
  if (row < 3) result.push(cell + 4);
  if (column > 0) result.push(cell - 1);
  if (column < 3) result.push(cell + 1);
  return result;
}

function pointsFor(state: GameState, cell: number, player: Player, mark: TileMark): number {
  const nearby = neighbors(cell)
    .map((neighbor) => state.placements.find((tile) => tile.cell === neighbor))
    .filter((tile): tile is Placement => Boolean(tile));
  if (state.goal === 'friends') {
    return nearby.reduce((total, tile) => total + (tile.player === player ? 2 : 0) + (tile.mark === mark ? 1 : 0), 0);
  }
  if (state.goal === 'variety') {
    const centrePoint = CENTRES.includes(cell) ? 1 : 0;
    return centrePoint + nearby.filter((tile) => tile.mark !== mark).length;
  }
  const row = Math.floor(cell / 4);
  const column = cell % 4;
  const edgePoint = row === 0 || row === 3 || column === 0 || column === 3 ? 2 : 0;
  return edgePoint + nearby.filter((tile) => tile.player !== player).length;
}

export function legalCells(state: GameState): number[] {
  if (state.status === 'finished' || state.paused) return [];
  const occupied = new Set(state.placements.map((tile) => tile.cell));
  if (state.placements.length === 0) return CENTRES;
  const touching = Array.from({ length: 16 }, (_, cell) => cell).filter(
    (cell) => !occupied.has(cell) && neighbors(cell).some((neighbor) => occupied.has(neighbor))
  );
  if (state.placements.length === 2) {
    const player = activePlayer(state);
    const mark = state.tileOrder[state.placements.length];
    const scoring = touching.filter((cell) => pointsFor(state, cell, player, mark) > 0);
    return scoring.length > 0 ? scoring : touching;
  }
  return touching;
}

export function placeTile(state: GameState, cell: number): GameState {
  if (!legalCells(state).includes(cell)) return state;
  const player = activePlayer(state);
  const mark = state.tileOrder[state.placements.length];
  const points = pointsFor(state, cell, player, mark);
  const placement: Placement = { cell, player, mark, points };
  const placements = [...state.placements, placement];
  return {
    ...state,
    placements,
    scores: { ...state.scores, [player]: state.scores[player] + points },
    status: placements.length === 16 ? 'finished' : 'playing'
  };
}

export function tutorialText(state: GameState): string {
  const move = state.placements.length;
  if (move === 0) return 'Sun: place the first lantern in a centre cell.';
  if (move === 1) return 'Moon: place beside the first lantern. Lanterns connect by their sides.';
  if (move === 2) return 'Sun: choose a marked cell that scores under this goal.';
  if (move < 16) return `${activePlayer(state) === 'sun' ? 'Sun' : 'Moon'}: place beside any lantern.`;
  return 'The board is full. This match is complete.';
}

export function nextRematch(state: GameState): GameState {
  return createGame(state.seed, state.rematch + 1);
}

export function winnerText(state: GameState): string {
  if (state.scores.sun === state.scores.moon) return `Draw at ${state.scores.sun} points each`;
  const winner = state.scores.sun > state.scores.moon ? 'Sun' : 'Moon';
  return `${winner} wins ${Math.max(state.scores.sun, state.scores.moon)}–${Math.min(state.scores.sun, state.scores.moon)}`;
}

export function createDemoGame(): GameState {
  let state = createGame('sample42');
  for (let move = 0; move < 4; move += 1) {
    const legal = legalCells(state);
    state = placeTile(state, legal[(move + 1) % legal.length]);
  }
  return state;
}
