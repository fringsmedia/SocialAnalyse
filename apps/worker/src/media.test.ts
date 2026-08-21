import { describe, expect, it } from "vitest";
import { buildFrameTimestamps, parseShowinfoTimes } from "./media";

describe("parseShowinfoTimes", () => {
  it("extrahiert pts_time-Werte aus ffmpeg-showinfo-Output", () => {
    const stderr = [
      "[Parsed_showinfo_1 @ 0x55] n:   0 pts:  30720 pts_time:2.4 duration:...",
      "[Parsed_showinfo_1 @ 0x55] n:   1 pts:  76800 pts_time:6 duration:...",
      "[Parsed_showinfo_1 @ 0x55] n:   2 pts: 122880 pts_time:9.63 duration:...",
    ].join("\n");
    expect(parseShowinfoTimes(stderr)).toEqual([2.4, 6, 9.63]);
  });

  it("liefert leeres Array ohne Treffer", () => {
    expect(parseShowinfoTimes("frame=  120 fps= 30")).toEqual([]);
  });
});

describe("buildFrameTimestamps", () => {
  it("kombiniert feste Sekunden mit Szenenwechseln, max. 8", () => {
    const result = buildFrameTimestamps(30, [5.2, 9.8, 14.1, 19.7, 24.3, 28.9]);
    expect(result).toHaveLength(8);
    expect(result.slice(0, 4)).toEqual([0, 1, 2, 3]);
    expect(result).toContain(5.2);
  });

  it("dedupliziert Szenen nahe der festen Frames (< 0,5 s Abstand)", () => {
    const result = buildFrameTimestamps(30, [1.2, 3.4, 10]);
    // 1.2 kollidiert mit 1, 3.4 kollidiert mit 3 → nur 10 kommt dazu
    expect(result).toEqual([0, 1, 2, 3, 10]);
  });

  it("respektiert die Videolänge bei kurzen Clips", () => {
    const result = buildFrameTimestamps(2.5, [1.8, 5]);
    expect(result).toEqual([0, 1, 2]);
  });
});
