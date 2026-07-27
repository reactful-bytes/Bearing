import {
  Firestore,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  Unsubscribe,
  collection,
  doc,
  getFirestore,
  onSnapshot,
  query,
  setDoc,
  where,
} from 'firebase/firestore';

import {
  CalendarConnectionProvider,
  CalendarConnectionRecord,
  ProviderCalendarRecord,
} from '../../features/calendar/calendarConnectionTypes';
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

function timestampToDate(value: Timestamp | null | undefined): Date {
  return value ? value.toDate() : new Date();
}

function dataToCalendars(data: DocumentData): ProviderCalendarRecord[] {
  const calendars = Array.isArray(data.calendars) ? data.calendars : [];

  return calendars
    .map((calendar) => ({
      id: typeof calendar?.id === 'string' ? calendar.id : '',
      label: typeof calendar?.label === 'string' ? calendar.label : 'Unnamed calendar',
      color: typeof calendar?.color === 'string' ? calendar.color : null,
      isPrimary: Boolean(calendar?.isPrimary),
      isSelected: calendar?.isSelected !== false,
    }))
    .filter((calendar) => calendar.id.length > 0);
}

function docToCalendarConnection(
  snapshot: QueryDocumentSnapshot<DocumentData>,
): CalendarConnectionRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: data.userId as string,
    provider: data.provider as CalendarConnectionProvider,
    status: (data.status as CalendarConnectionRecord['status']) ?? 'disconnected',
    accountLabel: (data.accountLabel as string | undefined) ?? '',
    calendars: dataToCalendars(data),
    syncEnabled: data.syncEnabled !== false,
    lastSyncAt: data.lastSyncAt ? timestampToDate(data.lastSyncAt as Timestamp) : null,
    lastSyncStatus: (data.lastSyncStatus as CalendarConnectionRecord['lastSyncStatus']) ?? 'never',
    lastErrorMessage: (data.lastErrorMessage as string | null | undefined) ?? null,
    createdAt: timestampToDate(data.createdAt as Timestamp | undefined),
    updatedAt: timestampToDate(data.updatedAt as Timestamp | undefined),
  };
}

export function subscribeToCalendarConnections(
  userId: string,
  onNext: (connections: CalendarConnectionRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const connectionsQuery = query(
    collection(db, 'calendarConnections'),
    where('userId', '==', userId),
  );

  return onSnapshot(
    connectionsQuery,
    (snapshot) => {
      const connections = snapshot.docs
        .map(docToCalendarConnection)
        .sort((left, right) => left.provider.localeCompare(right.provider));

      onNext(connections);
    },
    (firestoreError) => {
      onError(new Error('Failed to load calendar connections.', { cause: firestoreError }));
    },
  );
}

export async function updateCalendarConnectionCalendars(
  _userId: string,
  connectionId: string,
  calendars: ProviderCalendarRecord[],
): Promise<void> {
  const db = getFirebaseFirestore();

  await setDoc(
    doc(db, 'calendarConnections', connectionId),
    {
      calendars: calendars.map((calendar) => ({
        id: calendar.id,
        label: calendar.label,
        color: calendar.color,
        isPrimary: calendar.isPrimary,
        isSelected: calendar.isSelected,
      })),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}

export async function updateCalendarConnectionSyncEnabled(
  _userId: string,
  connectionId: string,
  syncEnabled: boolean,
): Promise<void> {
  const db = getFirebaseFirestore();

  await setDoc(
    doc(db, 'calendarConnections', connectionId),
    {
      syncEnabled,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}

export async function disconnectCalendarConnection(
  _userId: string,
  connectionId: string,
): Promise<void> {
  const db = getFirebaseFirestore();

  await setDoc(
    doc(db, 'calendarConnections', connectionId),
    {
      status: 'disconnected',
      syncEnabled: false,
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}