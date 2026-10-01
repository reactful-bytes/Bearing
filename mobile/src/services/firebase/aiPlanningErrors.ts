export function getAiPlanningErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code !== 'string') {
    return null;
  }
  return code.startsWith('functions/') ? code.slice('functions/'.length) : code;
}

export function getAiPlanningErrorDetails(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('details' in error)) {
    return null;
  }

  const details = (error as { details?: unknown }).details;
  if (!details || typeof details !== 'object') return null;

  const diagnostic = details as Record<string, unknown>;

  if (diagnostic.reason === 'goal_plan_input' && Array.isArray(diagnostic.invalidFields)) {
    const invalidFields = diagnostic.invalidFields.filter(
      (field): field is string => field === 'title' || field === 'targetDate' || field === 'input',
    );
    if (invalidFields.includes('title')) {
      return 'The goal name is missing or exceeds 120 characters. Re-enter the goal name and try again.';
    }
    if (invalidFields.includes('targetDate')) {
      return 'The target date is invalid. Choose a valid future date and try again.';
    }
    if (invalidFields.includes('input')) {
      return 'Goal details were missing. Re-enter the goal name and planning context, then try again.';
    }
  }

  if (diagnostic.provider !== 'gemini' && diagnostic.provider !== 'openai') return null;

  const status =
    typeof diagnostic.httpStatus === 'number' &&
    Number.isInteger(diagnostic.httpStatus) &&
    diagnostic.httpStatus >= 100 &&
    diagnostic.httpStatus <= 599
      ? diagnostic.httpStatus
      : null;
  const diagnosis =
    status === 429
      ? 'AI planning is busy right now. Please try again shortly.'
      : status === 500 || status === 502 || status === 503
        ? 'AI planning is temporarily unavailable. Please try again shortly.'
        : status === 504
          ? 'That took longer than expected. Please try again.'
          : 'AI planning is unavailable right now. Please try again or continue manually.';

  return diagnosis;
}
