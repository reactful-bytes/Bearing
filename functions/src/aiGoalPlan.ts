import { HttpsError } from "firebase-functions/v2/https";

import { EntitlementLookup, requirePremiumCaller } from "./entitlement";
import { CallableIdentityRequest } from "./security";

const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 1_000;
const MAX_MILESTONES = 6;
const MAX_STEPS = 8;

export type GoalPlanInput = {
  title: string;
  description: string;
  targetDate: string;
};

export type GoalPlanDraft = {
  promptVersion: 1;
  smartMeta: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  milestones: Array<{
    title: string;
    description: string;
  }>;
  steps: Array<{
    title: string;
    description: string;
    starter: string;
    targetDate: string;
  }>;
  timelineSummary: string;
};

export type GoalPlanRequest = CallableIdentityRequest & {
  data: unknown;
};

export type GoalPlanGenerator = (input: GoalPlanInput) => Promise<unknown>;

function requireTrimmedString(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new Error(`${field} is invalid.`);
  }

  return value.trim();
}

function requireIsoDate(value: unknown, field: string): string {
  const date = requireTrimmedString(value, field, 10);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    Number.isNaN(Date.parse(`${date}T00:00:00Z`))
  ) {
    throw new Error(`${field} is invalid.`);
  }

  return date;
}

export function parseGoalPlanInput(data: unknown): GoalPlanInput {
  if (!data || typeof data !== "object") {
    throw new HttpsError("invalid-argument", "Goal details are required.");
  }

  const input = data as Record<string, unknown>;

  try {
    return {
      title: requireTrimmedString(input.title, "title", MAX_TITLE_LENGTH),
      description:
        typeof input.description === "string"
          ? input.description.trim().slice(0, MAX_DESCRIPTION_LENGTH)
          : "",
      targetDate: requireIsoDate(input.targetDate, "targetDate"),
    };
  } catch {
    throw new HttpsError(
      "invalid-argument",
      "Provide a goal name up to 120 characters and a valid target date.",
    );
  }
}

export function validateGoalPlanDraft(
  value: unknown,
  latestTargetDate?: string,
): GoalPlanDraft {
  if (!value || typeof value !== "object") {
    throw new Error("AI goal plan is not an object.");
  }

  const draft = value as Record<string, unknown>;
  const smartMeta = draft.smartMeta as Record<string, unknown> | undefined;
  const milestones = draft.milestones;
  const steps = draft.steps;

  if (!smartMeta || !Array.isArray(milestones) || !Array.isArray(steps)) {
    throw new Error("AI goal plan is incomplete.");
  }

  if (
    milestones.length === 0 ||
    milestones.length > MAX_MILESTONES ||
    steps.length === 0 ||
    steps.length > MAX_STEPS
  ) {
    throw new Error("AI goal plan exceeds item limits.");
  }

  return {
    promptVersion: 1,
    smartMeta: {
      specific: requireTrimmedString(smartMeta.specific, "specific", 240),
      measurable: requireTrimmedString(smartMeta.measurable, "measurable", 240),
      achievable: requireTrimmedString(smartMeta.achievable, "achievable", 240),
      relevant: requireTrimmedString(smartMeta.relevant, "relevant", 240),
      timeBound: requireTrimmedString(smartMeta.timeBound, "timeBound", 240),
    },
    milestones: milestones.map((item, index) => {
      const milestone = item as Record<string, unknown>;
      return {
        title: requireTrimmedString(
          milestone.title,
          `milestone ${index + 1} title`,
          120,
        ),
        description: requireTrimmedString(
          milestone.description,
          `milestone ${index + 1} description`,
          500,
        ),
      };
    }),
    steps: steps.map((item, index) => {
      const step = item as Record<string, unknown>;
      const targetDate = requireIsoDate(
        step.targetDate,
        `step ${index + 1} targetDate`,
      );

      if (latestTargetDate && targetDate > latestTargetDate) {
        throw new Error(
          `step ${index + 1} targetDate exceeds the goal target date.`,
        );
      }

      return {
        title: requireTrimmedString(step.title, `step ${index + 1} title`, 120),
        description: requireTrimmedString(
          step.description,
          `step ${index + 1} description`,
          500,
        ),
        starter: requireTrimmedString(
          step.starter,
          `step ${index + 1} starter`,
          240,
        ),
        targetDate,
      };
    }),
    timelineSummary: requireTrimmedString(
      draft.timelineSummary,
      "timelineSummary",
      500,
    ),
  };
}

export async function generateGoalPlanDraft(
  request: GoalPlanRequest,
  generator: GoalPlanGenerator,
  entitlementLookup?: EntitlementLookup,
): Promise<GoalPlanDraft> {
  await requirePremiumCaller(request, entitlementLookup);
  const input = parseGoalPlanInput(request.data);

  try {
    return validateGoalPlanDraft(await generator(input), input.targetDate);
  } catch {
    throw new HttpsError(
      "internal",
      "A goal plan could not be generated. Try again or continue manually.",
    );
  }
}
