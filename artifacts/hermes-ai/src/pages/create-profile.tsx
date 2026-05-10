import { useState, useRef, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, X } from "lucide-react";
import { storage, makeId, type CatProfile } from "@/lib/storage";

const AGE_OPTIONS = [
  "Kitten (< 1 year)",
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5 years",
  "6 years",
  "7 years",
  "8–10 years",
  "Senior (10+ years)",
];

const BREED_SUGGESTIONS = [
  "Domestic Shorthair",
  "Domestic Longhair",
  "Maine Coon",
  "Siamese",
  "Persian",
  "Bengal",
  "Ragdoll",
  "British Shorthair",
  "Sphynx",
  "Norwegian Forest Cat",
  "Scottish Fold",
  "Abyssinian",
  "Burmese",
  "Russian Blue",
  "Mixed breed",
];

async function resizeImage(file: File, maxSize = 400): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function CreateProfile() {
  const [, navigate] = useLocation();
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [breed, setBreed] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [breedOpen, setBreedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canSave = name.trim().length > 0;

  const handlePhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const resized = await resizeImage(file);
    setPhoto(resized);
  };

  const handleSave = () => {
    if (!canSave) return;
    setSaving(true);
    const profile: CatProfile = {
      id: makeId(),
      name: name.trim(),
      age,
      breed: breed.trim(),
      photo,
      createdAt: Date.now(),
    };
    storage.saveProfile(profile);
    navigate(`/profile/${profile.id}`);
  };

  const filtered = BREED_SUGGESTIONS.filter((b) =>
    b.toLowerCase().includes(breed.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-6 pb-24">
        <header className="pt-10 pb-8 flex items-center gap-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-2xl font-semibold">New cat profile</h1>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="relative w-28 h-28 rounded-3xl bg-muted flex items-center justify-center overflow-hidden group hover:opacity-90 transition-opacity"
            >
              {photo ? (
                <>
                  <img
                    src={photo}
                    alt="Cat photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Camera className="h-6 w-6" />
                  <span className="text-xs">Add photo</span>
                </div>
              )}
            </button>
            {photo && (
              <button
                onClick={() => setPhoto(null)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhoto}
            />
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Leo"
                className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Age</label>
              <div className="relative">
                <select
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-base appearance-none focus:outline-none focus:ring-2 focus:ring-foreground/20 transition cursor-pointer"
                >
                  <option value="">Select age</option>
                  {AGE_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  ↓
                </div>
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-sm font-medium">Breed</label>
              <input
                type="text"
                value={breed}
                onChange={(e) => {
                  setBreed(e.target.value);
                  setBreedOpen(true);
                }}
                onFocus={() => setBreedOpen(true)}
                onBlur={() => setTimeout(() => setBreedOpen(false), 150)}
                placeholder="e.g. Domestic Shorthair"
                className="w-full px-4 py-3 rounded-2xl border border-border bg-background text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20 transition"
              />
              {breedOpen && breed && filtered.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-lg overflow-hidden z-10">
                  {filtered.slice(0, 6).map((b) => (
                    <button
                      key={b}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border last:border-0"
                      onMouseDown={() => {
                        setBreed(b);
                        setBreedOpen(false);
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!canSave || saving}
            className="w-full bg-foreground text-background font-medium text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Create Profile"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
