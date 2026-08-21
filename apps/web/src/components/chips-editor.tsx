"use client";

import * as React from "react";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/ui/chip";

interface ChipsEditorProps {
  values: string[];
  onChange: (values: string[]) => void;
  addPlaceholder: string;
  /** Optionales Anzeige-Präfix, z. B. "#" für Hashtags. */
  prefix?: string;
  /** Normalisierung neuer Werte (trim passiert immer). */
  normalize?: (value: string) => string;
  className?: string;
}

/**
 * Editierbare Chip-Liste: bestehende Werte als Pills mit x,
 * neues Feld als Pill-Input (Enter oder Plus fügt hinzu).
 */
function ChipsEditor({
  values,
  onChange,
  addPlaceholder,
  prefix,
  normalize,
  className,
}: ChipsEditorProps) {
  const [draft, setDraft] = React.useState("");

  function commit() {
    const cleaned = (normalize ? normalize(draft) : draft).trim();
    if (!cleaned || values.includes(cleaned)) {
      setDraft("");
      return;
    }
    onChange([...values, cleaned]);
    setDraft("");
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {values.map((value) => (
        <Chip
          key={value}
          onRemove={() => onChange(values.filter((v) => v !== value))}
        >
          {prefix}
          {value}
        </Chip>
      ))}
      <span className="inline-flex h-9 items-center rounded-full bg-surface-2/60 pl-4 pr-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={addPlaceholder}
          className="w-36 bg-transparent text-sm text-ink outline-none placeholder:text-ink-2"
        />
        <button
          type="button"
          onClick={commit}
          aria-label={addPlaceholder}
          className="grid size-6 place-items-center rounded-full text-ink-2 transition-colors duration-200 hover:bg-ink/10 hover:text-ink"
        >
          <Plus size={12} weight="bold" />
        </button>
      </span>
    </div>
  );
}

export { ChipsEditor };
