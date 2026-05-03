import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import { Loader2, TrendingUp, TrendingDown, Minus, Info, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  stockId: string;
}

export function QuarterlyMetricsTab({ stockId }: Props) {
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ["quarterly-metrics-xbrl", stockId],
    queryFn: async () => {
      const r = await apiFetch(`/api/xbrl/metrics/${stockId}`);
      if (!r.ok) throw new Error("Failed to fetch metrics");
      return r.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !metrics || metrics.length === 0) {
    return (
      <Card className="p-12 text-center bg-card border-border">
        <p className="text-muted-foreground font-mono text-sm">
          No quarterly XBRL metrics found for this stock.
          <br />
          <span className="text-xs opacity-60">Try fetching latest filings to trigger XBRL extraction.</span>
        </p>
      </Card>
    );
  }

  const formatCr = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return "₹" + (val / 10000000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Cr";
  };

  const getGrowthColor = (val: number | null) => {
    if (val === null) return "text-muted-foreground";
    return val > 0 ? "text-terminal-green" : val < 0 ? "text-terminal-red" : "text-muted-foreground";
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
            Official Quarterly Results (XBRL Truth)
          </h3>
          <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30">
            Unit: Crores (Extracted from Lakhs)
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="w-[140px] font-mono text-[10px] uppercase text-muted-foreground">Quarter</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">Revenue</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">PAT</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">Rec. Days</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">Inv. Days</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">Net Cash</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">CFO/PAT</TableHead>
                <TableHead className="text-center font-mono text-[10px] uppercase text-muted-foreground">V3 Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m: any) => (
                <TableRow key={m.quarter} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-foreground">
                    {m.quarter}
                    <div className="text-[9px] font-normal text-muted-foreground mt-0.5">
                      {m.period_end_date ? new Date(m.period_end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-mono text-xs text-foreground">{formatCr(m.revenue_from_ops)}</div>
                    {m.revenue_growth_yoy !== null && (
                      <div className={`text-[9px] font-mono flex items-center justify-end gap-1 ${getGrowthColor(m.revenue_growth_yoy)}`}>
                        {m.revenue_growth_yoy > 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                        {Math.abs(m.revenue_growth_yoy)}% YoY
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-mono text-xs text-foreground">{formatCr(m.pat)}</div>
                    {m.pat_growth_yoy !== null && (
                      <div className={`text-[9px] font-mono flex items-center justify-end gap-1 ${getGrowthColor(m.pat_growth_yoy)}`}>
                        {m.pat_growth_yoy > 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                        {Math.abs(m.pat_growth_yoy)}% YoY
                      </div>
                    )}
                  </TableCell>
                  
                  {/* V3 Enrichment Columns */}
                  <TableCell className="text-right font-mono text-xs text-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted decoration-muted-foreground/30">
                          {m.receivable_days != null ? Math.round(Number(m.receivable_days)) : "—"}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-[10px]">Receivables: {formatCr(m.receivables)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-foreground">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="cursor-help underline decoration-dotted decoration-muted-foreground/30">
                          {m.inventory_days != null ? Math.round(Number(m.inventory_days)) : "—"}
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-[10px]">Inventory: {formatCr(m.inventory)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs ${m.net_cash > 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                    {formatCr(m.net_cash)}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs ${m.cfo_pat_ratio && Number(m.cfo_pat_ratio) > 1 ? 'text-terminal-green' : 'text-terminal-amber'}`}>
                    {m.cfo_pat_ratio ? Number(m.cfo_pat_ratio).toFixed(2) : "—"}
                  </TableCell>

                  <TableCell className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            variant="outline" 
                            className={`font-mono text-[9px] uppercase ${
                              m.receivables != null ? 'text-terminal-cyan border-terminal-cyan/30 bg-terminal-cyan/5' :
                              m.confidence === 'high' ? 'text-terminal-green border-terminal-green/30 bg-terminal-green/5' :
                              m.confidence === 'medium' ? 'text-terminal-amber border-terminal-amber/30 bg-terminal-amber/5' :
                              'text-terminal-red border-terminal-red/30 bg-terminal-red/5'
                            }`}
                          >
                            {m.receivables != null ? 'V3 Deep' : m.confidence}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover border-border max-w-[250px] p-2">
                          <p className="text-[10px] font-mono leading-relaxed">
                            {m.receivables != null 
                              ? "Enriched with deep data from raw XML filing (Balance Sheet/Cash Flow extracted)." 
                              : (m.notes || "Standard NSE API summary data.")}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-muted/30 border-border border-dashed flex items-start gap-3">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-mono text-[10px] font-bold uppercase text-foreground">Truth Layer Data</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              These metrics are extracted directly from NSE XBRL filings (XML). Unlike Screener data which is crowdsourced/backfilled, 
              this is the official data as reported by the company to the exchange.
            </p>
          </div>
        </Card>
        {metrics.some((m: any) => m.exceptional_items && m.exceptional_items !== 0) && (
          <Card className="p-4 bg-terminal-amber/5 border-terminal-amber/20 border flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-terminal-amber shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-mono text-[10px] font-bold uppercase text-terminal-amber">Exceptional Items Detected</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                One or more quarters contain one-off items. Our EBITDA calculation automatically removes these to show true operational performance.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
