import { useState, useEffect, useRef } from "react";
import { Mic, Square, Loader2, Sparkles, AudioLines, Settings2, Plus, Clock, FileDown, CheckCircle2, Brain } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { startRecording, analyzeAudioBlob, type AudioClassification, type RecordingHandle, type VocalizationLabel } from "@/lib/audio-analyzer";
import { WaveformVisualizer } from "@/components/waveform-visualizer";

const VOCALIZATION_DESCRIPTIONS: Record<VocalizationLabel, string> = {
  "Short meow (attention)": "A quick, single-note call typically used to get your attention or say hello.",
  "Long meow (demanding)": "An extended, insistent meow often used to demand food, play, or access to a room.",
  "Yowl (distress or mating)": "A drawn-out, low cry that can signal distress, disorientation, or mating instinct.",
  "Purr (contentment)": "Typically indicates relaxation or a request for closeness and comfort.",
  "Chirp / Chatter (prey-focused)": "A rapid, stuttering sound usually directed at birds or small animals outside a window.",
  "Trill (greeting)": "A soft, rolling sound cats use to greet people or other cats they feel friendly toward.",
  "Hiss (defensive)": "A warning signal indicating fear, discomfort, or a desire to be left alone.",
  "Silent / No vocalization": "No clear vocalization was detected in this recording.",
};

type LogEntry = {
  id: string;
  timestamp: number;
  label: string;
  confidence: number;
  context: string;
  prediction: string;
};

const mapApiLogToEntry = (log: {
  id: string;
  label: string;
  confidence: number;
  context: string;
  prediction: string;
  createdAt: string;
}): LogEntry => ({
  id: log.id,
  timestamp: new Date(log.createdAt).getTime(),
  label: log.label,
  confidence: log.confidence,
  context: log.context,
  prediction: log.prediction,
});

export default function Home() {
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AudioClassification | null>(null);
  const [logSaved, setLogSaved] = useState(false);
  const [contextAdded, setContextAdded] = useState(false);
  const [showContextInput, setShowContextInput] = useState(false);
  const [contextText, setContextText] = useState("");
  const { toast } = useToast();

  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingHandleRef = useRef<RecordingHandle | null>(null);

  const getHistory = async (): Promise<LogEntry[]> => {
    try {
      const res = await fetch("/api/logs");
      if (!res.ok) return [];
      const data = await res.json();
      return (data as Parameters<typeof mapApiLogToEntry>[0][]).map(mapApiLogToEntry);
    } catch {
      return [];
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      setRecording(false);
      setProcessing(true);
      setRecordingStream(null);
      if (timerRef.current) clearInterval(timerRef.current);
      recordingHandleRef.current?.stop();
      recordingHandleRef.current = null;
    } else {
      setResult(null);
      setProcessing(false);

      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        toast({
          title: "Browser not supported",
          description: "Your browser doesn't support microphone recording. Try Chrome, Edge, or Firefox.",
        });
        return;
      }

      let handle: RecordingHandle;
      try {
        handle = await startRecording(async (blob) => {
          try {
            const classification = await analyzeAudioBlob(blob);
            setResult(classification);
          } catch {
            setProcessing(false);
            toast({
              title: "Analysis failed",
              description: "Couldn't analyze the recording. Please try again.",
            });
            return;
          }
          setProcessing(false);
          setLogSaved(false);
          setContextAdded(false);
          setShowContextInput(false);
          setContextText("");
        });
      } catch {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access in your browser to record Leo's vocalizations.",
        });
        return;
      }

      recordingHandleRef.current = handle;
      setRecordingStream(handle.stream);
      setRecording(true);
      setTime(0);
      timerRef.current = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    }
  };

  const handleSaveLog = async () => {
    if (!result) return;

    const history = await getHistory();
    setAnalyzing(true);

    let prediction = "";
    let needsMoreData = false;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: result.label,
          confidence: result.confidence,
          context: contextText,
          history: history.map((h) => ({
            label: h.label,
            confidence: h.confidence,
            context: h.context,
            prediction: h.prediction,
            timestamp: h.timestamp,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        needsMoreData = data.needsMoreData === true;
        prediction = data.error ?? "Unable to generate a prediction right now.";
      } else {
        prediction = data.prediction;
      }
    } catch {
      prediction = "Could not reach the AI service. Please try again.";
    } finally {
      setAnalyzing(false);
    }

    const newLog = {
      id: crypto.randomUUID(),
      label: result.label,
      confidence: result.confidence,
      context: contextText,
      prediction,
    };

    try {
      const saveRes = await fetch("/api/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog),
      });
      if (!saveRes.ok) {
        const errData = await saveRes.json().catch(() => ({}));
        const errMsg = (errData as { error?: string }).error ?? "Could not save the log. Please try again.";
        toast({ title: "Save failed", description: errMsg });
        return;
      }
    } catch {
      toast({
        title: "Save failed",
        description: "Could not reach the server. Please try again.",
      });
      return;
    }

    setLogSaved(true);

    if (needsMoreData) {
      toast({
        title: "Log Saved",
        description: prediction,
      });
    } else {
      toast({
        title: "Log Saved",
        description: "Leo's vocalization has been analyzed and saved.",
      });
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recordingHandleRef.current?.stop();
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
            <span data-testid="text-badge">HermesAI</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl" data-testid="text-title">
            What is Leo saying?
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

          <WaveformVisualizer stream={recordingStream} active={recording} />

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

              {analyzing && (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3 text-muted-foreground"
                >
                  <Brain className="h-6 w-6 animate-pulse text-primary" />
                  <p className="text-sm font-medium">AI is thinking...</p>
                </motion.div>
              )}

              {result && !recording && !processing && !analyzing && (
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
                    <p className="text-sm text-muted-foreground">{VOCALIZATION_DESCRIPTIONS[result.label] ?? result.label}</p>
                  </div>

                  {showContextInput ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-4 border-t space-y-3"
                    >
                      <Input
                        placeholder="e.g., by the fridge, next to me at the desk..."
                        value={contextText}
                        onChange={(e) => setContextText(e.target.value)}
                        className="text-sm rounded-xl"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          className="flex-1 rounded-xl"
                          size="sm"
                          onClick={() => {
                            setShowContextInput(false);
                            if (contextText.trim()) setContextAdded(true);
                          }}
                        >
                          Save Context
                        </Button>
                        <Button
                          variant="ghost"
                          className="rounded-xl"
                          size="sm"
                          onClick={() => setShowContextInput(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="pt-4 flex gap-2 border-t">
                      <Button
                        variant={contextAdded ? "secondary" : "outline"}
                        className="flex-1 rounded-xl transition-colors"
                        size="sm"
                        onClick={() => setShowContextInput(true)}
                        data-testid="button-add-context"
                      >
                        {contextAdded ? (
                          <><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Context Added</>
                        ) : (
                          <><Plus className="mr-2 h-4 w-4" /> Add Context</>
                        )}
                      </Button>
                      <Button
                        variant={logSaved ? "secondary" : "outline"}
                        className="flex-1 rounded-xl transition-colors"
                        size="sm"
                        onClick={handleSaveLog}
                        disabled={logSaved || analyzing}
                        data-testid="button-save-log"
                      >
                        {logSaved ? (
                          <><CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> Saved</>
                        ) : (
                          <><FileDown className="mr-2 h-4 w-4" /> Save Log</>
                        )}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>

        <footer className="flex justify-center gap-6 text-muted-foreground pt-4">
          <Link href="/history">
            <Button variant="ghost" size="sm" className="rounded-full" data-testid="button-history">
              <Clock className="mr-2 h-4 w-4" /> History
            </Button>
          </Link>
          <Button variant="ghost" size="sm" className="rounded-full" data-testid="button-settings">
            <Settings2 className="mr-2 h-4 w-4" /> Settings
          </Button>
        </footer>
      </div>
    </div>
  );
}
