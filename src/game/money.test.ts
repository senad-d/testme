import { describe, expect, it } from "vitest";
import { initialState } from "./store";
import { borrowCoins, grantCoins, repayDebt, saveCoins, withdrawSavings } from "./money";

describe("money operations", () => {
  it("grants, saves, withdraws, borrows and repays atomically", () => {
    let state = grantCoins(initialState(), 50).state;
    expect(state.wallet).toBe(50);
    state = saveCoins(state, 20).state;
    expect([state.wallet, state.savings]).toEqual([30, 20]);
    state = withdrawSavings(state, 5).state;
    expect([state.wallet, state.savings]).toEqual([35, 15]);
    state = borrowCoins(state, 25).state;
    expect([state.wallet, state.debt]).toEqual([60, 25]);
    state = repayDebt(state, 10).state;
    expect([state.wallet, state.debt]).toEqual([50, 15]);
    expect(state.activities).toHaveLength(5);
  });

  it.each([0, -1, 1.5])("rejects invalid amount %s", (amount) => {
    const state = initialState();
    for (const operation of [grantCoins, saveCoins, withdrawSavings, borrowCoins, repayDebt]) {
      const result = operation(state, amount);
      expect(result.code).toBe("invalid-amount");
      expect(result.state).toBe(state);
    }
  });

  it("enforces source balances, debt limit, and repayment ceiling", () => {
    const state = { ...initialState(), wallet: 5, savings: 4, debt: 3 };
    expect(saveCoins(state, 6)).toEqual({ state, code: "insufficient-wallet" });
    expect(withdrawSavings(state, 5)).toEqual({ state, code: "insufficient-savings" });
    expect(borrowCoins({ ...state, debt: 95 }, 6).code).toBe("debt-limit-exceeded");
    expect(repayDebt(state, 4).code).toBe("repayment-exceeds-debt");
    expect(repayDebt({ ...state, wallet: 1, debt: 3 }, 2).code).toBe("insufficient-wallet");
  });
});
