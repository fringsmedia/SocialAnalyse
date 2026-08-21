import { z } from "zod";
import type { ApifyRunner } from "./apify";
import type {
  NormalizedCreative,
  OrganicCollectParams,
  OrganicSourceAdapter,
} from "./types";

/**
 * TikTok über Apify-Actor (Default: clockworks/tiktok-scraper).
 * Nur URLs, Captions, Cover-Bilder, Metriken, Account-Metadaten.
 */

export const DEFAULT_TIKTOK_ACTOR = "clockworks/tiktok-scraper";

const rawTikTokItemSchema = z.looseObject({
  id: z.union([z.string(), z.number()]),
  webVideoUrl: z.string().optional(),
  text: z.string().optional(),
  createTimeISO: z.string().optional(),
  createTime: z.number().optional(),
  playCount: z.number().optional(),
  diggCount: z.number().optional(),
  commentCount: z.number().optional(),
  shareCount: z.number().optional(),
  collectCount: z.number().optional(),
  videoMeta: z
    .looseObject({
      coverUrl: z.string().optional(),
      duration: z.number().optional(),
      downloadAddr: z.string().optional(),
    })
    .optional(),
  covers: z.array(z.string()).optional(),
  mediaUrls: z.array(z.string()).optional(),
  authorMeta: z
    .looseObject({
      id: z.union([z.string(), z.number()]).optional(),
      name: z.string().optional(),
      nickName: z.string().optional(),
      signature: z.string().optional(),
      fans: z.number().optional(),
    })
    .optional(),
});

export function normalizeTikTokItem(raw: unknown): NormalizedCreative | null {
  const parsed = rawTikTokItemSchema.safeParse(raw);
  if (!parsed.success) return null;
  const item = parsed.data;

  const externalId = String(item.id);
  const handle = item.authorMeta?.name ?? null;
  const url =
    item.webVideoUrl ??
    (handle ? `https://www.tiktok.com/@${handle}/video/${externalId}` : null);
  if (!url) return null;

  const publishedAt = item.createTimeISO
    ? new Date(item.createTimeISO).toISOString()
    : item.createTime
      ? new Date(item.createTime * 1000).toISOString()
      : null;

  return {
    source: "tiktok",
    external_id: externalId,
    url,
    platforms: ["tiktok"],
    caption: item.text ?? null,
    published_at: publishedAt,
    thumbnail_url: item.videoMeta?.coverUrl ?? item.covers?.[0] ?? null,
    metrics: {
      plays: item.playCount ?? null,
      likes: item.diggCount ?? null,
      comments: item.commentCount ?? null,
      shares: item.shareCount ?? null,
      saves: item.collectCount ?? null,
      duration_seconds: item.videoMeta?.duration ?? null,
      // Direkte Medien-URL fuer die ANALYZE-Phase (Streaming, kein Speichern)
      video_url: item.videoMeta?.downloadAddr ?? item.mediaUrls?.[0] ?? null,
    },
    account:
      handle || item.authorMeta?.id
        ? {
            platform: "tiktok",
            external_id: String(item.authorMeta?.id ?? handle),
            handle,
            display_name: item.authorMeta?.nickName ?? null,
            bio: item.authorMeta?.signature ?? null,
            follower_count: item.authorMeta?.fans ?? null,
          }
        : null,
  };
}

export function createTikTokAdapter(opts: {
  runner: ApifyRunner;
  actorId?: string;
}): OrganicSourceAdapter {
  const actorId = opts.actorId ?? DEFAULT_TIKTOK_ACTOR;

  return {
    async collect(params: OrganicCollectParams): Promise<NormalizedCreative[]> {
      const input: Record<string, unknown> = {
        hashtags: params.hashtags,
        searchQueries: params.searchQueries,
        profiles: params.profiles,
        resultsPerPage: Math.min(
          Math.max(Math.ceil(params.maxItems / 4), 10),
          100,
        ),
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadSubtitles: false,
      };

      const items = await opts.runner.runActor(actorId, input, {
        maxItems: params.maxItems,
      });

      return items
        .map(normalizeTikTokItem)
        .filter((item): item is NormalizedCreative => item !== null);
    },
  };
}
