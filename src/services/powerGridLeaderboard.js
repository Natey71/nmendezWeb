import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDir, 'power-grid-tycoon-leaderboard.json');

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

async function ensureStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, '[]', 'utf-8');
  }
}

async function loadEntries() {
  await ensureStore();
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

function normalizeEntry(raw) {
  const safeName = String(raw.name ?? '').trim().slice(0, 32) || 'Anonymous';
  const safeScore = Number.isFinite(Number(raw.score)) ? Math.round(Number(raw.score)) : 0;
  const safeProfit = Number.isFinite(Number(raw.profit)) ? Math.round(Number(raw.profit)) : 0;
  const rawUptime = Number.isFinite(Number(raw.uptime)) ? Number(raw.uptime) : 0;
  const rawEmissions = Number.isFinite(Number(raw.emissions)) ? Number(raw.emissions) : 0;

  return {
    id: randomUUID(),
    name: safeName,
    score: safeScore,
    profit: safeProfit,
    uptime: Math.round(clamp(rawUptime, 0, 100)),
    emissions: Math.max(0, Math.round(rawEmissions)),
    endedAt: new Date().toISOString(),
  };
}

export async function getLeaderboard(limit) {
  const entries = await loadEntries();
  entries.sort((a, b) => b.score - a.score);
  if (limit && Number.isFinite(Number(limit))) {
    return entries.slice(0, Number(limit));
  }
  return entries;
}

export async function appendLeaderboardEntry(rawEntry) {
  const entry = normalizeEntry(rawEntry ?? {});
  const entries = await loadEntries();
  entries.push(entry);
  entries.sort((a, b) => b.score - a.score);
  await saveEntries(entries);
  return entry;
}
