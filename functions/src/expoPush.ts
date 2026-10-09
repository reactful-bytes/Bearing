export type PushTicket =
  { status: "ok"; id: string } | { status: "error"; code: string };

export class PushTransportError extends Error {
  constructor(
    readonly retryable: boolean,
    readonly ambiguous: boolean,
    options?: ErrorOptions,
  ) {
    super("Push provider request failed.", options);
  }
}

async function request(
  path: string,
  body: unknown,
  accessToken: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(`https://exp.host/--/api/v2/push/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    throw new PushTransportError(false, true, { cause: error });
  }
  if (!response.ok) {
    throw new PushTransportError(
      response.status === 429,
      response.status >= 500,
    );
  }
  try {
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || !("data" in value)) {
      throw new Error("Push provider returned an invalid response.");
    }
    return value.data;
  } catch (error) {
    throw new PushTransportError(false, true, { cause: error });
  }
}

export function parsePushTicket(value: unknown): PushTicket {
  if (!value || typeof value !== "object")
    throw new PushTransportError(false, true);
  if (
    "status" in value &&
    value.status === "ok" &&
    "id" in value &&
    typeof value.id === "string"
  ) {
    return { status: "ok", id: value.id };
  }
  if (
    "status" in value &&
    value.status === "error" &&
    "details" in value &&
    value.details &&
    typeof value.details === "object" &&
    "error" in value.details &&
    typeof value.details.error === "string"
  ) {
    return { status: "error", code: value.details.error };
  }
  throw new PushTransportError(false, true);
}

export async function sendExpoPush(
  message: Record<string, unknown>,
  accessToken: string,
): Promise<PushTicket> {
  const data = await request("send", [message], accessToken);
  if (!Array.isArray(data) || data.length !== 1)
    throw new PushTransportError(false, true);
  return parsePushTicket(data[0]);
}

export async function readExpoReceipt(
  ticketId: string,
  accessToken: string,
): Promise<PushTicket | null> {
  const data = await request("getReceipts", { ids: [ticketId] }, accessToken);
  if (!data || typeof data !== "object")
    throw new PushTransportError(false, false);
  if (!(ticketId in data)) return null;
  const receipt = (data as Record<string, unknown>)[ticketId];
  if (
    receipt &&
    typeof receipt === "object" &&
    "status" in receipt &&
    receipt.status === "ok"
  ) {
    return { status: "ok", id: ticketId };
  }
  return parsePushTicket(receipt);
}
