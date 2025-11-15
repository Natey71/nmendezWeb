// tests/services/powerGridLeaderboard.test.js
import { describe, it, before, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import os from 'os';
import path from 'path';
import { promises as fsp } from 'fs';

let appendLeaderboardEntry;
let getLeaderboard;

const tmpDir = path.join(os.tmpdir(), 'power-grid-leaderboard-tests');
const tmpFile = path.join(tmpDir, 'leaderboard.json');

before(async () => {
  // Point the service at our temp file before importing it
  process.env.POWER_GRID_LEADERBOARD_FILE = tmpFile;
  const mod = await import('../../src/services/powerGridLeaderboard.js');
  appendLeaderboardEntry = mod.appendLeaderboardEntry;
  getLeaderboard = mod.getLeaderboard;
});

beforeEach(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true });
});

after(async () => {
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

    const stored = await getLeaderboard();
    assert.equal(stored.length, 1);
    assert.equal(stored[0].score, 25001);
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

  it('serializes concurrent leaderboard writes to avoid data loss', async () => {
    const originalWriteFile = fsp.writeFile;
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const writeCalls = [];

    // Slow + instrument writes to simulate contention
    const writeMock = mock.method(fsp, 'writeFile', async (...args) => {
      writeCalls.push(args);
      await wait(5);
      return originalWriteFile.apply(fsp, args);
    });

    try {
      const jobs = Array.from({ length: 8 }, (_, i) =>
        appendLeaderboardEntry({
          name: `Player ${i + 1}`,
          score: 1000 + i * 10,
          profit: 5000 + i,
          uptime: 95,
          emissions: 10 + i,
        }),
      );

      const results = await Promise.all(jobs);
      assert.equal(results.length, 8);

      const stored = await getLeaderboard();
      assert.equal(stored.length, 8);

      const scores = stored.map((entry) => entry.score);
      const sortedScores = [...scores].sort((a, b) => b - a);

      assert.deepEqual(scores, sortedScores);
    } finally {
      writeMock.mock.restore();
    }
  });
});
