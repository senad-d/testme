import { CHORES } from "../content/hr";
import type { AppStateV1, ResultCode } from "./store";

export interface ChoreResult {
  state: AppStateV1;
  code: ResultCode;
}

export function requestChore(state: AppStateV1, choreId: string): ChoreResult {
  if (!CHORES.some((chore) => chore.id === choreId)) return { state, code: "unknown-chore" };
  if (state.choreRequests.some((request) => request.choreId === choreId && request.status === "pending")) {
    return { state, code: "chore-already-pending" };
  }
  return {
    state: {
      ...state,
      nextId: state.nextId + 1,
      choreRequests: [...state.choreRequests, { id: state.nextId, choreId, status: "pending" }],
    },
    code: "chore-request-ok",
  };
}

export function approveChore(state: AppStateV1, requestId: number): ChoreResult {
  const request = state.choreRequests.find(({ id }) => id === requestId);
  if (!request) return { state, code: "unknown-chore-request" };
  if (request.status !== "pending") return { state, code: "chore-request-already-resolved" };
  const chore = CHORES.find(({ id }) => id === request.choreId);
  if (!chore) return { state, code: "unknown-chore" };
  return {
    state: {
      ...state,
      wallet: state.wallet + chore.reward,
      choreRequests: state.choreRequests.map((entry) => entry.id === requestId ? { ...entry, status: "approved" as const } : entry),
      activities: [...state.activities, { code: "chore-reward-paid", amount: chore.reward, name: chore.name }],
    },
    code: "chore-approve-ok",
  };
}

export function returnChore(state: AppStateV1, requestId: number): ChoreResult {
  const request = state.choreRequests.find(({ id }) => id === requestId);
  if (!request) return { state, code: "unknown-chore-request" };
  if (request.status !== "pending") return { state, code: "chore-request-already-resolved" };
  return {
    state: {
      ...state,
      choreRequests: state.choreRequests.map((entry) => entry.id === requestId ? { ...entry, status: "returned" as const } : entry),
    },
    code: "chore-return-ok",
  };
}
