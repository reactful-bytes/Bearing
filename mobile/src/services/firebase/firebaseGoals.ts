import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  Unsubscribe,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import {
  CreateGoalInput,
  GoalRecord,
  GoalStatus,
  UpdateGoalInput,
} from '../../features/goals/goalTypes';
import { deriveGoalStatus, normalizeGoalTasks } from '../../features/goals/goalHelpers';
import { TaskRecord } from '../../features/tasks/taskTypes';
import { decodeTaskData } from '../../features/tasks/taskDecoder';
import { getFirebaseApp } from './firebaseApp';

let cachedDb: Firestore | null = null;

function getFirebaseFirestore(): Firestore {
  if (cachedDb) return cachedDb;
  try {
    cachedDb = getFirestore(getFirebaseApp());
    return cachedDb;
  } catch (error) {
    throw new Error('Failed to initialize Firestore.', { cause: error });
  }
}

function docToGoal(snapshot: QueryDocumentSnapshot<DocumentData>): GoalRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    userId: data.userId as string,
    title: data.title as string,
    description: data.description as string,
    smartMeta: {
      specific: (data.smartMeta?.specific as string) ?? '',
      measurable: (data.smartMeta?.measurable as string) ?? '',
      achievable: (data.smartMeta?.achievable as string) ?? '',
      relevant: (data.smartMeta?.relevant as string) ?? '',
      timeBound: (data.smartMeta?.timeBound as string) ?? '',
    },
    estimatedCompletionDate: (data.estimatedCompletionDate as Timestamp).toDate(),
    status: data.status as GoalStatus,
    isAiAssisted: Boolean(data.isAiAssisted),
    aiPlanVersion: (data.aiPlanVersion as number | null) ?? null,
    aiMilestones: Array.isArray(data.aiMilestones)
      ? data.aiMilestones.map((milestone: Record<string, unknown>) => ({
          title: typeof milestone.title === 'string' ? milestone.title : '',
          description: typeof milestone.description === 'string' ? milestone.description : '',
        }))
      : [],
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

async function getGoalTasks(userId: string, goalId: string): Promise<TaskRecord[]> {
  const db = getFirebaseFirestore();
  const tasksSnapshot = await getDocs(
    query(collection(db, 'tasks'), where('userId', '==', userId), where('goalId', '==', goalId)),
  );
  return tasksSnapshot.docs.map((snapshot) => decodeTaskData(snapshot.id, snapshot.data()));
}

export async function syncGoalRollup(userId: string, goalId: string): Promise<void> {
  const db = getFirebaseFirestore();
  const goalRef = doc(db, 'goals', goalId);
  const goalSnapshot = await getDoc(goalRef);
  if (!goalSnapshot.exists()) throw new Error('Goal not found.');

  const goalData = goalSnapshot.data();
  const tasks = normalizeGoalTasks(await getGoalTasks(userId, goalId));
  const rolledStatus = deriveGoalStatus(goalData.status as GoalStatus, tasks);
  const batch = writeBatch(db);

  tasks.forEach((task, index) => {
    if (task.order !== index) {
      batch.update(doc(db, 'tasks', task.id), { order: index, updatedAt: Timestamp.now() });
    }
  });

  batch.update(goalRef, { status: rolledStatus, updatedAt: Timestamp.now() });
  await batch.commit();
}

export function subscribeToGoals(
  userId: string,
  onNext: (goals: GoalRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const goalsQuery = query(collection(db, 'goals'), where('userId', '==', userId));
  return onSnapshot(
    goalsQuery,
    (snapshot) => onNext(snapshot.docs.map(docToGoal)),
    (firestoreError) => onError(new Error('Failed to load goals.', { cause: firestoreError })),
  );
}

export function subscribeToGoalTasks(
  userId: string,
  onNext: (tasks: TaskRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
  return onSnapshot(
    tasksQuery,
    (snapshot) => onNext(snapshot.docs.map((item) => decodeTaskData(item.id, item.data()))),
    (firestoreError) => onError(new Error('Failed to load goal tasks.', { cause: firestoreError })),
  );
}

export async function createGoal(userId: string, input: CreateGoalInput): Promise<string> {
  const db = getFirebaseFirestore();
  const now = Timestamp.now();
  const batch = writeBatch(db);
  const goalRef = doc(collection(db, 'goals'));
  const taskRefs = input.tasks.map(() => doc(collection(db, 'tasks')));

  batch.set(goalRef, {
    userId,
    title: input.title.trim(),
    description: input.description.trim(),
    smartMeta: {
      specific: input.smartMeta.specific.trim(),
      measurable: input.smartMeta.measurable.trim(),
      achievable: input.smartMeta.achievable.trim(),
      relevant: input.smartMeta.relevant.trim(),
      timeBound: input.smartMeta.timeBound.trim(),
    },
    estimatedCompletionDate: Timestamp.fromDate(input.estimatedCompletionDate),
    status: 'active',
    isAiAssisted: input.isAiAssisted,
    aiPlanVersion: input.aiPlanVersion ?? null,
    aiMilestones: (input.aiMilestones ?? []).map((milestone) => ({
      title: milestone.title.trim(),
      description: milestone.description.trim(),
    })),
    createdAt: now,
    updatedAt: now,
  });

  input.tasks.forEach((task, index) => {
    batch.set(taskRefs[index], {
      userId,
      title: task.title.trim(),
      description: task.description.trim(),
      goalId: goalRef.id,
      starter: task.starter?.trim() ?? '',
      order: index,
      dueDate: task.dueDate ? Timestamp.fromDate(task.dueDate) : null,
      scheduledStart: task.scheduledStart ? Timestamp.fromDate(task.scheduledStart) : null,
      scheduledEnd: task.scheduledEnd ? Timestamp.fromDate(task.scheduledEnd) : null,
      allDay: task.allDay ?? false,
      status: 'active',
      completionSource: null,
      completedAt: null,
      completedEventId: null,
      createdAt: now,
      updatedAt: now,
    });
  });

  await batch.commit();
  return goalRef.id;
}

export async function updateGoal(
  _userId: string,
  goalId: string,
  fields: UpdateGoalInput,
): Promise<void> {
  const db = getFirebaseFirestore();
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (fields.title !== undefined) updates.title = fields.title.trim();
  if (fields.description !== undefined) updates.description = fields.description.trim();
  if (fields.smartMeta !== undefined) {
    updates.smartMeta = {
      specific: fields.smartMeta.specific.trim(),
      measurable: fields.smartMeta.measurable.trim(),
      achievable: fields.smartMeta.achievable.trim(),
      relevant: fields.smartMeta.relevant.trim(),
      timeBound: fields.smartMeta.timeBound.trim(),
    };
  }
  if (fields.estimatedCompletionDate !== undefined) {
    updates.estimatedCompletionDate = Timestamp.fromDate(fields.estimatedCompletionDate);
  }
  if (fields.status !== undefined) updates.status = fields.status;
  await updateDoc(doc(db, 'goals', goalId), updates);
}

export async function markGoalCompleted(_userId: string, goalId: string): Promise<void> {
  const db = getFirebaseFirestore();
  await updateDoc(doc(db, 'goals', goalId), { status: 'completed', updatedAt: Timestamp.now() });
}
