import { describe, expect, it } from "vitest";
import { createApifyRunner } from "./apify";
import { createMetaAdLibraryAdapter, normalizeMetaAd } from "./meta-ad-library";
import { normalizeInstagramItem } from "./instagram";
import { normalizeTikTokItem } from "./tiktok";

// ---------- Fixtures (realistische Roh-Items der Quellen) ----------

const tiktokFixture = {
  id: "7301234567890",
  text: "POV: Du suchst einen Gebrauchtwagen 🚗 #autohaus",
  createTimeISO: "2026-08-01T10:00:00.000Z",
  playCount: 250000,
  diggCount: 12000,
  commentCount: 340,
  shareCount: 890,
  collectCount: 1500,
  webVideoUrl: "https://www.tiktok.com/@autohaus_mueller/video/7301234567890",
  videoMeta: { coverUrl: "https://cdn.example.com/cover.jpg", duration: 24 },
  authorMeta: {
    id: "6812345",
    name: "autohaus_mueller",
    nickName: "Autohaus Müller",
    signature: "Gebrauchtwagen aus Bayern",
    fans: 45000,
  },
};

const instagramFixture = {
  id: "312987",
  shortCode: "CxYzAb12",
  url: "https://www.instagram.com/p/CxYzAb12/",
  caption: "Neuer Deal der Woche 🔥",
  timestamp: "2026-08-05T09:30:00.000Z",
  type: "Video",
  productType: "clips",
  displayUrl: "https://cdn.example.com/reel.jpg",
  videoPlayCount: 98000,
  likesCount: 4300,
  commentsCount: 120,
  videoDuration: 31.2,
  ownerId: "998877",
  ownerUsername: "dealwoche",
  ownerFullName: "Deal der Woche",
};

const metaAdFixture = {
  id: "123456789",
  ad_snapshot_url: "https://www.facebook.com/ads/archive/render_ad/?id=123456789",
  ad_creative_bodies: ["Jetzt Probefahrt sichern – nur diese Woche!"],
  ad_creative_link_titles: ["Gebrauchtwagen-Aktion"],
  page_id: "555",
  page_name: "Autohaus Müller",
  publisher_platforms: ["facebook", "instagram"],
  ad_delivery_start_time: "2026-07-01",
  eu_total_reach: 84213,
};

// ---------- Normalisierung ----------

describe("normalizeTikTokItem", () => {
  it("mappt ein Roh-Item vollständig", () => {
    const item = normalizeTikTokItem(tiktokFixture);
    expect(item).toMatchObject({
      source: "tiktok",
      external_id: "7301234567890",
      url: tiktokFixture.webVideoUrl,
      caption: tiktokFixture.text,
      thumbnail_url: "https://cdn.example.com/cover.jpg",
    });
    expect(item?.metrics).toMatchObject({ plays: 250000, saves: 1500 });
    expect(item?.account).toMatchObject({
      platform: "tiktok",
      handle: "autohaus_mueller",
      follower_count: 45000,
    });
  });

  it("baut die URL aus Handle und ID, wenn webVideoUrl fehlt", () => {
    const { webVideoUrl: _url, ...withoutUrl } = tiktokFixture;
    const item = normalizeTikTokItem(withoutUrl);
    expect(item?.url).toBe(
      "https://www.tiktok.com/@autohaus_mueller/video/7301234567890",
    );
  });

  it("verwirft unbrauchbare Items statt zu raten", () => {
    expect(normalizeTikTokItem({ text: "ohne id" })).toBeNull();
  });
});

describe("normalizeInstagramItem", () => {
  it("mappt ein Reel vollständig", () => {
    const item = normalizeInstagramItem(instagramFixture);
    expect(item).toMatchObject({
      source: "instagram",
      external_id: "CxYzAb12",
      thumbnail_url: "https://cdn.example.com/reel.jpg",
    });
    expect(item?.metrics).toMatchObject({ plays: 98000 });
  });

  it("verwirft Nicht-Videos (Bilder, Karussells)", () => {
    expect(
      normalizeInstagramItem({
        ...instagramFixture,
        type: "Image",
        productType: "feed",
      }),
    ).toBeNull();
  });
});

describe("normalizeMetaAd", () => {
  it("mappt eine Ad inkl. EU-Reichweite und Laufzeit-Metadaten", () => {
    const item = normalizeMetaAd(metaAdFixture);
    expect(item).toMatchObject({
      source: "meta_ad",
      external_id: "123456789",
      platforms: ["facebook", "instagram"],
      caption: "Jetzt Probefahrt sichern – nur diese Woche!",
    });
    expect(item?.metrics).toMatchObject({
      eu_total_reach: 84213,
      page_name: "Autohaus Müller",
      headline: "Gebrauchtwagen-Aktion",
    });
  });

  it("verwirft Ads ohne Snapshot-URL", () => {
    const { ad_snapshot_url: _url, ...withoutUrl } = metaAdFixture;
    expect(normalizeMetaAd(withoutUrl)).toBeNull();
  });
});

// ---------- Meta Ad Library: Pagination ----------

describe("createMetaAdLibraryAdapter", () => {
  it("folgt paging.next bis maxItems erreicht ist", async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string | URL | Request) => {
      const u = String(url);
      calls.push(u);
      const page = u.includes("PAGE2")
        ? { data: [{ ...metaAdFixture, id: "3" }] }
        : {
            data: [
              { ...metaAdFixture, id: "1" },
              { ...metaAdFixture, id: "2" },
            ],
            paging: { next: "https://graph.facebook.com/next?PAGE2=1" },
          };
      return new Response(JSON.stringify(page), { status: 200 });
    }) as typeof fetch;

    const adapter = createMetaAdLibraryAdapter({
      accessToken: "test-token",
      fetchImpl,
    });
    const items = await adapter.searchAds({
      searchTerms: "autohaus",
      countries: ["DE"],
      maxItems: 3,
    });

    expect(items.map((i) => i.external_id)).toEqual(["1", "2", "3"]);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain("search_terms=autohaus");
    expect(calls[0]).toContain("access_token=test-token");
  });

  it("wirft bei API-Fehlern eine aussagekräftige Exception", async () => {
    const fetchImpl = (async () =>
      new Response("(#10) Permission denied", { status: 403 })) as typeof fetch;
    const adapter = createMetaAdLibraryAdapter({
      accessToken: "t",
      fetchImpl,
    });
    await expect(
      adapter.searchAds({ searchTerms: "x", countries: ["DE"], maxItems: 10 }),
    ).rejects.toThrow("Meta Ad Library 403");
  });
});

// ---------- Apify-Runner: Start → Poll → Dataset ----------

describe("createApifyRunner", () => {
  it("startet den Actor, pollt bis SUCCEEDED und lädt das Dataset", async () => {
    let polls = 0;
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/acts/") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            data: { id: "run1", defaultDatasetId: "ds1", status: "RUNNING" },
          }),
          { status: 201 },
        );
      }
      if (u.includes("/actor-runs/run1")) {
        polls++;
        return new Response(
          JSON.stringify({
            data: { status: polls < 2 ? "RUNNING" : "SUCCEEDED" },
          }),
          { status: 200 },
        );
      }
      if (u.includes("/datasets/ds1/items")) {
        return new Response(JSON.stringify([tiktokFixture]), { status: 200 });
      }
      throw new Error(`Unerwartete URL: ${u}`);
    }) as typeof fetch;

    const runner = createApifyRunner({
      token: "tok",
      fetchImpl,
      pollIntervalMs: 1,
    });
    const items = await runner.runActor(
      "clockworks/tiktok-scraper",
      { hashtags: ["autohaus"] },
      { maxItems: 100 },
    );

    expect(items).toHaveLength(1);
    expect(polls).toBe(2);
  });

  it("wirft bei fehlgeschlagenem Run", async () => {
    const fetchImpl = (async (url: string | URL | Request, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response(
          JSON.stringify({
            data: { id: "run2", defaultDatasetId: "ds2", status: "RUNNING" },
          }),
          { status: 201 },
        );
      }
      return new Response(
        JSON.stringify({ data: { status: "FAILED" } }),
        { status: 200 },
      );
    }) as typeof fetch;

    const runner = createApifyRunner({
      token: "tok",
      fetchImpl,
      pollIntervalMs: 1,
    });
    await expect(
      runner.runActor("a/b", {}, { maxItems: 10 }),
    ).rejects.toThrow("Status FAILED");
  });
});
