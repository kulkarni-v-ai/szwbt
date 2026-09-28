"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import gsap from "gsap";
import {
  Users, Trophy, Shield, Zap, ChevronRight, BarChart2,
  Menu, X, ArrowDown, Calendar, MapPin, Key, Activity, ArrowRight,
  ChevronDown,
} from "lucide-react";

function ShuttlecockEmblem({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Feathers Fan */}
      <path
        d="M6 14 L14 30 L22 14 Z"
        fill="#FFFFFF"
        stroke="#0F172A"
        strokeWidth="0.8"
      />
      {/* Feather Ribs */}
      <line x1="9" y1="16" x2="14" y2="29" stroke="#040711" strokeWidth="0.8" opacity="0.6" />
      <line x1="14" y1="15" x2="14" y2="29" stroke="#040711" strokeWidth="0.8" opacity="0.6" />
      <line x1="19" y1="16" x2="14" y2="29" stroke="#040711" strokeWidth="0.8" opacity="0.6" />
      {/* Feather Binding Thread Lines */}
      <path d="M8.5 19 Q14 21 19.5 19" stroke="#00F0FF" strokeWidth="0.9" fill="none" opacity="0.9" />
      <path d="M10.5 24 Q14 25.5 17.5 24" stroke="#00F0FF" strokeWidth="0.8" fill="none" opacity="0.9" />
      {/* Cork Dome */}
      <circle cx="14" cy="9" r="5" fill="#FF5A16" />
      <ellipse cx="14" cy="7.5" rx="3" ry="1.5" fill="#FFA366" opacity="0.8" />
      <path d="M9 10 Q14 12 19 10" stroke="#FFFFFF" strokeWidth="1" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   CINEMATIC INTRO — SHUTTLECOCK DROP + BLAST
   ═══════════════════════════════════════════ */
function CinematicIntro({ onComplete }: { onComplete: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<"falling" | "impact" | "done">("falling");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);
    let animId: number;
    let frame = 0;

    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);

    // Shuttlecock state
    const shuttle = {
      x: w / 2,
      y: -80,
      vy: 0,
      rotation: 0,
      scale: 1,
      landed: false,
      landFrame: 0,
    };

    // Impact particles
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; color: string; alpha: number; life: number;
    }
    const particles: Particle[] = [];
    const shockwaveRadius = { r: 0 };

    // Trail particles (fire trail behind falling shuttle)
    interface Trail {
      x: number; y: number; size: number; alpha: number; color: string;
    }
    const trails: Trail[] = [];

    // Stars in dark space
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() * 2.5 + 0.5,
      twinkle: Math.random() * Math.PI * 2,
    }));

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, w, h);

      // ─── DARK SPACE BACKGROUND ───
      ctx.fillStyle = "#020408";
      ctx.fillRect(0, 0, w, h);

      // Stars
      stars.forEach((s) => {
        const alpha = Math.sin(frame * 0.03 + s.twinkle) * 0.4 + 0.6;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#FFF";
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
      });
      ctx.globalAlpha = 1;

      if (!shuttle.landed) {
        // ─── FALLING PHASE ───
        // Gravity acceleration
        shuttle.vy += 0.35;
        // Terminal velocity cap
        shuttle.vy = Math.min(shuttle.vy, 18);
        shuttle.y += shuttle.vy;
        shuttle.rotation += 0.15;

        // Screen shake as it gets closer
        const shakeIntensity = Math.max(0, (shuttle.y / h) * 4);
        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity;
        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Fire trail
        if (shuttle.vy > 3) {
          for (let i = 0; i < 3; i++) {
            trails.push({
              x: shuttle.x + (Math.random() - 0.5) * 20,
              y: shuttle.y + (Math.random() - 0.5) * 10 + 30,
              size: Math.random() * 6 + 2,
              alpha: 1,
              color: Math.random() > 0.3 ? "#FF5A16" : "#FF7A1A",
            });
          }
        }

        // Draw trails
        for (let i = trails.length - 1; i >= 0; i--) {
          const t = trails[i];
          t.alpha -= 0.03;
          t.y -= 1;
          t.size *= 0.97;
          if (t.alpha <= 0) { trails.splice(i, 1); continue; }
          ctx.globalAlpha = t.alpha;
          ctx.fillStyle = t.color;
          ctx.shadowColor = t.color;
          ctx.shadowBlur = 12;
          ctx.fillRect(Math.floor(t.x - t.size / 2), Math.floor(t.y - t.size / 2), t.size, t.size);
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Draw shuttlecock
        ctx.save();
        ctx.translate(shuttle.x, shuttle.y);
        ctx.rotate(shuttle.rotation);

        // Glow
        ctx.shadowColor = "#FF5A16";
        ctx.shadowBlur = 30;

        // Cork (head)
        ctx.fillStyle = "#FF5A16";
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#FFF";
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Feathers (cone)
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#F4E6CE";
        ctx.beginPath();
        ctx.moveTo(-8, 10);
        ctx.lineTo(-20, 50);
        ctx.lineTo(20, 50);
        ctx.lineTo(8, 10);
        ctx.closePath();
        ctx.fill();

        // Feather lines
        ctx.strokeStyle = "#18D8D0";
        ctx.lineWidth = 1.5;
        for (let i = -12; i <= 12; i += 8) {
          ctx.beginPath();
          ctx.moveTo(i * 0.4, 12);
          ctx.lineTo(i, 48);
          ctx.stroke();
        }

        ctx.restore();
        ctx.restore(); // shake

        // Impact check
        if (shuttle.y >= h * 0.55) {
          shuttle.landed = true;
          shuttle.landFrame = frame;
          setPhase("impact");

          // Spawn explosion particles
          for (let i = 0; i < 200; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 20 + 5;
            particles.push({
              x: shuttle.x,
              y: shuttle.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - Math.random() * 8,
              size: Math.random() * 8 + 2,
              color: ["#FF5A16", "#FF7A1A", "#18D8D0", "#F4E6CE", "#ff9900"][Math.floor(Math.random() * 5)],
              alpha: 1,
              life: 0,
            });
          }
        }
      } else {
        // ─── IMPACT PHASE ───
        const elapsed = frame - shuttle.landFrame;

        // Shockwave
        shockwaveRadius.r = elapsed * 25;
        if (shockwaveRadius.r < Math.max(w, h) * 1.5) {
          ctx.save();
          ctx.strokeStyle = "#18D8D0";
          ctx.lineWidth = 4;
          ctx.globalAlpha = Math.max(0, 1 - shockwaveRadius.r / (Math.max(w, h) * 0.8));
          ctx.beginPath();
          ctx.arc(shuttle.x, shuttle.y, shockwaveRadius.r, 0, Math.PI * 2);
          ctx.stroke();

          // Second ring
          ctx.strokeStyle = "#FF5A16";
          ctx.lineWidth = 2;
          ctx.globalAlpha = Math.max(0, 1 - (shockwaveRadius.r - 30) / (Math.max(w, h) * 0.6));
          ctx.beginPath();
          ctx.arc(shuttle.x, shuttle.y, Math.max(0, shockwaveRadius.r - 30), 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Screen flash
        if (elapsed < 8) {
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, 1 - elapsed / 8)})`;
          ctx.fillRect(0, 0, w, h);
        }

        // Ground crack effect — lines radiating from impact
        if (elapsed < 40) {
          ctx.save();
          ctx.strokeStyle = "#FF5A16";
          ctx.lineWidth = 2;
          ctx.globalAlpha = Math.max(0, 1 - elapsed / 40);
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const len = elapsed * 8;
            ctx.beginPath();
            ctx.moveTo(shuttle.x, shuttle.y);
            ctx.lineTo(
              shuttle.x + Math.cos(angle) * len,
              shuttle.y + Math.sin(angle) * len
            );
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.3; // gravity
          p.alpha -= 0.012;
          p.life++;
          if (p.alpha <= 0) { particles.splice(i, 1); continue; }

          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Fade to black then complete
        if (elapsed > 60) {
          const fadeAlpha = Math.min(1, (elapsed - 60) / 30);
          ctx.fillStyle = `rgba(5, 9, 20, ${fadeAlpha})`;
          ctx.fillRect(0, 0, w, h);
        }

        if (elapsed > 95) {
          setPhase("done");
          onComplete();
          cancelAnimationFrame(animId);
          return;
        }
      }

      animId = requestAnimationFrame(render);
    };

    // Start after tiny delay
    const startTimeout = setTimeout(() => { render(); }, 200);

    return () => {
      clearTimeout(startTimeout);
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [onComplete]);

  if (phase === "done") return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: "pixelated" }} />
      {/* Text overlay during fall */}
      {phase === "falling" && (
        <motion.div
          className="absolute bottom-[15%] left-1/2 -translate-x-1/2 font-pixel text-[10px] text-[#18D8D0]/60 tracking-[0.3em] uppercase"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          THE SOUTH CONVERGES...
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   ANIMATED COUNTER
   ═══════════════════════════════════════════ */
function AnimatedCounter({ target, suffix = "", duration = 2 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref}>{count}{suffix}</span>;
}

/* ═══════════════════════════════════════════
   TEXT SCRAMBLE
   ═══════════════════════════════════════════ */
function ScrambleText({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const [displayed, setDisplayed] = useState("");
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ಕತவപ0123456789";

  useEffect(() => {
    const timeout = setTimeout(() => {
      let iteration = 0;
      const interval = setInterval(() => {
        setDisplayed(
          text.split("").map((char, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          }).join("")
        );
        if (iteration >= text.length) clearInterval(interval);
        iteration += 0.5;
      }, 30);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return <span className={className}>{displayed || text}</span>;
}

/* ═══════════════════════════════════════════
   PARTICLE FIELD (background ambience)
   ═══════════════════════════════════════════ */
function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", resize);

    interface P { x: number; y: number; vx: number; vy: number; size: number; color: string; alpha: number; maxLife: number; life: number; }
    const particles: P[] = [];
    const colors = ["#FF5A16", "#FFA726", "#00E5FF", "#FFFFFF"];

    const render = () => {
      ctx.clearRect(0, 0, w, h);
      if (particles.length < 35) {
        particles.push({
          x: Math.random() * w, y: h + 10,
          vx: (Math.random() - 0.5) * 0.8, vy: -Math.random() * 1.2 - 0.3,
          size: Math.random() * 2 + 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 1, life: 0, maxLife: Math.random() * 260 + 100,
        });
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.life++;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife) * 0.5;
        if (p.life > p.maxLife) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };
    render();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 w-full h-full pointer-events-none z-[15]" />;
}

/* ═══════════════════════════════════════════
   CURSOR SHUTTLECOCK DISABLED
   ═══════════════════════════════════════════ */
function CursorShuttlecock() {
  return null;
}



/* ═══════════════════════════════════════════
   MAIN HOMEPAGE
   ═══════════════════════════════════════════ */
export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavHovered, setIsNavHovered] = useState(false);
  const [isNavPinned, setIsNavPinned] = useState(false);
  const navHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleNavMouseEnter = () => {
    if (navHoverTimeoutRef.current) clearTimeout(navHoverTimeoutRef.current);
    setIsNavHovered(true);
  };

  const handleNavMouseLeave = () => {
    navHoverTimeoutRef.current = setTimeout(() => {
      setIsNavHovered(false);
    }, 220);
  };

  const isNavExpanded = isNavHovered || isNavPinned || mobileMenuOpen;

  const [hudVisible, setHudVisible] = useState(true);
  const [venueTheme, setVenueTheme] = useState<"pixel" | "real">("pixel");
  const heroRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 45, damping: 25 });
  const smoothY = useSpring(mouseY, { stiffness: 45, damping: 25 });

  // Layered parallax transforms for cinematic depth
  const bgX = useTransform(smoothX, [-0.5, 0.5], [-20, 20]);
  const bgY = useTransform(smoothY, [-0.5, 0.5], [-12, 12]);
  const athleteX = useTransform(smoothX, [-0.5, 0.5], [22, -22]);
  const athleteY = useTransform(smoothY, [-0.5, 0.5], [12, -12]);
  const shuttleX = useTransform(smoothX, [-0.5, 0.5], [32, -32]);
  const shuttleY = useTransform(smoothY, [-0.5, 0.5], [16, -16]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = heroRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.width / 2) / rect.width);
    mouseY.set((e.clientY - rect.height / 2) / rect.height);
  }, [mouseX, mouseY]);

  // GSAP entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      const animateIfFound = (selector: string, fromVars: gsap.TweenVars, toVars: gsap.TweenVars) => {
        if (typeof document !== "undefined" && document.querySelector(selector)) {
          gsap.fromTo(selector, fromVars, toVars);
        }
      };

      animateIfFound(".south-script", { opacity: 0, scale: 0.8 }, { opacity: 0.25, scale: 1, duration: 1.8, ease: "power2.out", delay: 0.4 });
    });
    return () => ctx.revert();
  }, []);

  const navLinks = [
    { label: "HOME", path: "/", active: true },
    { label: "TOURNAMENT", path: "/tournament" },
    { label: "SCHEDULE", path: "/schedule" },
    { label: "RESULTS", path: "/results" },
    { label: "EXPERIENCE", path: "/matches" },
    { label: "ABOUT", path: "/about" },
    { label: "CONTACT", path: "/contact" },
  ];

  return (
    <div className="relative min-h-screen bg-[#03060C] text-[#F8FAFC] overflow-x-hidden">
      <ParticleField />

      {/* ═══ DYNAMIC TOP NAVIGATION (COMPACT HUD TAB -> EXPANDS DOWNWARD ON HOVER) ═══ */}
      <motion.header
        onMouseEnter={handleNavMouseEnter}
        onMouseLeave={handleNavMouseLeave}
        initial={{ x: "-50%", y: -50, opacity: 0 }}
        animate={{
          x: "-50%",
          y: 0,
          opacity: 1,
          width: isNavExpanded ? "min(1360px, 98vw)" : "290px",
          borderRadius: "0px 0px 8px 8px",
        }}
        transition={{
          x: { duration: 0 },
          y: { type: "spring", stiffness: 350, damping: 28 },
          width: { type: "spring", stiffness: 350, damping: 30 },
          borderRadius: { duration: 0.15 },
          opacity: { duration: 0.25 },
        }}
        className={`fixed top-0 left-1/2 z-50 overflow-hidden bg-[#040711]/98 backdrop-blur-2xl border-x border-b border-white/20 select-none transition-shadow ${isNavExpanded
          ? "shadow-[0_20px_50px_rgba(0,0,0,0.95),0_0_25px_rgba(255,90,22,0.2)]"
          : "shadow-[0_8px_30px_rgba(0,0,0,0.85)] hover:border-[#FF5A16]/50 cursor-pointer"
          }`}
      >
        <AnimatePresence mode="wait" initial={false}>
          {!isNavExpanded ? (
            <motion.div
              key="compact-nav"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setIsNavPinned(true)}
              className="flex items-center justify-between h-[42px] w-full cursor-pointer group"
            >
              {/* Left accent bar matching Image 1 */}
              <div className="w-1.5 self-stretch bg-[#FF5A16] shadow-[0_0_10px_rgba(255,90,22,0.8)]" />

              <div className="flex items-center gap-2.5 px-3">
                <ShuttlecockEmblem className="w-5 h-5 shrink-0 drop-shadow-[0_0_6px_rgba(255,90,22,0.4)]" />
                <span className="font-rajdhani font-black tracking-wider text-xs text-white uppercase group-hover:text-[#FF5A16] transition-colors whitespace-nowrap">
                  SOUTH ZONE 2026
                </span>
              </div>

              <div className="flex items-center gap-1.5 pr-3 text-slate-400 group-hover:text-[#FF5A16] font-rajdhani text-[10px] font-bold uppercase transition-colors">
                <span>MENU</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded-nav"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-full flex flex-col"
            >
              <div className="flex items-center justify-between h-[64px] relative">
                {/* Left vertical accent stripe matching Image 1 */}
                <div className="w-2 self-stretch bg-[#FF5A16] shadow-[0_0_14px_rgba(255,90,22,0.9)] shrink-0" />

                {/* Brand Logo matching Image 1 */}
                <Link href="/" className="flex items-center gap-3 pl-3 sm:pl-4 group">
                  <ShuttlecockEmblem className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 group-hover:scale-105 transition-transform drop-shadow-[0_0_8px_rgba(255,90,22,0.5)]" />
                  <div className="flex flex-col">
                    <span className="font-rajdhani text-lg sm:text-xl text-white font-black tracking-wider leading-none group-hover:text-[#FF5A16] transition-colors">
                      SOUTH ZONE
                    </span>
                    <span className="font-rajdhani text-[9px] sm:text-[10px] text-slate-300 font-bold tracking-[0.16em] leading-tight uppercase mt-0.5">
                      WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026
                    </span>
                  </div>
                </Link>

                {/* Center / Right Links matching Image 1 */}
                <nav className="hidden lg:flex items-center gap-6 xl:gap-8 font-rajdhani text-xs sm:text-sm tracking-[0.14em] font-bold uppercase px-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.path}
                      href={link.path}
                      className={`relative py-1.5 transition-colors duration-150 ${link.active
                        ? "text-[#FF5A16] font-black"
                        : "text-slate-200 hover:text-[#FF5A16]"
                        }`}
                    >
                      {link.label}
                      {link.active && (
                        <motion.div
                          className="absolute -bottom-2 left-0 right-0 h-[2.5px] bg-[#FF5A16] shadow-[0_0_10px_rgba(255,90,22,0.9)]"
                          layoutId="navIndicator"
                        />
                      )}
                    </Link>
                  ))}
                </nav>

                {/* Right controls */}
                <div className="flex items-center gap-3 pr-4">
                  <div className="hidden 2xl:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 font-rajdhani text-xs text-slate-300 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
                    <span>8 COURTS LIVE</span>
                  </div>

                  {isNavPinned && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsNavPinned(false);
                        setIsNavHovered(false);
                        setMobileMenuOpen(false);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      title="Minimize"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Mobile Menu Toggle Button */}
                  <button
                    className="lg:hidden p-2 text-white rounded-lg border border-white/10 bg-white/5 shadow-sm cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMobileMenuOpen(!mobileMenuOpen);
                    }}
                    aria-label="Toggle navigation menu"
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5 text-[#FF5A16]" /> : <Menu className="w-5 h-5 text-white" />}
                  </button>
                </div>
              </div>

              {/* Mobile Navigation Drawer */}
              <AnimatePresence>
                {mobileMenuOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="lg:hidden overflow-hidden bg-[#050811]/98 border-t border-white/10 shadow-2xl"
                  >
                    <div className="flex flex-col gap-1 p-4 font-rajdhani text-xs tracking-wider">
                      {navLinks.map((link) => (
                        <Link
                          key={link.path}
                          href={link.path}
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setIsNavPinned(false);
                            setIsNavHovered(false);
                          }}
                          className={`py-2.5 px-3 border-l-2 uppercase transition-all ${link.active
                            ? "text-[#FF5A16] font-black border-[#FF5A16] bg-[#FF5A16]/10"
                            : "text-slate-300 hover:text-white border-transparent hover:border-white/20"
                            }`}
                        >
                          {link.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ═══ SCENE 01: ELITE CHAMPIONSHIP ARENA HERO ═══ */}
      <section
        ref={heroRef}
        onMouseMove={handleMouseMove}
        className="relative w-full h-[100svh] min-h-[660px] flex flex-col justify-between overflow-hidden bg-[#03060C] select-none"
      >
        {/* ─── LAYER 1: CINEMATIC CHAMPIONSHIP ARENA ENVIRONMENT (PARALLAX) ─── */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <motion.div
            className="relative w-full h-full scale-[1.04]"
            style={{ x: bgX, y: bgY }}
          >
            <Image
              src="/college-campus-pixel.jpg"
              alt="Championship Badminton Arena KLE Technological University"
              fill
              priority
              className="object-cover object-center select-none"
            />
            {/* Subtle atmospheric gradient scrim: keeps the neoclassical campus building clearly visible while ensuring crisp text contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#03060C]/75 via-[#03060C]/35 to-transparent z-[1] w-full lg:w-[58%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#03060C]/80 via-transparent to-[#03060C]/30 z-[1]" />
            <div
              className="absolute inset-0 pointer-events-none z-[1]"
              style={{
                background: "radial-gradient(circle at 65% 55%, rgba(0,229,255,0.06) 0%, transparent 60%)",
              }}
            />
          </motion.div>
        </div>

        {/* ─── LAYER 2: SOUTH INDIAN LANGUAGES WATERMARK (SUBTLE & REFINED) ─── */}
        <motion.div
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 0.3, x: 0 }}
          transition={{ duration: 1.4, delay: 0.7, ease: "easeOut" }}
          className="absolute right-[4%] sm:right-[7%] top-[14%] sm:top-[16%] z-10 select-none pointer-events-none hidden md:flex flex-col items-end gap-1 leading-none hover:opacity-50 transition-opacity"
        >
          <div className="flex items-baseline gap-4">
            <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0 }} className="text-3xl lg:text-4xl text-slate-400 font-bold tracking-wider">ಕನ್ನಡ</motion.span>
            <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }} className="text-3xl lg:text-4xl text-[#00E5FF]/60 font-bold tracking-wider">தமிழ்</motion.span>
          </div>
          <div className="flex items-baseline gap-4 mt-1">
            <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1.6 }} className="text-3xl lg:text-4xl text-[#FFD700]/70 font-bold tracking-wider">తెలుగు</motion.span>
            <motion.span animate={{ y: [0, -5, 0] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2.4 }} className="text-3xl lg:text-4xl text-slate-400 font-bold tracking-wider">മലയാളം</motion.span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3 }}
            className="flex items-center gap-2 font-sans text-[9px] text-slate-400 font-medium tracking-[0.25em] mt-1.5 uppercase"
          >
            <span>KARNATAKA</span>
            <span>•</span>
            <span>TAMIL NADU</span>
            <span>•</span>
            <span>TELANGANA &amp; AP</span>
            <span>•</span>
            <span>KERALA</span>
          </motion.div>
        </motion.div>

        {/* ─── LAYER 3: FEMALE BADMINTON ATHLETE (FOREGROUND RIGHT) ─── */}
        <motion.div
          style={{ x: athleteX, y: athleteY }}
          className="absolute right-0 sm:right-[1%] md:right-[2%] lg:right-[3%] xl:right-[5%] bottom-0 z-20 pointer-events-none w-[78vw] sm:w-[58vw] md:w-[48vw] lg:w-[42vw] xl:w-[38vw] max-w-[560px] h-[72vh] sm:h-[82vh] lg:h-[88vh] flex items-end justify-end select-none"
        >
          {/* Subtle ambient backlight halo behind athlete */}
          <div
            className="absolute -inset-10 opacity-50 filter blur-3xl pointer-events-none"
            style={{
              background: "radial-gradient(ellipse at 60% 45%, rgba(0,240,255,0.2) 0%, rgba(0,119,254,0.15) 50%, transparent 75%)",
            }}
          />

          {/* High-Resolution Athlete Character Sprite */}
          <div className="relative w-full h-full flex items-end justify-end">
            <Image
              src="/pixel-athlete-hero.png"
              alt="South Zone Women's Badminton Championship Hero Athlete"
              fill
              priority
              unoptimized
              className="object-contain object-bottom drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] drop-shadow-[0_0_30px_rgba(0,240,255,0.3)] filter contrast-[1.05]"
            />
          </div>
        </motion.div>

        {/* ─── LAYER 4: CHAMPIONSHIP TITLE & HERO CONTENT (LEFT 44-50%) ─── */}
        <div className="relative z-30 max-w-[1440px] mx-auto w-full px-4 sm:px-8 pt-24 sm:pt-28 lg:pt-32 flex flex-col justify-between flex-1 pointer-events-none">

          {/* Upper Area: Giant Free-Standing Title + Top-Right HUD */}
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6">

            {/* Giant Title Column (Left ~54% of Hero) */}
            <div className="pointer-events-auto flex flex-col items-start w-full lg:w-[56%] max-w-2xl">

              {/* Location & Dates Pill Badge */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#050B18]/80 border border-[#FF5A16]/50 backdrop-blur-xl mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.6)]"
              >
                <span className="w-2 h-2 rounded-full bg-[#FF5A16] animate-pulse shadow-[0_0_10px_#FF5A16]" />
                <span className="font-rajdhani text-xs sm:text-sm text-[#E2E8F0] tracking-[0.18em] uppercase font-bold">
                  KLE TECHNOLOGICAL UNIVERSITY • HUBBALLI
                </span>
                <span className="text-white/30 text-xs">|</span>
                <span className="font-rajdhani text-xs sm:text-sm text-[#FFD700] tracking-[0.16em] uppercase font-extrabold drop-shadow-[0_0_8px_rgba(255,215,0,0.6)]">
                  OCTOBER 18–21, 2026
                </span>
              </motion.div>

              {/* Dynamic Animated Championship Typography */}
              <div className="flex flex-col select-none leading-none">
                {/* Accent energy bar above SOUTH ZONE */}
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "3.5rem", opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="h-[3px] bg-gradient-to-r from-[#FF5A16] via-[#FF8A4A] to-transparent mb-2 rounded-full shadow-[0_0_8px_rgba(255,90,22,0.8)]"
                />

                <motion.div
                  initial={{ opacity: 0, x: -30, letterSpacing: "0.08em" }}
                  animate={{ opacity: 1, x: 0, letterSpacing: "0.14em" }}
                  transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className="font-rajdhani text-2xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold uppercase text-[#F8FAFC]"
                  style={{
                    textShadow: "2px 2px 0px #040814, 4px 4px 0px rgba(0,0,0,0.85), 0 0 20px rgba(0,0,0,0.6)",
                  }}
                >
                  SOUTH ZONE
                </motion.div>

                {/* BADMINTON — The Master Hero Word (Championship Orange Fire) */}
                <motion.h1
                  initial={{ opacity: 0, scale: 0.92, y: 25 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 280, damping: 22, delay: 0.25 }}
                  className="font-rajdhani text-5xl sm:text-7xl md:text-[5.5rem] lg:text-[6.8rem] xl:text-[7.6rem] font-black uppercase tracking-tight leading-[0.88] my-1 sm:my-1.5 select-none"
                >
                  <motion.span
                    animate={{
                      filter: [
                        "drop-shadow(0 3px 0 #7C1500) drop-shadow(0 6px 0 #040814) drop-shadow(0 8px 16px rgba(255, 90, 22, 0.5))",
                        "drop-shadow(0 3px 0 #7C1500) drop-shadow(0 6px 0 #040814) drop-shadow(0 14px 30px rgba(255, 90, 22, 0.9))",
                        "drop-shadow(0 3px 0 #7C1500) drop-shadow(0 6px 0 #040814) drop-shadow(0 8px 16px rgba(255, 90, 22, 0.5))",
                      ],
                    }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                    className="inline-block bg-gradient-to-b from-[#FFFFFF] via-[#FF8A4A] to-[#FF5A16] bg-clip-text text-transparent"
                    style={{
                      WebkitTextStroke: "1px rgba(255, 90, 22, 0.35)",
                    }}
                  >
                    BADMINTON
                  </motion.span>
                </motion.h1>

                {/* CHAMPIONSHIP 2026 */}
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.38, ease: "easeOut" }}
                  className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1"
                >
                  <span
                    className="font-rajdhani text-xl sm:text-3xl md:text-4xl lg:text-[2.8rem] font-black tracking-[0.08em] text-[#F8FAFC] uppercase"
                    style={{ textShadow: "2px 2px 0px #040814, 3px 3px 0px rgba(0,0,0,0.85)" }}
                  >
                    CHAMPIONSHIP
                  </span>
                  <motion.span
                    animate={{
                      filter: [
                        "drop-shadow(0 0 8px rgba(255,215,0,0.4)) drop-shadow(0 2px 0 #050A16)",
                        "drop-shadow(0 0 20px rgba(255,215,0,0.85)) drop-shadow(0 2px 0 #050A16)",
                        "drop-shadow(0 0 8px rgba(255,215,0,0.4)) drop-shadow(0 2px 0 #050A16)",
                      ],
                    }}
                    transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                    className="font-rajdhani text-xl sm:text-3xl md:text-4xl lg:text-[2.8rem] font-black tracking-[0.12em] bg-gradient-to-r from-[#FFF5C0] via-[#FFD700] to-[#FFAA00] bg-clip-text text-transparent"
                  >
                    2026
                  </motion.span>
                </motion.div>
              </div>

              {/* Championship Subtitle Telemetry Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.48 }}
                className="mt-5 max-w-xl border-l-2 border-[#FF5A16] bg-[#050A18]/65 backdrop-blur-md px-4 py-3 rounded-r-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)] border-y border-r border-white/5"
              >
                <p className="font-sans text-xs sm:text-sm md:text-base text-slate-200 leading-relaxed font-normal">
                  The official South Zone Inter-University Women&apos;s Badminton Championship. Over 1,000 elite athletes and 50+ university contingents clash for supremacy on 4 BWF-ratified synthetic courts at the KLE Tech Sports Complex.
                </p>
              </motion.div>
            </div>

          </div>

          {/* Lower Screen: Tournament Data HUD + Scroll Trigger */}
          <div className="pb-6 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 pointer-events-none">

            {/* Bottom-Left Tournament HUD */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, delay: 0.62, ease: "easeOut" }}
              className="pointer-events-auto p-4 bg-[#060A14]/80 border border-white/15 backdrop-blur-2xl rounded-2xl shadow-[0_15px_35px_rgba(0,0,0,0.7)] max-w-sm w-full sm:w-auto font-display text-white"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] text-[#FF5A16] tracking-wider uppercase font-semibold">
                <span className="flex items-center gap-2 font-rajdhani font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A16] animate-ping" />
                  TOURNAMENT SPECIFICATIONS
                </span>
                <span className="text-slate-400 font-sans">BWF RATIFIED</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {[
                  { value: "1,000+", label: "ATHLETES", color: "text-[#FF5A16]" },
                  { value: "50+", label: "UNIVERSITIES", color: "text-[#FFD700]" },
                  { value: "4", label: "SYNTHETIC COURTS", color: "text-[#FF8A4A]" },
                  { value: "5", label: "MEDAL EVENTS", color: "text-[#FFAA00]" },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.8 + i * 0.1 }}
                  >
                    <div className={`font-rajdhani font-black text-2xl sm:text-3xl ${s.color} leading-none`}>{s.value}</div>
                    <div className="font-rajdhani text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">{s.label}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Center: Scroll Down Indicator */}
            <a
              href="#arena-journey"
              className="pointer-events-auto flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 backdrop-blur-xl shadow-[0_8px_25px_rgba(0,0,0,0.5)] font-sans text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer group"
            >
              <motion.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                <ArrowDown className="w-3.5 h-3.5 text-[#FF5A16]" />
              </motion.span>
              <span className="tracking-wider uppercase">SCROLL TO EXPLORE</span>
              <motion.span animate={{ y: [0, 3, 0] }} transition={{ duration: 1.2, repeat: Infinity }}>
                <ArrowDown className="w-3.5 h-3.5 text-[#FF8A4A]" />
              </motion.span>
            </a>

            {/* Spacer for 3-column symmetry */}
            <div className="hidden md:block w-48 pointer-events-none" />
          </div>
        </div>

        {/* ─── CHAMPIONSHIP CREED — bottom-right corner near athlete's left foot, z-30 over athlete ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.55, ease: "easeOut" }}
          className="absolute right-2 sm:right-3 md:right-4 lg:right-5 bottom-[4%] sm:bottom-[5%] z-30 pointer-events-none text-right flex flex-col items-end select-none"
        >
          <motion.div
            initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}
            animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="font-rajdhani font-bold text-xs sm:text-sm md:text-base text-[#F8FAFC] tracking-[0.18em] uppercase whitespace-nowrap"
            style={{
              textShadow: "0 2px 8px #000, 0 4px 16px rgba(0,0,0,0.98), 0 0 24px rgba(0,0,0,0.9)",
            }}
          >
            THE SOUTH CONVERGES.
          </motion.div>
          <motion.div
            initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0 }}
            animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
            transition={{ duration: 1.0, delay: 1.05, ease: [0.22, 1, 0.36, 1] }}
            className="font-rajdhani font-black text-sm sm:text-base md:text-lg text-[#FF5A16] tracking-[0.2em] uppercase mt-0.5 whitespace-nowrap"
            style={{
              textShadow: "0 2px 8px #000, 0 0 18px rgba(255,90,22,0.85), 0 0 35px rgba(255,90,22,0.45)",
            }}
          >
            THE COURT DECIDES.
          </motion.div>
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            transition={{ duration: 0.55, delay: 1.5 }}
            style={{ transformOrigin: "right" }}
            className="w-10 h-[2px] bg-gradient-to-l from-[#FF5A16] via-[#FF8A4A] to-transparent mt-1 rounded-full shadow-[0_0_8px_rgba(255,90,22,0.8)]"
          />
        </motion.div>
        {/* Seamless Soft Atmospheric Blend into Scene 02 */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-b from-transparent via-[#03060C]/30 to-[#050B16]/60 z-[2] pointer-events-none" />

        {/* Visual Journey Energy Thread connecting Scene 01 to Scene 02 */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
          <motion.div
            animate={{ y: [0, 6, 0], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-[2px] h-10 bg-gradient-to-b from-[#FF5A16] to-transparent shadow-[0_0_8px_rgba(255,90,22,0.8)]"
          />
        </div>
      </section>


      {/* ═══ SCENE 02: THE CONTENDERS' PATHWAY (SCROLL MOTION) ═══ */}
      <section id="arena-journey" className="relative w-full pt-10 pb-20 sm:pt-14 sm:pb-24 px-4 sm:px-8 bg-[#050B16] overflow-hidden -mt-1">
        {/* Background Image: Campus Pathway to Arena */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/arena-amphitheatre-pixel.jpg"
            alt="Campus Walkway to Arena"
            fill
            className="object-cover object-center opacity-90 filter contrast-105"
          />
          {/* Gentle cinematic scrim that keeps the pathway trees & avenue clearly visible */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050B16]/50 via-transparent to-[#050B16]/60" />
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#050B16]/70 to-transparent z-[1] pointer-events-none" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-5xl mx-auto flex flex-col items-center text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#050914] border border-[#18D8D0] text-[#18D8D0] font-pixel text-[9px] tracking-wider mb-4 shadow-[2px_2px_0px_#000]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#18D8D0] animate-ping" />
            <span>02 // THE CONTENDERS&apos; PATHWAY</span>
          </div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="font-pixel text-2xl sm:text-4xl text-[#F4E6CE] font-bold tracking-tight mb-3"
          >
            FROM HERITAGE CAMPUS <br />
            <span className="text-[#00F0FF]">TO THE INDOOR STADIUM</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.22 }}
            className="font-sans text-sm sm:text-base text-[#91A0AE] max-w-2xl leading-relaxed mb-8"
          >
            Follow the championship avenue as university contingents from across South India journey from the iconic Dr. B.V. Bhoomaraddi heritage colonnade into the high-octane sports complex.
          </motion.p>

          {/* 4 Connected Pathway Milestones */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-10">
            {[
              { icon: <Users className="w-5 h-5 text-[#18D8D0]" />, value: "1,000+", label: "WOMEN ATHLETES" },
              { icon: <Shield className="w-5 h-5 text-[#FFD700]" />, value: "50+", label: "UNIVERSITIES" },
              { icon: <Zap className="w-5 h-5 text-[#18D8D0]" />, value: "4", label: "REGULATION COURTS" },
              { icon: <Trophy className="w-5 h-5 text-[#FFD700]" />, value: "5", label: "TROPHY CATEGORIES" },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                whileHover={{ y: -4, borderColor: "#18D8D0", scale: 1.02 }}
                transition={{ duration: 0.5, delay: i * 0.13 }}
                className="p-4 bg-[#050914]/90 border-2 border-[#18D8D0]/40 flex flex-col items-center justify-center shadow-[3px_3px_0px_#000] transition-all"
              >
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  whileInView={{ scale: 1, rotate: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 + i * 0.13 }}
                  className="mb-2"
                >{stat.icon}</motion.div>
                <p className="font-pixel text-lg sm:text-xl text-[#F4E6CE] font-bold">{stat.value}</p>
                <p className="font-pixel text-[8px] text-[#91A0AE] uppercase tracking-wider mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Continue scroll trigger */}
          <a
            href="#arena-venue"
            className="flex items-center gap-2 font-pixel text-xs text-[#18D8D0] hover:text-[#00F0FF] transition-colors cursor-pointer group"
          >
            <span>DISCOVER THE ARENA</span>
            <span className="group-hover:translate-y-1 transition-transform">↓</span>
          </a>
        </motion.div>

        {/* Visual Journey Energy Thread connecting Scene 02 to Scene 03 */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
          <motion.div
            animate={{ y: [0, 6, 0], opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="w-[2px] h-10 bg-gradient-to-b from-[#00F0FF] to-transparent shadow-[0_0_8px_#00F0FF]"
          />
        </div>
      </section>


      {/* ═══ SCENE 03: THE INDOOR ARENA — CHAMPIONSHIP VENUE ═══ */}
      <section id="arena-venue" className="relative w-full pt-12 pb-24 sm:pt-16 sm:pb-28 px-4 sm:px-8 overflow-hidden z-10 bg-[#050B16] -mt-1">
        {/* Full-Bleed Pixel Arena Facade Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/arena-facade-pixel.jpg"
            alt="KLE Tech Indoor Badminton Arena Facade"
            fill
            className="object-cover object-center select-none opacity-90 filter contrast-105"
            style={{ imageRendering: "pixelated" }}
          />
          {/* Smooth atmospheric gradients for text contrast & seamless blend */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#050B16]/60 via-transparent to-[#050914]/85" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050914]/40 via-transparent to-[#050914]/40" />
          <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#050B16]/70 to-transparent z-[1] pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#050914] to-transparent z-[1] pointer-events-none" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 max-w-6xl mx-auto flex flex-col items-center"
        >
          {/* Section Header */}
          <div className="flex flex-col items-center text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#050914]/90 border border-[#18D8D0] text-[#18D8D0] font-pixel text-[9px] tracking-wider mb-3 shadow-[2px_2px_0px_#000] backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#18D8D0] animate-pulse" />
              <span>03 // THE CHAMPIONSHIP VENUE</span>
            </div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-pixel text-2xl sm:text-4xl text-[#F4E6CE] font-bold tracking-tight uppercase mb-2"
              style={{ textShadow: "0 0 20px rgba(0,240,255,0.4)" }}
            >
              KLE TECH <span className="text-[#00F0FF]">INDOOR STADIUM</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.22 }}
              className="font-sans text-xs sm:text-sm text-[#91A0AE] max-w-xl"
            >
              4 BWF-Ratified Synthetic Courts • 1,500 Spectator Seating • Broadcast Telemetry • B.V.B. Campus, Hubballi
            </motion.p>
          </div>

          {/* Tournament Quick Access Portals */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 w-full mb-12">

            {/* Card 1: SCHEDULE & FIXTURES */}
            <Link href="/schedule" className="group">
              <div className="h-full p-5 bg-[#050914]/85 border-2 border-[#18D8D0]/50 hover:border-[#18D8D0] backdrop-blur-md flex flex-col justify-between shadow-[3px_3px_0px_#000] hover:shadow-[0_0_25px_rgba(24,216,208,0.25)] transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 border border-[#18D8D0] bg-[#07101D] flex items-center justify-center shadow-[2px_2px_0px_#000]">
                      <Calendar className="w-5 h-5 text-[#18D8D0]" />
                    </div>
                    <div>
                      <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold group-hover:text-[#18D8D0] transition-colors">
                        SCHEDULE &amp; FIXTURES
                      </h3>
                      <p className="font-pixel text-[8px] text-[#00F0FF]">OCT 18 – 21, 2026</p>
                    </div>
                  </div>
                  <p className="font-sans text-xs text-[#91A0AE] leading-relaxed mb-4">
                    Day-by-day court slot schedule, morning &amp; evening tie fixtures, team lineups, and court allocations.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#18D8D0]/20 flex items-center justify-between font-pixel text-[9px] text-[#18D8D0] group-hover:text-[#00F0FF] transition-colors">
                  <span>VIEW FIXTURES</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Card 2: LIVE MATCH TELEMETRY */}
            <Link href="/matches" className="group">
              <div className="h-full p-5 bg-[#050914]/85 border-2 border-[#FFD700]/50 hover:border-[#FFD700] backdrop-blur-md flex flex-col justify-between shadow-[3px_3px_0px_#000] hover:shadow-[0_0_25px_rgba(255,215,0,0.25)] transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 border border-[#FFD700] bg-[#07101D] flex items-center justify-center shadow-[2px_2px_0px_#000]">
                      <Activity className="w-5 h-5 text-[#FFD700]" />
                    </div>
                    <div>
                      <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold group-hover:text-[#FFD700] transition-colors">
                        LIVE MATCHES
                      </h3>
                      <p className="font-pixel text-[8px] text-[#18D8D0]">4 COURTS STREAMING</p>
                    </div>
                  </div>
                  <p className="font-sans text-xs text-[#91A0AE] leading-relaxed mb-4">
                    Point-by-point live match telemetry, tie progression, and active court status across all simultaneous ties.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#FFD700]/20 flex items-center justify-between font-pixel text-[9px] text-[#FFD700] group-hover:text-[#F4E6CE] transition-colors">
                  <span>COURT TELEMETRY</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Card 3: TOURNAMENT CENTRAL */}
            <Link href="/tournament" className="group">
              <div className="h-full p-5 bg-[#050914]/85 border-2 border-[#18D8D0]/50 hover:border-[#18D8D0] backdrop-blur-md flex flex-col justify-between shadow-[3px_3px_0px_#000] hover:shadow-[0_0_25px_rgba(24,216,208,0.25)] transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 border border-[#18D8D0] bg-[#07101D] flex items-center justify-center shadow-[2px_2px_0px_#000]">
                      <Trophy className="w-5 h-5 text-[#18D8D0]" />
                    </div>
                    <div>
                      <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold group-hover:text-[#18D8D0] transition-colors">
                        TOURNAMENT CENTRAL
                      </h3>
                      <p className="font-pixel text-[8px] text-[#18D8D0]">5 CHAMPIONSHIP DRAWS</p>
                    </div>
                  </div>
                  <p className="font-sans text-xs text-[#91A0AE] leading-relaxed mb-4">
                    Official BWF-standard draws, Singles, Doubles, and Inter-University Team Championship regulations.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#18D8D0]/20 flex items-center justify-between font-pixel text-[9px] text-[#18D8D0] group-hover:text-[#00F0FF] transition-colors">
                  <span>EXPLORE DRAWS</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* Card 4: RESULTS & STANDINGS */}
            <Link href="/results" className="group">
              <div className="h-full p-5 bg-[#050914]/85 border-2 border-[#38E8FF]/50 hover:border-[#38E8FF] backdrop-blur-md flex flex-col justify-between shadow-[3px_3px_0px_#000] hover:shadow-[0_0_25px_rgba(0,240,255,0.25)] transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 border border-[#38E8FF] bg-[#07101D] flex items-center justify-center shadow-[2px_2px_0px_#000]">
                      <BarChart2 className="w-5 h-5 text-[#38E8FF]" />
                    </div>
                    <div>
                      <h3 className="font-pixel text-sm text-[#F4E6CE] font-bold group-hover:text-[#38E8FF] transition-colors">
                        RESULTS &amp; STANDINGS
                      </h3>
                      <p className="font-pixel text-[8px] text-[#18D8D0]">VERIFIED SCORECARDS</p>
                    </div>
                  </div>
                  <p className="font-sans text-xs text-[#91A0AE] leading-relaxed mb-4">
                    Official tie outcome sheets, university medal standings, individual player records, and completed matches.
                  </p>
                </div>
                <div className="pt-3 border-t border-[#38E8FF]/20 flex items-center justify-between font-pixel text-[9px] text-[#38E8FF] group-hover:text-[#F4E6CE] transition-colors">
                  <span>VIEW STANDINGS</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

          </div>

          {/* Arena Key Specifications Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full p-4 bg-[#050914]/90 border border-[#18D8D0]/40 backdrop-blur-md shadow-[3px_3px_0px_#000] font-pixel text-center">
            <div className="p-2 border-r border-[#18D8D0]/20 last:border-none">
              <p className="text-base sm:text-lg text-[#00F0FF] font-bold">4 COURTS</p>
              <p className="text-[8px] text-[#91A0AE] uppercase mt-0.5">BWF Standard Synthetic Mats</p>
            </div>
            <div className="p-2 border-r border-[#18D8D0]/20 last:border-none">
              <p className="text-base sm:text-lg text-[#18D8D0] font-bold">1,500 SEATS</p>
              <p className="text-[8px] text-[#91A0AE] uppercase mt-0.5">Tiered Spectator Gallery</p>
            </div>
            <div className="p-2 border-r border-[#18D8D0]/20 last:border-none">
              <p className="text-base sm:text-lg text-[#F4E6CE] font-bold">1,200 LUX</p>
              <p className="text-[8px] text-[#91A0AE] uppercase mt-0.5">Anti-Glare LED Floodlighting</p>
            </div>
            <div className="p-2">
              <p className="text-base sm:text-lg text-[#FFD700] font-bold">HUBBALLI</p>
              <p className="text-[8px] text-[#91A0AE] uppercase mt-0.5">KLE B.V.B. Campus Venue</p>
            </div>
          </div>
        </motion.div>
      </section>


      {/* ═══ BOTTOM TICKER ═══ */}
      <footer className="sticky bottom-0 left-0 right-0 z-50 bg-[#050914]/95 backdrop-blur-md border-t border-white/10 px-4 sm:px-8 py-2.5 flex items-center justify-between font-pixel text-[10px] select-none shadow-[0_-4px_20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-2">
          <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity }}>🏸</motion.span>
          <span className="text-[#F4E6CE]">SOUTH ZONE WOMEN&apos;S BADMINTON CHAMPIONSHIP 2026</span>
        </div>
        <div className="hidden md:block flex-1 mx-8 overflow-hidden">
          <motion.div className="whitespace-nowrap text-[#18D8D0]/40"
            animate={{ x: ["100%", "-100%"] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >━━━ SPORT UNITES • OPPORTUNITY ELEVATES ━━━ DISCIPLINE TODAY • CHAMPION TOMORROW ━━━ THE SOUTH CONVERGES • THE COURT DECIDES ━━━ ಕನ್ನಡ • தமிழ் • తెలుగు • മലയാളം ━━━</motion.div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#00F0FF]">DISCIPLINE TODAY</span>
          <span className="text-[#F4E6CE]">CHAMPION TOMORROW</span>
        </div>
      </footer>
    </div>
  );
}
