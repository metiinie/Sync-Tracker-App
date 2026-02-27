"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const node_postgres_1 = require("drizzle-orm/node-postgres");
const schema = __importStar(require("./src/db/schema"));
const DATABASE_URL = 'postgresql://neondb_owner:npg_m60etzgfAHXR@ep-plain-fog-aithzseg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=verify-full';
async function check() {
    const pool = new pg_1.Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    const db = (0, node_postgres_1.drizzle)(pool, { schema });
    try {
        const users = await db.select().from(schema.users);
        console.log(`Users count: ${users.length}`);
        const tasks = await db.select().from(schema.tasks);
        console.log(`Tasks count: ${tasks.length}`);
    }
    catch (e) {
        console.error(e);
    }
    finally {
        await pool.end();
    }
}
check();
//# sourceMappingURL=check_db.js.map