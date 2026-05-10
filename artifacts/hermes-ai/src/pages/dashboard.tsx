import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, Mic, Clock, Sparkles } from "lucide-react";
import { storage, type CatProfile, type Recording } from "@/lib/storage";

const PREDICTION_THRESHOLD = 3;

function CatCard({
  profile,
  recordings,
  onClick,
}: {
  profile: CatProfile;
  recordings: Recording[];
  onClick: () => void;
}) {
  const progress = Math.min(recordings.length / PREDICTION_THRESHOLD, 1);
  const unlocked = recordings.length >= PREDICTION_THRESHOLD;
  const initials = profile.name.slice(0, 2).toUpperCase();

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="w-full text-left bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-muted flex items-center justify-center shrink-0">
          {profile.photo ? (
            <img
              src={profile.photo}
              alt={profile.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="font-semibold text-lg text-muted-foreground">
              {initials}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{profile.name}</h3>
          <p className="text-sm text-muted-foreground truncate">
            {[profile.breed, profile.age].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Mic className="h-3 w-3" />
            {recordings.length}{" "}
            {recordings.length === 1 ? "recording" : "recordings"}
          </span>
          {unlocked ? (
            <span className="flex items-center gap-1 text-primary font-medium">
              <Sparkles className="h-3 w-3" />
              Predictions active
            </span>
          ) : (
            <span className="font-mono text-muted-foreground">
              {recordings.length}/{PREDICTION_THRESHOLD} to unlock
            </span>
          )}
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </motion.button>
  );
}

export default function Dashboard() {
  const [profiles, setProfiles] = useState<CatProfile[]>([]);
  const [recordingsByProfile, setRecordingsByProfile] = useState<
    Record<string, Recording[]>
  >({});
  const [, navigate] = useLocation();

  useEffect(() => {
    const p = storage.getProfiles();
    setProfiles(p.sort((a, b) => a.createdAt - b.createdAt));
    const byProfile: Record<string, Recording[]> = {};
    for (const profile of p) {
      byProfile[profile.id] = storage.getRecordings(profile.id);
    }
    setRecordingsByProfile(byProfile);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 pb-24">
        <header className="pt-14 pb-10 flex items-start justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
              <Sparkles className="h-3 w-3" />
              <span className="font-mono tracking-wide">HermesAI</span>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {profiles.length === 0 ? "Welcome back." : "Your cats"}
            </h1>
          </div>
          <button
            onClick={() => navigate("/profile/new")}
            className="mt-1 flex items-center gap-2 bg-foreground text-background text-sm font-medium px-4 py-2 rounded-full hover:opacity-90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add cat
          </button>
        </header>

        {profiles.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 space-y-6 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
              <Clock className="h-8 w-8 text-muted-foreground opacity-40" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">No cats yet</h2>
              <p className="text-muted-foreground text-sm max-w-xs">
                Create your first cat profile to start recording and building
                their behavioral profile.
              </p>
            </div>
            <button
              onClick={() => navigate("/profile/new")}
              className="bg-foreground text-background font-medium px-6 py-3 rounded-full hover:opacity-90 active:scale-95 transition-all"
            >
              Create a profile
            </button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-3"
          >
            {profiles.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <CatCard
                  profile={profile}
                  recordings={recordingsByProfile[profile.id] ?? []}
                  onClick={() => navigate(`/profile/${profile.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
