/* eslint-disable no-console */

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY!;

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

const SEED_CATEGORIES = [
  { name: 'Work', color: '#3B82F6' },
  { name: 'Personal', color: '#10B981' },
  { name: 'Learning', color: '#F59E0B' },
];

const SEED_TAGS = [
  { name: 'urgent', color: '#EF4444' },
  { name: 'low-priority', color: '#6B7280' },
  { name: 'backlog', color: '#8B5CF6' },
];

async function createFirebaseUser(email: string, password: string): Promise<string> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = (await response.json()) as {
    localId?: string;
    error?: { message: string };
  };

  if (data.error) {
    if (data.error.message === 'EMAIL_EXISTS') {
      const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`;
      const signInRes = await fetch(signInUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      });
      const signInData = (await signInRes.json()) as { localId: string };
      return signInData.localId;
    }
    throw new Error(`Firebase error: ${JSON.stringify(data.error)}`);
  }

  return data.localId!;
}

async function seed() {
  console.log('🌱 Starting seed...\n');

  console.log('Creating Firebase Auth users:');
  for (const user of SEED_USERS) {
    try {
      const firebaseUid = await createFirebaseUser(user.email, user.password);
      console.log(`  ✅ ${user.email} (uid: ${firebaseUid}, role: ${user.role})`);
      console.log('     → Run D1 INSERT to add this user to the database');
    } catch (err) {
      console.error(`  ❌ ${user.email}:`, err);
    }
  }

  console.log('\nCategories to seed via D1:');
  SEED_CATEGORIES.forEach((c) => console.log(`  - ${c.name} (${c.color})`));

  console.log('\nTags to seed via D1:');
  SEED_TAGS.forEach((t) => console.log(`  - ${t.name} (${t.color})`));

  console.log('\n🌱 Seed complete! Run D1 inserts manually.');
}

seed().catch(console.error);
