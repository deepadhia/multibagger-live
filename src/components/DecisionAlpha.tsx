import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ShieldCheck, Zap, TrendingUp, BarChart3, AlertCircle } from "lucide-react";

interface Signal {
  name: string;
  score: number;
  trust: number;
  adjustedScore: number;
}

interface Props {
  alphaSignals: {
    signalStrengthScore: number;
    signalConfidence: number;
    growthType: string;
    signals: Signal[];
  } | null;
}

export function DecisionAlpha({ alphaSignals }: Props) {
  if (!alphaSignals) return null;

  const { signalStrengthScore, signalConfidence, signals, growthType } = alphaSignals;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-terminal-cyan";
    if (score >= 40) return "text-terminal-amber";
    return "text-terminal-red";
  };

  const getVerdict = (score: number) => {
    if (score >= 70) return { text: "HIGH CONVICTION", class: "bg-terminal-cyan/10 text-terminal-cyan border-terminal-cyan/30" };
    if (score >= 40) return { text: "MODERATE TREND", class: "bg-terminal-amber/10 text-terminal-amber border-terminal-amber/30" };
    return { text: "WEAK SIGNAL", class: "bg-terminal-red/10 text-terminal-red border-terminal-red/30" };
  };

  const verdict = getVerdict(signalStrengthScore);

  return (
    <Card className="p-6 bg-card border-border overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Zap className="h-24 w-24 text-primary" />
      </div>

      <div className="flex flex-col md:flex-row gap-8 items-center">
        {/* Main Score Dial */}
        <div className="relative flex flex-col items-center">
          <div className="relative h-32 w-32 flex items-center justify-center">
            <svg className="h-full w-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-muted/20"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={364.4}
                strokeDashoffset={364.4 - (364.4 * signalStrengthScore) / 100}
                className={`${getScoreColor(signalStrengthScore)} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-mono font-bold ${getScoreColor(signalStrengthScore)}`}>{signalStrengthScore}</span>
              <span className="text-[8px] font-mono uppercase text-muted-foreground">Signal Strength</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-center mt-4">
            <Badge variant="outline" className={`font-mono text-[10px] uppercase ${verdict.class}`}>
              {verdict.text}
            </Badge>
            {growthType && (
              <Badge variant="secondary" className="font-mono text-[9px] uppercase bg-primary/10 text-primary border-primary/20">
                {growthType}
              </Badge>
            )}
          </div>
        </div>

        {/* Signal Breakdown */}
        <div className="flex-1 w-full space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-3 w-3" /> Momentum Signals
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono text-muted-foreground uppercase">Signal Confidence:</span>
              <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 border-primary/20">
                {signalConfidence}%
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {signals.map((s) => (
              <div key={s.name} className="space-y-1.5">
                <div className="flex justify-between items-center text-[10px] font-mono">
                  <span className="text-muted-foreground">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className={s.adjustedScore >= 0 ? "text-terminal-green" : "text-terminal-red"}>
                      {s.adjustedScore > 0 ? "+" : ""}{s.adjustedScore}
                    </span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <ShieldCheck className={`h-3 w-3 ${s.trust >= 0.8 ? 'text-terminal-cyan' : s.trust > 0 ? 'text-terminal-amber' : 'text-terminal-red opacity-30'}`} />
                        </TooltipTrigger>
                        <TooltipContent className="text-[10px] font-mono">
                          Trust Multiplier: {(s.trust * 100).toFixed(0)}%
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <Progress value={Math.abs(s.adjustedScore)} className={`h-1 ${s.adjustedScore >= 0 ? 'bg-terminal-green/20' : 'bg-terminal-red/20'}`} />
              </div>
            ))}
          </div>

          <div className="p-3 bg-muted/30 border border-border/50 rounded-sm flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              These scores are **trust-adjusted**. A strong raw signal (e.g. 100% PAT growth) is automatically discounted 
              if derived from stale fallback data or summary API records.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
