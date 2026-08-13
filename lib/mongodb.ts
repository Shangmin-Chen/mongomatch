import { MongoClient, Db } from "mongodb";
import fs from "fs";
import path from "path";

function getMongoUri(): string {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }
  // Try reading from .env in root if running in script context
  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [k, ...v] = trimmed.split("=");
          const key = k.trim();
          let val = v.join("=").trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (key === "MONGODB_URI") return val;
        }
      }
    }
  } catch (e) {
    // ignore
  }
  throw new Error("Missing MONGODB_URI environment variable");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getDb(): Promise<Db> {
  if (!globalThis._mongoClientPromise) {
    const uri = getMongoUri();
    const client = new MongoClient(uri);
    globalThis._mongoClientPromise = client.connect();
  }
  const c = await globalThis._mongoClientPromise;
  const dbName = process.env.MONGODB_DB_NAME || "mongomatch";
  return c.db(dbName);
}

export default getDb;
