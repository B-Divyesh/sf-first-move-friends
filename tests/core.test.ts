import { describe, expect, test } from 'vitest';
import { activePlayer, createGame, isGameState, legalCells, nextRematch, normalizeSeed, placeTile, winnerText } from '../src/core';

function finish(seed = 'claim-seed') {
  let state = createGame(seed);
  while (state.status === 'playing') {
    const legal = legalCells(state);
    expect(legal.length).toBeGreaterThan(0);
    state = placeTile(state, legal[0]);
  }
  return state;
}

describe('deterministic game core', () => {
  test('fills all 16 cells and names a result', () => {
    const state = finish();
    expect(state.placements).toHaveLength(16);
    expect(state.status).toBe('finished');
    expect(winnerText(state)).toMatch(/wins|Draw/);
  });

  test('guided opening exposes only the taught legal moves', () => {
    let state = createGame('opening');
    expect(legalCells(state)).toEqual([5, 6, 9, 10]);
    state = placeTile(state, 5);
    expect(legalCells(state).every((cell) => [1, 4, 6, 9].includes(cell))).toBe(true);
    state = placeTile(state, legalCells(state)[0]);
    expect(legalCells(state).every((cell) => !state.placements.some((tile) => tile.cell === cell))).toBe(true);
  });

  test('two players alternate Sun and Moon without an account', () => {
    let state = createGame('pair');
    expect(activePlayer(state)).toBe('sun');
    state = placeTile(state, legalCells(state)[0]);
    expect(activePlayer(state)).toBe('moon');
  });

  test('resets the board and changes the shuffled setup', () => {
    const finished = finish('rematch');
    const rematch = nextRematch(finished);
    expect(rematch.placements).toHaveLength(0);
    expect(rematch.rematch).toBe(1);
    expect(`${rematch.goal}:${rematch.tileOrder.join('')}`).not.toBe(`${finished.goal}:${finished.tileOrder.join('')}`);
  });

  test('rejects incomplete saved state and treats a crafted seed as plain text', () => {
    expect(isGameState({ seed: 'x', placements: [], scores: {} })).toBe(false);
    expect(isGameState({ ...createGame('safe'), goal: 'unknown' })).toBe(false);
    expect(isGameState({ ...createGame('safe'), scores: { sun: 999, moon: 0 } })).toBe(false);
    expect(normalizeSeed('<h1>Injected</h1>')).toBe('h1Injectedh1');
  });
});
