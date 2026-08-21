import { z } from "zod";
import type { ApifyRunner } from "./apify";
import type {
  NormalizedCreative,
  OrganicCollectParams,
  OrganicSourceAdapter,
} from "./types";

/**
 * Instagram (Reels) über Apify-Actor (Default: apify/instagram-scraper).
 * Nur Videos werden übernommen; nur Metadaten, keine Video-Downloads.
 */

export const DEFAULT_INSTAGRAM_ACTOR = "apify/instagram-scraper";

const rawInstagramItemSchema = z.looseObject({
  id: z.union([z.string(), z.number()]).optional(),
  shortCode: z.string().optional(),
  url: z.string().optional(),
  caption: z.string().optional(),
  timestamp: z.string().optional(),
  type: z.string().optional(),
  productType: z.string().optional(),
  displayUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  videoPlayCount: z.number().optional(),
  videoViewCount: z.number().optional(),
  likesCount: z.number().optional(),
  commentsCount: z.number().optional(),
  videoDuration: z.number().optional(),
  ownerId: z.union([z.string(), z.number()]).optional(),
  ownerUsername: z.string().optional(),
  ownerFullName: z.string().optional(),
});

export function normalizeInstagramItem(
  raw: unknown,
): NormalizedCreative | null {
  const parsed = rawInstagramItemSchema.safeParse(raw);
  if (!parsed.success) return null;
  const item = parsed.data;

  const isVideo =
    item.type === "Video" || item.productType?.toLowerCase() === "clips";
  if (!isVideo) return null;

  const externalId = item.shortCode ?? (item.id ? String(item.id) : null);
  if (!externalId) return null;

  const url =
    item.url ??
    (item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : null);
  if (!url) return null;

  return {
    source: "instagram",
    external_id: externalId,
    url,
    platforms: ["instagram"],
    caption: item.caption ?? null,
    published_at: item.timestamp
      ? new Date(item.timestamp).toISOString()
      : null,
    thumbnail_url: item.displayUrl ?? null,
    metrics: {
      plays: item.videoPlayCount ?? item.videoViewCount ?? null,
      likes: item.likesCount ?? null,
      comments: item.commentsCount ?? null,
      duration_seconds: item.videoDuration ?? null,
      // Direkte Medien-URL fuer die ANALYZE-Phase (Streaming, kein Speichern)
      video_url: item.videoUrl ?? null,
    },
    account:
      item.ownerUsername || item.ownerId
        ? {
            platform: "instagram",
            external_id: String(item.ownerId ?? item.ownerUsername),
            handle: item.ownerUsername ?? null,
            display_name: item.ownerFullName ?? null,
            bio: null,
            follower_count: null,
          }
        : null,
  };
}

export function createInstagramAdapter(opts: {
  runner: ApifyRunner;
  actorId?: string;
}): OrganicSourceAdapter {
  const actorId = opts.actorId ?? DEFAULT_INSTAGRAM_ACTOR;

  return {
    async collect(params: OrganicCollectParams): Promise<NormalizedCreative[]> {
      const directUrls = [
        ...params.hashtags.map(
          (tag) => `https://www.instagram.com/explore/tags/${tag}/`,
        ),
        ...params.profiles.map(
          (handle) => `https://www.instagram.com/${handle}/`,
        ),
      ];
      if (directUrls.length === 0) return [];

      const input: Record<string, unknown> = {
        directUrls,
        resultsType: "posts",
        resultsLimit: Math.min(
          Math.max(Math.ceil(params.maxItems / directUrls.length), 10),
          200,
        ),
        addParentData: false,
      };

      const items = await opts.runner.runActor(actorId, input, {
        maxItems: params.maxItems * 2, // Nicht-Videos werden aussortiert
      });

      return items
        .map(normalizeInstagramItem)
        .filter((item): item is NormalizedCreative => item !== null)
        .slice(0, params.maxItems);
    },
  };
}
