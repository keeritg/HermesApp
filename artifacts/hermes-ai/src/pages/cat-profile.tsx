import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  Sparkles,
  Clock,
  MapPin,
  Tag,
  Trash2,
} from "lucide-react";
import { storage, type CatProfile, type Recording } from "@/lib/storage";

const PREDICTION_THRESHOLD = 3;

function ProgressRing({
  count,
  threshold,
}: {
  count: number;
  threshold: number;
}) {
  const progress = Math.min(count / threshold, 1);
  const unlocked = count >= threshold;
  const size = 96;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="hsl(var(--foreground))"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {unlocked ? (
            <Sparkles className="h-6 w-6 text-primary" />
          ) : (
            <span className="font-mono text-lg font-semibold">{count}</span>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center max-w-[160px]">
        {unlocked
          ? "Predictions active"
          : `${count} of ${threshold} recordings to unlock predictions`}
      </p>
    </div>
  );
}

function formatDate(ts: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ts));
}

export default function CatProfilePage() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [profile, setProfile] = useState<CatProfile | null>(null);
  const [recordings, setRecordings] = useState<Recording[]>([]);

  useEffect(() => {
    const p = storage.getProfile(params.id);
    if (!p) {
      navigate("/dashboard");
      return;
    }
    setProfile(p);
    setRecordings(
      storage.getRecordings(params.id).sort((a, b) => b.timestamp - a.timestamp),
    );
  }, [params.id]);

  const handleDeleteRecording = (id: string) => {
    storage.deleteRecording(id);
    setRecordings((r) => r.filter((rec) => rec.id !== id));
  };

  const handleDeleteProfile = () => {
    if (!confirm(`Delete ${profile?.name}'s profile and all recordings?`))
      return;
    storage.deleteProfile(params.id);
    navigate("/dashboard");
  };

  if (!profile) return null;

  const initials = profile.name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 pb-32">
        <header className="pt-10 pb-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleDeleteProfile}
            className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete profile
          </button>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-semibold text-xl text-muted-foreground">
                  {initials}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-semibold">{profile.name}</h1>
              <p className="text-muted-foreground mt-1">
                {[profile.breed, profile.age].filter(Boolean).join(" · ") ||
                  "No details added"}
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-3xl p-6 flex flex-col items-center">
            <ProgressRing
              count={recordings.length}
              threshold={PREDICTION_THRESHOLD}
            />
            {recordings.length >= PREDICTION_THRESHOLD && (
              <p className="text-xs text-center text-muted-foreground mt-4 max-w-xs">
                Keep recording — more data means more accurate and specific
                predictions.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Recordings ({recordings.length})
            </h2>

            {recordings.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center space-y-3">
                <Clock className="h-8 w-8 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm">
                  No recordings yet. Tap the button below to start.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recordings.map((rec, i) => (
                  <motion.div
                    key={rec.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border rounded-3xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{rec.label}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            {(rec.confidence * 100).toFixed(0)}% confidence
                          </span>
                          <span className="text-muted-foreground/40">·</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(rec.timestamp)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRecording(rec.id)}
                        className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {(rec.location || rec.situation || rec.afterBehavior) && (
                      <div className="flex flex-wrap gap-2">
                        {rec.location && (
                          <span className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-3 py-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            {rec.location}
                          </span>
                        )}
                        {rec.situation && (
                          <span className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-3 py-1">
                            <Tag className="h-3 w-3 text-muted-foreground" />
                            {rec.situation}
                          </span>
                        )}
                        {rec.afterBehavior && (
                          <span className="inline-flex items-center gap-1 text-xs bg-muted rounded-full px-3 py-1">
                            {rec.afterBehavior}
                          </span>
                        )}
                      </div>
                    )}

                    {rec.prediction && (
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-primary text-xs font-medium">
                          <Sparkles className="h-3.5 w-3.5" />
                          AI Prediction
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed">
                          {rec.prediction}
                        </p>
                      </div>
                    )}

                    {rec.needsMoreData && !rec.prediction && (
                      <div className="bg-muted rounded-2xl px-4 py-3">
                        <p className="text-xs text-muted-foreground">
                          More recordings needed before predictions unlock.
                        </p>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <div className="fixed bottom-8 left-0 right-0 flex justify-center px-6">
        <button
          onClick={() => navigate(`/record/${params.id}`)}
          className="flex items-center gap-3 bg-foreground text-background font-medium px-8 py-4 rounded-full shadow-lg hover:opacity-90 active:scale-95 transition-all"
        >
          <Mic className="h-5 w-5" />
          Record Now
        </button>
      </div>
    </div>
  );
}
