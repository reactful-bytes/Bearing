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
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  updateDoc,
  where,
} from 'firebase/firestore';

import { getFirebaseApp } from './firebaseApp';
import { buildEventPayload } from './firebaseEvents';
import { decodeCalendarEventData } from '../../features/calendar/calendarEventDecoder';
import { CreateEventInput, createUnpublishedMetadata } from '../../features/calendar/calendarTypes';
import {
  TaskConversionCompletionSource,
  TaskConversionEvent,
  TaskConversionResult,
  convertTaskToEventAtomically,
} from '../../features/tasks/taskConversionService';
import {
  CompleteTaskInput,
  CreateTaskInput,
  TaskRecord,
  UpdateTaskInput,
} from '../../features/tasks/taskTypes';

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

function docToTask(snapshot: QueryDocumentSnapshot<DocumentData>): TaskRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: data.userId as string,
    title: data.title as string,
    description: data.description as string,
    status: data.status as TaskRecord['status'],
    completionSource: (data.completionSource as TaskRecord['completionSource']) ?? null,
    completedAt: (data.completedAt as Timestamp | null)?.toDate() ?? null,
    completedEventId: (data.completedEventId as string | null) ?? null,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

export function subscribeToTasks(
  userId: string,
  onNext: (tasks: TaskRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
  );

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      onNext(snapshot.docs.map(docToTask));
    },
    (firestoreError) => {
      onError(new Error('Failed to load tasks.', { cause: firestoreError }));
    },
  );
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<string> {
  const db = getFirebaseFirestore();
  const now = Timestamp.now();

  const docRef = await addDoc(collection(db, 'tasks'), {
    userId,
    title: input.title.trim(),
    description: input.description.trim(),
    status: 'active',
    completionSource: null,
    completedAt: null,
    completedEventId: null,
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function updateTask(
  _userId: string,
  taskId: string,
  fields: UpdateTaskInput,
): Promise<void> {
  const db = getFirebaseFirestore();
  const updates: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  };

  if (fields.title !== undefined) {
    updates.title = fields.title.trim();
  }
  if (fields.description !== undefined) {
    updates.description = fields.description.trim();
  }

  await updateDoc(doc(db, 'tasks', taskId), updates);
}

export async function completeTask(
  _userId: string,
  taskId: string,
  input: CompleteTaskInput,
): Promise<void> {
  const db = getFirebaseFirestore();
  const now = Timestamp.now();

  await updateDoc(doc(db, 'tasks', taskId), {
    status: 'completed',
    completionSource: input.completionSource,
    completedAt: now,
    completedEventId: input.completedEventId ?? null,
    updatedAt: now,
  });
}

function eventToConversionInput(eventId: string, data: DocumentData): TaskConversionEvent {
  const event = decodeCalendarEventData(eventId, data);
  return {
    userId: event.userId,
    sourceTaskId: data.sourceTaskId as string,
    input: {
      title: event.title,
      description: event.description,
      startAt: event.startAt,
      endAt: event.endAt,
      timezone: event.timezone,
      allDay: event.allDay,
      location: event.location,
      recurrenceRule: event.recurrenceRule,
      alarms: event.alarms,
      availability: event.availability,
      url: event.url,
      goalId: event.goalId,
      stepId: event.stepId,
    },
  };
}

export async function convertTaskToEvent(
  userId: string,
  taskId: string,
  input: CreateEventInput,
  completionSource: TaskConversionCompletionSource,
): Promise<TaskConversionResult> {
  const db = getFirebaseFirestore();

  return convertTaskToEventAtomically(
    {
      runTransaction: (operation) =>
        runTransaction(db, async (firestoreTransaction) =>
          operation({
            getTask: async (requestedTaskId) => {
              const snapshot = await firestoreTransaction.get(doc(db, 'tasks', requestedTaskId));
              if (!snapshot.exists()) return null;
              const data = snapshot.data();
              return {
                userId: data.userId as string,
                status: data.status as TaskRecord['status'],
                completionSource: (data.completionSource as TaskRecord['completionSource']) ?? null,
                completedEventId: (data.completedEventId as string | null) ?? null,
              };
            },
            getEvent: async (eventId) => {
              const snapshot = await firestoreTransaction.get(doc(db, 'events', eventId));
              return snapshot.exists() ? eventToConversionInput(eventId, snapshot.data()) : null;
            },
            createEvent: (eventId, eventUserId, sourceTaskId, eventInput, now) => {
              firestoreTransaction.set(doc(db, 'events', eventId), {
                ...buildEventPayload(
                  eventUserId,
                  eventInput,
                  createUnpublishedMetadata(),
                  Timestamp.fromDate(now),
                ),
                sourceTaskId,
              });
            },
            completeTask: (requestedTaskId, source, eventId, now) => {
              const timestamp = Timestamp.fromDate(now);
              firestoreTransaction.update(doc(db, 'tasks', requestedTaskId), {
                status: 'completed',
                completionSource: source,
                completedAt: timestamp,
                completedEventId: eventId,
                updatedAt: timestamp,
              });
            },
          }),
        ),
    },
    userId,
    taskId,
    input,
    completionSource,
  );
}

export async function deleteTask(_userId: string, taskId: string): Promise<void> {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, 'tasks', taskId));
}
