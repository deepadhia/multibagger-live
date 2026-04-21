import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SIZE_COLOR: Record<string, string> = {
  full: "text-terminal-green border-terminal-green/40",
  half: "text-terminal-amber border-terminal-amber/40",
  starter: "text-sky-400 border-sky-400/40",
  none: "text-terminal-red border-terminal-red/40",
};

export function ActionableVerdictBadges({
  decision,
  convictionLevel,
  positionSize,
  compact = false,
  className,
}: {
  decision: string | null;
  convictionLevel: string | null;
  positionSize?: string | null;
  compact?: boolean;
  className?: string;
}) {
  if (!decision && !convictionLevel) {
    return <span className={cn("text-[10px] text-muted-foreground font-mono", className)}>—</span>;
  }
  const d = String(decision || "");
  const sizeKey = positionSize?.toLowerCase() ?? "";
  const sizeColor = SIZE_COLOR[sizeKey] ?? "text-muted-foreground border-muted-foreground/40";
  return (
    <div className={cn("flex flex-col items-center gap-1", compact ? "gap-0.5" : "gap-1", className)}>
      {decision ? (
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-center leading-tight whitespace-normal max-w-[14rem]",
            compact ? "text-[9px] px-1.5 py-0" : "text-[10px]",
            d.toUpperCase().includes("BUILD") || d.toUpperCase().includes("ADD")
              ? "text-terminal-green border-terminal-green/40"
              : d.toUpperCase().includes("CUT")
                ? "text-terminal-red border-terminal-red/40"
                : "text-terminal-amber border-terminal-amber/40",
          )}
          title="final_action from latest quarterly import"
        >
          {decision}
        </Badge>
      ) : null}
      {positionSize ? (
        <Badge
          variant="outline"
          className={cn(
            "font-mono uppercase tracking-wide",
            compact ? "text-[9px] px-1.5 py-0" : "text-[10px]",
            sizeColor,
          )}
          title="position_size from latest quarterly import"
        >
          {positionSize}
        </Badge>
      ) : convictionLevel ? (
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-muted-foreground border-muted-foreground/40",
            compact ? "text-[9px] px-1.5 py-0" : "text-[10px]",
          )}
          title="actionable_verdict.conviction_level"
        >
          {convictionLevel}
        </Badge>
      ) : null}
    </div>
  );
}
