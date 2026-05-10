import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { storage } from "@/lib/storage";

const screens = [
  {
    number: "01",
    text: "Your cat has a language.\nIt just takes time to learn it.",
  },
  {
    number: "02",
    text: "Cat communication is pattern-based. One meow doesn't tell us much. A hundred meows — in context, over time — tells us everything.",
  },
  {
    number: "03",
    text: "HermesAI builds a behavioral profile unique to your cat. The more you record, the smarter it gets. Give it time. Your cat is worth it.",
  },
];

export default function Onboarding() {
  const [index, setIndex] = useState(0);
  const [, navigate] = useLocation();

  const isLast = index === screens.length - 1;

  const handleContinue = () => {
    if (isLast) {
      storage.completeOnboarding();
      navigate("/dashboard");
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-start justify-center px-8 md:px-16 max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="space-y-8 w-full"
          >
            <span className="font-mono text-xs text-muted-foreground tracking-widest">
              {screens[index].number} / 03
            </span>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight tracking-tight whitespace-pre-line">
              {screens[index].text}
            </h1>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-8 md:px-16 pb-12 max-w-2xl mx-auto w-full space-y-8">
        <div className="flex gap-2">
          {screens.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i === index
                  ? "bg-foreground w-8"
                  : i < index
                    ? "bg-foreground/40 w-4"
                    : "bg-border w-4"
              }`}
            />
          ))}
        </div>

        <button
          onClick={handleContinue}
          className="w-full bg-foreground text-background font-medium text-base py-4 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all duration-150"
        >
          {isLast ? "Get Started" : "Continue"}
        </button>
      </div>
    </div>
  );
}
