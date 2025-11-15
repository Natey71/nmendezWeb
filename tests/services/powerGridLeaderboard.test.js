// tests/services/powerGridLeaderboard.test.js
import { describe, it, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import { promises as fsp } from 'fs';
import { spawn } from 'node:child_process';

let appendLeaderboardEntry;
let getLeaderboard;
let clearLeaderboard;

const tmpDir = path.join(os.tmpdir(), 'power-grid-leaderboard-tests');
const tmpFile = path.join(tmpDir, 'leaderboard.db');

before(async () => {
  process.env.POWER_GRID_LEADERBOARD_FILE = tmpFile;
  const mod = await import('../../src/services/powerGridLeaderboard.js');
  appendLeaderboardEntry = mod.appendLeaderboardEntry;
  getLeaderboard = mod.getLeaderboard;
  clearLeaderboard = mod.clearLeaderboard;
});

beforeEach(async () => {
  await clearLeaderboard();
});

after(async () => {
  await clearLeaderboard();
  await fsp.rm(tmpDir, { recursive: true, force: true });
  delete process.env.POWER_GRID_LEADERBOARD_FILE;
});

describe('powerGridLeaderboard service', () => {
  it('stores computed entries and clamps numeric fields', async () => {
    const entry = await appendLeaderboardEntry({
      name: 'Dana',
      score: 25000.7,
      profit: 10234.4,
      uptime: 104.2,
      emissions: -3,
    });

    assert.equal(entry.name, 'Dana');
    assert.equal(entry.score, 25001);
    assert.equal(entry.profit, 10234);
    assert.equal(entry.uptime, 100);
    assert.equal(entry.emissions, 0);
    assert.ok(entry.createdAt);

    const stored = await getLeaderboard();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].score, 25001);
    assert.equal(stored[0].createdAt, entry.createdAt);
  });

  it('rejects entries missing computed totals', async () => {
    await assert.rejects(
      () =>
        appendLeaderboardEntry({
          name: 'Eve',
          profit: 100,
          uptime: 80,
          emissions: 5,
        }),
      /Leaderboard entry is missing score\./,
    );
  });

  it('returns the highest scores first and respects the requested limit', async () => {
    const base = {
      profit: 10_000,
      uptime: 95,
      emissions: 10,
    };

    await appendLeaderboardEntry({ ...base, name: 'Player A', score: 12_000 });
    await appendLeaderboardEntry({ ...base, name: 'Player B', score: 18_500 });
    await appendLeaderboardEntry({ ...base, name: 'Player C', score: 16_250 });
    await appendLeaderboardEntry({ ...base, name: 'Player D', score: 19_750 });

    const topThree = await getLeaderboard(3);
    assert.equal(topThree.length, 3);
    assert.deepEqual(
      topThree.map((entry) => entry.name),
      ['Player D', 'Player B', 'Player C'],
    );
  });

  it('allows concurrent leaderboard saves from separate processes', async () => {
    const scriptUrl = new URL('../fixtures/append-leaderboard-entry.js', import.meta.url);

    const jobs = Array.from({ length: 5 }, (_, i) =>
      new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptUrl.pathname, String(i)], {
          env: { ...process.env, POWER_GRID_LEADERBOARD_FILE: tmpFile },
          stdio: 'ignore',
        });

        child.on('error', reject);
        child.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Child exited with code ${code}`));
          }
        });
      }),
    );

    await Promise.all(jobs);

    const stored = await getLeaderboard();
    assert.equal(stored.length, 5);
  });
});
