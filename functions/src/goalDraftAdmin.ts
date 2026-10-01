import { createHash } from "node:crypto";

import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

import type { GoalPlanCreditService } from "./aiGoalPlan";

function documentId(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function dateAtLocalNoon(value: string, timezone: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  const targetUtc = Date.UTC(year, month - 1, day, 12);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    calendar: "gregory",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let candidate = targetUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(candidate))
        .map((part) => [part.type, part.value]),
    );
    const localAsUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const difference = targetUtc - localAsUtc;
    if (difference === 0) return new Date(candidate);
    candidate += difference;
  }

  throw new Error(`Could not resolve a local date in ${timezone}.`);
}

export function createGoalPlanDraftAdminPersister(
  firestore = getFirestore(),
): GoalPlanCreditService["persistDraft"] {
  return async (userId, input, draft, requestId) => {
    const goalId = input.goalId ?? documentId(`goal:${userId}:${requestId}`);
    const goalRef = firestore.collection("goals").doc(goalId);
    const now = Timestamp.now();
    const timezone = input.timezone ?? "UTC";
    const persistedDraft = {
      ...draft,
      goalId,
      milestones: draft.milestones.map((milestone, milestoneIndex) => ({
        ...milestone,
        id: documentId(`milestone:${goalId}:${requestId}:${milestoneIndex}`),
        tasks: milestone.tasks.map((task, taskIndex) => ({
          ...task,
          id: documentId(
            `task:${goalId}:${requestId}:${milestoneIndex}:${taskIndex}`,
          ),
        })),
      })),
    };

    await firestore.runTransaction(async (transaction) => {
      const milestonesQuery = firestore
        .collection("milestones")
        .where("goalId", "==", goalId);
      const tasksQuery = firestore
        .collection("tasks")
        .where("goalId", "==", goalId);
      const [goalSnapshot, milestoneSnapshot, taskSnapshot] = await Promise.all(
        [
          transaction.get(goalRef),
          transaction.get(milestonesQuery),
          transaction.get(tasksQuery),
        ],
      );
      const existingGoal = goalSnapshot.data();

      if (
        goalSnapshot.exists &&
        (existingGoal?.userId !== userId || existingGoal.status !== "draft")
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Only an owned goal draft can receive an AI plan.",
        );
      }
      if (input.goalId && !goalSnapshot.exists) {
        throw new HttpsError("not-found", "Goal draft was not found.");
      }

      const milestoneIds = new Set(
        persistedDraft.milestones.map((milestone) => milestone.id),
      );
      const taskIds = new Set(
        persistedDraft.milestones.flatMap((milestone) =>
          milestone.tasks.map((task) => task.id),
        ),
      );
      milestoneSnapshot.docs.forEach((snapshot) => {
        if (!milestoneIds.has(snapshot.id)) transaction.delete(snapshot.ref);
      });
      taskSnapshot.docs.forEach((snapshot) => {
        if (!taskIds.has(snapshot.id)) transaction.delete(snapshot.ref);
      });

      const milestoneRefs = persistedDraft.milestones.map((milestone) =>
        firestore.collection("milestones").doc(milestone.id),
      );
      transaction.set(goalRef, {
        userId,
        title: input.title,
        description: input.description,
        smartMeta: draft.smartMeta,
        estimatedCompletionDate: Timestamp.fromDate(
          dateAtLocalNoon(input.targetDate, timezone),
        ),
        nextMilestoneId: milestoneRefs[0]?.id ?? null,
        manuallyCompletedAt: null,
        status: "draft",
        isAiAssisted: true,
        aiPlanVersion: draft.promptVersion,
        createdAt: existingGoal?.createdAt ?? now,
        updatedAt: now,
      });

      persistedDraft.milestones.forEach((milestone, milestoneIndex) => {
        const milestoneRef = milestoneRefs[milestoneIndex];
        transaction.set(milestoneRef, {
          userId,
          goalId,
          title: milestone.title,
          description: milestone.description,
          order: milestoneIndex,
          estimatedFinishDate: Timestamp.fromDate(
            dateAtLocalNoon(milestone.targetDate, timezone),
          ),
          manuallyCompletedAt: null,
          createdAt: now,
          updatedAt: now,
        });
        milestone.tasks.forEach((task) => {
          transaction.set(firestore.collection("tasks").doc(task.id), {
            userId,
            title: task.title,
            description: task.description,
            starter: task.starter,
            goalId,
            milestoneId: milestoneRef.id,
            dueDate: Timestamp.fromDate(
              dateAtLocalNoon(task.targetDate, timezone),
            ),
            scheduledStart: null,
            scheduledEnd: null,
            allDay: false,
            status: "active",
            completionSource: null,
            completedAt: null,
            completedEventId: null,
            createdAt: now,
            updatedAt: now,
          });
        });
      });
    });

    return persistedDraft;
  };
}
