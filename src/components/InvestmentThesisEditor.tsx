import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Edit3, Save, X, Loader2 } from "lucide-react";

interface Props {
  stockId: string;
  thesis: string | null;
}

export function InvestmentThesisEditor({ stockId, thesis }: Props) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(thesis || "");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("stocks")
        .update({ investment_thesis: value.trim() || null })
        .eq("id", stockId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["stock", stockId] });
      toast({ title: "Thesis saved" });
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Error saving thesis", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const renderThesis = () => {
    if (!thesis) {
      return (
        <span className="text-muted-foreground italic">
          No thesis written yet. Click Edit to add your investment thesis.
        </span>
      );
    }

    try {
      // Try parsing as JSON for structured thesis
      const structured = JSON.parse(thesis);
      if (typeof structured === "object" && structured !== null) {
        return (
          <div className="space-y-3 mt-1">
            {structured.primary_thesis && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight">Primary Thesis</p>
                <p className="text-sm text-foreground leading-relaxed">{structured.primary_thesis}</p>
              </div>
            )}
            {structured.key_catalysts && Array.isArray(structured.key_catalysts) && structured.key_catalysts.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight">Key Catalysts</p>
                <ul className="list-disc list-inside text-sm text-foreground/80">
                  {structured.key_catalysts.map((c: string, i: number) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {structured.risk_factors && Array.isArray(structured.risk_factors) && structured.risk_factors.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight">Risk Factors</p>
                <ul className="list-disc list-inside text-sm text-foreground/80">
                  {structured.risk_factors.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            {structured.conviction_drivers && Array.isArray(structured.conviction_drivers) && structured.conviction_drivers.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tight">Conviction Drivers</p>
                <p className="text-sm text-foreground/80">{structured.conviction_drivers.join(", ")}</p>
              </div>
            )}
          </div>
        );
      }
    } catch (e) {
      // Not JSON, fallback to plain text
    }

    return (
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
        {thesis}
      </p>
    );
  };

  if (!editing) {
    return (
      <Card className="p-4 bg-card border-border card-glow h-full">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> Investment Thesis
          </h3>
          <Button variant="ghost" size="sm" onClick={() => { 
            let displayValue = thesis || "";
            try {
              const parsed = JSON.parse(displayValue);
              displayValue = JSON.stringify(parsed, null, 2);
            } catch (e) {}
            setValue(displayValue); 
            setEditing(true); 
          }} className="h-6 px-2 text-[10px] font-mono">
            <Edit3 className="h-3 w-3 mr-1" /> Edit
          </Button>
        </div>
        {renderThesis()}
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border-border card-glow">
      <h3 className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
        <FileText className="h-3 w-3" /> Investment Thesis
      </h3>
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Why did you buy this stock? What's your stop-loss? Target price? Key triggers?"
        className="bg-muted border-border font-mono text-sm min-h-[120px] mb-3"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving} className="font-mono text-xs">
          {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
          Save
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(false)} className="font-mono text-xs">
          <X className="h-3 w-3 mr-1" /> Cancel
        </Button>
      </div>
    </Card>
  );
}
