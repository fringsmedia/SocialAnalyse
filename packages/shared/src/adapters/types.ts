/**
 * Adapter-Schicht: Alle externen APIs (Anthropic, Meta, Apify) laufen
 * über diese Interfaces, damit Actors und Modelle austauschbar bleiben
 * und Pipeline-Schritte mit gemockten Adaptern testbar sind.
 */

export type FetchLike = typeof fetch;

export interface NormalizedAccount {
  platform: "tiktok" | "instagram";
  external_id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  follower_count: number | null;
}

/** Einheitliche Form aller gesammelten Items (COLLECT-Phase). */
export interface NormalizedCreative {
  source: "meta_ad" | "tiktok" | "instagram";
  external_id: string;
  url: string;
  platforms: string[];
  caption: string | null;
  published_at: string | null;
  /** Remote-Thumbnail-URL; WebP-Ingestion in Storage folgt gezielt für Top-Items. */
  thumbnail_url: string | null;
  metrics: Record<string, unknown>;
  account: NormalizedAccount | null;
}

export interface OrganicCollectParams {
  hashtags: string[];
  searchQueries: string[];
  /** Seed-Account-Handles (ohne @). */
  profiles: string[];
  maxItems: number;
}

export interface OrganicSourceAdapter {
  collect(params: OrganicCollectParams): Promise<NormalizedCreative[]>;
}

export interface AdsSearchParams {
  searchTerms: string;
  countries: string[];
  maxItems: number;
  activeStatus?: "ACTIVE" | "ALL";
}

export interface AdsSourceAdapter {
  searchAds(params: AdsSearchParams): Promise<NormalizedCreative[]>;
}
