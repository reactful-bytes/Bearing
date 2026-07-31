import {
  Firestore,
  Unsubscribe,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';

import { getFirebaseApp } from './firebaseApp';
import { decodeCalendarEventData } from '../../features/calendar/calendarEventDecoder';
import {
  CalendarEvent,
  CreateEventInput,
  UpdateEventInput,
} from '../../features/calendar/calendarTypes';

// ---------------------------------------------------------------------------
// Firestore instance (cached, follows pattern from firebaseAuth.ts)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Firestore → domain type conversion
// ---------------------------------------------------------------------------

export function docToCalendarEvent(snapshot: QueryDocumentSnapshot<DocumentData>): CalendarEvent {
  return decodeCalendarEventData(snapshot.id, snapshot.data());
}

function buildEventPayload(userId: string, input: CreateEventInput): Record<string, unknown> {
  const now = Timestamp.now();
  const recurrenceRule = input.recurrenceRule
    ? {
        ...input.recurrenceRule,
        endAt: input.recurrenceRule.endAt ? Timestamp.fromDate(input.recurrenceRule.endAt) : null,
      }
    : null;
  const alarms = (input.alarms ?? []).map((alarm) => ({
    absoluteAt: alarm.absoluteAt ? Timestamp.fromDate(alarm.absoluteAt) : null,
    relativeOffsetMinutes: alarm.relativeOffsetMinutes,
  }));

  return {
    userId,
    title: input.title,
    description: input.description,
    startAt: Timestamp.fromDate(input.startAt),
    endAt: Timestamp.fromDate(input.endAt),
    timezone: input.timezone,
    allDay: input.allDay ?? false,
    location: input.location ?? '',
    recurrenceRule,
    alarms,
    availability: input.availability ?? 'busy',
    url: input.url ?? null,
    goalId: input.goalId ?? null,
    stepId: input.stepId ?? null,
    status: 'scheduled',
    createdAt: now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Public service functions
// ---------------------------------------------------------------------------

/**
 * Real-time subscription to all events for a user within a date range.
 * Requires a Firestore composite index on: userId + startAt.
 *
 * @returns Unsubscribe function — call it when the consumer unmounts.
 */
export function subscribeToEventsByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date,
  onNext: (events: CalendarEvent[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, 'events'),
    where('userId', '==', userId),
    where('startAt', '>=', Timestamp.fromDate(startDate)),
    where('startAt', '<=', Timestamp.fromDate(endDate)),
    orderBy('startAt', 'asc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onNext(snapshot.docs.map(docToCalendarEvent));
    },
    (firestoreError) => {
      onError(new Error('Failed to load calendar events.', { cause: firestoreError }));
    },
  );
}

export function subscribeToEventsByStepId(
  userId: string,
  stepId: string,
  onNext: (events: CalendarEvent[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const q = query(
    collection(db, 'events'),
    where('userId', '==', userId),
    where('stepId', '==', stepId),
    orderBy('startAt', 'asc'),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onNext(snapshot.docs.map(docToCalendarEvent));
    },
    (firestoreError) => {
      onError(new Error('Failed to load linked step events.', { cause: firestoreError }));
    },
  );
}

/**
 * Create a new local calendar event for the given user.
 * @returns The Firestore document ID of the newly created event.
 */
export async function createEvent(userId: string, input: CreateEventInput): Promise<string> {
  const db = getFirebaseFirestore();
  const docRef = await addDoc(collection(db, 'events'), buildEventPayload(userId, input));

  return docRef.id;
}

export async function listUserEvents(userId: string): Promise<CalendarEvent[]> {
  const db = getFirebaseFirestore();
  const snapshot = await getDocs(query(collection(db, 'events'), where('userId', '==', userId)));

  return snapshot.docs
    .map(docToCalendarEvent)
    .sort((left, right) => left.startAt.getTime() - right.startAt.getTime());
}

/**
 * Update mutable fields of an existing event.
 * Authorization is enforced by Firestore security rules.
 */
export async function updateEvent(
  _userId: string,
  eventId: string,
  fields: UpdateEventInput,
): Promise<void> {
  const db = getFirebaseFirestore();
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };

  if (fields.title !== undefined) updates.title = fields.title;
  if (fields.description !== undefined) updates.description = fields.description;
  if (fields.startAt !== undefined) updates.startAt = Timestamp.fromDate(fields.startAt);
  if (fields.endAt !== undefined) updates.endAt = Timestamp.fromDate(fields.endAt);
  if (fields.timezone !== undefined) updates.timezone = fields.timezone;
  if (fields.allDay !== undefined) updates.allDay = fields.allDay;
  if (fields.location !== undefined) updates.location = fields.location;
  if (fields.recurrenceRule !== undefined) {
    updates.recurrenceRule = fields.recurrenceRule
      ? {
          ...fields.recurrenceRule,
          endAt: fields.recurrenceRule.endAt
            ? Timestamp.fromDate(fields.recurrenceRule.endAt)
            : null,
        }
      : null;
  }
  if (fields.alarms !== undefined) {
    updates.alarms = fields.alarms.map((alarm) => ({
      absoluteAt: alarm.absoluteAt ? Timestamp.fromDate(alarm.absoluteAt) : null,
      relativeOffsetMinutes: alarm.relativeOffsetMinutes,
    }));
  }
  if (fields.availability !== undefined) updates.availability = fields.availability;
  if (fields.url !== undefined) updates.url = fields.url;
  if (fields.status !== undefined) updates.status = fields.status;

  await updateDoc(doc(db, 'events', eventId), updates);
}

/**
 * Permanently delete an event.
 * Authorization is enforced by Firestore security rules.
 */
export async function deleteEvent(_userId: string, eventId: string): Promise<void> {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, 'events', eventId));
}
