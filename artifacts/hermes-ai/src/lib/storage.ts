export type CatProfile = {
  id: string;
  name: string;
  age: string;
  breed: string;
  photo: string | null;
  createdAt: number;
};

export type Recording = {
  id: string;
  catId: string;
  timestamp: number;
  label: string;
  confidence: number;
  durationSecs: number;
  location: string;
  situation: string;
  afterBehavior: string;
  context: string;
  prediction: string;
  needsMoreData: boolean;
};

const PROFILES_KEY = "hermes_profiles";
const RECORDINGS_KEY = "hermes_recordings";
const ONBOARDING_KEY = "hermes_onboarding_complete";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  isOnboardingComplete(): boolean {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  },

  completeOnboarding(): void {
    localStorage.setItem(ONBOARDING_KEY, "true");
  },

  getProfiles(): CatProfile[] {
    return readJson<CatProfile[]>(PROFILES_KEY, []);
  },

  getProfile(id: string): CatProfile | null {
    return this.getProfiles().find((p) => p.id === id) ?? null;
  },

  saveProfile(profile: CatProfile): void {
    const profiles = this.getProfiles().filter((p) => p.id !== profile.id);
    writeJson(PROFILES_KEY, [...profiles, profile]);
  },

  deleteProfile(id: string): void {
    writeJson(
      PROFILES_KEY,
      this.getProfiles().filter((p) => p.id !== id),
    );
    writeJson(
      RECORDINGS_KEY,
      this.getRecordings().filter((r) => r.catId !== id),
    );
  },

  getRecordings(catId?: string): Recording[] {
    const all = readJson<Recording[]>(RECORDINGS_KEY, []);
    return catId ? all.filter((r) => r.catId === catId) : all;
  },

  saveRecording(recording: Recording): void {
    const all = this.getRecordings();
    writeJson(RECORDINGS_KEY, [...all, recording]);
  },

  deleteRecording(id: string): void {
    writeJson(
      RECORDINGS_KEY,
      this.getRecordings().filter((r) => r.id !== id),
    );
  },
};

export function buildContext(
  location: string,
  situation: string,
  afterBehavior: string,
): string {
  const parts: string[] = [];
  if (location) parts.push(`Location: ${location}`);
  if (situation) parts.push(`Situation: ${situation}`);
  if (afterBehavior) parts.push(`After: ${afterBehavior}`);
  return parts.join(" | ");
}

export function classifyByDuration(durationSecs: number): {
  label: string;
  confidence: number;
} {
  let label: string;
  if (durationSecs < 1.2) {
    label = "Quick chirp";
  } else if (durationSecs < 3) {
    label = "Short meow";
  } else if (durationSecs < 7) {
    label = "Sustained meow";
  } else {
    label = "Yowl / prolonged call";
  }
  const confidence = parseFloat((0.76 + Math.random() * 0.18).toFixed(2));
  return { label, confidence };
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}
