import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configuredDataFile = process.env.POWER_GRID_LEADERBOARD_FILE
  ? path.resolve(process.env.POWER_GRID_LEADERBOARD_FILE)
  : null;
const defaultDataDir = path.join(__dirname, '..', 'data');
const dataFile = configuredDataFile || path.join(defaultDataDir, 'power-grid-tycoon-leaderboard.json');
const dataDir = path.dirname(dataFile);
const lockFile = `${dataFile}.lock`;

const LOCK_RETRY_DELAY_MS = 25;
const LOCK_STALE_THRESHOLD_MS = 15_000;

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, '[]', 'utf-8');
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function acquireLock() {
  while (true) {
    try {
      return await fs.open(lockFile, 'wx');
    } catch (error) {
      if (error?.code !== 'EEXIST') {
        throw error;
      }

      let lockStats;
      try {
        lockStats = await fs.stat(lockFile);
      } catch (statError) {
        if (statError?.code === 'ENOENT') {
          continue;
        }
        throw statError;
      }

      if (Date.now() - lockStats.mtimeMs > LOCK_STALE_THRESHOLD_MS) {
        await fs.unlink(lockFile).catch(() => {});
        continue;
      }

      await wait(LOCK_RETRY_DELAY_MS);
    }
  }
}

async function withFileLock(operation) {
  await ensureStore();
  const handle = await acquireLock();
  try {
    return await operation();
  } finally {
    try {
      await handle.close();
    } catch {}
    await fs.unlink(lockFile).catch(() => {});
  }
}

async function loadEntries() {
  try {
    const raw = await fs.readFile(dataFile, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveEntries(entries) {
  await fs.writeFile(dataFile, JSON.stringify(entries, null, 2), 'utf-8');
}

let queue = Promise.resolve();

function enqueueSerialized(operation) {
  const run = queue.then(() => operation(), () => operation());
  queue = run.catch(() => {});
  return run;
}

function runWithExclusiveAccess(operation) {
  return enqueueSerialized(() => withFileLock(operation));
}

function sanitizeComputedEntry(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Computed leaderboard entry is required.');
  }

  const toFinite = (value, label) => {
    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new Error(`Leaderboard entry is missing ${label}.`);
    }
    return num;
  };

  const safeName = String(raw.name ?? '').trim().slice(0, 32) || 'Anonymous';
  const score = toFinite(raw.score, 'score');
  const profit = toFinite(raw.profit, 'profit');
  const uptime = toFinite(raw.uptime, 'uptime');
  const emissions = toFinite(raw.emissions, 'emissions');

  return {
    id: randomUUID(),
    name: safeName,
    score: Math.round(score),
    profit: Math.round(profit),
    uptime: Math.round(clamp(uptime, 0, 100)),
    emissions: Math.max(0, Math.round(emissions)),
    endedAt: new Date().toISOString(),
  };
}

export async function getLeaderboard(limit) {
  return runWithExclusiveAccess(async () => {
    const entries = await loadEntries();
    entries.sort((a, b) => b.score - a.score);
    if (limit && Number.isFinite(Number(limit))) {
      return entries.slice(0, Number(limit));
    }
    return entries;
  });
}

export async function appendLeaderboardEntry(rawEntry) {
  const entry = sanitizeComputedEntry(rawEntry ?? {});
  return runWithExclusiveAccess(async () => {
    const entries = await loadEntries();
    entries.push(entry);
    entries.sort((a, b) => b.score - a.score);
    await saveEntries(entries);
    return entry;
  });
}
