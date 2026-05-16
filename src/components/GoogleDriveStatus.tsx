import { useQuery } from "@tanstack/react-query";
import { apiFetch, apiUrl } from "@/lib/apiFetch";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function GoogleDriveStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ["transcripts-drive-status"],
    queryFn: async () => {
      const r = await apiFetch(apiUrl("/api/transcripts/drive-status"), { cache: "no-store" });
      if (!r.ok) return { driveConfigured: false, needsConnect: false, isOAuthConfigured: false };
      return r.json();
    },
    staleTime: 30000, // 30 seconds
  });

  if (isLoading) return null;

  const { driveConfigured, needsConnect, isOAuthConfigured } = data || {};

  // if (!isOAuthConfigured) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="font-mono text-[10px] h-7 gap-1.5 px-2 hover:bg-muted/50 transition-all"
            onClick={() => {
              window.location.href = apiUrl("/api/auth/drive/start");
            }}
          >
            {needsConnect ? (
              <>
                <AlertTriangle className="h-3 w-3 text-terminal-amber animate-pulse" />
                <span className="text-terminal-amber hidden md:inline">Connect Drive</span>
              </>
            ) : driveConfigured ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-terminal-green" />
                <span className="text-muted-foreground hidden md:inline">Drive Connected</span>
              </>
            ) : (
              <>
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground hidden md:inline">Configure Drive</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="bg-popover border-border font-mono text-[10px]">
          {needsConnect 
            ? "Google Drive configured but not connected. Click to sign in." 
            : driveConfigured 
              ? "Google Drive is active. Click to reconnect if tokens expire."
              : "Google Drive is not fully configured. Click to start setup."
          }
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
