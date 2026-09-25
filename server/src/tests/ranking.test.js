import { describe, expect, it } from "vitest";
import { attachRankingPosition } from "../utils/ranking.js";

describe("attachRankingPosition", () => {
  it("orders by score desc, duration asc, and submission time asc", () => {
    const rows = [
      {
        userId: 1,
        fullName: "A",
        totalScore: 80,
        totalDuration: 50,
        firstSubmissionAt: "2024-01-01T10:00:00.000Z"
      },
      {
        userId: 2,
        fullName: "B",
        totalScore: 90,
        totalDuration: 100,
        firstSubmissionAt: "2024-01-01T12:00:00.000Z"
      },
      {
        userId: 3,
        fullName: "C",
        totalScore: 90,
        totalDuration: 90,
        firstSubmissionAt: "2024-01-01T09:00:00.000Z"
      }
    ];

    const ranked = attachRankingPosition(rows);

    expect(ranked.map((item) => item.userId)).toEqual([3, 2, 1]);
    expect(ranked[0].position).toBe(1);
    expect(ranked[2].position).toBe(3);
  });
});

