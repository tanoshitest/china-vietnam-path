#!/usr/bin/env node
import { config } from "dotenv";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(root, ".env"))) config({ path: join(root, ".env") });

await import("./setup-supabase.mjs");
