import { Pool, neonConfig } from "@neondatabase/serverless";
import { migrate } from "./schema.js";
import { seedIfEmpty } from "./seed.js";

neonConfig.webSocketConstructor = globalThis.WebSocket;

let appPool;
let directPool;
let ready;

function requireUrl(name) {
  const url = process.env[name];
  if (!url) {
    const error = new Error(`Задайте ${name} — строку подключения Neon`);
    error.status = 500;
    throw error;
  }
  return url;
}

function pooledUrl() {
  return process.env.DATABASE_URL || requireUrl("DATABASE_URL_UNPOOLED");
}

function directUrl() {
  return process.env.DATABASE_URL_UNPOOLED || requireUrl("DATABASE_URL");
}

function poolFor(direct) {
  if (direct) {
    if (!directPool) {
      directPool = new Pool({ connectionString: directUrl() });
    }
    return directPool;
  }
  if (!appPool) {
    appPool = new Pool({ connectionString: pooledUrl() });
  }
  return appPool;
}

export function getPool() {
  return poolFor(false);
}

function bind(client) {
  return {
    async all(text, params = []) {
      const result = await client.query(text, params);
      return result.rows;
    },
    async get(text, params = []) {
      const result = await client.query(text, params);
      return result.rows[0] ?? null;
    },
    async run(text, params = []) {
      return client.query(text, params);
    },
    async exec(text) {
      await client.query(text);
    },
  };
}

async function ensureReady() {
  if (!ready) {
    ready = (async () => {
      const client = await poolFor(true).connect();
      const db = bind(client);
      try {
        await migrate(db);
        await seedIfEmpty(db);
      } finally {
        client.release();
      }
    })().catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

export async function withDb(work) {
  await ensureReady();
  const client = await getPool().connect();
  try {
    return await work(bind(client));
  } finally {
    client.release();
  }
}

export async function withTransaction(work) {
  await ensureReady();
  const client = await poolFor(true).connect();
  const db = bind(client);
  try {
    await client.query("BEGIN");
    const result = await work(db);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Транзакция уже закрыта.
    }
    throw error;
  } finally {
    client.release();
  }
}
