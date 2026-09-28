"use client";
import React from 'react';
import { motion, useTransform, MotionValue, useMotionValue } from 'framer-motion';

interface FemaleAthleteIllustrationProps {
  variant?: 'hero' | 'action' | 'badge' | 'card' | 'standing';
  className?: string;
  mouseX?: MotionValue<number>;
  mouseY?: MotionValue<number>;
}

export function FemaleAthleteIllustration({
  variant = 'hero',
  className = 'w-full h-auto',
  mouseX,
  mouseY,
}: FemaleAthleteIllustrationProps) {
  
  // Fallback for when no mouse values are provided
  const fallbackMouse = useMotionValue(0);
  const mX = mouseX || fallbackMouse;

  // Interactive transforms if mouse values are provided
  const armRotate = useTransform(mX, [-1, 1], [-15, 25]);
  const headRotate = useTransform(mX, [-1, 1], [-10, 10]);
  const headPan = useTransform(mX, [-1, 1], [-5, 5]);
  const bodySway = useTransform(mX, [-1, 1], [-2, 2]);

  if (variant === 'badge') {
    return (
      <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <circle cx="60" cy="60" r="54" fill="#07101D" stroke="#FF5A16" strokeWidth="2" />
        <circle cx="60" cy="60" r="46" stroke="#18D8D0" strokeWidth="1" strokeDasharray="4 4" />
        <path d="M60 22 C64 22 67 25 67 29 C67 33 64 36 60 36 C56 36 53 33 53 29 C53 25 56 22 60 22 Z" fill="#F4E6CE" />
        <path d="M54 26 C46 20 40 24 36 28 C42 32 50 30 54 28 Z" fill="#FF7A1A" />
        <path d="M60 37 L72 45 L84 32" stroke="#FF5A16" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="88" cy="27" r="9" stroke="#18D8D0" strokeWidth="2" fill="none" />
        <line x1="84" y1="32" x2="80" y2="38" stroke="#F4E6CE" strokeWidth="2" />
        <path d="M54 50 L66 50 L70 68 L50 68 Z" fill="#FF5A16" />
        <rect x="57" y="54" width="6" height="8" rx="1" fill="#07101D" opacity="0.8" />
        <path d="M54 68 L46 88 L38 96 M64 68 L70 85 L78 98" stroke="#F4E6CE" strokeWidth="4" strokeLinecap="round" />
        <circle cx="26" cy="26" r="3" fill="#18D8D0" />
      </svg>
    );
  }

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.svg
        viewBox="0 0 500 750"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-auto max-w-full drop-shadow-[0_10px_30px_rgba(255,90,22,0.4)]"
        style={mouseX ? { x: bodySway, rotate: bodySway } : {}}
      >
        <defs>
          <linearGradient id="sunsetRim" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF7A1A" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#FF5A16" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#18D8D0" stopOpacity="0.9" />
          </linearGradient>

          <linearGradient id="jerseyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0B132B" />
            <stop offset="50%" stopColor="#07101D" />
            <stop offset="100%" stopColor="#050914" />
          </linearGradient>

          <filter id="heroGlow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <circle cx="280" cy="380" r="220" fill="#FF5A16" fillOpacity="0.18" filter="url(#heroGlow)" />

        <g id="female-anime-athlete-hero">
          
          {/* Head & Hair (Interactive) */}
          <motion.g style={mouseX ? { rotate: headRotate, x: headPan, originX: "250px", originY: "210px" } : {}}>
            {/* Hair */}
            <path d="M 235 155 Q 170 120 130 150 Q 180 180 220 175 Z" fill="#050914" stroke="#FF7A1A" strokeWidth="2" />
            <path d="M 230 160 Q 175 135 145 165 Q 190 185 225 178 Z" fill="#111827" />
            <path d="M 220 162 Q 180 145 155 170" stroke="#FF5A16" strokeWidth="2.5" strokeLinecap="round" />
            
            {/* Head & Headband */}
            <ellipse cx="250" cy="180" rx="36" ry="40" fill="#F4E6CE" />
            <path d="M 218 160 Q 250 140 282 165 L 285 195 Q 250 205 215 190 Z" fill="#0A1424" />
            <path d="M 218 175 Q 250 165 284 178" stroke="#18D8D0" strokeWidth="8" strokeLinecap="round" />
          </motion.g>

          {/* Neck & Shoulders */}
          <path d="M 235 210 L 265 210 L 270 230 L 230 230 Z" fill="#F4E6CE" />

          {/* Jersey Body */}
          <path d="M 200 230 L 300 230 L 320 410 L 180 410 Z" fill="url(#jerseyGrad)" stroke="#FF5A16" strokeWidth="3" />
          <path d="M 200 230 L 230 230 L 210 280 L 195 260 Z" fill="#FF5A16" />
          <path d="M 300 230 L 270 230 L 290 280 L 305 260 Z" fill="#FF5A16" />

          {/* South Zone Jersey Emblem */}
          <g transform="translate(230, 275)" opacity="0.95">
            <rect x="0" y="0" width="40" height="22" rx="2" fill="#050914" stroke="#18D8D0" strokeWidth="1.5" />
            <text x="20" y="15" fill="#FF5A16" fontSize="11" fontWeight="bold" fontFamily="monospace" textAnchor="middle">SZ</text>
          </g>

          {/* Skirt */}
          <path d="M 180 410 L 320 410 L 335 500 L 165 500 Z" fill="#050914" stroke="#18D8D0" strokeWidth="2" />
          <path d="M 170 495 L 330 495" stroke="#FF5A16" strokeWidth="4" />

          {/* Left Arm */}
          <path d="M 195 240 L 160 340 L 150 420" stroke="#F4E6CE" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="140" y="370" width="22" height="18" rx="4" fill="#FF5A16" stroke="#050914" strokeWidth="2" />

          {/* Legs */}
          <path d="M 210 500 L 195 620 L 180 710" stroke="#F4E6CE" strokeWidth="26" strokeLinecap="round" />
          <rect x="165" y="660" width="28" height="25" fill="#FFFFFF" stroke="#050914" strokeWidth="2" />
          <path d="M 160 705 L 200 705 L 205 730 L 150 730 Z" fill="#FF5A16" />
          <path d="M 290 500 L 310 620 L 325 710" stroke="#F4E6CE" strokeWidth="26" strokeLinecap="round" />
          <rect x="310" y="660" width="28" height="25" fill="#FFFFFF" stroke="#050914" strokeWidth="2" />
          <path d="M 305 705 L 345 705 L 350 730 L 295 730 Z" fill="#18D8D0" />
          
          {/* Right Arm & Racket (Interactive) */}
          <motion.g style={mouseX ? { rotate: armRotate, originX: "305px", originY: "240px" } : {}}>
            <path d="M 305 240 L 340 340 L 360 430" stroke="#F4E6CE" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="345" y="380" width="22" height="18" rx="4" fill="#18D8D0" stroke="#050914" strokeWidth="2" />
            
            <g transform="translate(365, 430) rotate(25)">
              <rect x="-4" y="0" width="10" height="55" rx="3" fill="#F4E6CE" stroke="#050914" strokeWidth="2" />
              <rect x="-2" y="5" width="6" height="45" fill="#FF5A16" />
              <rect x="-2" y="55" width="6" height="120" fill="#18D8D0" />
              <path d="M -2 175 L -18 195 M 4 175 L 20 195" stroke="#FF5A16" strokeWidth="4" />
              <ellipse cx="1" cy="245" rx="45" ry="58" stroke="#FF5A16" strokeWidth="5" fill="#07101D" fillOpacity="0.4" />
              <ellipse cx="1" cy="245" rx="45" ry="58" stroke="#18D8D0" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
              <path d="M -35 245 L 37 245 M -30 220 L 32 220 M -30 270 L 32 270 M 1 200 L 1 290 M -20 205 L -20 285 M 20 205 L 20 285" stroke="#18D8D0" strokeWidth="1" opacity="0.6" />
            </g>
          </motion.g>

        </g>

        <circle cx="320" cy="240" r="4" fill="#FF7A1A" filter="url(#heroGlow)" />
        <circle cx="185" cy="420" r="3" fill="#18D8D0" filter="url(#heroGlow)" />
      </motion.svg>
    </div>
  );
}
