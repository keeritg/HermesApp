import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
} from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  Square,
  Image,
  Video,
  Loader2,
  Brain,
  CheckCircle2,
  X,
  MapPin,
  Tag,
  Footprints,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  storage,
  buildContext,
  makeId,
  type Recording,
} from "@/lib/storage";
import { analyzeAudioBlob } from "@/lib/audio-analyzer";

const LOCATION_TAGS = [
  "Kitchen",
  "Living room",
  "Bedroom",
  "Bathroom",
  "By the door",
  "By the window",
  "Outside",
  "Other",
];
const SITUATION_TAGS = [
  "Feeding time",
  "Playtime",
  "Nap time",
  "After sleeping",
  "When I arrived home",
  "During the night",
  "During grooming",
  "Other",
];
const AFTER_TAGS = [
  "Walked away",
  "Looked at food bowl",
  "Went to door",
  "Sat down",
  "Continued vocalizing",
  "Started playing",
  "Jumped onto me",
  "Other",
];

type Phase = "idle" | "recording" | "processing" | "tagging" | "analyzing" | "done";

function TagRow({
  icon,
  label,
  options,
  selected,
  onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(selected === opt ? "" : opt)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              selected === opt
                ? "bg-foreground text-background border-foreground"
                : "border-border text-muted-foreground hover:border-foreground/40"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Record() {
  const params = useParams<{ catId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>("idle");
  const [time, setTime] = useState(0);
  const [result, setResult] = useState<{
    label: string;
    confidence: number;
    durationSecs: number;
  } | null>(null);
  const [location, setLocation] = useState("");
  const [situation, setSituation] = useState("");
  const [afterBehavior, setAfterBehavior] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [attachedVideo, setAttachedVideo] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);
  const videoFileRef = useRef<HTMLInputElement>(null);

  const catProfile = storage.getProfile(params.catId);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "hsl(var(--background))";
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };
    draw();
  }, []);

  const stopWaveform = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const startRecording = async () => {
    setMicError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const durationSecs = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || "audio/webm",
        });
        stopWaveform();
        streamRef.current?.getTracks().forEach((t) => t.stop());
        setPhase("processing");
        try {
          const classification = await analyzeAudioBlob(blob);
          setResult({
            label: classification.label,
            confidence: classification.confidence,
            durationSecs,
          });
          setPhase("tagging");
        } catch {
          setPhase("idle");
          setMicError(
            "Couldn't analyze the recording. Please try again.",
          );
        }
      };

      mr.start();
      startTimeRef.current = Date.now();
      setTime(0);
      setPhase("recording");

      timerRef.current = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);

      setTimeout(drawWaveform, 100);
    } catch {
      setMicError(
        "Microphone access was denied. Please allow microphone access and try again.",
      );
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const handleSave = async () => {
    if (!result) return;
    setPhase("analyzing");

    const history = storage.getRecordings(params.catId).map((r) => ({
      label: r.label,
      confidence: r.confidence,
      context: r.context,
      prediction: r.prediction,
      timestamp: r.timestamp,
    }));

    const context = buildContext(location, situation, afterBehavior);
    let prediction = "";
    let needsMoreData = false;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: result.label,
          confidence: result.confidence,
          context,
          history,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        needsMoreData = data.needsMoreData === true;
        prediction = needsMoreData ? "" : (data.error ?? "");
      } else {
        prediction = data.prediction;
      }
    } catch {
      prediction = "";
    }

    const newRecording: Recording = {
      id: makeId(),
      catId: params.catId,
      timestamp: Date.now(),
      label: result.label,
      confidence: result.confidence,
      durationSecs: result.durationSecs,
      location,
      situation,
      afterBehavior,
      context,
      prediction,
      needsMoreData,
    };

    storage.saveRecording(newRecording);
    setPhase("done");

    if (needsMoreData) {
      const remaining = 3 - (history.length + 1);
      toast({
        title: "Recording saved",
        description:
          remaining > 0
            ? `${remaining} more recording${remaining === 1 ? "" : "s"} to unlock predictions.`
            : "Almost there — keep going!",
      });
    } else {
      toast({
        title: "Recording saved",
        description: "AI prediction generated.",
      });
    }

    navigate(`/profile/${params.catId}`);
  };

  const handleImageAttach = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = document.createElement("img");
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(300 / img.width, 300 / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      setAttachedImage(canvas.toDataURL("image/jpeg", 0.75));
    };
    img.src = url;
  };

  const handleVideoAttach = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setAttachedVideo(true);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopWaveform();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopWaveform]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (!catProfile) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-6 pb-24">
        <header className="pt-10 pb-8 flex items-center gap-4">
          <button
            onClick={() => navigate(`/profile/${params.catId}`)}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-xl font-semibold">Record</h1>
            <p className="text-sm text-muted-foreground">{catProfile.name}</p>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {(phase === "idle" || phase === "recording") && (
            <motion.div
              key="capture"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-8"
            >
              <div className="flex flex-col items-center gap-6 py-8">
                <div className="relative">
                  <AnimatePresence>
                    {phase === "recording" && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 0.25, scale: 1.3 }}
                        exit={{ opacity: 0 }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.4,
                          repeatType: "reverse",
                        }}
                        className="absolute inset-0 bg-red-500 rounded-full z-0"
                      />
                    )}
                  </AnimatePresence>

                  <button
                    onClick={phase === "idle" ? startRecording : stopRecording}
                    className={`relative z-10 w-44 h-44 rounded-full flex flex-col items-center justify-center gap-3 shadow-lg transition-all duration-200 active:scale-95 ${
                      phase === "recording"
                        ? "bg-red-500 text-white shadow-red-500/30"
                        : "bg-foreground text-background shadow-foreground/20"
                    }`}
                  >
                    {phase === "recording" ? (
                      <>
                        <Square className="h-10 w-10 fill-current" />
                        <span className="font-mono text-lg font-medium">
                          {formatTime(time)}
                        </span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-10 w-10" />
                        <span className="text-base font-medium">
                          Tap to Record
                        </span>
                      </>
                    )}
                  </button>
                </div>

                {phase === "recording" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="w-full bg-foreground rounded-2xl p-4 overflow-hidden"
                  >
                    <canvas
                      ref={canvasRef}
                      width={400}
                      height={80}
                      className="w-full"
                    />
                  </motion.div>
                )}
              </div>

              {phase === "idle" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider text-center">
                    Attach media (optional)
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => imageFileRef.current?.click()}
                      className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border transition-all ${
                        attachedImage
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      {attachedImage ? (
                        <img
                          src={attachedImage}
                          alt="Attached"
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <Image className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {attachedImage ? "Image attached" : "Add image"}
                      </span>
                    </button>

                    <button
                      onClick={() => videoFileRef.current?.click()}
                      className={`flex-1 flex flex-col items-center gap-2 py-5 rounded-2xl border transition-all ${
                        attachedVideo
                          ? "border-foreground bg-foreground/5"
                          : "border-border hover:border-foreground/30"
                      }`}
                    >
                      {attachedVideo ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <Video className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {attachedVideo ? "Video attached" : "Add video"}
                      </span>
                    </button>
                  </div>

                  {(attachedImage || attachedVideo) && (
                    <button
                      onClick={() => {
                        setAttachedImage(null);
                        setAttachedVideo(false);
                      }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mx-auto"
                    >
                      <X className="h-3 w-3" />
                      Remove attachments
                    </button>
                  )}
                </motion.div>
              )}

              {micError && (
                <p className="text-sm text-destructive text-center bg-destructive/10 rounded-2xl px-4 py-3">
                  {micError}
                </p>
              )}
            </motion.div>
          )}

          {phase === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground"
            >
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Analyzing audio pattern…</p>
            </motion.div>
          )}

          {phase === "tagging" && result && result.label === "Silent / No vocalization" && (
            <motion.div
              key="silent"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-muted/50 border border-border rounded-3xl p-8 flex flex-col items-center text-center space-y-4">
                <div className="text-3xl">🔇</div>
                <div>
                  <h2 className="text-lg font-semibold">No vocalization detected</h2>
                  <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                    The recording was too quiet or didn't contain a recognizable sound. Make sure your microphone is close to Leo when he vocalizes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setResult(null);
                  setPhase("idle");
                }}
                className="w-full bg-foreground text-background font-medium text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-150"
              >
                Try Again
              </button>
            </motion.div>
          )}

          {phase === "tagging" && result && result.label !== "Silent / No vocalization" && (
            <motion.div
              key="tagging"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-card border border-border rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Detection
                  </span>
                  <span className="font-mono text-xs bg-muted px-2.5 py-1 rounded-full">
                    {(result.confidence * 100).toFixed(0)}% confidence
                  </span>
                </div>
                <h2 className="text-2xl font-semibold">{result.label}</h2>
                {attachedImage && (
                  <img
                    src={attachedImage}
                    alt="Attached"
                    className="w-full h-32 object-cover rounded-2xl"
                  />
                )}
              </div>

              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">
                  Add context to help the AI understand what was happening
                  (optional):
                </p>
                <TagRow
                  icon={<MapPin className="h-3.5 w-3.5" />}
                  label="Location"
                  options={LOCATION_TAGS}
                  selected={location}
                  onSelect={setLocation}
                />
                <TagRow
                  icon={<Tag className="h-3.5 w-3.5" />}
                  label="Situation"
                  options={SITUATION_TAGS}
                  selected={situation}
                  onSelect={setSituation}
                />
                <TagRow
                  icon={<Footprints className="h-3.5 w-3.5" />}
                  label="What happened after"
                  options={AFTER_TAGS}
                  selected={afterBehavior}
                  onSelect={setAfterBehavior}
                />
              </div>

              <button
                onClick={handleSave}
                className="w-full bg-foreground text-background font-medium text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-150"
              >
                Save Recording
              </button>
            </motion.div>
          )}

          {phase === "analyzing" && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground"
            >
              <Brain className="h-8 w-8 animate-pulse text-primary" />
              <p className="text-sm font-medium">AI is thinking…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <input
        ref={imageFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageAttach}
      />
      <input
        ref={videoFileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoAttach}
      />
    </div>
  );
}
