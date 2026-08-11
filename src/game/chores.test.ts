import { describe, expect, it } from "vitest";
import { initialState } from "./store";
import { approveChore, requestChore, returnChore } from "./chores";

describe("chores", () => {
  it("requires parent approval before paying the exact reward", () => {
    const requested = requestChore(initialState(), "tidy-toys");
    expect(requested.state.wallet).toBe(0);
    expect(requested.state.choreRequests[0].status).toBe("pending");
    const approved = approveChore(requested.state, requested.state.choreRequests[0].id);
    expect(approved.state.wallet).toBe(8);
    expect(approved.state.activities.at(-1)).toEqual({ code: "chore-reward-paid", amount: 8, name: "Pospremi igračke" });
  });

  it("returns work without payment and permits a later request", () => {
    const first = requestChore(initialState(), "make-bed").state;
    const returned = returnChore(first, first.choreRequests[0].id).state;
    expect(returned.wallet).toBe(0);
    expect(requestChore(returned, "make-bed").code).toBe("chore-request-ok");
  });

  it("prevents parallel requests and duplicate resolution", () => {
    const requested = requestChore(initialState(), "water-plants").state;
    expect(requestChore(requested, "water-plants").code).toBe("chore-already-pending");
    const id = requested.choreRequests[0].id;
    const paid = approveChore(requested, id).state;
    const duplicate = approveChore(paid, id);
    expect(duplicate.code).toBe("chore-request-already-resolved");
    expect(duplicate.state).toBe(paid);
    expect(approveChore(paid, 999).code).toBe("unknown-chore-request");
    expect(requestChore(paid, "missing").code).toBe("unknown-chore");
  });
});
