const fs = require('fs');
const fsp = require('fs').promises;
const os = require('os');
const path = require('path');

let appendLeaderboardEntry;
let getLeaderboard;

const tmpDir = path.join(os.tmpdir(), 'power-grid-leaderboard-tests');
const tmpFile = path.join(tmpDir, 'leaderboard.json');

beforeAll(() => {
  process.env.POWER_GRID_LEADERBOARD_FILE = tmpFile;
  const modulePath = path.join(__dirname, '../../src/services/powerGridLeaderboard.js');
  let code = fs.readFileSync(modulePath, 'utf8');
  code = code
    .replace("import { promises as fs } from 'fs';", "const { promises: fs } = require('fs');")
    .replace("import path from 'path';", "const path = require('path');")
    .replace("import { fileURLToPath } from 'url';", "const { fileURLToPath } = require('url');")
    .replace("import { randomUUID } from 'crypto';", "const { randomUUID } = require('crypto');")
    .replace(
      "const __filename = fileURLToPath(import.meta.url);\nconst __dirname = path.dirname(__filename);",
      `const __filename = ${JSON.stringify(modulePath)};\nconst __dirname = path.dirname(__filename);`,
    )
    .replace(/export\s+async\s+function\s+getLeaderboard/g, 'async function getLeaderboard')
    .replace(/export\s+async\s+function\s+appendLeaderboardEntry/g, 'async function appendLeaderboardEntry');
  code += '\nmodule.exports = { appendLeaderboardEntry, getLeaderboard };';
  const moduleObj = { exports: {} };
  const wrapper = new Function('module', 'exports', 'require', code);
  wrapper(moduleObj, moduleObj.exports, require);
  ({ appendLeaderboardEntry, getLeaderboard } = moduleObj.exports);
});

beforeEach(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true });
});

afterAll(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true });
  delete process.env.POWER_GRID_LEADERBOARD_FILE;
});

describe('powerGridLeaderboard service', () => {
  test('stores computed entries and clamps numeric fields', async () => {
    const entry = await appendLeaderboardEntry({
      name: 'Dana',
      score: 25000.7,
      profit: 10234.4,
      uptime: 104.2,
      emissions: -3,
    });

    expect(entry.name).toBe('Dana');
    expect(entry.score).toBe(25001);
    expect(entry.profit).toBe(10234);
    expect(entry.uptime).toBe(100);
    expect(entry.emissions).toBe(0);

    const stored = await getLeaderboard();
    expect(stored).toHaveLength(1);
    expect(stored[0].score).toBe(25001);
  });

  test('rejects entries missing computed totals', async () => {
    await expect(
      appendLeaderboardEntry({ name: 'Eve', profit: 100, uptime: 80, emissions: 5 }),
    ).rejects.toThrow('Leaderboard entry is missing score.');
  });
});
