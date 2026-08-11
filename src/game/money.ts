import { CONFIG } from "../content/hr";
import type { AppStateV1, ResultCode } from "./store";

export interface ActionResult {
  state: AppStateV1;
  code: ResultCode;
}

function validAmount(amount: number): boolean {
  return Number.isSafeInteger(amount) && amount > 0;
}

function accepted(state: AppStateV1, code: ResultCode, changes: Partial<AppStateV1>, activity: AppStateV1["activities"][number]): ActionResult {
  return { state: { ...state, ...changes, activities: [...state.activities, activity] }, code };
}

export function grantCoins(state: AppStateV1, amount: number): ActionResult {
  if (!validAmount(amount) || !Number.isSafeInteger(state.wallet + amount)) return { state, code: "invalid-amount" };
  return accepted(state, "grant-ok", { wallet: state.wallet + amount }, { code: "coins-granted", amount });
}

export function saveCoins(state: AppStateV1, amount: number): ActionResult {
  if (!validAmount(amount)) return { state, code: "invalid-amount" };
  if (amount > state.wallet) return { state, code: "insufficient-wallet" };
  if (!Number.isSafeInteger(state.savings + amount)) return { state, code: "invalid-amount" };
  return accepted(state, "save-ok", { wallet: state.wallet - amount, savings: state.savings + amount }, { code: "coins-saved", amount });
}

export function withdrawSavings(state: AppStateV1, amount: number): ActionResult {
  if (!validAmount(amount)) return { state, code: "invalid-amount" };
  if (amount > state.savings) return { state, code: "insufficient-savings" };
  if (!Number.isSafeInteger(state.wallet + amount)) return { state, code: "invalid-amount" };
  return accepted(state, "withdraw-ok", { wallet: state.wallet + amount, savings: state.savings - amount }, { code: "savings-withdrawn", amount });
}

export function borrowCoins(state: AppStateV1, amount: number): ActionResult {
  if (!validAmount(amount)) return { state, code: "invalid-amount" };
  if (state.debt + amount > CONFIG.debtLimit) return { state, code: "debt-limit-exceeded" };
  if (!Number.isSafeInteger(state.wallet + amount)) return { state, code: "invalid-amount" };
  return accepted(state, "borrow-ok", { wallet: state.wallet + amount, debt: state.debt + amount }, { code: "coins-borrowed", amount });
}

export function repayDebt(state: AppStateV1, amount: number): ActionResult {
  if (!validAmount(amount)) return { state, code: "invalid-amount" };
  if (amount > state.debt) return { state, code: "repayment-exceeds-debt" };
  if (amount > state.wallet) return { state, code: "insufficient-wallet" };
  return accepted(state, "repay-ok", { wallet: state.wallet - amount, debt: state.debt - amount }, { code: "debt-repaid", amount });
}
