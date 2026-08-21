"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "@phosphor-icons/react/dist/ssr";
import {
  estimateRunCost,
  normalizeHashtag,
  RUN_REGIONS,
  runConfigSchema,
  TOP_N_OPTIONS,
  type IndustryProfile,
  type RunConfig,
  type SeedAccount,
} from "@ci/shared";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getMessages } from "@/lib/i18n/de";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { ChipsEditor } from "@/components/chips-editor";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Stepper } from "@/components/stepper";
import {
  retryProfileAction,
  saveProfileAction,
  startRunAction,
} from "./actions";

interface ProfileWizardProps {
  profileId: string;
  clientId: string;
  status: "generating" | "draft" | "failed";
  sourceDescription: string;
  initialProfile: IndustryProfile;
}

function usdFormat(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

/** Wartezustand: Poll auf den Profil-Status, bis der Worker fertig ist. */
function GeneratingState({ profileId }: { profileId: string }) {
  const m = getMessages();
  const router = useRouter();

  React.useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("industry_profiles")
        .select("status")
        .eq("id", profileId)
        .single();
      if (data && data.status !== "generating") {
        router.refresh();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [profileId, router]);

  return (
    <Card className="p-8 md:p-10">
      <h1 className="text-[2rem] font-medium leading-[1.1] tracking-tight">
        {m.wizard.generatingTitle}
      </h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
        {m.wizard.generatingText}
      </p>
      <div className="mt-10 space-y-6">
        {[5, 4, 6].map((count, row) => (
          <div key={row} className="space-y-3">
            <Skeleton className="h-3.5 w-32" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: count }, (_, i) => (
                <Skeleton
                  key={i}
                  className="h-9"
                  style={{ width: 64 + ((i * 37 + row * 23) % 72) }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function FailedState({ profileId }: { profileId: string }) {
  const m = getMessages();
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Card className="p-8 md:p-10">
      <h1 className="text-[2rem] font-medium leading-[1.1] tracking-tight">
        {m.wizard.failedTitle}
      </h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-2">
        {m.wizard.failedText}
      </p>
      <div className="mt-8">
        <Button
          size="lg"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await retryProfileAction(profileId);
              router.refresh();
            })
          }
        >
          {pending ? m.common.loading : m.wizard.retry}
        </Button>
      </div>
    </Card>
  );
}

function SectionBlock({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div>
        <Label>{label}</Label>
        {hint ? (
          <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{hint}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export function ProfileWizard({
  profileId,
  status,
  sourceDescription,
  initialProfile,
}: ProfileWizardProps) {
  const m = getMessages();
  const [step, setStep] = React.useState<2 | 3>(2);
  const [profile, setProfile] = React.useState<IndustryProfile>(initialProfile);
  const [config, setConfig] = React.useState<RunConfig>(() =>
    runConfigSchema.parse({
      region: RUN_REGIONS.includes(
        initialProfile.region_default as (typeof RUN_REGIONS)[number],
      )
        ? initialProfile.region_default
        : "DE",
    }),
  );
  const [error, setError] = React.useState<string | undefined>();
  const [pending, startTransition] = React.useTransition();

  const [seedPlatform, setSeedPlatform] = React.useState<"tiktok" | "instagram">(
    "tiktok",
  );
  const [seedHandle, setSeedHandle] = React.useState("");

  if (status === "generating") return <GeneratingState profileId={profileId} />;
  if (status === "failed") return <FailedState profileId={profileId} />;

  const set = <K extends keyof IndustryProfile>(
    key: K,
    value: IndustryProfile[K],
  ) => setProfile((p) => ({ ...p, [key]: value }));

  function addSeedAccount() {
    const handle = seedHandle.trim().replace(/^@/, "");
    if (!handle) return;
    const exists = profile.seed_accounts.some(
      (a) => a.platform === seedPlatform && a.handle === handle,
    );
    if (!exists) {
      set("seed_accounts", [
        ...profile.seed_accounts,
        { platform: seedPlatform, handle },
      ]);
    }
    setSeedHandle("");
  }

  function goToConfig() {
    setError(undefined);
    startTransition(async () => {
      const result = await saveProfileAction(profileId, profile);
      if (result.error) {
        setError(result.error);
      } else {
        setStep(3);
        window.scrollTo({ top: 0 });
      }
    });
  }

  function start() {
    setError(undefined);
    startTransition(async () => {
      const result = await startRunAction(profileId, profile, config);
      // Bei Erfolg redirected die Action serverseitig.
      if (result?.error) setError(result.error);
    });
  }

  const estimate = estimateRunCost(config);
  const estimateParts: Array<[string, number]> = [
    [m.wizard.estimatePerPart.collect, estimate.collectUsd],
    [m.wizard.estimatePerPart.filter, estimate.filterUsd],
    [m.wizard.estimatePerPart.analyze, estimate.analyzeUsd],
    [m.wizard.estimatePerPart.synthesize, estimate.synthesizeUsd],
    [m.wizard.estimatePerPart.transcription, estimate.transcriptionUsd],
  ];

  return (
    <div>
      <Stepper steps={m.wizard.steps} active={step - 1} className="mb-8" />

      {step === 2 ? (
        <Card className="space-y-10 p-8 md:p-10">
          <div className="rounded-[20px] bg-surface-2/60 p-5">
            <p className="text-[13px] font-medium text-ink-2">
              {m.wizard.sourceLabel}
            </p>
            <p className="mt-1.5 text-[15px] leading-relaxed">
              {sourceDescription}
            </p>
          </div>

          <SectionBlock label={m.wizard.sections.keywordsDe}>
            <ChipsEditor
              values={profile.keywords_de}
              onChange={(v) => set("keywords_de", v)}
              addPlaceholder={m.wizard.addPlaceholder}
            />
          </SectionBlock>

          <SectionBlock label={m.wizard.sections.keywordsEn}>
            <ChipsEditor
              values={profile.keywords_en}
              onChange={(v) => set("keywords_en", v)}
              addPlaceholder={m.wizard.addPlaceholder}
            />
          </SectionBlock>

          <SectionBlock label={m.wizard.sections.hashtags}>
            <ChipsEditor
              values={profile.hashtags}
              onChange={(v) => set("hashtags", v)}
              addPlaceholder={m.wizard.addPlaceholder}
              prefix="#"
              normalize={normalizeHashtag}
            />
          </SectionBlock>

          <SectionBlock
            label={m.wizard.sections.seedAccounts}
            hint={m.wizard.seedAccountsHint}
          >
            <div className="flex flex-wrap gap-2">
              {profile.seed_accounts.map((account: SeedAccount) => (
                <Chip
                  key={`${account.platform}:${account.handle}`}
                  onRemove={() =>
                    set(
                      "seed_accounts",
                      profile.seed_accounts.filter(
                        (a) =>
                          !(
                            a.platform === account.platform &&
                            a.handle === account.handle
                          ),
                      ),
                    )
                  }
                >
                  @{account.handle}
                  <span className="text-ink-2">
                    · {m.wizard.platformLabels[account.platform]}
                  </span>
                </Chip>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={seedPlatform}
                onValueChange={(v) =>
                  setSeedPlatform(v as "tiktok" | "instagram")
                }
              >
                <SelectTrigger
                  aria-label={m.wizard.sections.seedAccounts}
                  className="h-9 text-sm"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tiktok">TikTok</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
              <span className="inline-flex h-9 items-center rounded-full bg-surface-2/60 pl-4 pr-1.5">
                <span className="text-sm text-ink-2">@</span>
                <input
                  value={seedHandle}
                  onChange={(e) => setSeedHandle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSeedAccount();
                    }
                  }}
                  placeholder={m.wizard.handlePlaceholder}
                  className="w-36 bg-transparent text-sm text-ink outline-none placeholder:text-ink-2"
                />
                <button
                  type="button"
                  onClick={addSeedAccount}
                  aria-label={m.wizard.add}
                  className="grid size-6 place-items-center rounded-full text-ink-2 transition-colors duration-200 hover:bg-ink/10 hover:text-ink"
                >
                  <Plus size={12} weight="bold" />
                </button>
              </span>
            </div>
          </SectionBlock>

          <SectionBlock
            label={m.wizard.sections.adjacent}
            hint={m.wizard.adjacentHint}
          >
            <div className="flex flex-wrap gap-2">
              {profile.adjacent_industries.map((industry) => (
                <button
                  key={industry.name}
                  type="button"
                  aria-pressed={industry.enabled}
                  onClick={() =>
                    set(
                      "adjacent_industries",
                      profile.adjacent_industries.map((a) =>
                        a.name === industry.name
                          ? { ...a, enabled: !a.enabled }
                          : a,
                      ),
                    )
                  }
                  className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                >
                  <Chip selected={industry.enabled}>{industry.name}</Chip>
                </button>
              ))}
            </div>
          </SectionBlock>

          <SectionBlock label={m.wizard.sections.exclusions}>
            <ChipsEditor
              values={profile.exclusions}
              onChange={(v) => set("exclusions", v)}
              addPlaceholder={m.wizard.addPlaceholder}
            />
          </SectionBlock>

          <SectionBlock label={m.wizard.sections.offerForms}>
            <ChipsEditor
              values={profile.offer_forms}
              onChange={(v) => set("offer_forms", v)}
              addPlaceholder={m.wizard.addPlaceholder}
            />
          </SectionBlock>

          {error ? (
            <p role="alert" className="text-[13px] font-medium text-accent">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button size="lg" disabled={pending} onClick={goToConfig}>
              {pending ? m.common.loading : m.wizard.continue}
              {pending ? null : <ArrowRight size={16} weight="bold" />}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="space-y-10 p-8 md:p-10">
          <h2 className="text-[2rem] font-medium leading-[1.1] tracking-tight">
            {m.wizard.configTitle}
          </h2>

          <div className="grid gap-8 sm:grid-cols-2">
            <SectionBlock label={m.wizard.region}>
              <Select
                value={config.region}
                onValueChange={(v) =>
                  setConfig((c) => ({
                    ...c,
                    region: v as RunConfig["region"],
                  }))
                }
              >
                <SelectTrigger aria-label={m.wizard.region} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RUN_REGIONS.map((region) => (
                    <SelectItem key={region} value={region}>
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SectionBlock>

            <SectionBlock label={m.wizard.depth}>
              <Select
                value={String(config.topN)}
                onValueChange={(v) =>
                  setConfig((c) => ({ ...c, topN: Number(v) }))
                }
              >
                <SelectTrigger aria-label={m.wizard.depth} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TOP_N_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {m.wizard.depthOption(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SectionBlock>
          </div>

          <SectionBlock label={m.wizard.platforms}>
            <div className="flex flex-wrap gap-2">
              {(["meta_ad", "tiktok", "instagram"] as const).map((platform) => {
                const enabled = config.platforms.includes(platform);
                return (
                  <button
                    key={platform}
                    type="button"
                    aria-pressed={enabled}
                    onClick={() =>
                      setConfig((c) => ({
                        ...c,
                        platforms: enabled
                          ? c.platforms.filter((p) => p !== platform)
                          : [...c.platforms, platform],
                      }))
                    }
                    className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                  >
                    <Chip selected={enabled}>
                      {m.wizard.platformLabels[platform]}
                    </Chip>
                  </button>
                );
              })}
            </div>
          </SectionBlock>

          <div className="rounded-[20px] bg-surface-2/60 p-6">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-[13px] font-medium text-ink-2">
                {m.wizard.estimateTitle}
              </span>
              <span className="tnum text-[2rem] font-medium leading-none tracking-tight">
                {usdFormat(estimate.totalUsd)}
              </span>
            </div>
            <dl className="mt-5 space-y-2">
              {estimateParts.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-baseline justify-between text-[13px]"
                >
                  <dt className="text-ink-2">{label}</dt>
                  <dd className="tnum font-medium">{usdFormat(value)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
              {m.wizard.estimateHint}
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-[13px] font-medium text-accent">
              {error}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="lg"
              disabled={pending}
              onClick={() => setStep(2)}
            >
              <ArrowLeft size={16} weight="bold" />
              {m.wizard.back}
            </Button>
            <Button
              size="lg"
              disabled={pending || config.platforms.length === 0}
              onClick={start}
            >
              {pending ? m.wizard.starting : m.wizard.start}
              {pending ? null : <ArrowRight size={16} weight="bold" />}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
