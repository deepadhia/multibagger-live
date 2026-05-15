import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiFetch";
import { Loader2, TrendingUp, TrendingDown, Info, AlertTriangle, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
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

  const MetricCell = ({ field, row, type = 'currency' }: { field: string, row: any, type?: 'currency' | 'number' | 'ratio' }) => {
    const meta = row.metric_metadata?.[field] || {};
    const source = meta.source || row.metric_sources?.[field] || 'unknown';
    const value = row[field];
    const isValid = meta.derived_valid !== false;
    const isHighRisk = meta.age_quarters > 2 || meta.confidence === 0;
    const isFallback = meta.source === 'fallback';

    let displayVal = "—";
    if (value != null && isValid) {
      if (type === 'currency') displayVal = formatCr(value);
      else if (type === 'ratio') displayVal = Number(value).toFixed(2);
      else displayVal = Math.round(Number(value)).toString();
    }

    const colorClasses = {
      xbrl: "text-foreground",
      api: "text-muted-foreground opacity-80",
      derived: "text-terminal-purple opacity-90",
      fallback: "text-terminal-amber",
      missing: "text-muted-foreground opacity-40"
    }[source as string] || "text-foreground";

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="cursor-help w-full text-right">
            <div className={`font-mono text-xs flex items-center justify-end gap-1 ${isValid ? colorClasses : 'text-terminal-red line-through opacity-50'}`}>
              {displayVal}
              {isFallback && <Clock className="h-2 w-2 opacity-60" />}
              {!isValid && <ShieldAlert className="h-2 w-2" />}
            </div>
          </TooltipTrigger>
          <TooltipContent className="bg-popover border-border p-3 space-y-2 max-w-[200px]">
            <div className="flex items-center justify-between border-b border-border pb-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-tighter">LINEAGE</span>
              <Badge variant="outline" className="text-[8px] h-4 uppercase">{source}</Badge>
            </div>
            <div className="space-y-1 text-[9px] font-mono">
              <div className="flex justify-between"><span>Confidence:</span> <span className={meta.confidence > 80 ? 'text-terminal-green' : 'text-terminal-amber'}>{meta.confidence || 0}%</span></div>
              {meta.age_quarters > 0 && <div className="flex justify-between"><span>Age:</span> <span className="text-terminal-amber">{meta.age_quarters}Q OLD</span></div>}
              {meta.ref_quarter && <div className="flex justify-between"><span>Ref Quarter:</span> <span>{meta.ref_quarter}</span></div>}
              {!isValid && <div className="mt-2 p-1 bg-terminal-red/10 border border-terminal-red/20 text-terminal-red font-bold text-[8px] uppercase">
                INVALID: {meta.invalid_reason || 'STALE_DATA'}
              </div>}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border overflow-hidden">
        <div className="p-4 border-b border-border/50 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-foreground">
              Official Quarterly Results (Truth Engine)
            </h3>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="font-mono text-[10px] bg-primary/10 text-primary border-primary/30">
              Unit: Crores
            </Badge>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/50 hover:bg-transparent">
                <TableHead className="w-[140px] font-mono text-[10px] uppercase text-muted-foreground">Quarter | Score</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">Revenue</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">PAT</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">Rec. Days</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">Inv. Days</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">Net Cash</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">CFO/PAT</TableHead>
                <TableHead className="text-center font-mono text-[10px] uppercase text-muted-foreground">Reliability</TableHead>
                <TableHead className="text-right font-mono text-[10px] uppercase text-muted-foreground">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m: any) => (
                <TableRow key={m.quarter} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-foreground">
                    <div className="flex items-center justify-between">
                      <span>{m.quarter}</span>
                      <span className={`text-[10px] ${m.reliability_score >= 80 ? 'text-terminal-green' : m.reliability_score >= 50 ? 'text-terminal-amber' : 'text-terminal-red'}`}>
                        {m.reliability_score || 0}%
                      </span>
                    </div>
                    <div className="text-[9px] font-normal text-muted-foreground mt-0.5">
                      {m.period_end_date ? new Date(m.period_end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell field="revenue_from_ops" row={m} />
                    {m.revenue_growth_yoy !== null && (
                      <div className={`text-[9px] font-mono flex items-center justify-end gap-1 ${getGrowthColor(m.revenue_growth_yoy)}`}>
                        {m.revenue_growth_yoy > 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                        {Math.abs(m.revenue_growth_yoy)}% YoY
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell field="pat" row={m} />
                    {m.pat_growth_yoy !== null && (
                      <div className={`text-[9px] font-mono flex items-center justify-end gap-1 ${getGrowthColor(m.pat_growth_yoy)}`}>
                        {m.pat_growth_yoy > 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                        {Math.abs(m.pat_growth_yoy)}% YoY
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <MetricCell field="receivable_days" row={m} type="number" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell field="inventory_days" row={m} type="number" />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell field="net_cash" row={m} />
                  </TableCell>
                  <TableCell className="text-right">
                    <MetricCell field="cfo_pat_ratio" row={m} type="ratio" />
                  </TableCell>

                  <TableCell className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          {(() => {
                            const score = m.reliability_score || 0;
                            const isDeep = m.source_preferred === 'xml';
                            
                            let label = isDeep ? 'V3 DEEP' : 'V3 MIXED';
                            if (score < 40) label = 'UNRELIABLE';

                            const variantClass = score >= 80 
                              ? 'text-terminal-cyan border-terminal-cyan/30 bg-terminal-cyan/5'
                              : score >= 50 
                              ? 'text-terminal-amber border-terminal-amber/30 bg-terminal-amber/5'
                              : 'text-terminal-red border-terminal-red/30 bg-terminal-red/5';

                            return (
                              <Badge variant="outline" className={`font-mono text-[9px] uppercase ${variantClass}`}>
                                {label}
                              </Badge>
                            );
                          })()}
                        </TooltipTrigger>
                        <TooltipContent className="bg-popover border-border max-w-[250px] p-2">
                          <p className="text-[10px] font-mono leading-relaxed">
                            <div className="space-y-1">
                              <p className="font-bold border-b border-border pb-1 mb-1">Reliability Breakdown:</p>
                              <div className="flex justify-between"><span>Overall Quality:</span> <span className="font-bold">{m.reliability_score}%</span></div>
                              <div className="flex justify-between"><span>Prefered Source:</span> <span className="font-bold uppercase">{m.source_preferred}</span></div>
                              <div className="flex justify-between"><span>XML Confidence:</span> <span className="font-bold">{m.xml_confidence_score}%</span></div>
                            </div>
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>

                  <TableCell className="text-right">
                    {m.gdrive_url ? (
                      <button 
                        onClick={() => window.open(m.gdrive_url, '_blank')}
                        className="text-primary hover:text-primary/80 transition-colors p-1"
                        title="Download Source XBRL"
                      >
                        <ShieldCheck className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 bg-muted/30 border-border border-dashed flex items-start gap-3">
          <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-mono text-[10px] font-bold uppercase text-foreground">Data Lineage Engine</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Every metric carries auditable metadata. <span className="text-terminal-amber">Amber</span> values are fallbacks from previous filings. <span className="text-terminal-red line-through">Struck-through</span> values are invalidated due to staleness (&gt;2Q) or period mismatch.
            </p>
          </div>
        </Card>
        <Card className="p-4 bg-terminal-purple/5 border-terminal-purple/20 border flex items-start gap-3">
          <Info className="h-4 w-4 text-terminal-purple shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-mono text-[10px] font-bold uppercase text-terminal-purple">Temporal Truth</h4>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              We enforce temporal consistency. If Balance Sheet data is more than 2 quarters old, it is automatically discarded to prevent fake trends in derived ratios.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
