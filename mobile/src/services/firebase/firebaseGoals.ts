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
  CreateGoalStepInput,
  GoalRecord,
  GoalStatus,
  GoalStepRecord,
  UpdateGoalInput,
  UpdateGoalStepInput,
} from '../../features/goals/goalTypes';
import {
  deriveGoalStatus,
  getFirstIncompleteStep,
  normalizeGoalSteps,
} from '../../features/goals/goalHelpers';
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
    nextStepId: (data.nextStepId as string | null) ?? null,
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

function docToGoalStep(snapshot: QueryDocumentSnapshot<DocumentData>): GoalStepRecord {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    userId: data.userId as string,
    goalId: data.goalId as string,
    title: data.title as string,
    description: data.description as string,
    starter: data.starter as string,
    estimatedFinishDate: data.estimatedFinishDate
      ? (data.estimatedFinishDate as Timestamp).toDate()
      : null,
    order: Number(data.order ?? 0),
    status: data.status as GoalStepRecord['status'],
    completedAt: data.completedAt ? (data.completedAt as Timestamp).toDate() : null,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

async function syncGoalRollup(userId: string, goalId: string): Promise<void> {
  const db = getFirebaseFirestore();
  const goalRef = doc(db, 'goals', goalId);
  const goalSnapshot = await getDoc(goalRef);

  if (!goalSnapshot.exists()) {
    throw new Error('Goal not found.');
  }

  const goalData = goalSnapshot.data();
  const stepsSnapshot = await getDocs(
    query(
      collection(db, 'goalSteps'),
      where('userId', '==', userId),
      where('goalId', '==', goalId),
    ),
  );
  const normalizedSteps = normalizeGoalSteps(stepsSnapshot.docs.map(docToGoalStep));
  const nextStep = getFirstIncompleteStep(normalizedSteps);
  const rolledStatus = deriveGoalStatus(goalData.status as GoalStatus, normalizedSteps);

  const batch = writeBatch(db);

  normalizedSteps.forEach((step, index) => {
    if (step.order !== index) {
      batch.update(doc(db, 'goalSteps', step.id), {
        order: index,
        updatedAt: Timestamp.now(),
      });
    }
  });

  batch.update(goalRef, {
    nextStepId: rolledStatus === 'completed' ? null : (nextStep?.id ?? null),
    status: rolledStatus,
    updatedAt: Timestamp.now(),
  });

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
    (snapshot) => {
      onNext(snapshot.docs.map(docToGoal));
    },
    (firestoreError) => {
      onError(new Error('Failed to load goals.', { cause: firestoreError }));
    },
  );
}

export function subscribeToGoalSteps(
  userId: string,
  onNext: (steps: GoalStepRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const db = getFirebaseFirestore();
  const stepsQuery = query(collection(db, 'goalSteps'), where('userId', '==', userId));

  return onSnapshot(
    stepsQuery,
    (snapshot) => {
      onNext(snapshot.docs.map(docToGoalStep));
    },
    (firestoreError) => {
      onError(new Error('Failed to load goal steps.', { cause: firestoreError }));
    },
  );
}

export async function createGoal(userId: string, input: CreateGoalInput): Promise<string> {
  const db = getFirebaseFirestore();
  const now = Timestamp.now();
  const batch = writeBatch(db);
  const goalRef = doc(collection(db, 'goals'));
  const stepRefs = input.steps.map(() => doc(collection(db, 'goalSteps')));

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
    nextStepId: stepRefs[0]?.id ?? null,
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

  input.steps.forEach((step, index) => {
    batch.set(stepRefs[index], {
      userId,
      goalId: goalRef.id,
      title: step.title.trim(),
      description: step.description.trim(),
      starter: step.starter.trim(),
      estimatedFinishDate: step.estimatedFinishDate
        ? Timestamp.fromDate(step.estimatedFinishDate)
        : null,
      order: index,
      status: 'pending',
      completedAt: null,
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
  await updateDoc(doc(db, 'goals', goalId), {
    status: 'completed',
    nextStepId: null,
    updatedAt: Timestamp.now(),
  });
}

export async function createGoalStep(
  userId: string,
  goalId: string,
  input: CreateGoalStepInput,
  order: number,
  currentGoalStatus: GoalStatus,
  currentNextStepId: string | null,
): Promise<string> {
  const db = getFirebaseFirestore();
  const now = Timestamp.now();
  const batch = writeBatch(db);
  const stepRef = doc(collection(db, 'goalSteps'));

  batch.set(stepRef, {
    userId,
    goalId,
    title: input.title.trim(),
    description: input.description.trim(),
    starter: input.starter.trim(),
    estimatedFinishDate: input.estimatedFinishDate
      ? Timestamp.fromDate(input.estimatedFinishDate)
      : null,
    order,
    status: 'pending',
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  batch.update(doc(db, 'goals', goalId), {
    nextStepId: currentNextStepId ?? stepRef.id,
    status: currentGoalStatus === 'archived' ? 'archived' : 'active',
    updatedAt: now,
  });

  await batch.commit();
  return stepRef.id;
}

export async function deleteGoalStep(
  _userId: string,
  goalId: string,
  stepId: string,
  orderedRemainingSteps: GoalStepRecord[],
  nextGoalStatus: GoalStatus,
  nextStepId: string | null,
): Promise<void> {
  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  const now = Timestamp.now();

  batch.delete(doc(db, 'goalSteps', stepId));

  orderedRemainingSteps.forEach((step, index) => {
    if (step.order !== index) {
      batch.update(doc(db, 'goalSteps', step.id), {
        order: index,
        updatedAt: now,
      });
    }
  });

  batch.update(doc(db, 'goals', goalId), {
    nextStepId,
    status: nextGoalStatus,
    updatedAt: now,
  });

  await batch.commit();
}

export async function updateGoalStep(
  _userId: string,
  goalId: string,
  stepId: string,
  fields: UpdateGoalStepInput,
): Promise<void> {
  const db = getFirebaseFirestore();
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };

  if (fields.title !== undefined) updates.title = fields.title.trim();
  if (fields.description !== undefined) updates.description = fields.description.trim();
  if (fields.starter !== undefined) updates.starter = fields.starter.trim();
  if (fields.estimatedFinishDate !== undefined) {
    updates.estimatedFinishDate = fields.estimatedFinishDate
      ? Timestamp.fromDate(fields.estimatedFinishDate)
      : null;
  }
  if (fields.order !== undefined) updates.order = fields.order;
  if (fields.status !== undefined) {
    updates.status = fields.status;
    updates.completedAt = fields.status === 'completed' ? Timestamp.now() : null;
  }

  await updateDoc(doc(db, 'goalSteps', stepId), updates);
  await syncGoalRollup(_userId, goalId);
}

export async function reorderGoalSteps(
  _userId: string,
  goalId: string,
  orderedStepIds: string[],
): Promise<void> {
  const db = getFirebaseFirestore();
  const batch = writeBatch(db);
  const now = Timestamp.now();

  orderedStepIds.forEach((stepId, index) => {
    batch.update(doc(db, 'goalSteps', stepId), {
      order: index,
      updatedAt: now,
    });
  });

  await batch.commit();
  await syncGoalRollup(_userId, goalId);
}
