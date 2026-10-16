// Recall answers given offline wait in localStorage and are sent when the
// connection is back (recordRecall takes the time each was given).

import { storedGet, storedSet } from "./voice";

export interface PendingAnswer {
  key: string;
  correct: boolean;
  at: string;
}

const KEY = "nc-pending";

export function pendingAnswers(): PendingAnswer[] {
  try {
    const list = JSON.parse(storedGet(KEY) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export const savePending = (list: PendingAnswer[]) => storedSet(KEY, JSON.stringify(list.slice(-500)));

/** Send waiting answers in order; stops at the first failure and keeps the rest. */
export async function flushPending(send: (a: PendingAnswer) => Promise<unknown>): Promise<number> {
  const list = pendingAnswers();
  let sent = 0;
  for (const a of list) {
    try {
      await send(a);
      sent++;
    } catch {
      break;
    }
  }
  savePending(list.slice(sent));
  return sent;
}
