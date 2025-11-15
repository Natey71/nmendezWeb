// src/services/powerGridLeaderboard.js
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configuredDbFile = process.env.POWER_GRID_LEADERBOARD_FILE
	? path.resolve(process.env.POWER_GRID_LEADERBOARD_FILE)
	: path.join(__dirname, '..', 'data', 'power-grid-tycoon', 'leaderboard.db');

const dbDirectory = path.dirname(configuredDbFile);
fs.mkdirSync(dbDirectory, { recursive: true });

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
	const commands = ['.bail on', '.parameter clear'];

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

// Initialize DB for leaderboard
runSql('PRAGMA journal_mode=WAL;');
runSql('PRAGMA busy_timeout = 5000;');
runSql(`
  CREATE TABLE IF NOT EXISTS power_grid_leaderboard (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    profit INTEGER NOT NULL,
    uptime INTEGER NOT NULL,
    emissions INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );
`);

const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

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
		createdAt: new Date().toISOString(),
	};
}

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function resolveLimit(limit) {
	if (limit === undefined || limit === null) {
		return DEFAULT_LIMIT;
	}

	const numeric = Number(limit);
	if (!Number.isFinite(numeric) || numeric <= 0) {
		return DEFAULT_LIMIT;
	}

	return Math.min(numeric, MAX_LIMIT);
}

export async function getLeaderboard(limit) {
	const resolvedLimit = resolveLimit(limit);
	const rows = runSql(
		`
      SELECT id, name, score, profit, uptime, emissions, created_at
      FROM power_grid_leaderboard
      ORDER BY score DESC, datetime(created_at) ASC, rowid ASC
      LIMIT @limit;
    `,
		{ limit: resolvedLimit },
		{ json: true },
	);

	return rows.map((row) => ({
		id: row.id,
		name: row.name,
		score: Number(row.score),
		profit: Number(row.profit),
		uptime: Number(row.uptime),
		emissions: Number(row.emissions),
		createdAt: row.created_at,
	}));
}

export async function appendLeaderboardEntry(rawEntry) {
	const entry = sanitizeComputedEntry(rawEntry ?? {});

	runSql(
		`
      INSERT INTO power_grid_leaderboard (id, name, score, profit, uptime, emissions, created_at)
      VALUES (@id, @name, @score, @profit, @uptime, @emissions, @createdAt);
    `,
		entry,
	);

	return entry;
}

export async function clearLeaderboard() {
	runSql('DELETE FROM power_grid_leaderboard;');
}
