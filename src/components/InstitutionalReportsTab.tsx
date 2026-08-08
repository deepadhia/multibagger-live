import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, BrainCircuit, ShieldAlert, MessageSquare, BadgeAlert, Sparkles, RefreshCw, FileText, ExternalLink, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/hooks/use-toast";

interface SynthesisReport {
  prompt_name: string;
  prompt_title: string;
  report_content: string;
  updated_at: string;
}

interface QuarterlyVerdict {
  id: string;
  title: string;
  filing_date: string;
  attachment_url?: string;
  event_analysis?: {
    institutional_verdict?: {
      credibility_tier?: string;
      action_signal?: string;
      conviction_score?: number;
      verdict_summary?: string;
      key_drivers?: string[];
      commitments?: Array<{
        statement?: string;
        metric?: string;
        target_value?: string;
        timeline?: string;
        status?: string;
        credibility_impact?: string;
      }>;
    };
  };
}

export function InstitutionalReportsTab({ stockId, ticker }: { stockId: string; ticker: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stock-syntheses", stockId],
    queryFn: async () => {
      const res = await apiFetch(`/api/stocks/${stockId}/syntheses`);
      if (!res.ok) throw new Error("Failed to fetch synthesis reports");
      return await res.json() as {
        syntheses: SynthesisReport[];
        quarterlyVerdicts: QuarterlyVerdict[];
      };
    },
    enabled: !!stockId,
  });

  const handleGenerateSyntheses = async () => {
    setGenerating(true);
    try {
      const res = await apiFetch(`/api/stocks/${stockId}/generate-syntheses`, { method: "POST" });
      if (!res.ok) throw new Error("Synthesis generation failed");
      await refetch();
      toast({
        title: "Synthesis Complete",
        description: `Generated 4 Multi-Quarter Institutional Synthesis Reports for ${ticker}.`,
      });
    } catch (err: any) {
      toast({
        title: "Synthesis Error",
        description: err.message || "Failed to generate synthesis reports.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground font-mono text-sm">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        Loading institutional synthesis reports for {ticker}...
      </div>
    );
  }

  const syntheses = data?.syntheses || [];
  const quarterlyVerdicts = data?.quarterlyVerdicts || [];

  const getPromptIcon = (name: string) => {
    switch (name) {
      case "strategic_evolution":
        return <BrainCircuit className="h-4 w-4 text-indigo-400 shrink-0" />;
      case "strategic_accountability":
        return <ShieldAlert className="h-4 w-4 text-emerald-400 shrink-0" />;
      case "institutional_debate":
        return <MessageSquare className="h-4 w-4 text-amber-400 shrink-0" />;
      case "current_institutional_status":
        return <BadgeAlert className="h-4 w-4 text-rose-400 shrink-0" />;
      default:
        return <FileText className="h-4 w-4 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* ═══ SECTION 1: MULTI-QUARTER INSTITUTIONAL SYNTHESIS ═══ */}
      <Card className="p-5 bg-card border-border card-glow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Multi-Quarter Institutional Synthesis ({ticker})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              4 synthesized research notes compiled across all historical earnings results, concall Q&amp;As, and guidance track record.
            </p>
          </div>

          <Button
            size="sm"
            onClick={handleGenerateSyntheses}
            disabled={generating}
            className="font-mono text-xs gap-1.5 h-8 bg-primary/90 hover:bg-primary text-primary-foreground"
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {syntheses.length > 0 ? "Re-Synthesize 4 Reports" : "Generate 4 Synthesis Reports"}
          </Button>
        </div>

        {syntheses.length === 0 ? (
          <div className="text-center py-8 space-y-3 bg-muted/20 rounded-lg border border-dashed border-border/60">
            <BrainCircuit className="h-8 w-8 text-muted-foreground/40 mx-auto" />
            <p className="text-xs text-muted-foreground font-mono">
              No synthesis reports generated yet. Click above to run the 4 Institutional Synthesis Prompts for {ticker}.
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible defaultValue={syntheses[0]?.prompt_name} className="w-full space-y-3">
            {syntheses.map((s) => (
              <AccordionItem
                key={s.prompt_name}
                value={s.prompt_name}
                className="border border-border/60 rounded-lg bg-muted/10 px-4 py-1 transition-all hover:bg-muted/15 data-[state=open]:border-primary/30 data-[state=open]:bg-muted/20"
              >
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-3 text-left">
                    {getPromptIcon(s.prompt_name)}
                    <div>
                      <h4 className="text-sm font-semibold text-foreground">{s.prompt_title}</h4>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        Last Synthesized: {new Date(s.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="pt-2 pb-4 space-y-3 border-t border-border/40 mt-1">
                  <div className="prose prose-invert max-w-none text-xs leading-relaxed font-mono whitespace-pre-wrap bg-muted/40 p-4 rounded-lg border border-border/40 text-foreground/90">
                    {s.report_content}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </Card>

      {/* ═══ SECTION 2: QUARTERLY FILING DEEP-DIVE VERDICTS ═══ */}
      <Card className="p-5 bg-card border-border card-glow space-y-4">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Quarterly Filing Deep-Dive Verdicts ({quarterlyVerdicts.length})
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Historical quarterly verdicts evaluated directly from exchange filing PDFs &amp; concall transcripts.
            </p>
          </div>
        </div>

        {quarterlyVerdicts.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground font-mono">
            No completed quarterly filing verdicts found for {ticker}.
          </div>
        ) : (
          <div className="space-y-4">
            {quarterlyVerdicts.map((v) => {
              const iv = v.event_analysis?.institutional_verdict;
              const signal = iv?.action_signal || "HOLD";
              const tier = iv?.credibility_tier || "Tier 2";
              const score = iv?.conviction_score || 5;

              return (
                <div key={v.id} className="p-4 bg-muted/20 border border-border/70 rounded-lg space-y-3 hover:border-border transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                        {v.title}
                        {v.attachment_url && (
                          <a
                            href={v.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="View Official Filing PDF"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </h4>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        Filing Date: {new Date(v.filing_date).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`font-mono text-xs px-2.5 py-0.5 border ${
                          signal === "ADD"
                            ? "bg-terminal-green/10 text-terminal-green border-terminal-green/30"
                            : signal === "TRIM"
                            ? "bg-terminal-red/10 text-terminal-red border-terminal-red/30"
                            : "bg-terminal-amber/10 text-terminal-amber border-terminal-amber/30"
                        }`}
                      >
                        {signal === "ADD" ? "🟢 ADD" : signal === "TRIM" ? "🔴 TRIM" : "🟡 HOLD"} ({score}/10)
                      </Badge>
                      <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-border">
                        {tier}
                      </Badge>
                    </div>
                  </div>

                  {iv?.verdict_summary && (
                    <p className="text-xs text-foreground/90 leading-relaxed font-sans">
                      {iv.verdict_summary}
                    </p>
                  )}

                  {iv?.key_drivers && iv.key_drivers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Key Drivers:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {iv.key_drivers.map((kd, idx) => (
                          <Badge key={idx} variant="secondary" className="font-mono text-[10px] bg-muted/60 text-muted-foreground">
                            • {kd}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {iv?.commitments && iv.commitments.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Extracted Guidance Commitments:</p>
                      <div className="space-y-1">
                        {iv.commitments.map((c, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs bg-muted/40 p-2 rounded border border-border/30">
                            {c.status === "Achieved" ? (
                              <CheckCircle className="h-3.5 w-3.5 text-terminal-green shrink-0 mt-0.5" />
                            ) : c.status === "Delayed" || c.status === "Missed" ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-terminal-red shrink-0 mt-0.5" />
                            ) : (
                              <Clock className="h-3.5 w-3.5 text-terminal-amber shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-foreground">{c.statement || c.metric}</span>
                              <div className="flex flex-wrap gap-2 text-[10px] font-mono text-muted-foreground mt-0.5">
                                <span>Target: {c.target_value || "N/A"}</span>
                                <span>Timeline: {c.timeline || "N/A"}</span>
                                <span>Status: {c.status}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
