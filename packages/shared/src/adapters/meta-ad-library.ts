import { z } from "zod";
import type {
  AdsSearchParams,
  AdsSourceAdapter,
  FetchLike,
  NormalizedCreative,
} from "./types";

/**
 * Meta Ad Library API (offiziell, Graph API `ads_archive`).
 * Liefert nur Metadaten – keine Medien-Downloads. `ad_snapshot_url`
 * verlinkt das Original-Creative in der Ad Library.
 */

const DEFAULT_GRAPH_VERSION = "v23.0";

const AD_FIELDS = [
  "id",
  "ad_snapshot_url",
  "ad_creative_bodies",
  "ad_creative_link_titles",
  "ad_creative_link_captions",
  "ad_creative_link_descriptions",
  "page_id",
  "page_name",
  "publisher_platforms",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "eu_total_reach",
  "languages",
].join(",");

const rawAdSchema = z.looseObject({
  id: z.string(),
  ad_snapshot_url: z.string().optional(),
  ad_creative_bodies: z.array(z.string()).optional(),
  ad_creative_link_titles: z.array(z.string()).optional(),
  ad_creative_link_captions: z.array(z.string()).optional(),
  ad_creative_link_descriptions: z.array(z.string()).optional(),
  page_id: z.string().optional(),
  page_name: z.string().optional(),
  publisher_platforms: z.array(z.string()).optional(),
  ad_delivery_start_time: z.string().optional(),
  ad_delivery_stop_time: z.string().optional(),
  eu_total_reach: z.union([z.number(), z.string()]).optional(),
  languages: z.array(z.string()).optional(),
});

const responseSchema = z.looseObject({
  data: z.array(z.unknown()),
  paging: z
    .looseObject({ next: z.string().optional() })
    .optional(),
});

/** Ein Roh-Item der Ad Library → einheitliche Creative-Form. */
export function normalizeMetaAd(raw: unknown): NormalizedCreative | null {
  const parsed = rawAdSchema.safeParse(raw);
  if (!parsed.success) return null;
  const ad = parsed.data;
  if (!ad.ad_snapshot_url) return null;

  const euReach =
    typeof ad.eu_total_reach === "string"
      ? Number.parseInt(ad.eu_total_reach, 10) || null
      : (ad.eu_total_reach ?? null);

  return {
    source: "meta_ad",
    external_id: ad.id,
    url: ad.ad_snapshot_url,
    platforms: ad.publisher_platforms ?? [],
    caption: ad.ad_creative_bodies?.[0] ?? null,
    published_at: ad.ad_delivery_start_time
      ? new Date(ad.ad_delivery_start_time).toISOString()
      : null,
    thumbnail_url: null,
    metrics: {
      headline: ad.ad_creative_link_titles?.[0] ?? null,
      link_caption: ad.ad_creative_link_captions?.[0] ?? null,
      link_description: ad.ad_creative_link_descriptions?.[0] ?? null,
      page_id: ad.page_id ?? null,
      page_name: ad.page_name ?? null,
      delivery_start: ad.ad_delivery_start_time ?? null,
      delivery_stop: ad.ad_delivery_stop_time ?? null,
      eu_total_reach: euReach,
      languages: ad.languages ?? [],
    },
    account: null,
  };
}

export function createMetaAdLibraryAdapter(opts: {
  accessToken: string;
  fetchImpl?: FetchLike;
  graphVersion?: string;
}): AdsSourceAdapter {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const version = opts.graphVersion ?? DEFAULT_GRAPH_VERSION;

  return {
    async searchAds(params: AdsSearchParams): Promise<NormalizedCreative[]> {
      const results: NormalizedCreative[] = [];
      const initial = new URL(
        `https://graph.facebook.com/${version}/ads_archive`,
      );
      initial.searchParams.set("search_terms", params.searchTerms);
      initial.searchParams.set(
        "ad_reached_countries",
        JSON.stringify(params.countries),
      );
      initial.searchParams.set(
        "ad_active_status",
        params.activeStatus ?? "ACTIVE",
      );
      initial.searchParams.set("ad_type", "ALL");
      initial.searchParams.set("fields", AD_FIELDS);
      initial.searchParams.set(
        "limit",
        String(Math.min(params.maxItems, 100)),
      );
      initial.searchParams.set("access_token", opts.accessToken);

      let nextUrl: string | null = initial.toString();

      while (nextUrl && results.length < params.maxItems) {
        const response = await fetchImpl(nextUrl);
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          throw new Error(
            `Meta Ad Library ${response.status}: ${body.slice(0, 300)}`,
          );
        }
        const json = responseSchema.parse(await response.json());
        for (const raw of json.data) {
          const normalized = normalizeMetaAd(raw);
          if (normalized) results.push(normalized);
          if (results.length >= params.maxItems) break;
        }
        nextUrl = json.paging?.next ?? null;
      }

      return results;
    },
  };
}
