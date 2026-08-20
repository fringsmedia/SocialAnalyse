import { describe, expect, it } from "vitest";
import { backoffMs, formatCompactNumber, slugify, withRetry } from "./utils";

describe("slugify", () => {
  it("wandelt Namen in URL-taugliche Slugs", () => {
    expect(slugify("Frings Media GmbH")).toBe("frings-media-gmbh");
  });

  it("behandelt deutsche Umlaute und ß", () => {
    expect(slugify("Müller & Söhne Straßenbau")).toBe(
      "mueller-soehne-strassenbau",
    );
  });

  it("entfernt führende/nachgestellte Trenner und deckelt die Länge", () => {
    expect(slugify("  --Agentur!!  ")).toBe("agentur");
    expect(slugify("a".repeat(100)).length).toBeLessThanOrEqual(60);
  });

  it("liefert leeren String für reinen Sonderzeichen-Input", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("backoffMs", () => {
  it("verdoppelt pro Versuch", () => {
    expect(backoffMs(1, 1000)).toBe(1000);
    expect(backoffMs(2, 1000)).toBe(2000);
    expect(backoffMs(3, 1000)).toBe(4000);
  });

  it("respektiert die Obergrenze", () => {
    expect(backoffMs(20, 1000, 60_000)).toBe(60_000);
  });
});

describe("formatCompactNumber", () => {
  it("zeigt Tausender voll mit Gruppierung", () => {
    expect(formatCompactNumber(1842)).toBe("1.842");
    expect(formatCompactNumber(842)).toBe("842");
  });

  it("kürzt ab einer Million kompakt", () => {
    expect(formatCompactNumber(1_200_000)).toMatch(/1,2\sMio/);
  });
});

describe("withRetry", () => {
  it("wiederholt bis zum Erfolg", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("transient");
        return "ok";
      },
      { attempts: 4, baseMs: 1 },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });

  it("wirft den letzten Fehler nach Ausschöpfung der Versuche", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls++;
          throw new Error(`fail ${calls}`);
        },
        { attempts: 3, baseMs: 1 },
      ),
    ).rejects.toThrow("fail 3");
    expect(calls).toBe(3);
  });
});
