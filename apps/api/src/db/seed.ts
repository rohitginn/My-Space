import { db, sql } from '../config/db.js';
import { users } from './schema/users.js';
import { hashPassword } from '../utils/hash.js';

async function seed() {
  const passwordHash = await hashPassword('password123');

  await db
    .insert(users)
    .values({
      email: 'demo@myspace.local',
      displayName: 'Demo User',
      passwordHash,
      isVerified: true,
    })
    .onConflictDoNothing();

  await sql.end();
}

void seed();
