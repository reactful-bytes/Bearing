const {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} = require('@firebase/rules-unit-testing');
const { afterAll, beforeAll, beforeEach, describe, expect, it } = require('@jest/globals');
const {
  doc,
  getDoc,
  runTransaction,
  setLogLevel,
  setDoc,
  updateDoc,
} = require('firebase/firestore');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ID = 'bearing-rules-test';
const OWNER_ID = 'owner-user';
const OTHER_ID = 'other-user';
const OWNED_COLLECTIONS = ['events', 'notes', 'goals', 'goalSteps', 'tasks'];

let testEnvironment;

setLogLevel('silent');

function firestoreFor(userId) {
  return testEnvironment.authenticatedContext(userId).firestore();
}

async function seedDocument(collectionName, documentId, data) {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), collectionName, documentId), data);
  });
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: fs.readFileSync(path.resolve(process.cwd(), '../firestore.rules'), 'utf8'),
    },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.cleanup();
});

describe('Firestore ownership rules', () => {
  it.each(OWNED_COLLECTIONS)(
    'allows owner CRUD but rejects access by another user for %s',
    async (collectionName) => {
      const ownerDb = firestoreFor(OWNER_ID);
      const otherDb = firestoreFor(OTHER_ID);
      const documentId = `${collectionName}-1`;
      const ownerRef = doc(ownerDb, collectionName, documentId);

      await assertSucceeds(setDoc(ownerRef, { userId: OWNER_ID, title: 'Owned record' }));
      await assertSucceeds(getDoc(ownerRef));
      await assertSucceeds(updateDoc(ownerRef, { title: 'Updated record' }));
      await assertFails(getDoc(doc(otherDb, collectionName, documentId)));
      await assertFails(
        setDoc(doc(otherDb, collectionName, `${collectionName}-2`), {
          userId: OWNER_ID,
          title: 'Spoofed record',
        }),
      );
    },
  );

  it.each(OWNED_COLLECTIONS)('prevents ownership transfer for %s', async (collectionName) => {
    await seedDocument(collectionName, 'owned-record', {
      userId: OWNER_ID,
      title: 'Owned record',
    });

    await assertFails(
      updateDoc(doc(firestoreFor(OWNER_ID), collectionName, 'owned-record'), {
        userId: OTHER_ID,
      }),
    );
  });

  it('allows profile preferences but prevents client entitlement escalation', async () => {
    const profileRef = doc(firestoreFor(OWNER_ID), 'users', OWNER_ID);

    await assertSucceeds(
      setDoc(profileRef, {
        displayName: 'Owner',
        premiumStatus: 'free',
        premiumSource: 'none',
      }),
    );
    await assertSucceeds(updateDoc(profileRef, { displayName: 'Updated owner' }));
    await assertFails(updateDoc(profileRef, { premiumStatus: 'premium' }));
    await assertFails(updateDoc(profileRef, { premiumSource: 'app_store' }));
  });

  it('keeps subscriptions server-owned and user-readable', async () => {
    await seedDocument('subscriptions', OWNER_ID, {
      userId: OWNER_ID,
      status: 'active',
    });

    await assertSucceeds(getDoc(doc(firestoreFor(OWNER_ID), 'subscriptions', OWNER_ID)));
    await assertFails(getDoc(doc(firestoreFor(OTHER_ID), 'subscriptions', OWNER_ID)));
    const missingSubscription = await assertSucceeds(
      getDoc(doc(firestoreFor(OTHER_ID), 'subscriptions', OTHER_ID)),
    );
    expect(missingSubscription.exists()).toBe(false);
    await assertFails(
      updateDoc(doc(firestoreFor(OWNER_ID), 'subscriptions', OWNER_ID), {
        status: 'cancelled',
      }),
    );
  });

  it('denies unauthenticated and unknown collection access', async () => {
    const unauthenticatedDb = testEnvironment.unauthenticatedContext().firestore();

    await assertFails(setDoc(doc(unauthenticatedDb, 'tasks', 'task-1'), { userId: OWNER_ID }));
    await assertFails(
      setDoc(doc(firestoreFor(OWNER_ID), 'unexpected', 'record-1'), { userId: OWNER_ID }),
    );
  });

  it('allows atomic owner task conversion without weakening ownership', async () => {
    await seedDocument('tasks', 'task-1', {
      userId: OWNER_ID,
      status: 'active',
    });
    const ownerDb = firestoreFor(OWNER_ID);

    await assertSucceeds(
      runTransaction(ownerDb, async (transaction) => {
        transaction.set(doc(ownerDb, 'events', 'task-task-1'), {
          userId: OWNER_ID,
          sourceTaskId: 'task-1',
          title: 'Converted task',
        });
        transaction.update(doc(ownerDb, 'tasks', 'task-1'), {
          status: 'completed',
          completedEventId: 'task-task-1',
        });
      }),
    );
  });
});
