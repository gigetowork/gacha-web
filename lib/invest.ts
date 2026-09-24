// Constantes EXACTEMENT copiées de bot.py (!invest) -- si tu changes une valeur d'un côté,
// change-la aussi de l'autre.
export const INVEST_DURATION_SECONDS = 60 * 60; // 1h
export const INVEST_RETURN_MIN = 0.1; // +10%
export const INVEST_RETURN_MAX = 0.2; // +20%
export const INVEST_MIN_AMOUNT = 50;
export const MAX_CONCURRENT_INVESTMENTS = 1;

export type InvestmentRow = {
  invest_id: number;
  user_id: string;
  amount: number;
  channel_id: string | null;
  start_ts: number;
  end_ts: number;
  status: "active" | "done";
  payout: number | null;
};
