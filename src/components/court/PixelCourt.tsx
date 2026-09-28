"use client";

import React, { useRef, useEffect } from "react";
import { MATCHES_DATA } from "@/data/schedule";
import { PixelScoreboard } from "@/components/pixel/PixelScoreboard";

export const PixelCourt: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = 400);

    let shuttleX = width * 0.3;
    let shuttleY = height * 0.4;
    let shuttleVx = 4;
    let shuttleVy = -3;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep Court Background
      ctx.fillStyle = "#0a0c14";
      ctx.fillRect(0, 0, width, height);

      // Audience Silhouettes Parallax Layer
      ctx.fillStyle = "#121726";
      for (let x = 10; x < width; x += 25) {
        const headY = 40 + Math.sin(x * 0.1) * 5;
        ctx.beginPath();
        ctx.arc(x, headY, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Stadium Overhead Spotlight Beams
      ctx.fillStyle = "rgba(255, 85, 0, 0.08)";
      ctx.beginPath();
      ctx.moveTo(width * 0.3, 0);
      ctx.lineTo(width * 0.5, height);
      ctx.lineTo(width * 0.1, height);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(width * 0.7, 0);
      ctx.lineTo(width * 0.9, height);
      ctx.lineTo(width * 0.5, height);
      ctx.fill();

      // Badminton Court Floor (Isometric Perspective)
      ctx.fillStyle = "#1e3023";
      ctx.beginPath();
      ctx.moveTo(width * 0.1, height * 0.9);
      ctx.lineTo(width * 0.9, height * 0.9);
      ctx.lineTo(width * 0.8, height * 0.45);
      ctx.lineTo(width * 0.2, height * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Court Inner Markings
      ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
      ctx.lineWidth = 2;

      // Service Center Line
      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.45);
      ctx.lineTo(width * 0.5, height * 0.9);
      ctx.stroke();

      // Badminton Net
      ctx.strokeStyle = "#ff7700";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(width * 0.5, height * 0.35);
      ctx.lineTo(width * 0.5, height * 0.9);
      ctx.stroke();

      // Net Mesh Pattern
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      for (let y = height * 0.35; y < height * 0.9; y += 8) {
        ctx.beginPath();
        ctx.moveTo(width * 0.48, y);
        ctx.lineTo(width * 0.52, y);
        ctx.stroke();
      }

      // Animated Shuttlecock Rally Trajectory
      shuttleX += shuttleVx;
      shuttleY += shuttleVy;
      shuttleVy += 0.15; // Gravity

      if (shuttleX > width * 0.8 || shuttleX < width * 0.2) {
        shuttleVx = -shuttleVx;
        shuttleVy = -4;
      }
      if (shuttleY > height * 0.8) {
        shuttleY = height * 0.8;
        shuttleVy = -5;
      }

      // Render Animated Shuttlecock Sprite
      ctx.fillStyle = "#ff5500";
      ctx.fillRect(Math.floor(shuttleX), Math.floor(shuttleY), 6, 6);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(Math.floor(shuttleX - 4), Math.floor(shuttleY - 4), 4, 4);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="w-full flex flex-col gap-6 my-8">
      <div className="relative w-full border-4 border-pixel-orange-fiery bg-black shadow-pixel-orange overflow-hidden">
        <div className="absolute top-3 left-3 z-10">
          <span className="font-pixel text-[10px] bg-pixel-orange-fiery text-black px-2.5 py-1 border border-black font-bold">
            COURT 01 — LIVE PARALLAX MATRIX
          </span>
        </div>
        <canvas ref={canvasRef} className="w-full h-[400px] pixelated" />
      </div>

      {/* Live Match Scoreboard under Court */}
      {MATCHES_DATA.length > 0 && <PixelScoreboard match={MATCHES_DATA[0]} />}
    </div>
  );
};
