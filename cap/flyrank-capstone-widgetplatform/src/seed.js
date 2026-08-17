require('dotenv').config();
const bcrypt = require('bcrypt');
const { db, migrate, randomUUID } = require('./db');

async function seed() {
  migrate();

  const hashA = await bcrypt.hash('password123', 10);
  const hashB = await bcrypt.hash('password456', 10);

  // Upsert tenant A
  db.prepare(`INSERT OR REPLACE INTO users (email, password_hash) VALUES (?, ?)`).run('tenant-a@example.com', hashA);
  db.prepare(`INSERT OR REPLACE INTO users (email, password_hash) VALUES (?, ?)`).run('tenant-b@example.com', hashB);

  const userA = db.prepare('SELECT id FROM users WHERE email = ?').get('tenant-a@example.com');
  const userB = db.prepare('SELECT id FROM users WHERE email = ?').get('tenant-b@example.com');

  // Widget for tenant A
  const widgetId = randomUUID();
  db.prepare(`
    INSERT OR IGNORE INTO widgets (id, user_id, name, description, type, fields, button_text)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    widgetId, userA.id,
    'Newsletter Signup', 'Sign up for our weekly newsletter', 'signup',
    JSON.stringify([
      { name: 'name',  label: 'Full Name',      type: 'text',  required: true },
      { name: 'email', label: 'Email Address',   type: 'email', required: true },
    ]),
    'Subscribe'
  );

  const w = db.prepare('SELECT id FROM widgets WHERE user_id = ?').get(userA.id);

  console.log('\n=== SEED DATA ===');
  console.log('Tenant A:', 'tenant-a@example.com', '/ password: password123');
  console.log('Tenant B:', 'tenant-b@example.com', '/ password: password456');
  console.log('Widget ID:', w.id);
  console.log('\nEmbed snippet:');
  console.log(`<script src="http://localhost:3000/widget.js?v=1.0.0" data-widget-id="${w.id}"></script>`);
  console.log('\nPaste that widget ID into test-site/index.html');
}

seed().catch(err => { console.error(err); process.exit(1); });
