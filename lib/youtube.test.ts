import { describe, it, expect } from "vitest";
import { getYouTubeId, getYouTubeThumbnail } from "./youtube";

describe("getYouTubeId", () => {
  it("extracts the id from a watch URL", () => {
    expect(getYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from a youtu.be short link, ignoring trailing params", () => {
    expect(getYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=AbCdEfGhIjK")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from an embed URL", () => {
    expect(getYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("extracts the id from a Shorts URL", () => {
    expect(getYouTubeId("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
  });

  it("does not mistake a playlist embed's 'videoseries' for a video id", () => {
    // "videoseries" is coincidentally 11 characters — the same length as a
    // real video id — so a naive regex would extract it as one and build a
    // broken embed URL with no list param.
    expect(getYouTubeId("https://www.youtube.com/embed/videoseries?list=PLsomePlaylistId")).toBeNull();
  });

  it("returns null for non-YouTube URLs", () => {
    expect(getYouTubeId("https://instagram.com/reel/abc123/")).toBeNull();
    expect(getYouTubeId("")).toBeNull();
  });
});

describe("getYouTubeThumbnail", () => {
  it("builds a thumbnail URL from a valid video id", () => {
    expect(getYouTubeThumbnail("https://youtu.be/dQw4w9WgXcQ")).toBe("https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  });

  it("returns null when no id can be extracted", () => {
    expect(getYouTubeThumbnail("https://www.youtube.com/embed/videoseries?list=PLsomePlaylistId")).toBeNull();
  });
});
