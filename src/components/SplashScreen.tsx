import React, { useState, useEffect } from "react";
import jaLogoWhite from "../assets/logo_ja_white.png";

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [phase, setPhase] = useState<"spinning" | "pause" | "fading" | "done">("spinning");

  useEffect(() => {
    // Phase 1 -> 2: Spin completes after 750ms, then stays still for 0.5s
    const pauseTimer = setTimeout(() => {
      setPhase("pause");
    }, 750);

    // Phase 2 -> 3: Pause for ~0.5s, then start smooth fade out
    const fadeTimer = setTimeout(() => {
      setPhase("fading");
    }, 1300);

    // Phase 3 -> 4: Fade out completes, unmount completely
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onFinish?.();
    }, 1650);

    return () => {
      clearTimeout(pauseTimer);
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinish]);

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center select-none transition-all duration-350 ease-out bg-gradient-to-br from-[#4A227A] via-[#381860] to-[#1E0938] ${
        phase === "fading" ? "opacity-0 scale-105 pointer-events-none" : "opacity-100 scale-100"
      }`}
      style={{ willChange: "opacity, transform" }}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Animated Badge Container */}
        <div
          className={`relative p-5 sm:p-6 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl transition-transform duration-300 ${
            phase === "spinning"
              ? "animate-splash-spin animate-splash-glow"
              : "scale-100 rotate-0 shadow-purple-500/40"
          }`}
        >
          <img
            src={jaLogoWhite}
            alt="Jugendausschuss Logo"
            className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-lg"
          />
        </div>

        {/* Brand Text */}
        <div
          className={`text-center transition-all duration-500 ease-out ${
            phase === "spinning"
              ? "opacity-0 translate-y-3"
              : "opacity-100 translate-y-0"
          }`}
        >
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-widest">
            JA PROTOKOLL
          </h1>
          <p className="text-xs sm:text-sm font-medium text-purple-200/80 mt-0.5 tracking-wide">
            Jugendausschuss Leonberg
          </p>
        </div>
      </div>
    </div>
  );
};
