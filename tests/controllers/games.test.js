import { describe, expect, it, jest } from '@jest/globals';
import { getPowerGridTycoon2DPage } from '../../src/controllers/games.js';

describe('games controller', () => {
  it('renders the 2D Power Grid Tycoon page with the expected title', () => {
    const render = jest.fn();
    const req = {};
    const res = { render };

    getPowerGridTycoon2DPage(req, res);

    expect(render).toHaveBeenCalledWith('games/power-grid-tycoon-2d', {
      title: 'Power Grid Tycoon — 2D Command Center',
    });
  });
});
