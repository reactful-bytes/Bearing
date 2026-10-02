import {
  Firestore,
  Unsubscribe,
  Timestamp,
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
import { decodeTaskData } from '../../features/tasks/taskDecoder';
import {
  LegacyTaskCompletionSource,
  getLegacyTaskCompletionSource,
  repairLegacyTaskCompletionAtomically,
} from '../../features/tasks/taskCompletionRepair';
import { buildTaskCreateFields, buildTaskUpdateFields } from '../../features/tasks/taskPersistence';
import { reactivateTaskAtomically } from '../../features/tasks/taskReactivation';

let cachedDb: Firestore | null = null;
const taskCompletionRepairsInFlight = new Set<string>();

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

function queueLegacyTaskCompletionRepair(
  userId: string,
  taskId: string,
  source: LegacyTaskCompletionSource,
): void {
  const repairKey = `${userId}:${taskId}`;
  if (taskCompletionRepairsInFlight.has(repairKey)) return;
  taskCompletionRepairsInFlight.add(repairKey);

  const db = getFirebaseFirestore();
  void repairLegacyTaskCompletionAtomically(
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
              };
            },
            reactivateTask: (requestedTaskId, now) => {
              const timestamp = Timestamp.fromDate(now);
              firestoreTransaction.update(doc(db, 'tasks', requestedTaskId), {
                status: 'active',
                completionSource: null,
                completedAt: null,
                completedEventId: null,
                updatedAt: timestamp,
              });
            },
          }),
        ),
    },
    userId,
    taskId,
    source,
  )
    .catch(() => undefined)
    .finally(() => taskCompletionRepairsInFlight.delete(repairKey));
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
    { includeMetadataChanges: true },
    (snapshot) => {
      onNext(
        snapshot.docs.map((taskSnapshot) => {
          const data = taskSnapshot.data();
          const legacyCompletionSource = getLegacyTaskCompletionSource(
            data.status,
            data.completionSource,
          );
          if (legacyCompletionSource) {
            queueLegacyTaskCompletionRepair(userId, taskSnapshot.id, legacyCompletionSource);
          }
          return decodeTaskData(taskSnapshot.id, data);
        }),
      );
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
    ...buildTaskCreateFields(input, Timestamp.fromDate),
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
  Object.assign(updates, buildTaskUpdateFields(fields, Timestamp.fromDate));

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
    completedEventId: null,
    updatedAt: now,
  });
}

export async function reactivateTask(userId: string, taskId: string): Promise<void> {
  const db = getFirebaseFirestore();
  await reactivateTaskAtomically(
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
              };
            },
            reactivateTask: (requestedTaskId, now) => {
              firestoreTransaction.update(doc(db, 'tasks', requestedTaskId), {
                status: 'active',
                completionSource: null,
                completedAt: null,
                completedEventId: null,
                updatedAt: Timestamp.fromDate(now),
              });
            },
          }),
        ),
    },
    userId,
    taskId,
  );
}

function eventToConversionInput(eventId: string, data: DocumentData): TaskConversionEvent {
  const event = decodeCalendarEventData(eventId, data);
  return {
    userId: event.userId,
    sourceTaskId: event.sourceTaskId ?? '',
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
      milestoneId: event.milestoneId,
    },
  };
}

export async function convertTaskToEvent(
  userId: string,
  taskId: string,
  input: CreateEventInput,
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
                  sourceTaskId,
                ),
              });
            },
            updateEvent: (eventId, eventInput, now) => {
              const payload = buildEventPayload(
                userId,
                eventInput,
                createUnpublishedMetadata(),
                Timestamp.fromDate(now),
                taskId,
              );
              firestoreTransaction.update(doc(db, 'events', eventId), {
                title: payload.title,
                description: payload.description,
                startAt: payload.startAt,
                endAt: payload.endAt,
                timezone: payload.timezone,
                allDay: payload.allDay,
                location: payload.location,
                recurrenceRule: payload.recurrenceRule,
                excludedOccurrenceDates: payload.excludedOccurrenceDates,
                recurrenceOverrides: payload.recurrenceOverrides,
                alarms: payload.alarms,
                availability: payload.availability,
                url: payload.url,
                goalId: payload.goalId,
                milestoneId: payload.milestoneId,
                status: payload.status,
                updatedAt: payload.updatedAt,
              });
            },
          }),
        ),
    },
    userId,
    taskId,
    input,
  );
}

export async function deleteTask(_userId: string, taskId: string): Promise<void> {
  const db = getFirebaseFirestore();
  await deleteDoc(doc(db, 'tasks', taskId));
}
