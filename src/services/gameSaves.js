import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { randomInt, randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configuredDbFile = process.env.POWER_GRID_SAVES_FILE
  ? path.resolve(process.env.POWER_GRID_SAVES_FILE)
  : path.join(__dirname, '..', 'data', 'power-grid-tycoon', 'saves.db');

fs.mkdirSync(path.dirname(configuredDbFile), { recursive: true });

function serializeParam(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (value instanceof Date) {
    return `'${value.toISOString().replace(/'/g, "''")}'`;
  }

  const str = String(value);
  return `'${str.replace(/'/g, "''")}'`;
}

function runSql(sql, params = {}, { json = false } = {}) {
  const commands = ['.bail on', '.parameter clear', '.timeout 5000'];

  for (const [key, value] of Object.entries(params)) {
    commands.push(`.parameter set @${key} ${serializeParam(value)}`);
  }

  if (json) {
    commands.push('.mode json');
  }

  const script = `${commands.join('\n')}\n${sql}\n`;

  const result = spawnSync('sqlite3', ['-batch', configuredDbFile], {
    input: script,
    encoding: 'utf-8',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const error = new Error(stderr || `Failed to execute SQL: ${sql}`);
    error.stderr = stderr;
    throw error;
  }

  if (json) {
    const output = result.stdout.trim();
    if (!output) {
      return [];
    }

    try {
      return JSON.parse(output);
    } catch (err) {
      const error = new Error(`Failed to parse sqlite3 JSON output: ${err.message}`);
      error.output = output;
      throw error;
    }
  }

  return undefined;
}

runSql('PRAGMA journal_mode=WAL;');
runSql('PRAGMA busy_timeout = 5000;');
runSql(`
  CREATE TABLE IF NOT EXISTS saved_games (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    access_code TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);
runSql('CREATE INDEX IF NOT EXISTS idx_saved_games_name ON saved_games(name);');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateAccessCode() {
  let raw = '';
  for (let i = 0; i < 8; i += 1) {
    raw += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function ensureUniqueCode() {
  for (let attempts = 0; attempts < 12; attempts += 1) {
    const candidate = generateAccessCode();
    const existing = runSql(
      'SELECT access_code FROM saved_games WHERE access_code=@code LIMIT 1;',
      { code: candidate },
      { json: true },
    );
    if (!existing.length) {
      return candidate;
    }
  }

  const error = new Error('Unable to generate a unique access code.');
  error.status = 500;
  throw error;
}

function normalizeName(name) {
  const cleaned = String(name ?? '').trim();
  if (!cleaned) {
    const error = new Error('Save name is required.');
    error.status = 400;
    throw error;
  }
  return cleaned.slice(0, 128);
}

function normalizeIdentifier(identifier) {
  const cleaned = String(identifier ?? '').trim();
  if (!cleaned) {
    const error = new Error('A save identifier is required.');
    error.status = 400;
    throw error;
  }
  return cleaned;
}

function normalizeCode(code) {
  const cleaned = String(code ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(cleaned)) {
    const error = new Error('Access code must follow the format AAAA-BBBB.');
    error.status = 400;
    throw error;
  }
  return cleaned;
}

function serializeState(state) {
  if (!state || typeof state !== 'object') {
    const error = new Error('Game state payload is required.');
    error.status = 400;
    throw error;
  }

  try {
    return JSON.stringify(state);
  } catch (err) {
    const error = new Error('Game state could not be serialized.');
    error.status = 400;
    throw error;
  }
}

export async function saveGameState({ name, state }) {
  const safeName = normalizeName(name);
  const serializedState = serializeState(state);
  const id = randomUUID();
  const code = ensureUniqueCode();
  const createdAt = new Date().toISOString();

  runSql(
    `
      INSERT INTO saved_games (id, name, access_code, state, created_at)
      VALUES (@id, @name, @code, @state, @createdAt);
    `,
    { id, name: safeName, code, state: serializedState, createdAt },
  );

  return { id, name: safeName, code, createdAt };
}

export async function loadGameState({ identifier, code }) {
  const key = normalizeIdentifier(identifier);
  const accessCode = normalizeCode(code);

  const rows = runSql(
    `
      SELECT id, name, access_code, state, created_at
      FROM saved_games
      WHERE (id=@identifier OR name=@identifier) AND access_code=@code
      LIMIT 1;
    `,
    { identifier: key, code: accessCode },
    { json: true },
  );

  if (!rows.length) {
    const error = new Error('Save not found or code is incorrect.');
    error.status = 404;
    throw error;
  }

  let parsedState;
  try {
    parsedState = JSON.parse(rows[0].state);
  } catch (err) {
    const error = new Error('Saved game data is corrupted.');
    error.status = 500;
    throw error;
  }

  return {
    id: rows[0].id,
    name: rows[0].name,
    code: rows[0].access_code,
    state: parsedState,
    createdAt: rows[0].created_at,
  };
}

export async function clearSaves() {
  runSql('DELETE FROM saved_games;');
}

export default { saveGameState, loadGameState, clearSaves };
