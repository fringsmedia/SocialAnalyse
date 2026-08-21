"use client";

import * as React from "react";
import {
  Check,
  Copy,
  DownloadSimple,
  Sparkle,
} from "@phosphor-icons/react/dist/ssr";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getMessages } from "@/lib/i18n/de";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { startGenerationAction } from "./actions";

export interface PatternRef {
  id: string;
  type: string;
  title: string;
}

export interface SourceRef {
  id: string;
  url: string;
  source: string;
  thumbnail_url: string | null;
}

export interface GenerationItemView {
  id: string;
  kind: string;
  content: Record<string, unknown>;
  pattern_id: string | null;
  source_creative_ids: string[];
  position: number;
}

const KIND_ORDER = ["hook", "script_structure", "ad_text", "offer_variant"];

function itemToText(item: GenerationItemView): string {
  const c = item.content;
  switch (item.kind) {
    case "hook":
      return String(c.text ?? "");
    case "script_structure": {
      const outline = Array.isArray(c.outline)
        ? (c.outline as Array<{ segment?: string; description?: string }>)
            .map((s, i) => `${i + 1}. ${s.segment}: ${s.description}`)
            .join("\n")
        : "";
      return `${c.title}\n${outline}`;
    }
    case "ad_text":
      return `${c.headline}\n\n${c.body}\n\nCTA: ${c.cta}`;
    case "offer_variant":
      return `${c.title}\n${c.description}`;
    default:
      return JSON.stringify(c);
  }
}

function buildMarkdown(
  items: GenerationItemView[],
  patternById: Map<string, PatternRef>,
  sections: Record<string, string>,
): string {
  const lines: string[] = ["# Generierte Creatives", ""];
  for (const kind of KIND_ORDER) {
    const group = items.filter((i) => i.kind === kind);
    if (group.length === 0) continue;
    lines.push(`## ${sections[kind] ?? kind}`, "");
    group.forEach((item, index) => {
      const pattern = item.pattern_id
        ? patternById.get(item.pattern_id)
        : undefined;
      lines.push(`### ${index + 1}.${pattern ? ` _(Pattern: ${pattern.title})_` : ""}`);
      lines.push("");
      lines.push(itemToText(item));
      lines.push("");
    });
  }
  return lines.join("\n");
}

function CopyButton({ text }: { text: string }) {
  const m = getMessages();
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={m.generator.copy}
      title={copied ? m.generator.copied : m.generator.copy}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-200",
        copied
          ? "bg-ink text-white"
          : "bg-surface-2 text-ink-2 hover:bg-[#e4e4e2] hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
      )}
    >
      {copied ? <Check size={14} weight="bold" /> : <Copy size={14} />}
    </button>
  );
}

function SourceThumbs({
  ids,
  sourceById,
}: {
  ids: string[];
  sourceById: Map<string, SourceRef>;
}) {
  const sources = ids
    .map((id) => sourceById.get(id))
    .filter((s): s is SourceRef => Boolean(s));
  if (sources.length === 0) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      {sources.map((source) => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          title={source.source}
          className="relative block h-10 w-6 overflow-hidden rounded-[6px] bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          {source.thumbnail_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={source.thumbnail_url}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
        </a>
      ))}
    </span>
  );
}

export function GeneratorView({
  clientId,
  runId,
  runDate,
  patterns,
  sources,
  initialGenerationId,
  initialItems,
}: {
  clientId: string;
  runId: string;
  runDate: string;
  patterns: PatternRef[];
  sources: SourceRef[];
  initialGenerationId: string | null;
  initialItems: GenerationItemView[];
}) {
  const m = getMessages();
  const patternById = React.useMemo(
    () => new Map(patterns.map((p) => [p.id, p])),
    [patterns],
  );
  const sourceById = React.useMemo(
    () => new Map(sources.map((s) => [s.id, s])),
    [sources],
  );

  const [offer, setOffer] = React.useState("");
  const [audience, setAudience] = React.useState("");
  const [tone, setTone] = React.useState("");
  const [platform, setPlatform] = React.useState<string>("tiktok");
  const [error, setError] = React.useState<string | undefined>();
  const [phase, setPhase] = React.useState<"idle" | "generating" | "done">(
    initialItems.length > 0 ? "done" : "idle",
  );
  const [items, setItems] = React.useState<GenerationItemView[]>(initialItems);
  const [generationId, setGenerationId] = React.useState<string | null>(
    initialGenerationId,
  );

  // Poll auf die laufende Generation, dann Items nachladen.
  React.useEffect(() => {
    if (phase !== "generating" || !generationId) return;
    const supabase = createSupabaseBrowserClient();
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("generations")
        .select("status")
        .eq("id", generationId)
        .single();
      if (data?.status === "succeeded") {
        const { data: itemRows } = await supabase
          .from("generation_items")
          .select("id, kind, content, pattern_id, source_creative_ids, position")
          .eq("generation_id", generationId)
          .order("position", { ascending: true });
        setItems((itemRows ?? []) as GenerationItemView[]);
        setPhase("done");
      } else if (data?.status === "failed") {
        setError(m.generator.failed);
        setPhase(items.length > 0 ? "done" : "idle");
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [phase, generationId, items.length, m.generator.failed]);

  async function start() {
    setError(undefined);
    const input = { offer, audience, tone, platform };
    const result = await startGenerationAction({ clientId, runId }, input);
    if (result.error || !result.id) {
      setError(result.error ?? m.generator.form.errors.generic);
      return;
    }
    setGenerationId(result.id);
    setPhase("generating");
  }

  function exportMarkdown() {
    const md = buildMarkdown(items, patternById, m.generator.sections);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "creatives.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: items.filter((i) => i.kind === kind),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <section className="pb-10">
        <p className="text-[13px] font-medium text-ink-2">
          {m.generator.eyebrow}
        </p>
        <h1 className="mt-3 text-[clamp(2rem,4vw,3rem)] font-medium leading-[1.1] tracking-tight">
          {m.generator.title}
        </h1>
        <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-2">
          {m.generator.context}
        </p>
        <p className="tnum mt-2 text-[13px] font-medium text-ink-2">
          {m.generator.basedOnRun(
            new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(
              new Date(runDate),
            ),
          )}
        </p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
        {/* Formular */}
        <Card className="space-y-5 p-8 lg:sticky lg:top-6">
          <Field label={m.generator.form.offer} htmlFor="gen-offer">
            <Textarea
              id="gen-offer"
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder={m.generator.form.offerPlaceholder}
              rows={4}
              maxLength={1000}
            />
          </Field>
          <Field label={m.generator.form.audience} htmlFor="gen-audience">
            <Input
              id="gen-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder={m.generator.form.audiencePlaceholder}
              maxLength={500}
            />
          </Field>
          <Field label={m.generator.form.tone} htmlFor="gen-tone">
            <Input
              id="gen-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder={m.generator.form.tonePlaceholder}
              maxLength={200}
            />
          </Field>
          <Field label={m.generator.form.platform} htmlFor="gen-platform">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger
                id="gen-platform"
                aria-label={m.generator.form.platform}
                className="w-full"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram Reels</SelectItem>
                <SelectItem value="meta_ad">Meta Ads</SelectItem>
                <SelectItem value="all">
                  {m.generator.form.platformAll}
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {error ? (
            <p role="alert" className="text-[13px] font-medium text-accent">
              {error}
            </p>
          ) : null}
          <Button
            size="lg"
            className="w-full"
            disabled={phase === "generating"}
            onClick={start}
          >
            <Sparkle size={16} weight="fill" />
            {phase === "generating"
              ? m.generator.form.generating
              : m.generator.form.submit}
          </Button>
        </Card>

        {/* Ergebnisse */}
        <div className="min-w-0 space-y-5">
          {phase === "generating" ? (
            <Card className="space-y-4 p-8">
              <p className="text-[15px] font-medium">
                {m.generator.form.generating}
              </p>
              <p className="text-[13px] text-ink-2">
                {m.generator.form.generatingHint}
              </p>
              <div className="space-y-2.5 pt-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </Card>
          ) : null}

          {phase === "done" && items.length > 0 ? (
            <>
              <div className="flex justify-end">
                <Button variant="dark" size="sm" onClick={exportMarkdown}>
                  <DownloadSimple size={14} weight="bold" />
                  {m.generator.exportMd}
                </Button>
              </div>
              {grouped.map((group) => (
                <Card key={group.kind} className="p-8">
                  <h2 className="text-xl font-medium tracking-tight">
                    {m.generator.sections[group.kind]}
                  </h2>
                  <ul className="mt-6 space-y-5">
                    {group.items.map((item, index) => {
                      const pattern = item.pattern_id
                        ? patternById.get(item.pattern_id)
                        : undefined;
                      return (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex gap-3">
                              <span className="tnum mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-surface-2 text-[12px] font-semibold">
                                {index + 1}
                              </span>
                              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                                {itemToText(item)}
                              </p>
                            </div>
                            <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-9">
                              {pattern ? (
                                <Chip className="h-7 text-[12px]">
                                  {pattern.title}
                                </Chip>
                              ) : null}
                              <SourceThumbs
                                ids={item.source_creative_ids}
                                sourceById={sourceById}
                              />
                            </div>
                          </div>
                          <CopyButton text={itemToText(item)} />
                        </li>
                      );
                    })}
                  </ul>
                </Card>
              ))}
            </>
          ) : null}

          {phase === "idle" && items.length === 0 ? (
            <Card className="grid place-items-center px-8 py-20 text-center text-[15px] leading-relaxed text-ink-2">
              {m.generator.empty}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
