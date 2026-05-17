import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Newspaper, ExternalLink, ChevronDown, RefreshCw } from "lucide-react";
import { format, subMonths } from "date-fns";
import { apiFetch } from "@/lib/apiFetch";
import { useToast } from "@/hooks/use-toast";

interface Announcement {
  id: string;
  ticker: string;
  title: string;
  summary: string;
  priority: string;
  impact: string;
  processed_at: string;
  is_earnings_release: boolean;
  attachment_url?: string;
  raw_text?: string;
  filing_date?: string;
  category?: string;
}

export function CorporateAnnouncements({ stockId }: { stockId: string }) {
  const { toast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["corporate-announcements", stockId],
    queryFn: async () => {
      const r = await apiFetch(`/api/stocks/${stockId}/announcements`);
      if (!r.ok) throw new Error("Failed to fetch announcements");
      const json = await r.json();
      return json.announcements as Announcement[];
    },
    enabled: !!stockId,
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const r = await apiFetch(`/api/stocks/${stockId}/refresh-announcements`, { method: "POST" });
      if (!r.ok) throw new Error("Refresh failed");
      await refetch();
      toast({
        title: "Sync Complete",
        description: "Latest announcements fetched from NSE/BSE.",
      });
    } catch (err) {
      toast({
        title: "Sync Failed",
        description: "Could not connect to exchange APIs.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground font-mono text-sm">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading live news...
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-terminal-red font-mono text-sm">
        <AlertCircle className="h-4 w-4 mx-auto mb-2" />
        Error loading announcements.
      </div>
    );
  }


  const announcements = data || [];

  if (announcements.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end px-1">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 font-mono text-[10px] text-muted-foreground hover:text-primary"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh Feed
          </Button>
        </div>
        <div className="py-12 text-center text-muted-foreground font-mono text-sm border border-dashed border-border rounded-lg bg-muted/20">
          <Newspaper className="h-5 w-5 mx-auto mb-2 opacity-20" />
          No live news items tracked for this stock yet.
        </div>
      </div>
    );
  }

  // Pagination logic
  const itemsPerPage = 5;
  const totalPages = Math.ceil(announcements.length / itemsPerPage);
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedAnnouncements = announcements.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-3">
      <div className="flex justify-end px-1">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 font-mono text-[10px] text-muted-foreground hover:text-primary"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? "animate-spin" : ""}`} />
          Refresh Feed
        </Button>
      </div>
      {displayedAnnouncements.map((ann) => (
        <Card key={ann.id} className="p-4 bg-card border-border hover:border-primary/30 transition-all card-glow-hover">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div className="space-y-1 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {format(new Date(ann.filing_date || ann.processed_at), "dd MMM yyyy, HH:mm")}
                </span>
                {ann.is_earnings_release && (
                  <Badge className="bg-terminal-cyan/10 text-terminal-cyan border-terminal-cyan/30 font-mono text-[9px] h-4">
                    Results
                  </Badge>
                )}
                {ann.category && (
                  <Badge variant="secondary" className="font-mono text-[9px] h-4 bg-muted text-muted-foreground border-border uppercase">
                    {ann.category.replace(/_/g, " ")}
                  </Badge>
                )}
                <Badge variant="outline" className={`font-mono text-[9px] h-4 ${
                  ann.priority === "HIGH" ? "text-terminal-red border-terminal-red/30 bg-terminal-red/5" :
                  ann.priority === "MEDIUM" ? "text-terminal-amber border-terminal-amber/30 bg-terminal-amber/5" :
                  "text-muted-foreground border-border"
                }`}>
                  {ann.priority}
                </Badge>
              </div>
              <h4 className="text-sm font-semibold text-foreground leading-snug">
                {ann.title}
              </h4>
              {ann.summary && (
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {ann.summary}
                </p>
              )}
              {ann.raw_text && ann.raw_text.length > 0 && (
                <div className="mt-2 p-2 bg-muted/40 rounded border border-border/50">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-tighter mb-1">Important Info</p>
                  <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-3">
                    {ann.raw_text}
                  </p>
                </div>
              )}
            </div>
            
            <div className="shrink-0 flex flex-col items-end gap-2">
              <Badge variant="outline" className={`font-mono text-[9px] ${
                ann.impact === "POSITIVE" ? "text-terminal-green border-terminal-green/30 bg-terminal-green/10" :
                ann.impact === "NEGATIVE" ? "text-terminal-red border-terminal-red/30 bg-terminal-red/10" :
                "text-muted-foreground border-border"
              }`}>
                {ann.impact || "NEUTRAL"}
              </Badge>
              {ann.attachment_url && (
                <a 
                  href={ann.attachment_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] font-mono text-primary hover:underline mt-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View Filing
                </a>
              )}
            </div>
          </div>
        </Card>
      ))}
      
      {totalPages > 1 && (
        <div className="pt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-mono text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-3 font-mono text-[10px]"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 px-3 font-mono text-[10px]"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
