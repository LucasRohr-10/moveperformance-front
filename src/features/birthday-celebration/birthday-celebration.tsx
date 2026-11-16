"use client";

import { useEffect, useRef, useState } from "react";

import { businessDateOf } from "@/features/checkout/business-time";
import { isBirthdayOn } from "@/lib/birth-date";

import { hasShownBirthday, markBirthdayShown } from "./birthday-shown-store";
import { runConfetti } from "./run-confetti";

const DURATION_MS = 5000;
const EMIT_FOR_MS = 2200;
const CONFETTI_COLORS = ["#ffffff", "#e5e5e5", "#9a9a9a", "#6b6b6b"] as const;

function prefersReducedMotion(): boolean {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface BirthdayCelebrationProps {
  userId: string;
  firstName: string;
  // YYYY-MM-DD.
  birthDate: string;
}

// Five seconds of confetti the first time the client opens the app on their birthday.
export function BirthdayCelebration({ userId, firstName, birthDate }: BirthdayCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [withConfetti, setWithConfetti] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Decided in the browser: today and the "already shown" mark only exist here.
  useEffect(() => {
    const today = businessDateOf(new Date().toISOString());
    if (!isBirthdayOn(birthDate, today)) return;
    const year = today.slice(0, 4);
    if (hasShownBirthday(userId, year)) return;
    markBirthdayShown(userId, year);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- today and the "already shown" mark only exist in the browser
    setWithConfetti(!prefersReducedMotion());
    setIsVisible(true);
  }, [userId, birthDate]);

  useEffect(() => {
    if (!isVisible) return;
    const timer = window.setTimeout(() => setIsVisible(false), DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [isVisible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isVisible || !withConfetti || !canvas) return;
    return runConfetti(canvas, { durationMs: DURATION_MS, emitForMs: EMIT_FOR_MS, colors: CONFETTI_COLORS });
  }, [isVisible, withConfetti]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 cursor-pointer animate-birthday-fx"
      onClick={() => setIsVisible(false)}
    >
      <div aria-hidden="true" className="absolute inset-0 bg-black/60" />
      {withConfetti ? <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" /> : null}
      <div
        role="status"
        className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center motion-safe:animate-birthday-pop"
      >
        <p className="mb-3 text-[10px] font-semibold tracking-[0.35em] text-muted uppercase">¡Hoy es tu día!</p>
        <p className="font-display text-[46px] leading-[0.95] font-black tracking-[-0.02em] uppercase">
          ¡Feliz
          <br />
          cumple,
        </p>
        <p className="mt-3 font-display text-[22px] font-extrabold uppercase">{firstName}!</p>
      </div>
    </div>
  );
}
