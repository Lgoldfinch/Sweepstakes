import type { DrawResponse, PresetsResponse, Sweepstake } from "./types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface CreatePayload {
  name: string;
  category: string;
  drawMode: string;
  stake?: number;
  payoutSplit?: unknown;
  allowSpare?: boolean;
  entrants: { name: string; paid?: boolean }[];
  options: { label: string; alias?: string }[];
  sidePrizes: { name: string; note?: string }[];
}

export const api = {
  getPresets: () => request<PresetsResponse>("/presets"),

  createSweepstake: (payload: CreatePayload) =>
    request<Sweepstake>("/sweepstakes", { method: "POST", body: JSON.stringify(payload) }),

  getSweepstake: (id: string) => request<Sweepstake>(`/sweepstakes/${id}`),

  updateSweepstake: (id: string, payload: Partial<CreatePayload>) =>
    request<Sweepstake>(`/sweepstakes/${id}`, { method: "PUT", body: JSON.stringify(payload) }),

  draw: (id: string) => request<DrawResponse>(`/sweepstakes/${id}/draw`, { method: "POST" }),

  reset: (id: string) => request<Sweepstake>(`/sweepstakes/${id}/reset`, { method: "POST" }),

  setSidePrizeWinner: (id: string, prizeId: string, winnerEntrantId: string | null, note?: string) =>
    request<Sweepstake>(`/sweepstakes/${id}/side-prizes/${prizeId}`, {
      method: "PUT",
      body: JSON.stringify({ winnerEntrantId, note }),
    }),
};
