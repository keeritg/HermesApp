import { useState, useEffect } from "react";
import { Clock, ArrowLeft, Trash2, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type LogEntry = {
  id: string;
  timestamp: number;
  label: string;
  confidence: number;
  context: string;
  prediction: string;
};

export default function History() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("hermes_logs");
    if (saved) {
      try {
        setLogs(JSON.parse(saved).sort((a: LogEntry, b: LogEntry) => b.timestamp - a.timestamp));
      } catch (e) {
        console.error("Failed to parse logs", e);
      }
    }
  }, []);

  const clearHistory = () => {
    localStorage.removeItem("hermes_logs");
    setLogs([]);
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ts));
  };

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
        {logs.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearHistory} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </header>

      <main className="flex-1">
        {logs.length === 0 ? (
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
            {logs.map((log) => (
              <div key={log.id} className="bg-card border rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-medium">{log.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{formatDate(log.timestamp)}</p>
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