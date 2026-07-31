import {
  Firestore,
  Timestamp,
  DocumentData,
  DocumentSnapshot,
  Unsubscribe,
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { User } from 'firebase/auth';

import {
  DEFAULT_REMINDER_SOUND_ID,
  DEFAULT_TIMER_SOUND_ID,
} from '../../features/profile/profileSounds';
import { UpdateUserProfileInput, UserProfileRecord } from '../../features/profile/profileTypes';
import { getFirebaseApp } from './firebaseApp';

let cachedDb: Firestore | null = null;

function getFirebaseFirestore(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    cachedDb = getFirestore(getFirebaseApp());
    return cachedDb;
  } catch (error) {
    throw new Error('Failed to initialize Firestore.', { cause: error });
  }
}

function getLocaleDefaults(): { locale: string; timezone: string } {
  const resolved = Intl.DateTimeFormat().resolvedOptions();

  return {
    locale: resolved.locale || 'en-US',
    timezone: resolved.timeZone || 'UTC',
  };
}

function timestampToDate(value: Timestamp | null | undefined): Date {
  return value ? value.toDate() : new Date();
}

function docToUserProfile(snapshot: DocumentSnapshot<DocumentData>): UserProfileRecord {
  const data = snapshot.data();

  if (!data) {
    throw new Error('User profile document was not found.');
  }

  return {
    userId: snapshot.id,
    displayName: (data.displayName as string | undefined) ?? '',
    email: (data.email as string | undefined) ?? '',
    timezone: (data.timezone as string | undefined) ?? 'UTC',
    locale: (data.locale as string | undefined) ?? 'en-US',
    premiumStatus: (data.premiumStatus as UserProfileRecord['premiumStatus'] | undefined) ?? 'free',
    premiumSource: (data.premiumSource as UserProfileRecord['premiumSource'] | undefined) ?? 'none',
    tipsEnabled: data.tipsEnabled !== false,
    reminderSoundId: (data.reminderSoundId as string | undefined) ?? DEFAULT_REMINDER_SOUND_ID,
    alarmSoundId: (data.alarmSoundId as string | undefined) ?? DEFAULT_TIMER_SOUND_ID,
    createdAt: timestampToDate(data.createdAt as Timestamp | undefined),
    updatedAt: timestampToDate(data.updatedAt as Timestamp | undefined),
  };
}

export async function ensureUserProfile(user: User): Promise<void> {
  const db = getFirebaseFirestore();
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);
  const { locale, timezone } = getLocaleDefaults();
  const nextDisplayName = user.displayName?.trim() ?? '';
  const nextEmail = user.email?.trim() ?? '';

  if (!snapshot.exists()) {
    const now = Timestamp.now();

    await setDoc(userRef, {
      displayName: nextDisplayName,
      email: nextEmail,
      timezone,
      locale,
      premiumStatus: 'free',
      premiumSource: 'none',
      tipsEnabled: true,
      reminderSoundId: DEFAULT_REMINDER_SOUND_ID,
      alarmSoundId: DEFAULT_TIMER_SOUND_ID,
      createdAt: now,
      updatedAt: now,
    });

    return;
  }

  const data = snapshot.data();
  const updates: Record<string, unknown> = {};

  if ((data.displayName as string | undefined) !== nextDisplayName && nextDisplayName) {
    updates.displayName = nextDisplayName;
  }

  if ((data.email as string | undefined) !== nextEmail) {
    updates.email = nextEmail;
  }

  if (!(data.timezone as string | undefined)) {
    updates.timezone = timezone;
  }

  if (!(data.locale as string | undefined)) {
    updates.locale = locale;
  }

  if (!(data.premiumStatus as string | undefined)) {
    updates.premiumStatus = 'free';
  }

  if (!(data.premiumSource as string | undefined)) {
    updates.premiumSource = 'none';
  }

  if (typeof data.tipsEnabled !== 'boolean') {
    updates.tipsEnabled = true;
  }

  if (!(data.reminderSoundId as string | undefined)) {
    updates.reminderSoundId = DEFAULT_REMINDER_SOUND_ID;
  }

  if (!(data.alarmSoundId as string | undefined)) {
    updates.alarmSoundId = DEFAULT_TIMER_SOUND_ID;
  }

  if (Object.keys(updates).length > 0) {
    await setDoc(
      userRef,
      {
        ...updates,
        updatedAt: Timestamp.now(),
      },
      { merge: true },
    );
  }
}

export function subscribeToUserProfile(
  userId: string,
  onNext: (profile: UserProfileRecord | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();

  return onSnapshot(
    doc(db, 'users', userId),
    (snapshot) => {
      onNext(snapshot.exists() ? docToUserProfile(snapshot) : null);
    },
    (firestoreError) => {
      onError(new Error('Failed to load user profile.', { cause: firestoreError }));
    },
  );
}

export async function updateUserProfile(
  userId: string,
  fields: UpdateUserProfileInput,
): Promise<void> {
  const db = getFirebaseFirestore();
  const updates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (fields.displayName !== undefined) {
    updates.displayName = fields.displayName.trim();
  }

  if (fields.timezone !== undefined) {
    updates.timezone = fields.timezone.trim();
  }

  if (fields.locale !== undefined) {
    updates.locale = fields.locale.trim();
  }

  if (fields.tipsEnabled !== undefined) {
    updates.tipsEnabled = fields.tipsEnabled;
  }

  if (fields.reminderSoundId !== undefined) {
    updates.reminderSoundId = fields.reminderSoundId;
  }

  if (fields.alarmSoundId !== undefined) {
    updates.alarmSoundId = fields.alarmSoundId;
  }

  await setDoc(doc(db, 'users', userId), updates, { merge: true });
}
