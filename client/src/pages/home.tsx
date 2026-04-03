import { useState, useEffect, useRef } from "react";
import { Mic, Square, Loader2, Sparkles, AudioLines, Settings2, Plus, Clock, FileDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<null | { label: string; confidence: number }>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleRecording = () => {
    if (recording) {
      setRecording(false);
      setProcessing(true);
      if (timerRef.current) clearInterval(timerRef.current);
      
      // Simulate processing
      setTimeout(() => {
        setProcessing(false);
        setResult({ label: "Short meow (attention)", confidence: 0.86 });
      }, 2000);
    } else {
      setResult(null);
      setRecording(true);
      setTime(0);
      setProcessing(false);
      timerRef.current = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto space-y-12">
        <header className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span data-testid="text-badge">CatSignal AI</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl" data-testid="text-title">
            What are they saying?
          </h1>
          <p className="text-base text-muted-foreground max-w-sm mx-auto" data-testid="text-subtitle">
            Record a vocalization and let AI analyze the pattern and context.
          </p>
        </header>

        <main className="flex flex-col items-center justify-center gap-8 py-8">
          <div className="relative">
            <AnimatePresence>
              {recording && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ repeat: Infinity, duration: 1.5, repeatType: "reverse" }}
                  className="absolute inset-0 bg-red-500/20 rounded-full z-0"
                />
              )}
            </AnimatePresence>
            
            <Button
              size="lg"
              className={`relative z-10 w-48 h-48 rounded-full shadow-lg transition-all duration-300 ${
                recording 
                  ? "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30" 
                  : "bg-primary hover:bg-primary/90 shadow-primary/20"
              }`}
              onClick={toggleRecording}
              data-testid="button-record-main"
            >
              <div className="flex flex-col items-center gap-3">
                {recording ? (
                  <>
                    <Square className="h-12 w-12 fill-current" />
                    <span className="text-lg font-medium font-mono">{formatTime(time)}</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-12 w-12" />
                    <span className="text-lg font-medium">Tap to Record</span>
                  </>
                )}
              </div>
            </Button>
          </div>

          <div className="h-40 w-full flex items-center justify-center">
            <AnimatePresence mode="wait">
              {processing && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3 text-muted-foreground"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm font-medium">Analyzing audio pattern...</p>
                </motion.div>
              )}

              {result && !recording && !processing && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  className="w-full bg-card border rounded-3xl p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AudioLines className="h-4 w-4" />
                      <span>Analysis Complete</span>
                    </div>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      {(result.confidence * 100).toFixed(0)}% Confidence
                    </Badge>
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-2xl font-semibold">{result.label}</h3>
                    <p className="text-sm text-muted-foreground">Matches typical patterns for hunger or soliciting attention.</p>
                  </div>
                  
                  <div className="pt-4 flex gap-2 border-t">
                    <Button variant="outline" className="flex-1 rounded-xl" size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Add Context
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-xl" size="sm">
                      <FileDown className="mr-2 h-4 w-4" /> Save Log
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
        
        <footer className="flex justify-center gap-6 text-muted-foreground pt-4">
          <Button variant="ghost" size="sm" className="rounded-full" data-testid="button-history">
            <Clock className="mr-2 h-4 w-4" /> History
          </Button>
          <Button variant="ghost" size="sm" className="rounded-full" data-testid="button-settings">
            <Settings2 className="mr-2 h-4 w-4" /> Settings
          </Button>
        </footer>
      </div>
    </div>
  );
}
