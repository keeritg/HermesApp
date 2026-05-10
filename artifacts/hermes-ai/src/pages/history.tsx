import { Clock, ArrowLeft, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGetLogs, useClearLogs, getGetLogsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

export default function History() {
  const queryClient = useQueryClient();
  const { data: logs, isLoading } = useGetLogs();
  const clearLogsMutation = useClearLogs({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetLogsQueryKey() });
      },
    },
  });

  const clearHistory = () => {
    clearLogsMutation.mutate();
  };

  const formatDate = (createdAt: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(createdAt));
  };

  const sortedLogs = logs
    ? [...logs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    : [];

  return (
    <div className="min-h-screen bg-background flex flex-col p-4 md:p-8 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Leo's History</h1>
        </div>
        {sortedLogs.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearHistory}
            disabled={clearLogsMutation.isPending}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </header>

      <main className="flex-1">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <Loader2 className="h-8 w-8 animate-spin opacity-40" />
            <p>Loading history...</p>
          </div>
        ) : sortedLogs.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <Clock className="h-12 w-12 opacity-20" />
            <p>No recordings saved yet.</p>
            <Link href="/">
              <Button variant="outline" className="rounded-full mt-4">
                Record a sound
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedLogs.map((log) => (
              <div key={log.id} className="bg-card border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium">{log.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{formatDate(log.createdAt)}</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 shrink-0">
                    {(log.confidence * 100).toFixed(0)}% Match
                  </Badge>
                </div>

                {log.context && (
                  <div className="bg-muted/50 rounded-2xl p-3 text-sm">
                    <span className="font-medium">Context:</span> {log.context}
                  </div>
                )}

                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-medium text-sm">
                    <Sparkles className="h-4 w-4" />
                    <span>AI Prediction</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">
                    {log.prediction}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
