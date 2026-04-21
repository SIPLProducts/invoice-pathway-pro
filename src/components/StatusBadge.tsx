import { cn } from "@/lib/utils";

type Tone = "success" | "warning" | "destructive" | "info" | "pending" | "muted";

const tones: Record<Tone, string> = {
  success: "bg-success/10 text-success ring-success/20",
  warning: "bg-warning/10 text-warning ring-warning/30",
  destructive: "bg-destructive/10 text-destructive ring-destructive/20",
  info: "bg-info/10 text-info ring-info/20",
  pending: "bg-pending/10 text-pending ring-pending/20",
  muted: "bg-muted text-muted-foreground ring-border",
};

const map: Record<string, { tone: Tone; label: string }> = {
  draft: { tone: "muted", label: "Draft" },
  submitted: { tone: "info", label: "Submitted" },
  validated: { tone: "info", label: "Validated" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "destructive", label: "Rejected" },
  grn_posted: { tone: "success", label: "GRN Posted" },
  pending: { tone: "pending", label: "Pending" },
  partial: { tone: "warning", label: "Partial" },
  posted: { tone: "success", label: "Posted" },
  failed: { tone: "destructive", label: "Failed" },
  pass: { tone: "success", label: "Pass" },
  warning: { tone: "warning", label: "Warning" },
  fail: { tone: "destructive", label: "Fail" },
  high: { tone: "destructive", label: "High" },
  medium: { tone: "warning", label: "Medium" },
  low: { tone: "muted", label: "Low" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = map[status] ?? { tone: "muted" as Tone, label: status };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[cfg.tone],
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", `bg-${cfg.tone === "muted" ? "muted-foreground" : cfg.tone}`)} />
      {cfg.label}
    </span>
  );
}
