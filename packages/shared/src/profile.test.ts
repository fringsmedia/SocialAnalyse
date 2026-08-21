import { describe, expect, it } from "vitest";
import {
  generatedProfileSchema,
  industryProfileSchema,
  normalizeHashtag,
  toStoredProfile,
} from "./profile";

const validGenerated = {
  keywords_de: ["autohaus", "gebrauchtwagen kaufen"],
  keywords_en: ["used cars"],
  synonyms: ["gebrauchte autos"],
  hashtags: ["#Autokauf", "gebrauchtwagen", "# auto haus "],
  seed_accounts: [{ platform: "tiktok", handle: "autohaus_mueller" }],
  adjacent_industries: ["Autovermietung", "Kfz-Werkstatt"],
  exclusions: ["autokino"],
  offer_forms: ["Probefahrt", "Finanzierung"],
  region_default: "DE",
};

describe("generatedProfileSchema", () => {
  it("akzeptiert vollständigen LLM-Output", () => {
    expect(generatedProfileSchema.parse(validGenerated)).toBeTruthy();
  });

  it("lehnt fehlende Felder ab", () => {
    const { hashtags: _hashtags, ...incomplete } = validGenerated;
    expect(generatedProfileSchema.safeParse(incomplete).success).toBe(false);
  });

  it("lehnt unbekannte Plattformen bei Seed-Accounts ab", () => {
    const invalid = {
      ...validGenerated,
      seed_accounts: [{ platform: "youtube", handle: "x" }],
    };
    expect(generatedProfileSchema.safeParse(invalid).success).toBe(false);
  });
});

describe("normalizeHashtag", () => {
  it("entfernt #, Leerzeichen und normalisiert auf Kleinschreibung", () => {
    expect(normalizeHashtag("#Autokauf")).toBe("autokauf");
    expect(normalizeHashtag("# auto haus ")).toBe("autohaus");
    expect(normalizeHashtag("##Deal")).toBe("deal");
  });
});

describe("toStoredProfile", () => {
  it("aktiviert Nachbarbranchen initial und normalisiert Hashtags", () => {
    const stored = toStoredProfile(generatedProfileSchema.parse(validGenerated));
    expect(stored.adjacent_industries).toEqual([
      { name: "Autovermietung", enabled: true },
      { name: "Kfz-Werkstatt", enabled: true },
    ]);
    expect(stored.hashtags).toEqual(["autokauf", "gebrauchtwagen", "autohaus"]);
  });
});

describe("industryProfileSchema", () => {
  it("füllt fehlende Felder mit Defaults (robuste gespeicherte Form)", () => {
    const parsed = industryProfileSchema.parse({});
    expect(parsed.keywords_de).toEqual([]);
    expect(parsed.region_default).toBe("DE");
  });
});
