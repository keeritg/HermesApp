import { BarChart3, Boxes, Brain, Database, Mic, ShieldCheck, SquareStack, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function Pill({
  icon,
  title,
  detail,
  testid,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  testid: string;
}) {
  return (
    <div
      className="rounded-2xl border border-border/60 bg-secondary/25 p-3"
      data-testid={testid}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-card/40 text-foreground/80">
          {icon}
        </span>
        <div>
          <div className="text-sm font-semibold" data-testid={`${testid}-title`}>
            {title}
          </div>
          <div className="text-xs text-muted-foreground" data-testid={`${testid}-detail`}>
            {detail}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  n,
  title,
  detail,
  right,
  testid,
}: {
  n: string;
  title: string;
  detail: string;
  right?: React.ReactNode;
  testid: string;
}) {
  return (
    <div className="relative" data-testid={testid}>
      <div className="absolute left-3 top-4 h-[calc(100%-24px)] w-px bg-border/60" />
      <div className="flex gap-3">
        <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full border border-border/60 bg-secondary/40 font-mono text-[11px] text-foreground/80">
          {n}
        </div>
        <div className="flex-1">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold" data-testid={`${testid}-title`}>
                {title}
              </div>
              <div className="mt-1 text-xs text-muted-foreground" data-testid={`${testid}-detail`}>
                {detail}
              </div>
            </div>
            {right ? (
              <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">{right}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ArchitectureOverview() {
  return (
    <Card className="glass rounded-3xl p-5" data-testid="card-architecture">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-medium" data-testid="text-architecture-title">
                MVP Architecture Overview
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-architecture-subtitle">
                A Swift-first, on-device pipeline that stays useful before ML.
              </div>
            </div>
          </div>
        </div>
        <Badge
          variant="secondary"
          className="rounded-full border border-border/60 bg-secondary/60 font-mono text-[11px]"
          data-testid="badge-architecture-scope"
        >
          MVP \u2192 ML later
        </Badge>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_.9fr]">
        <div className="rounded-2xl border border-border/60 bg-card/30 p-4" data-testid="panel-stack">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold" data-testid="text-stack-title">
                Tech stack
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-stack-subtitle">
                Chosen for performance, privacy, and offline reliability.
              </div>
            </div>
            <Badge
              variant="secondary"
              className="rounded-full border border-border/60 bg-secondary/60"
              data-testid="badge-stack-ondevice"
            >
              On-device
            </Badge>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            <Pill
              icon={<SquareStack className="h-5 w-5" />}
              title="SwiftUI"
              detail="UI + navigation + state"
              testid="pill-stack-swiftui"
            />
            <Pill
              icon={<Mic className="h-5 w-5" />}
              title="AVFoundation"
              detail="Audio capture + session handling"
              testid="pill-stack-avfoundation"
            />
            <Pill
              icon={<Database className="h-5 w-5" />}
              title="SwiftData / CoreData"
              detail="Local storage for sessions + notes"
              testid="pill-stack-storage"
            />
            <Pill
              icon={<BarChart3 className="h-5 w-5" />}
              title="Charts"
              detail="Basic pattern views (MVP)"
              testid="pill-stack-charts"
            />
            <Pill
              icon={<Brain className="h-5 w-5" />}
              title="CoreML"
              detail="Future: on-device classification"
              testid="pill-stack-coreml"
            />
            <Pill
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Privacy-first"
              detail="Local by default, export when needed"
              testid="pill-stack-privacy"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/30 p-4" data-testid="panel-flow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold" data-testid="text-flow-title">
                Data flow
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-flow-subtitle">
                Capture \u2192 annotate \u2192 store \u2192 review \u2192 patterns.
              </div>
            </div>
            <Badge
              variant="secondary"
              className="rounded-full border border-border/60 bg-secondary/60"
              data-testid="badge-flow-timestamped"
            >
              Timestamped
            </Badge>
          </div>

          <div className="mt-4 grid gap-4">
            <Step
              n="01"
              title="Record audio (and optionally video)"
              detail="Start a session, capture clean audio with consistent settings, and mark key moments."
              right={
                <>
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-border/60 bg-secondary/60"
                    data-testid="badge-flow-audio"
                  >
                    <Mic className="mr-1 h-3.5 w-3.5" /> Audio
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="rounded-full border border-border/60 bg-secondary/60"
                    data-testid="badge-flow-video"
                  >
                    <Video className="mr-1 h-3.5 w-3.5" /> Video (future)
                  </Badge>
                </>
              }
              testid="step-flow-01"
            />
            <Step
              n="02"
              title="Capture context"
              detail="What was happening? Location, activity, people, and anything that might explain the vocalization."
              testid="step-flow-02"
            />
            <Step
              n="03"
              title="Persist locally"
              detail="Store sessions, notes, and derived metadata so the app works offline and stays fast."
              testid="step-flow-03"
            />
            <Step
              n="04"
              title="Review + patterns"
              detail="Simple frequency charts and timeline views to spot routines and triggers before ML exists."
              testid="step-flow-04"
            />
            <Step
              n="05"
              title="(Later) ML inference"
              detail="Run CoreML classifiers for vocalizations/behavior tags; keep raw media local by default."
              testid="step-flow-05"
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
