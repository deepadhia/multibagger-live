import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStockCommitments } from "@/hooks/useStocks";
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  TrendingUp, 
  Info,
  Calendar,
  Target,
  FileText
} from "lucide-react";

interface Props {
  stockId: string;
}

export function PromisesTab({ stockId }: Props) {
  const { data: dbCommitments, isLoading } = useStockCommitments(stockId);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const commitments = dbCommitments || [];

  // Metrics computation
  const total = commitments.length;
  const achieved = commitments.filter((c) => c.status === "Achieved" || c.status === "kept").length;
  const missed = commitments.filter((c) => c.status === "Missed" || c.status === "broken").length;
  const delayed = commitments.filter((c) => c.status === "Delayed").length;
  const pending = commitments.filter((c) => c.status === "Pending" || c.status === "pending").length;

  const resolved = achieved + missed;
  const credibilityRate = resolved > 0 ? Math.round((achieved / resolved) * 100) : total > 0 ? 100 : null;

  // Credibility tier decision
  let credibilityTier = "Tier 2 (Neutral)";
  let tierColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  if (credibilityRate !== null) {
    if (credibilityRate >= 80 && missed === 0) {
      credibilityTier = "Tier 1 (High Track Record)";
      tierColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    } else if (missed > 2 || (credibilityRate < 50 && resolved > 0)) {
      credibilityTier = "Tier 3 (High Risk / Overpromises)";
      tierColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
    }
  }

  // Filtered commitments list
  const filteredCommitments = commitments.filter((c) => {
    if (filterStatus === "all") return true;
    const s = c.status.toLowerCase();
    if (filterStatus === "achieved") return s === "achieved" || s === "kept";
    if (filterStatus === "missed") return s === "missed" || s === "broken";
    if (filterStatus === "delayed") return s === "delayed";
    if (filterStatus === "pending") return s === "pending";
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-5 text-slate-200">
      {/* Executive Credibility Overview Dashboard */}
      <Card className="p-5 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-800 border-slate-800 shadow-xl rounded-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Main Score Indicator */}
          <div className="flex items-center gap-5">
            <div className="relative flex items-center justify-center min-w-[90px] min-h-[90px] rounded-2xl bg-slate-950/80 border border-slate-800 p-3 shadow-inner">
              <div className="text-center">
                <span className={`text-3xl font-extrabold font-mono tracking-tight ${
                  credibilityRate === null ? "text-slate-400" :
                  credibilityRate >= 80 ? "text-emerald-400" :
                  credibilityRate >= 50 ? "text-amber-400" : "text-rose-400"
                }`}>
                  {credibilityRate !== null ? `${credibilityRate}%` : "—"}
                </span>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mt-0.5">
                  Track Record
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`font-mono text-xs px-2.5 py-0.5 font-semibold ${tierColor}`}>
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 inline-block" />
                  {credibilityTier}
                </Badge>
                <Badge variant="secondary" className="bg-slate-800 text-slate-300 font-mono text-xs">
                  {total} Tracked Commitments
                </Badge>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md">
                Institutional analysis of management guidance vs. reported quarterly financials across transcripts and disclosures.
              </p>
            </div>
          </div>

          {/* Detailed Status Breakdown Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg text-center min-w-[90px]">
              <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Achieved
              </span>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{achieved}</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg text-center min-w-[90px]">
              <span className="text-xs font-semibold text-amber-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Pending
              </span>
              <p className="text-2xl font-bold font-mono text-amber-400 mt-1">{pending}</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg text-center min-w-[90px]">
              <span className="text-xs font-semibold text-orange-400 flex items-center justify-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Delayed
              </span>
              <p className="text-2xl font-bold font-mono text-orange-400 mt-1">{delayed}</p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-lg text-center min-w-[90px]">
              <span className="text-xs font-semibold text-rose-400 flex items-center justify-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> Missed
              </span>
              <p className="text-2xl font-bold font-mono text-rose-400 mt-1">{missed}</p>
            </div>
          </div>

        </div>
      </Card>

      {/* Mobile-Friendly Filter Pills Toolbar */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFilterStatus("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === "all"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              All ({total})
            </button>
            <button
              onClick={() => setFilterStatus("achieved")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === "achieved"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-emerald-400"
              }`}
            >
              Achieved ({achieved})
            </button>
            <button
              onClick={() => setFilterStatus("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === "pending"
                  ? "bg-amber-600 text-white shadow-md shadow-amber-600/20"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-amber-400"
              }`}
            >
              Pending ({pending})
            </button>
            {delayed > 0 && (
              <button
                onClick={() => setFilterStatus("delayed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  filterStatus === "delayed"
                    ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                    : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-orange-400"
                }`}
              >
                Delayed ({delayed})
              </button>
            )}
            <button
              onClick={() => setFilterStatus("missed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === "missed"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                  : "bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
              }`}
            >
              Missed ({missed})
            </button>
          </div>
        </div>
      </div>

      {/* Commitments List Cards (Clean, Responsive, Card-Glow Design) */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 font-mono text-sm">
          Loading management commitments...
        </div>
      ) : filteredCommitments.length === 0 ? (
        <Card className="p-8 text-center bg-slate-900/50 border-slate-800 rounded-xl">
          <Info className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-300">No management commitments found matching this filter.</p>
          <p className="text-xs text-slate-500 mt-1">Select another filter pill above to view commitments.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredCommitments.map((c) => {
            const isAchieved = c.status === "Achieved" || c.status === "kept";
            const isMissed = c.status === "Missed" || c.status === "broken";
            const isDelayed = c.status === "Delayed";
            const isPending = c.status === "Pending" || c.status === "pending";

            const isExpanded = expandedId === c.id;

            return (
              <Card
                key={c.id}
                className={`p-4 bg-slate-900/90 border transition-all rounded-xl shadow-md ${
                  isAchieved ? "border-emerald-500/30 hover:border-emerald-500/60" :
                  isMissed ? "border-rose-500/30 hover:border-rose-500/60" :
                  isDelayed ? "border-orange-500/30 hover:border-orange-500/60" :
                  "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="space-y-3">
                  
                  {/* Top Bar: Badges & Status */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    
                    {/* Left: Issued Quarter & Target Deadline Badges */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      {c.quarter && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                          <Calendar className="w-3 h-3 mr-1 text-indigo-400" />
                          Made in: <strong className="ml-1 text-white">{c.quarter}</strong>
                        </span>
                      )}
                      {c.timeline && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 font-mono text-[11px] border border-slate-700">
                          <Target className="w-3 h-3 mr-1 text-amber-400" />
                          Target: <strong className="ml-1 text-amber-300">{c.timeline}</strong>
                        </span>
                      )}
                      {c.metric && (
                        <Badge variant="secondary" className="bg-indigo-950/60 text-indigo-300 border-indigo-800/40 text-[10px] font-mono">
                          {c.metric} {c.target_value ? `: ${c.target_value}` : ""}
                        </Badge>
                      )}
                    </div>

                    {/* Right: Status Pill */}
                    <div>
                      {isAchieved && (
                        <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 font-semibold text-xs px-2.5 py-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Achieved
                        </Badge>
                      )}
                      {isMissed && (
                        <Badge className="bg-rose-500/15 text-rose-400 border-rose-500/30 font-semibold text-xs px-2.5 py-0.5">
                          <XCircle className="w-3.5 h-3.5 mr-1 inline" /> Missed
                        </Badge>
                      )}
                      {isDelayed && (
                        <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 font-semibold text-xs px-2.5 py-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 inline" /> Delayed
                        </Badge>
                      )}
                      {isPending && (
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 font-semibold text-xs px-2.5 py-0.5">
                          <Clock className="w-3.5 h-3.5 mr-1 inline" /> Pending
                        </Badge>
                      )}
                    </div>

                  </div>

                  {/* Commitment Statement */}
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-100 leading-snug">
                      {c.statement}
                    </p>
                  </div>

                  {/* Evidence / Concall Q&A Reason Section */}
                  {(c.evidence_summary || c.blockers_and_risks) && (
                    <div className="pt-1">
                      <button
                        onClick={() => toggleExpand(c.id)}
                        className="flex items-center text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        {isExpanded ? "Hide Concall Evidence & Notes" : "View Concall Evidence & Operational Delta"}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2 text-xs leading-relaxed animate-fadeIn">
                          {c.evidence_summary && (
                            <div>
                              <p className="font-semibold text-slate-300 font-mono text-[11px] mb-0.5">Financial Audit Evidence:</p>
                              <p className="text-slate-300 font-mono text-[11px] leading-normal bg-slate-900 p-2 rounded border border-slate-800/80">
                                {c.evidence_summary}
                              </p>
                            </div>
                          )}
                          {c.blockers_and_risks && (
                            <div>
                              <p className="font-semibold text-amber-400 font-mono text-[11px] mb-0.5">Concall Q&A Management Explanation:</p>
                              <p className="text-slate-400 font-mono text-[11px] leading-normal bg-amber-950/20 p-2 rounded border border-amber-900/30">
                                {c.blockers_and_risks}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
