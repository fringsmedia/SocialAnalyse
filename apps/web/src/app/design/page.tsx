"use client";

import { useState } from "react";
import {
  ArrowRight,
  MagnifyingGlass,
  Play,
  Plus,
  SlidersHorizontal,
} from "@phosphor-icons/react/dist/ssr";
import { PRODUCT_NAME } from "@ci/shared";
import { tokens } from "@/lib/design-tokens";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Stat } from "@/components/ui/stat";
import { StatusDots } from "@/components/ui/status-dots";
import { Textarea } from "@/components/ui/textarea";

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-6 border-t border-ink/8 py-14 md:grid-cols-[220px_1fr] md:gap-12">
      <div>
        <h2 className="text-[13px] font-medium text-ink-2">{title}</h2>
        {note ? (
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{note}</p>
        ) : null}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

function Swatch({ name, hex, dark }: { name: string; hex: string; dark?: boolean }) {
  return (
    <div className="min-w-36">
      <div
        className="h-20 rounded-(--radius-thumb)"
        style={{
          backgroundColor: hex,
          boxShadow: hex.toLowerCase() === "#ffffff" ? "inset 0 0 0 1px rgba(17,17,17,0.06)" : undefined,
        }}
      />
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium">{name}</span>
        <span className={`tnum text-[13px] ${dark ? "text-ink-2" : "text-ink-2"}`}>
          {hex}
        </span>
      </div>
    </div>
  );
}

export default function DesignPage() {
  const [chips, setChips] = useState([
    "autohaus",
    "gebrauchtwagen",
    "#autokauf",
    "probefahrt",
  ]);
  const [platform, setPlatform] = useState("tiktok");

  return (
    <div className="mx-auto w-full max-w-300 px-6 pb-32 md:px-10">
      <header className="flex items-center justify-between py-7">
        <Logo />
        <span className="text-[13px] font-medium text-ink-2">
          Design-System · Styleguide
        </span>
      </header>

      <section className="pb-16 pt-10">
        <h1 className="max-w-3xl text-[clamp(2.5rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-tight">
          Warm, ruhig, editorial.
        </h1>
        <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-2">
          Das visuelle System von {PRODUCT_NAME}: eine Grotesk, eine
          Akzentfarbe, Flächen ohne Schatten und Borders – Karten trennen sich
          nur über den Tonunterschied. Thumbnails sind der Held, die UI bleibt
          zurückhaltend.
        </p>
      </section>

      <Section
        title="Farben"
        note="Genau eine Akzentfarbe. Koralle nie als Flächenfarbe für Karten."
      >
        <div className="flex flex-wrap gap-5">
          <Swatch name="Canvas" hex={tokens.color.canvas} />
          <Swatch name="Surface" hex={tokens.color.surface} />
          <Swatch name="Surface 2" hex={tokens.color.surface2} />
          <Swatch name="Ink" hex={tokens.color.ink} />
          <Swatch name="Ink 2" hex={tokens.color.ink2} />
          <Swatch name="Ink 3" hex={tokens.color.ink3} />
          <Swatch name="Akzent" hex={tokens.color.accent} />
          <Swatch name="Akzent Hover" hex={tokens.color.accentHover} />
        </div>
      </Section>

      <Section
        title="Typografie"
        note="Geist in wenigen Größen. Zahlen immer tabellarisch (.tnum)."
      >
        <div className="space-y-10">
          <div>
            <p className="mb-2 text-[13px] text-ink-2">H1 · 40–56 px · 1.1</p>
            <p className="text-[clamp(2.5rem,5vw,3.5rem)] font-medium leading-[1.1] tracking-tight">
              Die stärksten Creatives deiner Branche.
            </p>
          </div>
          <div>
            <p className="mb-2 text-[13px] text-ink-2">Kennzahl · 32–40 px · medium</p>
            <p className="tnum text-[2.5rem] font-medium leading-none tracking-tight">
              1.842
            </p>
          </div>
          <div>
            <p className="mb-2 text-[13px] text-ink-2">Body · 15 px</p>
            <p className="max-w-[65ch] text-[15px] leading-relaxed">
              Der Nutzer beschreibt eine Branche, das Tool sammelt die aktuell
              stärksten Werbeanzeigen und organischen Kurzvideos, analysiert
              Hooks, Struktur und Angebotsframing – und generiert daraus
              fertige Creatives mit Beleg.
            </p>
          </div>
          <div>
            <p className="mb-2 text-[13px] text-ink-2">Label · 13 px · sekundär</p>
            <p className="text-[13px] font-medium text-ink-2">
              412 relevante Creatives
            </p>
          </div>
        </div>
      </Section>

      <Section
        title="Buttons"
        note="Pill-Form, vier Varianten. Icon-Buttons kreisrund, 48 px."
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">
              Analyse starten
              <ArrowRight size={16} weight="bold" />
            </Button>
            <Button variant="dark" size="lg">
              Exportieren
            </Button>
            <Button variant="subtle" size="lg">
              Profil bearbeiten
            </Button>
            <Button variant="ghost" size="lg">
              Abbrechen
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="md">Mittel</Button>
            <Button size="sm" variant="dark">
              Klein
            </Button>
            <Button size="lg" disabled>
              Inaktiv
            </Button>
            <Button size="icon" variant="dark" aria-label="Suchen">
              <MagnifyingGlass size={18} />
            </Button>
            <Button size="icon" variant="subtle" aria-label="Filter">
              <SlidersHorizontal size={18} />
            </Button>
            <Button size="icon" aria-label="Hinzufügen">
              <Plus size={18} weight="bold" />
            </Button>
          </div>
        </div>
      </Section>

      <Section
        title="Formulare"
        note="Inputs als Pill auf Surface 2. Dropdowns als Pill mit Chevron."
      >
        <Card className="max-w-xl space-y-5 p-8">
          <Field label="Branche" htmlFor="sg-industry">
            <Input
              id="sg-industry"
              placeholder="z. B. Autohaus in Bayern, Fokus Gebrauchtwagen"
            />
          </Field>
          <Field label="Beschreibung" htmlFor="sg-desc">
            <Textarea
              id="sg-desc"
              placeholder="Was bietet der Kunde an, für wen?"
            />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger aria-label="Plattform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="instagram">Instagram Reels</SelectItem>
                <SelectItem value="meta">Meta Ads</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-56">
              <MagnifyingGlass
                size={16}
                className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-ink-2"
              />
              <Input
                aria-label="Suche"
                placeholder="Creatives durchsuchen"
                className="h-11 pl-12"
              />
            </div>
          </div>
        </Card>
      </Section>

      <Section
        title="Chips & Badges"
        note="Chips für Keywords und Filter (mit x). Badges für Scores – Schwarz als Standard, Koralle sparsam."
      >
        <div className="space-y-6">
          <div className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Chip
                key={chip}
                onRemove={() =>
                  setChips((prev) => prev.filter((c) => c !== chip))
                }
              >
                {chip}
              </Chip>
            ))}
            <Chip selected>Kernbranche</Chip>
            <Chip>Nachbarbranche</Chip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>9,2</Badge>
            <Badge variant="accent">12× über Account-Schnitt</Badge>
            <Badge variant="neutral">34 Tage aktiv</Badge>
            <Badge variant="neutral">4 Varianten</Badge>
          </div>
        </div>
      </Section>

      <Section
        title="Status"
        note="Dünner Ringfortschritt und Punkt-Raster – Koralle auf Hellgrau."
      >
        <div className="flex flex-wrap items-center gap-10">
          <ProgressRing value={0.65} label="Fortschritt 65 %" />
          <div className="space-y-2">
            <StatusDots total={7} done={3} activeIndex={3} />
            <p className="text-[13px] font-medium text-ink-2">
              Phase 4 von 7 · Scoring läuft
            </p>
          </div>
          <div className="w-40 space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      </Section>

      <Section
        title="Kennzahlen"
        note="Große Zahlen, ruhige Labels – keine generischen Dashboard-Widgets."
      >
        <Card className="max-w-xl p-8">
          <div className="grid grid-cols-3 gap-8">
            <Stat value="1.842" label="gesammelt" />
            <Stat value="412" label="relevant" />
            <Stat value="80" label="analysiert" />
          </div>
        </Card>
      </Section>

      <Section
        title="Karten & Thumbnails"
        note="Creatives im Hochformat 9:16, 16 px gerundet, Badge oben links. Die UI drumherum bleibt zurückhaltend."
      >
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {[
            { badge: "9,2", label: "Hook: Frage", variant: "dark" as const },
            {
              badge: "12×",
              label: "Outlier",
              variant: "accent" as const,
            },
            { badge: "8,7", label: "Hook: POV", variant: "dark" as const },
          ].map((item, i) => (
            <div key={i}>
              <div className="relative aspect-[9/16] overflow-hidden rounded-(--radius-thumb) bg-surface-2">
                <div className="absolute left-3 top-3">
                  <Badge variant={item.variant}>{item.badge}</Badge>
                </div>
                <div className="absolute inset-0 grid place-items-center">
                  <span className="grid size-12 place-items-center rounded-full bg-ink text-white">
                    <Play size={18} weight="fill" />
                  </span>
                </div>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <span className="text-sm font-medium">{item.label}</span>
                <span className="text-[13px] text-ink-2">0:24</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
