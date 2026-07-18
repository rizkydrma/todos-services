/**
 * Generate PBKDF2 password hashes + sample INSERT statements for D1.
 * Usage: bun run db:seed
 *
 * Seed users are written with `email_verified_at = datetime('now')` so local
 * admin/user can log in without OTP. This is an intentional **exception** to
 * migration B (no backfill of existing rows): only seed script inserts set
 * verified; real users and migration 0002 leave `email_verified_at` null.
 */
import { hashPassword } from '../lib/password';

const SEED_USERS = [
  {
    email: 'rizky.darmarazak@gmail.com',
    password: '23oktober99',
    name: 'Rizky Darma',
    role: 'admin' as const,
  },
  {
    email: 'rdarmarazak93@gmail.com',
    password: '23oktober99',
    name: 'Razak',
    role: 'user' as const,
  },
];

async function seed() {
  console.info('🌱 Generating password hashes for D1 seed...\n');
  console.info(
    '-- Seed exception: email_verified_at set so password login works without OTP.\n' +
      '-- Migration 0002 does NOT backfill existing users; only this seed does.\n',
  );

  for (const user of SEED_USERS) {
    const passwordHash = await hashPassword(user.password);
    console.info(`-- ${user.email} (${user.role})`);
    console.info(`-- password_hash: ${passwordHash}`);
    console.info(
      `INSERT INTO users (id, firebase_uid, email, name, role, password_hash, email_verified_at, created_at, updated_at) VALUES (`,
    );
    console.info(
      `  lower(hex(randomblob(16))), NULL, '${user.email}', '${user.name}', '${user.role}', '${passwordHash}', datetime('now'), datetime('now'), datetime('now')`,
    );
    console.info(`);\n`);
  }

  console.info('🌱 Done. Run inserts against D1 as needed.');
}

seed().catch(console.error);
