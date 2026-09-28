"use client";

import React, { useEffect, useRef } from "react";

interface HeroSceneProps {
  className?: string;
}

export const HeroScene: React.FC<HeroSceneProps> = ({ className = "" }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX - width / 2) / (width / 2),
        y: (e.clientY - height / 2) / (height / 2),
      };
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Stars particle system
    const stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.5,
      size: Math.random() * 2 + 1,
      alpha: Math.random(),
    }));

    // Floating Ember / Cyan Sparks
    const sparks = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: -Math.random() * 1.5 - 0.5,
      size: Math.random() * 3 + 1,
      color: Math.random() > 0.4 ? "#FF5A16" : "#18D8D0",
      alpha: Math.random() * 0.8 + 0.2,
    }));

    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      const mouseX = mouseRef.current.x;
      const mouseY = mouseRef.current.y;

      // 1. Deep Midnight Navy Background Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, "#050914");
      skyGrad.addColorStop(0.4, "#07101D");
      skyGrad.addColorStop(0.7, "#1F0B18");
      skyGrad.addColorStop(1, "#0A1424");
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Stars Particle Layer (Parallax 2px)
      ctx.fillStyle = "#FFFFFF";
      stars.forEach((star) => {
        ctx.globalAlpha = Math.sin(frameCount * 0.04 + star.alpha) * 0.4 + 0.5;
        ctx.fillRect(
          Math.floor(star.x + mouseX * 2),
          Math.floor(star.y + mouseY * 2),
          star.size,
          star.size
        );
      });
      ctx.globalAlpha = 1.0;

      // 3. Orange Sunset Sun (Parallax 4px)
      const sunX = width * 0.55 + mouseX * 4;
      const sunY = height * 0.46 + mouseY * 4;
      const sunRadius = Math.min(width, height) * 0.18;

      const sunGlow = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunRadius * 2);
      sunGlow.addColorStop(0, "#FF7A1A");
      sunGlow.addColorStop(0.3, "#FF5A16");
      sunGlow.addColorStop(0.7, "rgba(217, 78, 22, 0.4)");
      sunGlow.addColorStop(1, "rgba(5, 9, 20, 0)");

      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#FF7A1A";
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunRadius, 0, Math.PI * 2);
      ctx.fill();

      // 4. Pixel Sunset Mountain Silhouettes (Parallax 6px)
      ctx.fillStyle = "#0A1424";
      ctx.beginPath();
      ctx.moveTo(0, height * 0.6);
      ctx.lineTo(width * 0.2, height * 0.52 + mouseY * 6);
      ctx.lineTo(width * 0.4, height * 0.58 + mouseY * 6);
      ctx.lineTo(width * 0.65, height * 0.48 + mouseY * 6);
      ctx.lineTo(width * 0.85, height * 0.56 + mouseY * 6);
      ctx.lineTo(width, height * 0.5 + mouseY * 6);
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.fill();

      // Mountain Contour Lines (Orange Sunset Rim)
      ctx.strokeStyle = "#FF5A16";
      ctx.lineWidth = 2;
      ctx.stroke();

      // 5. KLE TECH ARENA Stadium Structure (Parallax 8px)
      const stadiumX = width * 0.5 + mouseX * 8;
      const stadiumY = height * 0.58 + mouseY * 8;
      const stadiumWidth = Math.min(width * 0.6, 750);
      const stadiumHeight = stadiumWidth * 0.38;

      ctx.save();
      ctx.translate(stadiumX - stadiumWidth / 2, stadiumY);

      // Main Stadium Oval / Outer Hull
      ctx.fillStyle = "#07101D";
      ctx.strokeStyle = "#FF5A16";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(
        stadiumWidth / 2,
        stadiumHeight / 2,
        stadiumWidth / 2,
        stadiumHeight / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.stroke();

      // Warm Stadium Window Lights Grid
      ctx.fillStyle = "#FF7A1A";
      for (let i = 0.15; i <= 0.85; i += 0.08) {
        for (let j = 0.3; j <= 0.7; j += 0.2) {
          const wx = stadiumWidth * i;
          const wy = stadiumHeight * j;
          ctx.fillRect(wx, wy, 8, 5);
        }
      }

      // KLE TECH ARENA Header Sign
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 13px monospace";
      ctx.textAlign = "center";
      ctx.fillText("KLE TECH ARENA", stadiumWidth / 2, stadiumHeight * 0.22);

      // Central Blue Jumbotron Digital Screen
      const jumbotronW = stadiumWidth * 0.26;
      const jumbotronH = stadiumHeight * 0.45;
      const jumbotronX = stadiumWidth / 2 - jumbotronW / 2;
      const jumbotronY = stadiumHeight * 0.35;

      ctx.fillStyle = "#050914";
      ctx.fillRect(jumbotronX, jumbotronY, jumbotronW, jumbotronH);
      ctx.strokeStyle = "#18D8D0";
      ctx.lineWidth = 2;
      ctx.strokeRect(jumbotronX, jumbotronY, jumbotronW, jumbotronH);

      // Screen Blue Glow Text: "GOOD PLAYERS BETTER PEOPLE"
      ctx.fillStyle = "#18D8D0";
      ctx.font = "bold 11px monospace";
      ctx.shadowColor = "#18D8D0";
      ctx.shadowBlur = 8;
      ctx.fillText("GOOD", stadiumWidth / 2, jumbotronY + 16);
      ctx.fillText("PLAYERS", stadiumWidth / 2, jumbotronY + 30);
      ctx.fillText("BETTER", stadiumWidth / 2, jumbotronY + 44);
      ctx.fillText("PEOPLE", stadiumWidth / 2, jumbotronY + 58);
      ctx.shadowBlur = 0;

      ctx.restore();

      // 6. Flying Fiery Shuttlecock Meteor (Top Right to Center)
      const shuttleStartX = width * 0.75 + mouseX * 10;
      const shuttleStartY = height * 0.15 + mouseY * 10;
      const shuttlePulse = Math.sin(frameCount * 0.08) * 5;

      ctx.save();
      ctx.translate(shuttleStartX, shuttleStartY + shuttlePulse);
      ctx.rotate(-Math.PI / 6); // Angled down towards left

      // Orange Fire Tail Streak
      const tailGrad = ctx.createLinearGradient(0, 0, -220, -80);
      tailGrad.addColorStop(0, "rgba(255, 122, 26, 0.95)");
      tailGrad.addColorStop(0.4, "rgba(255, 90, 22, 0.7)");
      tailGrad.addColorStop(0.8, "rgba(217, 78, 22, 0.3)");
      tailGrad.addColorStop(1, "rgba(5, 9, 20, 0)");

      ctx.fillStyle = tailGrad;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(-240, -45);
      ctx.lineTo(-220, 35);
      ctx.lineTo(0, 10);
      ctx.closePath();
      ctx.fill();

      // Shuttlecock Feather Cone
      ctx.fillStyle = "#F4E6CE";
      ctx.beginPath();
      ctx.moveTo(10, -18);
      ctx.lineTo(-30, -35);
      ctx.lineTo(-30, 35);
      ctx.lineTo(10, 18);
      ctx.closePath();
      ctx.fill();

      // Shuttle Feather Lines
      ctx.strokeStyle = "#18D8D0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, -10);
      ctx.lineTo(-28, -20);
      ctx.moveTo(10, 0);
      ctx.lineTo(-28, 0);
      ctx.moveTo(10, 10);
      ctx.lineTo(-28, 20);
      ctx.stroke();

      // Cork Head with Fiery Glow
      ctx.fillStyle = "#FF5A16";
      ctx.shadowColor = "#FF7A1A";
      ctx.shadowBlur = 15;
      ctx.fillRect(10, -16, 24, 32);
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(20, -12, 10, 24);
      ctx.shadowBlur = 0;

      ctx.restore();

      // 7. Floating Sparks/Embers Particle System
      sparks.forEach((sp) => {
        sp.x += sp.vx;
        sp.y += sp.vy;
        if (sp.y < 0) {
          sp.y = height;
          sp.x = Math.random() * width;
        }
        ctx.fillStyle = sp.color;
        ctx.globalAlpha = sp.alpha;
        ctx.fillRect(Math.floor(sp.x), Math.floor(sp.y), sp.size, sp.size);
      });
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 w-full h-full pointer-events-none z-0 ${className}`}
    />
  );
};
