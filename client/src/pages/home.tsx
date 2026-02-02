import { useMemo, useState } from "react";
import {
  Activity,
  AudioLines,
  Camera,
  ChevronRight,
  ClipboardList,
  Cpu,
  Database,
  Download,
  Filter,
  Leaf,
  Mic,
  PawPrint,
  Radar,
  Sparkles,
  Timer,
  Upload,
  Video,
  Wand2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ArchitectureOverview } from "@/components/architecture-overview";

type CaptureMode = "audio" | "video" | "sensor";

type CaptureEvent = {
  id: string;
  ts: string;
  source: "mic" | "camera" | "iot";
  label: string;
  confidence: number;
  context: string;
};

type Insight = {
  id: string;
  title: string;
  detail: string;
  signal: "audio" | "vision" | "context";
  strength: number;
};

const demoEvents: CaptureEvent[] = [
  {
    id: "evt-2401",
    ts: "07:18:12",
    source: "mic",
    label: "Short meow (attention)",
    confidence: 0.78,
    context: "Near kitchen • feeder last ran 6h ago",
  },
  {
    id: "evt-2402",
    ts: "07:22:41",
    source: "camera",
    label: "Tail upright + slow approach",
    confidence: 0.84,
    context: "Owner entered room • morning routine",
  },
  {
    id: "evt-2403",
    ts: "12:05:09",
    source: "iot",
    label: "Litter box visit",
    confidence: 0.92,
    context: "12 min after meal • water intake normal",
  },
  {
    id: "evt-2404",
    ts: "18:47:55",
    source: "mic",
    label: "Purr (resting)",
    confidence: 0.88,
    context: "On couch • low ambient noise",
  },
];

const demoInsights: Insight[] = [
  {
    id: "ins-1",
    title: "Vocalizations cluster before feeding window",
    detail:
      "Meow bursts are 2.3× more frequent in the 45 minutes leading up to your scheduled feeding time.",
    signal: "context",
    strength: 76,
  },
  {
    id: "ins-2",
    title: "Ear tilt + tail flick predicts overstimulation",
    detail:
      "In video segments, this posture often precedes disengagement within ~20 seconds.",
    signal: "vision",
    strength: 63,
  },
  {
    id: "ins-3",
    title: "Purr energy spectrum matches 'rest' state",
    detail:
      "Low-frequency harmonics are consistent across quiet sessions, suggesting a stable baseline.",
    signal: "audio",
    strength: 71,
  },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function SwiftPill({
  label,
  detail,
  testid,
}: {
  label: string;
  detail: string;
  testid: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border/60 bg-secondary/25 px-3 py-2"
      data-testid={testid}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium" data-testid={`${testid}-label`}>
          {label}
        </div>
        <Badge
          variant="secondary"
          className="rounded-full border border-border/60 bg-secondary/60 font-mono text-[11px]"
          data-testid={`${testid}-tag`}
        >
          Swift
        </Badge>
      </div>
      <div className="mt-1 text-xs text-muted-foreground" data-testid={`${testid}-detail`}>
        {detail}
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
  testid,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  testid: string;
}) {
  return (
    <div className="glass rounded-2xl p-4" data-testid={testid}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/80">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div
          className="text-2xl font-semibold tracking-tight text-foreground"
          data-testid={`${testid}-value`}
        >
          {value}
        </div>
        <div className="text-xs text-muted-foreground" data-testid={`${testid}-sub`}>
          {sub}
        </div>
      </div>
    </div>
  );
}

function SourcePill({
  source,
  testid,
}: {
  source: CaptureEvent["source"];
  testid: string;
}) {
  const map = {
    mic: { icon: <Mic className="h-3.5 w-3.5" />, label: "Audio" },
    camera: { icon: <Camera className="h-3.5 w-3.5" />, label: "Video" },
    iot: { icon: <Radar className="h-3.5 w-3.5" />, label: "IoT" },
  } as const;

  return (
    <Badge
      variant="secondary"
      className="gap-1 rounded-full border border-border/60 bg-secondary/60 px-2 py-1 text-[12px]"
      data-testid={testid}
    >
      {map[source].icon}
      {map[source].label}
    </Badge>
  );
}

export default function Home() {
  const [mode, setMode] = useState<CaptureMode>("audio");
  const [recording, setRecording] = useState(false);
  const [includeAmbient, setIncludeAmbient] = useState(true);
  const [location, setLocation] = useState("kitchen");
  const [tag, setTag] = useState("");

  const sessionProgress = useMemo(() => {
    if (!recording) return 24;
    if (mode === "audio") return 67;
    if (mode === "video") return 52;
    return 41;
  }, [recording, mode]);

  const modeCopy = useMemo(() => {
    switch (mode) {
      case "audio":
        return {
          title: "Audio capture + vocal analysis",
          subtitle: "Meows, purrs, chirps \u2014 with on-device feature extraction.",
          icon: <AudioLines className="h-5 w-5" />,
          bullets: [
            "AVFoundation capture pipeline",
            "Spectrogram + MFCC features",
            "CoreML/TFLite on-device inference",
          ],
        };
      case "video":
        return {
          title: "Video capture + body language",
          subtitle: "Posture, tail position, ear angle \u2014 with robust tracking.",
          icon: <Video className="h-5 w-5" />,
          bullets: [
            "Low-latency camera ingest",
            "Keypoint + pose estimation",
            "Behavior tags & review clips",
          ],
        };
      case "sensor":
        return {
          title: "IoT sensors + context signals",
          subtitle: "Events from feeders, water fountains, litter boxes \u2014 time-stamped.",
          icon: <Radar className="h-5 w-5" />,
          bullets: [
            "Device event normalization",
            "Ambient + environmental context",
            "Correlation features for patterns",
          ],
        };
    }
  }, [mode]);

  return (
    <div className="app-noise min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-3 py-1.5 text-xs text-muted-foreground glass">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span data-testid="text-badge">AI Cat Communication Lab</span>
              </div>
              <h1
                className="mt-4 text-balance text-4xl font-semibold tracking-tight md:text-5xl"
                data-testid="text-title"
              >
                CatSignal
                <span className="text-foreground/70"> builds meaning from meows + motion</span>
              </h1>
              <p
                className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground"
                data-testid="text-subtitle"
              >
                MVP architecture: audio recording with context capture, timestamped sessions, contextual notes, local storage,
                and basic pattern viewing (ML integration later).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                className="rounded-2xl border border-border/60 bg-secondary/60"
                data-testid="button-import"
              >
                <Upload className="mr-2 h-4 w-4" />
                Import sample
              </Button>
              <Button
                className="rounded-2xl"
                data-testid="button-export"
              >
                <Download className="mr-2 h-4 w-4" />
                Export session
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Metric
              icon={<ClipboardList className="h-4 w-4" />}
              label="Events captured"
              value="128"
              sub="last 24h"
              testid="metric-events"
            />
            <Metric
              icon={<Cpu className="h-4 w-4" />}
              label="On-device inference"
              value="92%"
              sub="avg confidence"
              testid="metric-confidence"
            />
            <Metric
              icon={<Timer className="h-4 w-4" />}
              label="Processing latency"
              value="84ms"
              sub="p50 (prototype)"
              testid="metric-latency"
            />
          </div>
        </header>

        <main className="mt-10 grid grid-cols-1 gap-6">
          <ArchitectureOverview />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_.85fr]">
            <Card className="glass relative overflow-hidden rounded-3xl p-5">
              <div className="pointer-events-none absolute inset-0 gridline opacity-80" />
              <div className="relative">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2" data-testid="text-capture-title">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      {modeCopy.icon}
                    </span>
                    <div>
                      <div className="text-lg font-semibold">{modeCopy.title}</div>
                      <div className="text-sm text-muted-foreground">{modeCopy.subtitle}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Tabs value={mode} onValueChange={(v) => setMode(v as CaptureMode)}>
                    <TabsList className="rounded-2xl bg-secondary/50" data-testid="tabs-mode">
                      <TabsTrigger value="audio" className="rounded-2xl" data-testid="tab-audio">
                        <Mic className="mr-2 h-4 w-4" />
                        Audio
                      </TabsTrigger>
                      <TabsTrigger value="video" className="rounded-2xl" data-testid="tab-video">
                        <Video className="mr-2 h-4 w-4" />
                        Video
                      </TabsTrigger>
                      <TabsTrigger value="sensor" className="rounded-2xl" data-testid="tab-sensors">
                        <Radar className="mr-2 h-4 w-4" />
                        Sensors
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  <Button
                    onClick={() => setRecording((s) => !s)}
                    className={cn(
                      "rounded-2xl",
                      recording ? "bg-accent text-accent-foreground hover:bg-accent/90" : "",
                    )}
                    data-testid="button-record"
                  >
                    {recording ? (
                      <>
                        <Activity className="mr-2 h-4 w-4" />
                        Recording
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Start capture
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-card/40 p-4" data-testid="panel-config">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium" data-testid="text-config-title">Capture config</div>
                      <div className="text-xs text-muted-foreground" data-testid="text-config-subtitle">
                        Keep it simple now; wire it up later.
                      </div>
                    </div>
                    <Badge
                      className="rounded-full border border-border/60 bg-secondary/60"
                      variant="secondary"
                      data-testid="badge-session"
                    >
                      Session A
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="grid gap-2">
                      <div className="text-xs text-muted-foreground" data-testid="text-location-label">Location</div>
                      <Select value={location} onValueChange={setLocation}>
                        <SelectTrigger className="rounded-2xl" data-testid="select-location">
                          <SelectValue placeholder="Pick a room" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="kitchen" data-testid="option-location-kitchen">Kitchen</SelectItem>
                          <SelectItem value="living" data-testid="option-location-living">Living room</SelectItem>
                          <SelectItem value="bedroom" data-testid="option-location-bedroom">Bedroom</SelectItem>
                          <SelectItem value="hall" data-testid="option-location-hall">Hallway</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <div className="text-xs text-muted-foreground" data-testid="text-tag-label">Tag (optional)</div>
                      <Input
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        placeholder="e.g. post-play, pre-feed, visitor"
                        className="rounded-2xl"
                        data-testid="input-tag"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-secondary/30 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Leaf className="h-4 w-4 text-muted-foreground" />
                        <div data-testid="text-ambient-label">Include ambient noise profile</div>
                      </div>
                      <Switch
                        checked={includeAmbient}
                        onCheckedChange={setIncludeAmbient}
                        data-testid="switch-ambient"
                      />
                    </div>

                    <Separator className="bg-border/60" />

                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground" data-testid="text-progress-label">Session progress</div>
                        <div className="text-xs text-muted-foreground" data-testid="text-progress-value">{sessionProgress}%</div>
                      </div>
                      <Progress value={sessionProgress} className="h-2" data-testid="progress-session" />
                      <div className="text-xs text-muted-foreground" data-testid="text-progress-hint">
                        Visualizes pipeline health (buffering, inference, logging).
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/40 p-4" data-testid="panel-roadmap">
                  <div className="flex items-center gap-2">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                      <PawPrint className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-sm font-medium" data-testid="text-roadmap-title">Roadmap (your bullets)</div>
                      <div className="text-xs text-muted-foreground" data-testid="text-roadmap-subtitle">
                        A clean breakdown of infrastructure + ML components.
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <div className="rounded-2xl border border-border/60 bg-secondary/25 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium" data-testid="text-infra-title">
                        <Database className="h-4 w-4 text-primary" />
                        Data collection infrastructure
                      </div>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                        <li className="flex gap-2" data-testid="text-infra-item-audio">
                          <ChevronRight className="mt-0.5 h-4 w-4 text-foreground/50" />
                          Audio recording + processing (AVFoundation)
                        </li>
                        <li className="flex gap-2" data-testid="text-infra-item-video">
                          <ChevronRight className="mt-0.5 h-4 w-4 text-foreground/50" />
                          Video capture (body language / behavior)
                        </li>
                        <li className="flex gap-2" data-testid="text-infra-item-iot">
                          <ChevronRight className="mt-0.5 h-4 w-4 text-foreground/50" />
                          IoT sensors (feeder, water, litter box)
                        </li>
                        <li className="flex gap-2" data-testid="text-infra-item-logging">
                          <ChevronRight className="mt-0.5 h-4 w-4 text-foreground/50" />
                          Time-stamped event logging system
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-secondary/25 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium" data-testid="text-ml-title">
                        <Cpu className="h-4 w-4 text-accent" />
                        AI / ML components
                      </div>
                      <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                        <li className="flex gap-2" data-testid="text-ml-item-audio">
                          <ChevronRight className="mt-0.5 h-4 w-4 text-foreground/50" />
                          Audio analysis (CoreML / TFLite)
                        </li>
                        <li className="flex gap-2" data-testid="text-ml-item-vision">
                          <ChevronRight className="mt-0.5 h-4 w-4 text-foreground/50" />
                          Computer vision (tail/ear/body language)
                        </li>
                        <li className="flex gap-2" data-testid="text-ml-item-patterns">
                          <ChevronRight className="mt-0.5 h-4 w-4 text-foreground/50" />
                          Pattern recognition (context correlation)
                        </li>
                        <li className="flex gap-2" data-testid="text-ml-item-finetune">
                          <ChevronRight className="mt-0.5 h-4 w-4 text-foreground/50" />
                          Pre-trained models + fine-tuning
                        </li>
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-secondary/25 p-3">
                      <div className="flex items-center gap-2 text-sm font-medium" data-testid="text-actions-title">
                        <Filter className="h-4 w-4 text-foreground/80" />
                        Key components (Swift app)
                      </div>
                      <div className="mt-3 grid gap-2">
                        <SwiftPill
                          label="AudioRecorder"
                          detail="Handles recording sessions (AVFoundation), permissions, and file lifecycle."
                          testid="pill-audiorecorder"
                        />
                        <SwiftPill
                          label="VocalizationModel"
                          detail="Stores recordings + context, duration, tags, and derived metadata."
                          testid="pill-vocalizationmodel"
                        />
                        <SwiftPill
                          label="ContextCapture"
                          detail="UI for situational notes (what happened, location, activity, mood)."
                          testid="pill-contextcapture"
                        />
                        <SwiftPill
                          label="SessionManager"
                          detail="Organizes timestamped sessions and groups events/recordings."
                          testid="pill-sessionmanager"
                        />
                        <SwiftPill
                          label="PatternAnalyzer"
                          detail="Phase 2: basic correlations + Charts-ready aggregates (ML later)."
                          testid="pill-patternanalyzer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border/60 bg-card/30 p-4" data-testid="panel-event-log">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-medium" data-testid="text-eventlog-title">Time-stamped event log</div>
                    <div className="text-xs text-muted-foreground" data-testid="text-eventlog-subtitle">
                      This is where capture, labeling, and inference converge.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="secondary"
                      className="rounded-2xl border border-border/60 bg-secondary/60"
                      data-testid="button-add-event"
                    >
                      Add event
                    </Button>
                    <Button
                      variant="secondary"
                      className="rounded-2xl border border-border/60 bg-secondary/60"
                      data-testid="button-review-clips"
                    >
                      Review clips
                    </Button>
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  {demoEvents.map((e) => (
                    <div
                      key={e.id}
                      className="flex flex-col gap-2 rounded-2xl border border-border/60 bg-secondary/20 p-3 md:flex-row md:items-center md:justify-between"
                      data-testid={`row-event-${e.id}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 text-xs font-semibold text-foreground/80" data-testid={`text-event-ts-${e.id}`}>
                          {e.ts}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <SourcePill source={e.source} testid={`badge-source-${e.id}`} />
                            <div className="text-sm font-medium" data-testid={`text-event-label-${e.id}`}>{e.label}</div>
                            <Badge
                              className="rounded-full bg-primary/15 text-primary border border-border/60"
                              data-testid={`badge-confidence-${e.id}`}
                            >
                              {Math.round(e.confidence * 100)}%
                            </Badge>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground" data-testid={`text-event-context-${e.id}`}>
                            {e.context}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl border border-border/60 bg-secondary/50"
                          data-testid={`button-view-${e.id}`}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl"
                          data-testid={`button-label-${e.id}`}
                        >
                          Label
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="glass rounded-3xl p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium" data-testid="text-insights-title">Pattern insights</div>
                  <div className="text-xs text-muted-foreground" data-testid="text-insights-subtitle">
                    Correlate behaviors with time-of-day, routine, and environment.
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="rounded-full border border-border/60 bg-secondary/60"
                  data-testid="badge-model"
                >
                  Prototype model
                </Badge>
              </div>

              <div className="mt-4 grid gap-3">
                {demoInsights.map((ins) => (
                  <motion.div
                    key={ins.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05 }}
                    className="rounded-2xl border border-border/60 bg-card/40 p-4"
                    data-testid={`card-insight-${ins.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "inline-flex h-9 w-9 items-center justify-center rounded-2xl",
                              ins.signal === "audio"
                                ? "bg-primary/15 text-primary"
                                : ins.signal === "vision"
                                  ? "bg-accent/15 text-accent"
                                  : "bg-secondary/60 text-foreground/80",
                            )}
                          >
                            {ins.signal === "audio" ? (
                              <AudioLines className="h-5 w-5" />
                            ) : ins.signal === "vision" ? (
                              <Camera className="h-5 w-5" />
                            ) : (
                              <Timer className="h-5 w-5" />
                            )}
                          </div>
                          <div className="text-sm font-semibold" data-testid={`text-insight-title-${ins.id}`}>{ins.title}</div>
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground" data-testid={`text-insight-detail-${ins.id}`}>{ins.detail}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span data-testid={`text-insight-strength-label-${ins.id}`}>Signal strength</span>
                        <span data-testid={`text-insight-strength-${ins.id}`}>{ins.strength}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-secondary/50">
                        <div
                          className={cn(
                            "h-2 rounded-full",
                            ins.signal === "audio"
                              ? "bg-primary"
                              : ins.signal === "vision"
                                ? "bg-accent"
                                : "bg-foreground/60",
                          )}
                          style={{ width: `${ins.strength}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        className="rounded-xl"
                        data-testid={`button-open-insight-${ins.id}`}
                      >
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="rounded-xl border border-border/60 bg-secondary/60"
                        data-testid={`button-pin-insight-${ins.id}`}
                      >
                        Pin
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>

            <Card className="glass rounded-3xl p-5">
              <div className="flex items-center gap-2">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary/70 text-foreground/80">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-medium" data-testid="text-dataset-title">Dataset builder</div>
                  <div className="text-xs text-muted-foreground" data-testid="text-dataset-subtitle">
                    Prepare labeled clips for training / fine-tuning.
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium" data-testid="text-dataset-row-audio">
                      <Mic className="h-4 w-4 text-primary" />
                      Audio clips
                    </div>
                    <Badge className="rounded-full" variant="secondary" data-testid="badge-audio-count">
                      42
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground" data-testid="text-dataset-audio-hint">
                    Trim, normalize, attach context tags.
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium" data-testid="text-dataset-row-video">
                      <Camera className="h-4 w-4 text-accent" />
                      Video segments
                    </div>
                    <Badge className="rounded-full" variant="secondary" data-testid="badge-video-count">
                      19
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground" data-testid="text-dataset-video-hint">
                    Keyframes, pose vectors, posture labels.
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-secondary/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium" data-testid="text-dataset-row-events">
                      <ClipboardList className="h-4 w-4 text-foreground/80" />
                      Context events
                    </div>
                    <Badge className="rounded-full" variant="secondary" data-testid="badge-events-count">
                      128
                    </Badge>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground" data-testid="text-dataset-events-hint">
                    Schedule, feeding, visitors, ambient noise.
                  </div>
                </div>

                <Button
                  variant="secondary"
                  className="rounded-2xl border border-border/60 bg-secondary/60"
                  data-testid="button-generate-dataset"
                >
                  Generate dataset draft
                </Button>
              </div>
            </Card>
          </div>
          </div>
        </main>

        <footer className="mt-10 flex flex-col gap-2 text-xs text-muted-foreground">
          <div data-testid="text-footer-note">
            This is a UI prototype. To make it real, you\u2019d connect device capture (Swift/AVFoundation), on-device models (CoreML/TFLite),
            and a secure backend for storage + training.
          </div>
        </footer>
      </div>
    </div>
  );
}
