// tests/services/powerGridLeaderboard.test.js
// tests/services/powerGridLeaderboard.test.js
import assert from 'assert/strict';
import os from 'os';
import path from 'path';
import { promises as fsp } from 'fs';
import { spawn } from 'child_process';

let appendLeaderboardEntry;
let getLeaderboard;
let clearLeaderboard;

const tmpDir = path.join(os.tmpdir(), 'power-grid-tycoon-tests');
const tmpFile = path.join(tmpDir, 'leaderboard.db');

beforeAll(async () => {
  await fsp.rm(tmpFile, { force: true });

  // Make sure the service points at our temp file *before* we import it
  process.env.POWER_GRID_LEADERBOARD_FILE = tmpFile;

  const mod = await import('../../src/services/powerGridLeaderboard.js');
  appendLeaderboardEntry = mod.appendLeaderboardEntry;
  getLeaderboard = mod.getLeaderboard;
  clearLeaderboard = mod.clearLeaderboard;

  // Start from a clean file
  await clearLeaderboard();
});

beforeEach(async () => {
  // Each test runs against a fresh leaderboard file
  await clearLeaderboard();
});

afterAll(async () => {
  if (clearLeaderboard) {
    await clearLeaderboard();
  }
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

    const stored = await getLeaderboard(1);
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

  it('coerces non-finite values instead of rejecting leaderboard saves', async () => {
    const entry = await appendLeaderboardEntry({
      name: 'Overflowing Player With A Very Long Name',
      score: Number.POSITIVE_INFINITY,
      profit: '123abc',
      uptime: 'NaN',
      emissions: Number.NEGATIVE_INFINITY,
    });

    assert.equal(entry.name, 'Overflowing Player With A Very L');
    assert.equal(entry.score, Number.MAX_SAFE_INTEGER);
    assert.equal(entry.profit, 0);
    assert.equal(entry.uptime, 0);
    assert.equal(entry.emissions, 0);

    const stored = await getLeaderboard(1);
    assert.equal(stored.length, 1);
    assert.equal(stored[0].score, Number.MAX_SAFE_INTEGER);
    assert.equal(stored[0].profit, 0);
    assert.equal(stored[0].uptime, 0);
    assert.equal(stored[0].emissions, 0);
  });

  it('allows concurrent leaderboard saves from separate processes', async () => {
    const scriptUrl = new URL('../fixtures/append-leaderboard-entry.js', import.meta.url);

    const jobs = Array.from({ length: 5 }, (_, i) =>
      new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptUrl.pathname, String(i)], {
          env: { ...process.env, POWER_GRID_LEADERBOARD_FILE: tmpFile },
          stdio: ['ignore', 'ignore', 'pipe'],
        });

        let stderr = '';
        child.stderr.setEncoding('utf-8');
        child.stderr.on('data', (chunk) => {
          stderr += chunk;
        });

        child.on('error', reject);
        child.on('exit', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Child exited with code ${code}: ${stderr.trim()}`));
        });
      }),
    );

    await Promise.all(jobs);

    // 🔴 THIS WAS THE BIG BUG:
    // It used to be: const stored = await getLeaderboard(2);
    // so you were asking for LIMIT 2 but expecting 5 rows.
    const stored = await getLeaderboard(); // use default limit (50)
    assert.equal(stored.length, 5);
  });
});