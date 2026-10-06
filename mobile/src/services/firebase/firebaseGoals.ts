import {
  DocumentData,
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
  Unsubscribe,
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  query,
  runTransaction,
  where,
  writeBatch,
} from 'firebase/firestore';

import {
  CreateGoalInput,
  CreateGoalMilestoneInput,
  GoalMilestoneRecord,
  GoalRecord,
  GoalDraftSaveInput,
  GoalDraftSaveResult,
  GoalTaskInput,
  GoalStatus,
  UpdateGoalInput,
  UpdateGoalMilestoneInput,
} from '../../features/goals/goalTypes';
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

function timestampToDate(value: unknown): Date | null {
  return value && typeof value === 'object' && 'toDate' in value
    ? (value as Timestamp).toDate()
    : null;
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
    nextMilestoneId: (data.nextMilestoneId as string | null) ?? null,
    manuallyCompletedAt: timestampToDate(data.manuallyCompletedAt),
    status: data.status as GoalStatus,
    isAiAssisted: Boolean(data.isAiAssisted),
    aiPlanVersion: (data.aiPlanVersion as number | null) ?? null,
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

function docToMilestone(snapshot: QueryDocumentSnapshot<DocumentData>): GoalMilestoneRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    userId: data.userId as string,
    goalId: data.goalId as string,
    title: data.title as string,
    description: data.description as string,
    order: Number(data.order ?? 0),
    estimatedFinishDate: timestampToDate(data.estimatedFinishDate),
    manuallyCompletedAt: timestampToDate(data.manuallyCompletedAt),
    createdAt: (data.createdAt as Timestamp).toDate(),
    updatedAt: (data.updatedAt as Timestamp).toDate(),
  };
}

export function subscribeToGoals(
  userId: string,
  onNext: (goals: GoalRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const goalsQuery = query(
    collection(getFirebaseFirestore(), 'goals'),
    where('userId', '==', userId),
  );
  return onSnapshot(
    goalsQuery,
    (snapshot) => onNext(snapshot.docs.map(docToGoal)),
    (error) => onError(new Error('Failed to load goals.', { cause: error })),
  );
}

export function subscribeToMilestones(
  userId: string,
  onNext: (milestones: GoalMilestoneRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const milestonesQuery = query(
    collection(getFirebaseFirestore(), 'milestones'),
    where('userId', '==', userId),
  );
  return onSnapshot(
    milestonesQuery,
    (snapshot) => onNext(snapshot.docs.map(docToMilestone)),
    (error) => onError(new Error('Failed to load milestones.', { cause: error })),
  );
}

function taskFields(
  userId: string,
  goalId: string,
  milestoneId: string | null,
  task: GoalTaskInput,
  now: Timestamp,
): Record<string, unknown> {
  return {
    userId,
    title: task.title.trim(),
    description: task.description.trim(),
    starter: task.starter.trim(),
    goalId,
    milestoneId,
    dueDate: task.dueDate ? Timestamp.fromDate(task.dueDate) : null,
    scheduledStart: null,
    scheduledEnd: null,
    allDay: false,
    status: 'active',
    completionSource: null,
    completedAt: null,
    completedEventId: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function createGoal(userId: string, input: CreateGoalInput): Promise<string> {
  const title = input.title.trim();
  if (!title) {
    throw new Error('Goal title is required.');
  }

  const db = getFirebaseFirestore();
  const now = Timestamp.now();
  const batch = writeBatch(db);
  const goalRef = doc(collection(db, 'goals'));
  const milestoneRefs = input.milestones.map(() => doc(collection(db, 'milestones')));

  batch.set(goalRef, {
    userId,
    title,
    description: input.description.trim(),
    smartMeta: {
      specific: input.smartMeta.specific.trim(),
      measurable: input.smartMeta.measurable.trim(),
      achievable: input.smartMeta.achievable.trim(),
      relevant: input.smartMeta.relevant.trim(),
      timeBound: input.smartMeta.timeBound.trim(),
    },
    estimatedCompletionDate: Timestamp.fromDate(input.estimatedCompletionDate),
    nextMilestoneId: milestoneRefs[0]?.id ?? null,
    manuallyCompletedAt: null,
    status: input.status ?? 'active',
    isAiAssisted: input.isAiAssisted,
    aiPlanVersion: input.aiPlanVersion ?? null,
    createdAt: now,
    updatedAt: now,
  });

  input.milestones.forEach((milestone, index) => {
    const milestoneRef = milestoneRefs[index];
    batch.set(milestoneRef, buildMilestoneFields(userId, goalRef.id, milestone, index, now));
    milestone.tasks.forEach((task) => {
      batch.set(
        doc(collection(db, 'tasks')),
        taskFields(userId, goalRef.id, milestoneRef.id, task, now),
      );
    });
  });
  (input.tasks ?? []).forEach((task) => {
    batch.set(doc(collection(db, 'tasks')), taskFields(userId, goalRef.id, null, task, now));
  });

  await batch.commit();
  return goalRef.id;
}

function buildMilestoneFields(
  userId: string,
  goalId: string,
  input: CreateGoalMilestoneInput,
  order: number,
  now: Timestamp,
): Record<string, unknown> {
  return {
    userId,
    goalId,
    title: input.title.trim(),
    description: input.description.trim(),
    order,
    estimatedFinishDate: input.estimatedFinishDate
      ? Timestamp.fromDate(input.estimatedFinishDate)
      : null,
    manuallyCompletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateGoal(
  userId: string,
  goalId: string,
  fields: UpdateGoalInput,
): Promise<void> {
  const db = getFirebaseFirestore();
  const goalRef = doc(db, 'goals', goalId);
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
  if (fields.status === 'archived') updates.status = 'archived';
  if (fields.status === 'draft') {
    updates.status = 'draft';
    updates.manuallyCompletedAt = null;
  }
  if (fields.status === 'active') {
    updates.status = 'active';
    updates.manuallyCompletedAt = null;
  }
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(goalRef);
    if (!snapshot.exists() || snapshot.data().userId !== userId) throw new Error('Goal not found.');
    transaction.update(goalRef, updates);
  });
}

export async function saveGoalDraft(
  userId: string,
  goalId: string,
  input: GoalDraftSaveInput,
): Promise<GoalDraftSaveResult> {
  const db = getFirebaseFirestore();
  const goalRef = doc(db, 'goals', goalId);
  const milestonesQuery = query(
    collection(db, 'milestones'),
    where('userId', '==', userId),
    where('goalId', '==', goalId),
  );
  const tasksQuery = query(
    collection(db, 'tasks'),
    where('userId', '==', userId),
    where('goalId', '==', goalId),
  );
  const [milestoneQuerySnapshot, taskQuerySnapshot] = await Promise.all([
    getDocs(milestonesQuery),
    getDocs(tasksQuery),
  ]);
  const title = input.title.trim();
  if (!title) throw new Error('Goal title is required.');
  const now = Timestamp.now();

  return runTransaction(db, async (transaction) => {
    const childSnapshots = await Promise.all([
      ...milestoneQuerySnapshot.docs.map((snapshot) => transaction.get(snapshot.ref)),
      ...taskQuerySnapshot.docs.map((snapshot) => transaction.get(snapshot.ref)),
    ]);
    const [goalSnapshot] = await Promise.all([transaction.get(goalRef)]);
    if (
      !goalSnapshot.exists() ||
      goalSnapshot.data().userId !== userId ||
      goalSnapshot.data().status !== 'draft'
    ) {
      throw new Error('Goal draft not found.');
    }

    const milestoneSnapshots = childSnapshots.slice(0, milestoneQuerySnapshot.size);
    const taskSnapshots = childSnapshots.slice(milestoneQuerySnapshot.size);
    const existingMilestones = new Map(
      milestoneSnapshots.map((snapshot) => [snapshot.id, snapshot]),
    );
    const existingTasks = new Map(taskSnapshots.map((snapshot) => [snapshot.id, snapshot]));
    if (
      [...milestoneSnapshots, ...taskSnapshots].some(
        (snapshot) => snapshot.data()?.userId !== userId || snapshot.data()?.goalId !== goalId,
      )
    ) {
      throw new Error('Goal draft contains an invalid linked record.');
    }
    const nextMilestoneIds = new Set<string>();
    const nextTaskIds = new Set<string>();
    const result: GoalDraftSaveResult = { milestones: [] };

    const milestoneRefs = input.milestones
      .filter((milestone) => milestone.title.trim())
      .map((milestone) => {
        const reference = milestone.id
          ? doc(db, 'milestones', milestone.id)
          : doc(collection(db, 'milestones'));
        if (milestone.id && !existingMilestones.has(milestone.id)) {
          throw new Error('Milestone does not belong to this goal draft.');
        }
        nextMilestoneIds.add(reference.id);
        return { milestone, reference };
      });

    transaction.update(goalRef, {
      title,
      description: input.description.trim(),
      smartMeta: {
        specific: input.smartMeta.specific.trim(),
        measurable: input.smartMeta.measurable.trim(),
        achievable: input.smartMeta.achievable.trim(),
        relevant: input.smartMeta.relevant.trim(),
        timeBound: input.smartMeta.timeBound.trim(),
      },
      estimatedCompletionDate: Timestamp.fromDate(input.estimatedCompletionDate),
      nextMilestoneId: milestoneRefs[0]?.reference.id ?? null,
      isAiAssisted: input.isAiAssisted,
      aiPlanVersion: input.aiPlanVersion ?? null,
      updatedAt: now,
    });

    milestoneSnapshots.forEach((snapshot) => {
      if (!nextMilestoneIds.has(snapshot.id)) transaction.delete(snapshot.ref);
    });

    milestoneRefs.forEach(({ milestone, reference }, order) => {
      const oldMilestone = existingMilestones.get(reference.id);
      const tasks = milestone.tasks.filter((task) => task.title.trim());
      const persistedTasks = tasks.map((task) => {
        const taskRef = task.id ? doc(db, 'tasks', task.id) : doc(collection(db, 'tasks'));
        if (task.id && !existingTasks.has(task.id)) {
          throw new Error('Task does not belong to this goal draft.');
        }
        nextTaskIds.add(taskRef.id);
        const oldTask = existingTasks.get(taskRef.id);
        transaction.set(taskRef, {
          ...taskFields(userId, goalId, reference.id, task, now),
          createdAt: oldTask?.data()?.createdAt ?? now,
        });
        return { clientId: task.clientId, id: taskRef.id };
      });

      transaction.set(reference, {
        userId,
        goalId,
        title: milestone.title.trim(),
        description: milestone.description.trim(),
        order,
        estimatedFinishDate: milestone.estimatedFinishDate
          ? Timestamp.fromDate(milestone.estimatedFinishDate)
          : null,
        manuallyCompletedAt: null,
        createdAt: oldMilestone?.data()?.createdAt ?? now,
        updatedAt: now,
      });
      result.milestones.push({
        clientId: milestone.clientId,
        id: reference.id,
        tasks: persistedTasks.map(({ clientId, id }) => ({ clientId, id })),
      });
    });

    taskSnapshots.forEach((snapshot) => {
      if (!nextTaskIds.has(snapshot.id)) transaction.delete(snapshot.ref);
    });

    return result;
  });
}

export async function activateGoalDraft(userId: string, goalId: string): Promise<void> {
  const db = getFirebaseFirestore();
  const goalRef = doc(db, 'goals', goalId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(goalRef);
    if (
      !snapshot.exists() ||
      snapshot.data().userId !== userId ||
      snapshot.data().status !== 'draft'
    ) {
      throw new Error('Goal draft not found.');
    }
    transaction.update(goalRef, {
      status: 'active',
      manuallyCompletedAt: null,
      updatedAt: Timestamp.now(),
    });
  });
}

export async function deleteGoal(userId: string, goalId: string): Promise<void> {
  const db = getFirebaseFirestore();
  const goalRef = doc(db, 'goals', goalId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(goalRef);
    if (!snapshot.exists() || snapshot.data().userId !== userId) {
      throw new Error('Goal not found.');
    }
  });
  const [milestoneSnapshots, goalTaskSnapshots, goalEventSnapshots] = await Promise.all([
    getDocs(
      query(
        collection(db, 'milestones'),
        where('userId', '==', userId),
        where('goalId', '==', goalId),
      ),
    ),
    getDocs(
      query(collection(db, 'tasks'), where('userId', '==', userId), where('goalId', '==', goalId)),
    ),
    getDocs(
      query(collection(db, 'events'), where('userId', '==', userId), where('goalId', '==', goalId)),
    ),
  ]);
  const milestoneIds = milestoneSnapshots.docs.map((snapshot) => snapshot.id);
  const linkedTasks = new Map(goalTaskSnapshots.docs.map((snapshot) => [snapshot.id, snapshot]));
  const linkedEvents = new Map(goalEventSnapshots.docs.map((snapshot) => [snapshot.id, snapshot]));
  const linkedNotes = new Map<string, QueryDocumentSnapshot<DocumentData>>();

  for (let index = 0; index < milestoneIds.length; index += 30) {
    const ids = milestoneIds.slice(index, index + 30);
    const [taskSnapshots, eventSnapshots, noteSnapshots] = await Promise.all([
      getDocs(
        query(
          collection(db, 'tasks'),
          where('userId', '==', userId),
          where('milestoneId', 'in', ids),
        ),
      ),
      getDocs(
        query(
          collection(db, 'events'),
          where('userId', '==', userId),
          where('milestoneId', 'in', ids),
        ),
      ),
      getDocs(
        query(
          collection(db, 'notes'),
          where('userId', '==', userId),
          where('sourceMilestoneId', 'in', ids),
        ),
      ),
    ]);
    taskSnapshots.docs.forEach((snapshot) => linkedTasks.set(snapshot.id, snapshot));
    eventSnapshots.docs.forEach((snapshot) => linkedEvents.set(snapshot.id, snapshot));
    noteSnapshots.docs.forEach((snapshot) => linkedNotes.set(snapshot.id, snapshot));
  }

  const now = Timestamp.now();
  const writes: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
  [...linkedTasks.values(), ...linkedEvents.values()].forEach((snapshot) =>
    writes.push((batch) =>
      batch.update(snapshot.ref, {
        ...(snapshot.data().goalId === goalId ? { goalId: null } : {}),
        milestoneId: null,
        updatedAt: now,
      }),
    ),
  );
  linkedNotes.forEach((snapshot) =>
    writes.push((batch) => batch.update(snapshot.ref, { sourceMilestoneId: null, updatedAt: now })),
  );
  milestoneSnapshots.docs.forEach((snapshot) => writes.push((batch) => batch.delete(snapshot.ref)));
  writes.push((batch) => batch.delete(goalRef));

  // Detach links first and delete the goal last so a failed batch can be retried.
  for (let index = 0; index < writes.length; index += 450) {
    const batch = writeBatch(db);
    writes.slice(index, index + 450).forEach((write) => write(batch));
    await batch.commit();
  }
}

export async function setGoalManuallyCompleted(
  userId: string,
  goalId: string,
  completed: boolean,
): Promise<void> {
  const db = getFirebaseFirestore();
  const goalRef = doc(db, 'goals', goalId);
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(goalRef);
    if (!snapshot.exists() || snapshot.data().userId !== userId) throw new Error('Goal not found.');
    const now = Timestamp.now();
    transaction.update(goalRef, {
      status: completed ? 'completed' : 'active',
      manuallyCompletedAt: completed ? now : null,
      updatedAt: now,
    });
  });
}

export async function createMilestone(
  userId: string,
  goalId: string,
  input: Omit<CreateGoalMilestoneInput, 'tasks' | 'estimatedFinishDate'>,
  order: number,
): Promise<string> {
  const db = getFirebaseFirestore();
  const now = Timestamp.now();
  const milestoneRef = doc(collection(db, 'milestones'));
  const goalRef = doc(db, 'goals', goalId);
  await runTransaction(db, async (transaction) => {
    const goalSnapshot = await transaction.get(goalRef);
    if (!goalSnapshot.exists() || goalSnapshot.data().userId !== userId) {
      throw new Error('Goal not found.');
    }
    transaction.set(milestoneRef, {
      userId,
      goalId,
      title: input.title.trim(),
      description: input.description.trim(),
      order,
      estimatedFinishDate: null,
      manuallyCompletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    if (!goalSnapshot.data().nextMilestoneId) {
      transaction.update(goalRef, { nextMilestoneId: milestoneRef.id, updatedAt: now });
    }
  });
  return milestoneRef.id;
}

export async function updateMilestone(
  userId: string,
  milestoneId: string,
  fields: UpdateGoalMilestoneInput,
): Promise<void> {
  const db = getFirebaseFirestore();
  const milestoneRef = doc(db, 'milestones', milestoneId);
  const updates: Record<string, unknown> = { updatedAt: Timestamp.now() };
  if (fields.title !== undefined) updates.title = fields.title.trim();
  if (fields.description !== undefined) updates.description = fields.description.trim();
  if (fields.order !== undefined) updates.order = fields.order;
  if (fields.estimatedFinishDate !== undefined) {
    updates.estimatedFinishDate = fields.estimatedFinishDate
      ? Timestamp.fromDate(fields.estimatedFinishDate)
      : null;
  }
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(milestoneRef);
    if (!snapshot.exists() || snapshot.data().userId !== userId) {
      throw new Error('Milestone not found.');
    }
    transaction.update(milestoneRef, updates);
  });
}

export async function deleteMilestone(userId: string, milestoneId: string): Promise<void> {
  const db = getFirebaseFirestore();
  const milestoneRef = doc(db, 'milestones', milestoneId);
  const milestoneSnapshot = await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(milestoneRef);
    if (!snapshot.exists() || snapshot.data().userId !== userId)
      throw new Error('Milestone not found.');
    return snapshot.data();
  });
  const [taskSnapshots, eventSnapshots, noteSnapshots, siblingSnapshots] = await Promise.all([
    getDocs(
      query(
        collection(db, 'tasks'),
        where('userId', '==', userId),
        where('milestoneId', '==', milestoneId),
      ),
    ),
    getDocs(
      query(
        collection(db, 'events'),
        where('userId', '==', userId),
        where('milestoneId', '==', milestoneId),
      ),
    ),
    getDocs(
      query(
        collection(db, 'notes'),
        where('userId', '==', userId),
        where('sourceMilestoneId', '==', milestoneId),
      ),
    ),
    getDocs(
      query(
        collection(db, 'milestones'),
        where('userId', '==', userId),
        where('goalId', '==', milestoneSnapshot.goalId),
      ),
    ),
  ]);
  const siblings = siblingSnapshots.docs
    .filter((snapshot) => snapshot.id !== milestoneId)
    .map(docToMilestone)
    .sort(
      (left, right) =>
        left.order - right.order || left.createdAt.getTime() - right.createdAt.getTime(),
    );
  const writes: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];
  taskSnapshots.docs.forEach((snapshot) =>
    writes.push((batch) =>
      batch.update(snapshot.ref, { milestoneId: null, updatedAt: Timestamp.now() }),
    ),
  );
  eventSnapshots.docs.forEach((snapshot) =>
    writes.push((batch) =>
      batch.update(snapshot.ref, { milestoneId: null, updatedAt: Timestamp.now() }),
    ),
  );
  noteSnapshots.docs.forEach((snapshot) =>
    writes.push((batch) =>
      batch.update(snapshot.ref, { sourceMilestoneId: null, updatedAt: Timestamp.now() }),
    ),
  );
  siblings.forEach((sibling, index) => {
    if (sibling.order !== index)
      writes.push((batch) =>
        batch.update(doc(db, 'milestones', sibling.id), {
          order: index,
          updatedAt: Timestamp.now(),
        }),
      );
  });
  writes.push((batch) => batch.delete(milestoneRef));
  writes.push((batch) =>
    batch.update(doc(db, 'goals', milestoneSnapshot.goalId as string), {
      nextMilestoneId: siblings[0]?.id ?? null,
      updatedAt: Timestamp.now(),
    }),
  );

  for (let index = 0; index < writes.length; index += 450) {
    const batch = writeBatch(db);
    writes.slice(index, index + 450).forEach((write) => write(batch));
    await batch.commit();
  }
}

/** @deprecated Milestone completion is derived from tasks. */
export async function setMilestoneManuallyCompleted(
  _userId: string,
  _milestoneId: string,
  _completed: boolean,
): Promise<void> {
  throw new Error('Milestone completion is automatic. Complete or uncomplete its tasks instead.');
}

export async function reorderMilestones(
  userId: string,
  goalId: string,
  orderedMilestoneIds: string[],
): Promise<void> {
  const db = getFirebaseFirestore();
  const snapshots = await getDocs(
    query(
      collection(db, 'milestones'),
      where('userId', '==', userId),
      where('goalId', '==', goalId),
    ),
  );
  const currentIds = new Set(snapshots.docs.map((snapshot) => snapshot.id));
  if (
    orderedMilestoneIds.length !== currentIds.size ||
    orderedMilestoneIds.some((id) => !currentIds.has(id))
  ) {
    throw new Error('Milestone order does not match this goal.');
  }
  const batch = writeBatch(db);
  const now = Timestamp.now();
  orderedMilestoneIds.forEach((milestoneId, index) => {
    batch.update(doc(db, 'milestones', milestoneId), { order: index, updatedAt: now });
  });
  batch.update(doc(db, 'goals', goalId), {
    nextMilestoneId: orderedMilestoneIds[0] ?? null,
    updatedAt: now,
  });
  await batch.commit();
}
