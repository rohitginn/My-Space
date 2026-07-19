import { sql } from './src/config/db.js';

async function run() {
  try {
    console.log('Altering goals table...');
    await sql`
      ALTER TABLE goals 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'personal',
      ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#3b82f6',
      ADD COLUMN IF NOT EXISTS milestones TEXT;
    `;
    console.log('Success!');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
