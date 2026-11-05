// Creates the first owner account, or resets its password.
// Usage: npm run admin:create -- "Full Name" name@company.com
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const [name, email] = process.argv.slice(2);
if (!name || !email) {
  console.error('Usage: npm run admin:create -- "Full Name" name@company.com');
  process.exit(1);
}

const password = crypto.randomBytes(12).toString("base64url");
const salt = crypto.randomBytes(16);
const hash = `scrypt$${salt.toString("hex")}$${crypto.scryptSync(password, salt, 64).toString("hex")}`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
await client.query(
  `insert into admin_users (name, email, role, status, password_hash) values ($1, $2, 'owner', 'active', $3)
   on conflict (lower(email)) do update set password_hash = $3, status = 'active', failed_attempts = 0, locked_until = null`,
  [name, email, hash],
);
await client.end();

// Written to a private file so the password does not end up in shell history or logs.
const file = path.join(process.cwd(), "data", "first-admin.txt");
fs.mkdirSync(path.dirname(file), { recursive: true });
fs.writeFileSync(file, `${email}\n${password}\n`, { mode: 0o600 });
console.log(`Owner ready: ${email}. Password is in ${file}. Delete that file after you sign in and change it.`);
