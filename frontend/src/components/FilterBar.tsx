import { useAppStore } from "../store/useAppStore";

/** Severity / type / status filters — keyboard operable native selects. */

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-muted">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-text focus:border-primary"
      >
        <option value="">{label}: all</option>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FilterBar() {
  const filters = useAppStore((s) => s.filters);
  const setFilter = useAppStore((s) => s.setFilter);

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter issues">
      <Select
        label="Severity"
        value={filters.severity}
        onChange={(v) => setFilter("severity", v)}
        options={[
          ["critical", "Critical"],
          ["serious", "Serious"],
          ["moderate", "Moderate"],
          ["minor", "Minor"],
        ]}
      />
      <Select
        label="Type"
        value={filters.category}
        onChange={(v) => setFilter("category", v)}
        options={[
          ["alt-text", "Alt text"],
          ["aria-label", "Labels"],
          ["contrast", "Contrast"],
          ["structure", "Structure"],
          ["lang", "Language"],
          ["other", "Other"],
        ]}
      />
      <Select
        label="Status"
        value={filters.status}
        onChange={(v) => setFilter("status", v)}
        options={[
          ["detected", "Open"],
          ["fixed", "Fixed"],
          ["dismissed", "Dismissed"],
        ]}
      />
    </div>
  );
}
