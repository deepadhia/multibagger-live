import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Copy, 
  Check, 
  Save, 
  RotateCcw, 
  Loader2, 
  FileText, 
  BrainCircuit, 
  ShieldAlert, 
  MessageSquare,
  BadgeAlert,
  Sparkles
} from "lucide-react";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";

// Default template texts as fallback and for reset capability
const DEFAULT_TEMPLATES: Record<string, { title: string; template: string }> = {
  strategic_evolution: {
    title: "Strategic Evolution Prompt",
    template: `If this is the first run after quarterly results, create a complete quarterly update.

If this is a rerun after the concall transcript becomes available:
- Compare with the previous quarterly note.
- Update ONLY sections materially affected by management commentary.
- Do NOT rewrite unchanged sections.
- Clearly identify what changed because of the concall.

Review the following institutional notes before updating:
• Strategic Evolution
• Strategic Accountability
• Institutional Debate
• Current Institutional Status

Do not rewrite unchanged initiatives.

Only update sections where new evidence materially changes the long-term strategic view.

Retain historical context from previous Strategic Evolution notes.

Analyze:
• Latest Quarterly Results
• Investor Presentation
• Concall Transcript (if available)

Primary Thesis Metrics
{{company_metrics}}

Identify ALL strategic initiatives discussed by management.

For every initiative, create the following sections:

1. Initiative Name

2. Original Objective

3. Timeline
• When announced
• Original target
• Current stage

4. Execution Progress

   Execution Momentum
   Accelerating
   On Track
   Slowing
   Behind Schedule

5. Evidence Timeline
Quarter-by-quarter evidence supporting your conclusion.

6. Financial Impact

7. Competitive Impact

8. Success Criteria
Specific measurable milestones.

9. Failure Triggers
What would invalidate or weaken this initiative?

10. Next Milestone

11. Key Risks

12. Current Status
Completed
Ongoing
Delayed
Cancelled

   Probability of Strategic Success
   High
   Medium
   Low

Separate initiatives into:

Completed Strategic Initiatives

Ongoing Strategic Initiatives

Finally provide:

• Biggest Strategic Success

• Biggest Strategic Concern

• Structural Change Since Last Quarter

• Monitoring Metrics

• Next Quarter Watchlist

• Strategic Confidence
High / Medium / Low

Support every conclusion using evidence.
If concall is unavailable finish with:

Questions Waiting For Management`
  },
  strategic_accountability: {
    title: "Strategic Accountability Prompt",
    template: `If this is the first run after quarterly results, create a complete quarterly update.

If this is a rerun after the concall transcript becomes available:
- Compare with the previous quarterly note.
- Update ONLY sections materially affected by management commentary.
- Do NOT rewrite unchanged sections.
- Clearly identify what changed because of the concall.

Review all previous Strategic Accountability notes.

Analyze the latest Results,
Investor Presentation,
Concall Transcript.

Primary Thesis Metrics

{{company_metrics}}

Identify every commitment made by management.

For every commitment provide:

1. Original Guidance

2. Evidence Timeline

3. Current Status

Delivered

Partially Delivered

Delayed

Dropped

Modified

4. Reason for Outcome

5. Evidence

6. Probability of Completion

High

Medium

Low

7. Impact on Management Credibility

Financial Impact
Has this commitment created value?
Has it improved margins?
Cash flow?
Capital allocation?
Competitive position?

Lessons Learned
What does this commitment tell us about management quality?
Has management become more conservative?
More aggressive?
More realistic?

Finally summarize:

Biggest Promise Delivered

Biggest Delay

New Commitments

Promises Quietly Removed

Management Credibility Trend

Execution Confidence

Management Quality Assessment

Use evidence only.`
  },
  institutional_debate: {
    title: "Institutional Debate Prompt",
    template: `If this is the first run after quarterly results, create a complete quarterly update.

If this is a rerun after the concall transcript becomes available:
- Compare with the previous quarterly note.
- Update ONLY sections materially affected by management commentary.
- Do NOT rewrite unchanged sections.
- Clearly identify what changed because of the concall.

Review:

Strategic Evolution

Strategic Accountability

Current Institutional Status

Latest Quarterly Documents

Primary Thesis Metrics

{{company_metrics}}

Evaluate every important thesis driver.

For each one discuss:

Bull Case

Supporting Evidence

Probability (%)

Bear Case

Supporting Evidence

Probability (%)

What would invalidate the Bull Case?

What would invalidate the Bear Case?

Leading Indicators to Monitor
Which metrics would tell us earliest whether the bull or bear case is playing out?

Structural vs Temporary

Probability Bull Case Wins

Probability Bear Case Wins

Catalysts That Increase Conviction

Catalysts That Reduce Conviction

Questions Still Unanswered

Finally summarize:

Central Institutional Debate

Most Important Unknown

Current Thesis

Strengthening

Stable

Weakening

Probability Long-term Thesis Succeeds

Evidence Only`
  },
  current_institutional_status: {
    title: "Current Institutional Status Prompt",
    template: `If this is the first run after quarterly results, create a complete quarterly update.

If this is a rerun after the concall transcript becomes available:
- Compare with the previous quarterly note.
- Update ONLY sections materially affected by management commentary.
- Do NOT rewrite unchanged sections.
- Clearly identify what changed because of the concall.

Review:

• Strategic Evolution
• Strategic Accountability
• Institutional Debate
• Previous Current Institutional Status
• Latest Quarterly Results
• Investor Presentation
• Concall Transcript (if available)

Primary Thesis Metrics

{{company_metrics}}

For EACH thesis metric evaluate:

• Current Value (if disclosed)
• QoQ Trend
• YoY Trend
• Trend vs Management Guidance
• Structural or Temporary
• Impact on Investment Thesis
• Supporting Evidence

Create a Metric Scorecard with:

• Metric
• Status (🟢 Improving / 🟡 Stable / 🔴 Deteriorating)
• Reason
• Effect on Thesis

Then summarize:

1. Investment Thesis Status
   - Strengthening / Unchanged / Weakening
   - Explain why.

2. Conviction Level
   - High / Medium / Low
   - Explain the key drivers.

3. Biggest Positive Development

4. Biggest Emerging Risk

5. Management Credibility
   - Improved / Unchanged / Deteriorated
   - Evidence.

6. Key Questions Remaining

7. Top 5 Metrics to Monitor Next Quarter

8. Institutional Conclusion

Summarize:
• What changed since last quarter?
• Has conviction increased, decreased, or remained unchanged?
• Three key reasons.
• Evidence supporting the conclusion.

Do NOT give Buy/Sell/Hold recommendations.

Base every conclusion only on evidence from the documents.`
  }
};

interface Props {
  stockId: string;
  stockTicker: string;
  initialMetrics: string | null;
}

export function InstitutionalPromptsTab({ stockId, stockTicker, initialMetrics }: Props) {
  const [metrics, setMetrics] = useState(initialMetrics || "");
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState<string | null>(null);
  const [resettingTemplate, setResettingTemplate] = useState<string | null>(null);
  const [editedTemplates, setEditedTemplates] = useState<Record<string, string>>({});
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query templates
  const { data: dbTemplates, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ["prompt-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prompt_templates")
        .select("*")
        .order("name", { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  const handleSaveMetrics = async () => {
    setSavingMetrics(true);
    try {
      const { error } = await supabase
        .from("stocks")
        .update({ key_thesis_metrics: metrics.trim() || null })
        .eq("id", stockId);

      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["stock", stockId] });
      toast({ title: "Metrics updated", description: `Key thesis metrics for ${stockTicker} saved.` });
    } catch (err: any) {
      toast({ title: "Error saving metrics", description: err.message, variant: "destructive" });
    } finally {
      setSavingMetrics(false);
    }
  };

  const handleSaveTemplate = async (name: string, templateText: string) => {
    setSavingTemplate(name);
    try {
      const { error } = await supabase
        .from("prompt_templates")
        .update({ template: templateText })
        .eq("name", name);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      toast({ title: "Template saved", description: "Global prompt template updated successfully." });
      
      // Clean edited state for this name
      setEditedTemplates(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    } catch (err: any) {
      toast({ title: "Error saving template", description: err.message, variant: "destructive" });
    } finally {
      setSavingTemplate(null);
    }
  };

  const handleResetTemplate = async (name: string) => {
    const defaultData = DEFAULT_TEMPLATES[name];
    if (!defaultData) return;

    setResettingTemplate(name);
    try {
      const { error } = await supabase
        .from("prompt_templates")
        .update({ template: defaultData.template })
        .eq("name", name);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["prompt-templates"] });
      
      setEditedTemplates(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });

      toast({ title: "Template reset", description: "Template has been reset to system default." });
    } catch (err: any) {
      toast({ title: "Error resetting template", description: err.message, variant: "destructive" });
    } finally {
      setResettingTemplate(null);
    }
  };

  const copyCompiledPrompt = async (name: string, templateText: string) => {
    const compiled = templateText.replace("{{company_metrics}}", metrics.trim() || "(No metrics configured)");
    try {
      await navigator.clipboard.writeText(compiled);
      setCopiedName(name);
      toast({ title: "Copied!", description: "Compiled prompt copied to clipboard." });
      setTimeout(() => setCopiedName(null), 2000);
    } catch {
      toast({ title: "Copy failed", description: "Could not access clipboard.", variant: "destructive" });
    }
  };

  // Build mapping of templates (using DB values if exists, else defaults)
  const templatesMap = dbTemplates && dbTemplates.length > 0 
    ? dbTemplates.reduce((acc, t) => {
        acc[t.name] = { id: t.id, title: t.title, template: t.template };
        return acc;
      }, {} as Record<string, { id?: string; title: string; template: string }>)
    : DEFAULT_TEMPLATES;

  const getTemplateIcon = (name: string) => {
    switch (name) {
      case "strategic_evolution":
        return <BrainCircuit className="h-5 w-5 text-indigo-400 shrink-0" />;
      case "strategic_accountability":
        return <ShieldAlert className="h-5 w-5 text-emerald-400 shrink-0" />;
      case "institutional_debate":
        return <MessageSquare className="h-5 w-5 text-amber-400 shrink-0" />;
      case "current_institutional_status":
        return <BadgeAlert className="h-5 w-5 text-rose-400 shrink-0" />;
      default:
        return <FileText className="h-5 w-5 text-blue-400 shrink-0" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* --- Section 1: Company metrics input --- */}
      <Card className="p-5 bg-card border-border card-glow space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/50 pb-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              Company Metrics: {stockTicker}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define the key thesis metrics that drive {stockTicker}'s evaluation in NotebookLM.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleSaveMetrics}
            disabled={savingMetrics}
            className="self-start sm:self-center font-mono text-xs gap-1.5 h-8 bg-primary/95 hover:bg-primary"
          >
            {savingMetrics ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Metrics
          </Button>
        </div>

        <Textarea
          value={metrics}
          onChange={(e) => setMetrics(e.target.value)}
          placeholder="e.g. EBITDA/kg, FDC Mix, Small Packs, B2C Revenue, Capacity Utilization, Export Growth, Operating Cash Flow, Net Debt, Working Capital"
          className="bg-muted/30 border-border/60 focus:border-primary/50 font-mono text-xs min-h-[80px] w-full resize-y placeholder:italic placeholder:opacity-50"
        />
      </Card>

      {/* --- Section 2: Prompts templates --- */}
      <Card className="p-5 bg-card border-border card-glow space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Standardized Prompts Framework
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select an institutional prompt to copy or edit. Placeholders (e.g. <code className="text-primary font-mono font-semibold">{"{{company_metrics}}"}</code>) will automatically resolve to your configured company metrics above.
          </p>
        </div>

        {isLoadingTemplates ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary/75" />
            <span className="text-xs font-mono">Loading prompt templates...</span>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-3">
            {Object.entries(templatesMap).map(([name, item]) => {
              const currentVal = editedTemplates[name] !== undefined ? editedTemplates[name] : item.template;
              const isDirty = editedTemplates[name] !== undefined && editedTemplates[name] !== item.template;
              
              return (
                <AccordionItem 
                  key={name} 
                  value={name}
                  className="border border-border/60 rounded-lg bg-muted/10 px-4 py-1.5 transition-all duration-200 hover:bg-muted/15 data-[state=open]:border-primary/30 data-[state=open]:bg-muted/20"
                >
                  <div className="flex items-center justify-between gap-3 w-full">
                    <AccordionTrigger className="flex-1 hover:no-underline py-3">
                      <div className="flex items-center gap-3 text-left">
                        {getTemplateIcon(name)}
                        <div>
                          <h4 className="text-sm font-medium text-foreground">{item.title}</h4>
                          <span className="text-[10px] font-mono text-muted-foreground lowercase opacity-80">
                            Key: {name}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCompiledPrompt(name, item.template);
                        }}
                        className="h-7 px-2.5 font-mono text-[10px] border-border/80 flex items-center gap-1"
                        title="Copy compiled prompt with company metrics"
                      >
                        {copiedName === name ? (
                          <Check className="h-3 w-3 text-terminal-green animate-scale" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                        <span>{copiedName === name ? "Copied!" : "Copy"}</span>
                      </Button>
                    </div>
                  </div>

                  <AccordionContent className="pt-2 pb-4 space-y-4 border-t border-border/40 mt-1">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                          Template Code
                        </label>
                        {isDirty && (
                          <span className="text-[9px] font-mono text-amber-500 font-semibold uppercase animate-pulse">
                            Unsaved Changes
                          </span>
                        )}
                      </div>
                      <Textarea
                        value={currentVal}
                        onChange={(e) => {
                          setEditedTemplates(prev => ({
                            ...prev,
                            [name]: e.target.value
                          }));
                        }}
                        className="bg-muted/80 border-border/85 font-mono text-xs min-h-[300px] w-full p-3 leading-relaxed focus:bg-muted text-foreground"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-2.5 rounded-lg border border-border/30">
                      <div className="text-[10px] text-muted-foreground italic leading-snug max-w-[65%]">
                        Modifying templates updates them globally. Placeholder <code className="text-primary font-mono font-semibold">{"{{company_metrics}}"}</code> will resolve dynamically.
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleResetTemplate(name)}
                          disabled={resettingTemplate === name}
                          className="h-8 px-2.5 font-mono text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Restore default system template"
                        >
                          {resettingTemplate === name ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          )}
                          Reset
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveTemplate(name, currentVal)}
                          disabled={!isDirty || savingTemplate === name}
                          className="h-8 px-3 font-mono text-[10px] bg-primary/90 hover:bg-primary text-primary-foreground flex items-center gap-1"
                        >
                          {savingTemplate === name ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Save Global Template
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </Card>
    </div>
  );
}
