import assert from 'assert/strict';
import os from 'os';
import path from 'path';
import { promises as fsp } from 'fs';

let saveGameState;
let loadGameState;
let clearSaves;

const tmpDir = path.join(os.tmpdir(), 'power-grid-save-tests');
const tmpFile = path.join(tmpDir, 'saves.db');

beforeAll(async () => {
  await fsp.rm(tmpDir, { recursive: true, force: true });
  await fsp.mkdir(tmpDir, { recursive: true });
  process.env.POWER_GRID_SAVES_FILE = tmpFile;

  const mod = await import('../../src/services/gameSaves.js');
  saveGameState = mod.saveGameState;
  loadGameState = mod.loadGameState;
  clearSaves = mod.clearSaves;

  await clearSaves();
});

beforeEach(async () => {
  await clearSaves();
});

afterAll(async () => {
  if (clearSaves) {
    await clearSaves();
  }
  await fsp.rm(tmpDir, { recursive: true, force: true });
  delete process.env.POWER_GRID_SAVES_FILE;
});

describe('gameSaves service', () => {
  it('stores and loads a snapshot by id', async () => {
    const snapshot = { cash: 5000, seasonIndex: 2 };
    const saved = await saveGameState({ name: 'Evening Run', state: snapshot });

    assert.ok(saved.id);
    assert.match(saved.code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);

    const loaded = await loadGameState({ identifier: saved.id, code: saved.code });
    assert.equal(loaded.name, 'Evening Run');
    assert.deepEqual(loaded.state, snapshot);
  });

  it('loads by name when the access code matches', async () => {
    const saved = await saveGameState({ name: 'Morning Shift', state: { ticks: 123 } });

    await assert.rejects(
      () => loadGameState({ identifier: saved.name, code: 'ZZZZ-ZZZZ' }),
      /Save not found or code is incorrect/,
    );

    const loaded = await loadGameState({ identifier: saved.name, code: saved.code });
    assert.equal(loaded.state.ticks, 123);
  });

  it('generates unique access codes for each save', async () => {
    const saves = await Promise.all(
      Array.from({ length: 10 }, (_, i) => saveGameState({ name: `Save ${i}`, state: { i } })),
    );

    const codes = new Set(saves.map((s) => s.code));
    assert.equal(codes.size, saves.length);
  });

  it('validates required inputs', async () => {
    await assert.rejects(() => saveGameState({ name: '', state: {} }), /Save name is required/);
    await assert.rejects(() => saveGameState({ name: 'Valid', state: null }), /Game state payload is required/);
    await assert.rejects(
      () => loadGameState({ identifier: '', code: 'ABCD-EFGH' }),
      /A save identifier is required/,
    );
    await assert.rejects(
      () => loadGameState({ identifier: 'id', code: 'bad' }),
      /Access code must follow the format AAAA-BBBB/,
    );
  });
});
