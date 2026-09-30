export const GOAL_PLAN_DRAFT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["smartMeta", "milestones", "timelineSummary"],
  properties: {
    smartMeta: {
      type: "object",
      additionalProperties: false,
      required: [
        "specific",
        "measurable",
        "achievable",
        "relevant",
        "timeBound",
      ],
      properties: {
        specific: { type: "string" },
        measurable: { type: "string" },
        achievable: { type: "string" },
        relevant: { type: "string" },
        timeBound: { type: "string" },
      },
    },
    milestones: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "targetDate", "tasks"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          targetDate: { type: "string" },
          tasks: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["title", "description", "starter", "targetDate"],
              properties: {
                title: { type: "string" },
                description: { type: "string" },
                starter: { type: "string" },
                targetDate: { type: "string" },
              },
            },
          },
        },
      },
    },
    timelineSummary: { type: "string" },
  },
} as const;
