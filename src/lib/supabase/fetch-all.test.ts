import { describe, expect, it } from "vitest";
import { fetchAll } from "./fetch-all";

const table = Array.from({ length: 2500 }, (_, i) => i);
const pager = (rows: number[]) => async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null });

describe("fetchAll", () => {
  it("reads every page past the row cap", async () => {
    expect(await fetchAll(pager(table))).toEqual(table);
  });

  it("stops after an exactly full last page", async () => {
    const calls: number[] = [];
    const rows = table.slice(0, 2000);
    const result = await fetchAll(async (from, to) => (calls.push(from), { data: rows.slice(from, to + 1), error: null }));
    expect(result).toHaveLength(2000);
    expect(calls).toEqual([0, 1000, 2000]);
  });

  it("surfaces errors instead of returning partial data", async () => {
    await expect(fetchAll(async () => ({ data: null, error: { message: "boom" } }))).rejects.toThrow("boom");
  });
});
