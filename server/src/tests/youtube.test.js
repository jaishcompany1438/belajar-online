import { describe, expect, it } from "vitest";
import { assertYoutubeUrl, extractYoutubeVideoId } from "../utils/youtube.js";

describe("youtube utils", () => {
  it("extracts supported video ids", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(extractYoutubeVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("rejects invalid urls", () => {
    expect(assertYoutubeUrl("https://example.com/video")).toBeNull();
  });
});

