import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export interface ParticipantRecord {
  id: string;
  name: string;
  baseWeight?: number;
  consecutiveMisses: number;
  lastWonAt?: string;
  eligible?: boolean;
}

let db: Database.Database | null = null;

interface ParticipantRow {
  id: string;
  name: string;
  base_weight: number;
  consecutive_misses: number;
  last_won_at?: string | null;
  eligible: number;
  created_at: string;
  updated_at: string;
}

const BASE_SELECT = `
  SELECT
    id,
    name,
    base_weight,
    consecutive_misses,
    last_won_at,
    eligible,
    created_at,
    updated_at
  FROM participants
  ORDER BY created_at ASC
`;

export function initDatabase(rootDir: string) {
  const dbPath = path.join(rootDir, "participants.sqlite");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.prepare(`
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      base_weight INTEGER NOT NULL DEFAULT 1,
      consecutive_misses INTEGER NOT NULL DEFAULT 0,
      last_won_at TEXT NULL,
      eligible INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();
  return db;
}

function ensureDb(): Database.Database {
  if (!db) {
    throw new Error("Database not initialized");
  }
  return db;
}

function mapRow(row: ParticipantRow): ParticipantRecord {
  return {
    id: row.id,
    name: row.name,
    baseWeight: row.base_weight,
    consecutiveMisses: row.consecutive_misses,
    lastWonAt: row.last_won_at ?? undefined,
    eligible: row.eligible === 1
  };
}

export function listParticipants(): ParticipantRecord[] {
  const rows = ensureDb().prepare(BASE_SELECT).all() as ParticipantRow[];
  return rows.map(mapRow);
}

interface CreateParticipantInput {
  name: string;
  baseWeight?: number;
}

export function createParticipant(input: CreateParticipantInput): ParticipantRecord {
  const database = ensureDb();
  const now = new Date().toISOString();
  const row: ParticipantRow = {
    id: randomUUID(),
    name: input.name.trim(),
    base_weight: Math.max(1, input.baseWeight ?? 1),
    consecutive_misses: 0,
    last_won_at: null,
    eligible: 1,
    created_at: now,
    updated_at: now
  };

  database
    .prepare(`
      INSERT INTO participants (id, name, base_weight, consecutive_misses, last_won_at, eligible, created_at, updated_at)
      VALUES (@id, @name, @base_weight, @consecutive_misses, @last_won_at, @eligible, @created_at, @updated_at)
    `)
    .run(row);

  return mapRow(row);
}

interface UpdateParticipantInput {
  id: string;
  changes: Partial<ParticipantRecord>;
}

export function updateParticipant({ id, changes }: UpdateParticipantInput): ParticipantRecord {
  const database = ensureDb();
  const existing = database
    .prepare(`SELECT * FROM participants WHERE id = ?`)
    .get(id) as ParticipantRow | undefined;
  if (!existing) {
    throw new Error(`Participant ${id} not found`);
  }

  const next: ParticipantRow = {
    ...existing,
    name: changes.name?.trim() ?? existing.name,
    base_weight: changes.baseWeight ? Math.max(1, changes.baseWeight) : existing.base_weight,
    consecutive_misses:
      typeof changes.consecutiveMisses === "number" ? Math.max(0, changes.consecutiveMisses) : existing.consecutive_misses,
    last_won_at: changes.lastWonAt ?? existing.last_won_at,
    eligible: typeof changes.eligible === "boolean" ? (changes.eligible ? 1 : 0) : existing.eligible,
    updated_at: new Date().toISOString()
  };

  database
    .prepare(`
      UPDATE participants
      SET name=@name,
          base_weight=@base_weight,
          consecutive_misses=@consecutive_misses,
          last_won_at=@last_won_at,
          eligible=@eligible,
          updated_at=@updated_at
      WHERE id=@id
    `)
    .run(next);

  return mapRow(next);
}

export function deleteParticipant(id: string) {
  ensureDb()
    .prepare(`DELETE FROM participants WHERE id = ?`)
    .run(id);
}

export function bulkSaveParticipants(participants: ParticipantRecord[]) {
  const database = ensureDb();
  const stmt = database.prepare(`
    UPDATE participants
    SET name=@name,
        base_weight=@base_weight,
        consecutive_misses=@consecutive_misses,
        last_won_at=@last_won_at,
        eligible=@eligible,
        updated_at=@updated_at
    WHERE id=@id
  `);

  const tx = database.transaction((rows: ParticipantRecord[]) => {
    for (const participant of rows) {
      stmt.run({
        id: participant.id,
        name: participant.name,
        base_weight: Math.max(1, participant.baseWeight ?? 1),
        consecutive_misses: Math.max(0, participant.consecutiveMisses ?? 0),
        last_won_at: participant.lastWonAt ?? null,
        eligible: participant.eligible === false ? 0 : 1,
        updated_at: new Date().toISOString()
      });
    }
  });

  tx(participants);
}
