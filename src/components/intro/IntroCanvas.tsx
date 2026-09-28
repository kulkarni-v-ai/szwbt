"use client";

import React, { useEffect, useRef, useState } from "react";

interface IntroCanvasProps {
  currentScene: number; // 1 to 8
  onSceneComplete?: () => void;
  onEnter?: () => void;
}

export const IntroCanvas: React.FC<IntroCanvasProps> = ({
  currentScene,
  onEnter,
}) => {
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
    const stars = Array.from({ length: 150 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.5 + 0.1,
      alpha: Math.random(),
    }));

    // Meteor / Fire particles
    const fireParticles: { x: number; y: number; vx: number; vy: number; size: number; life: number }[] = [];

    // Impact explosion pixel rings
    const rings: { radius: number; maxRadius: number; alpha: number }[] = [];

    let frameCount = 0;

    const render = () => {
      frameCount++;
      ctx.clearRect(0, 0, width, height);

      // Deep Black / Navy Space Background
      const bgGradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        50,
        width / 2,
        height / 2,
        width * 0.8
      );
      bgGradient.addColorStop(0, "#0e1526");
      bgGradient.addColorStop(0.6, "#080a10");
      bgGradient.addColorStop(1, "#040508");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Render Stars (Scene 01+)
      ctx.fillStyle = "#ffffff";
      stars.forEach((star) => {
        star.y += star.speed * (currentScene >= 3 ? 4 : 1);
        if (star.y > height) star.y = 0;
        ctx.globalAlpha = Math.sin(frameCount * 0.05 + star.alpha) * 0.5 + 0.5;
        ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
      });
      ctx.globalAlpha = 1.0;

      // Distant Earth Pixel Sphere (Scene 01, 02, 03, 04)
      if (currentScene <= 4) {
        const earthScale = currentScene === 1 ? 40 : currentScene === 2 ? 60 : currentScene === 3 ? 120 : 250;
        const earthY = height / 2 + (currentScene >= 3 ? (frameCount * 2) % 300 : 0);
        
        ctx.save();
        ctx.translate(width / 2 + mouseRef.current.x * 10, earthY + mouseRef.current.y * 10);
        ctx.fillStyle = "#0a4b7c";
        ctx.beginPath();
        ctx.arc(0, 0, earthScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#00f0ff";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      // Floating Shuttlecock (Scene 02 - 04)
      if (currentScene >= 2 && currentScene <= 5) {
        ctx.save();
        const shuttleX = width / 2 + mouseRef.current.x * 30;
        const shuttleY = height / 2 + Math.sin(frameCount * 0.05) * 15 + mouseRef.current.y * 20;

        ctx.translate(shuttleX, shuttleY);
        if (currentScene === 3 || currentScene === 4) {
          ctx.rotate((Math.PI / 4) + Math.sin(frameCount * 0.1) * 0.2);
        } else {
          ctx.rotate(Math.sin(frameCount * 0.03) * 0.3);
        }

        // Render Pixel Shuttlecock Primitive
        ctx.fillStyle = "#ff5500";
        ctx.shadowColor = "#ff7700";
        ctx.shadowBlur = currentScene >= 3 ? 20 : 5;

        // Shuttle Head (Cork)
        ctx.fillRect(-12, -8, 24, 16);
        ctx.fillStyle = "#ffffff";
        // Feather Cone Streaks
        ctx.beginPath();
        ctx.moveTo(-16, -20);
        ctx.lineTo(16, -20);
        ctx.lineTo(10, -8);
        ctx.lineTo(-10, -8);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Spawn Meteor Fire Particles (Scene 03 & 04)
        if (currentScene === 3 || currentScene === 4) {
          for (let i = 0; i < 3; i++) {
            fireParticles.push({
              x: shuttleX + (Math.random() - 0.5) * 20,
              y: shuttleY + (Math.random() - 0.5) * 20,
              vx: (Math.random() - 0.5) * 6,
              vy: Math.random() * 8 + 4,
              size: Math.random() * 6 + 2,
              life: 1.0,
            });
          }
        }
      }

      // Render Fire Particles
      fireParticles.forEach((p, idx) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.03;
        if (p.life <= 0) {
          fireParticles.splice(idx, 1);
          return;
        }
        ctx.fillStyle = p.life > 0.5 ? "#ff5500" : "#ffaa00";
        ctx.globalAlpha = p.life;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.floor(p.size), Math.floor(p.size));
      });
      ctx.globalAlpha = 1.0;

      // Stadium Reveal (Scene 05 & 06)
      if (currentScene >= 5) {
        ctx.save();
        // Pixel Stadium Lights & Arena Beams
        ctx.fillStyle = "rgba(255, 85, 0, 0.15)";
        ctx.beginPath();
        ctx.moveTo(width * 0.2, 0);
        ctx.lineTo(width * 0.4, height);
        ctx.lineTo(width * 0.1, height);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(width * 0.8, 0);
        ctx.lineTo(width * 0.9, height);
        ctx.lineTo(width * 0.6, height);
        ctx.fill();

        // Stadium Net & Court Floor Line
        ctx.strokeStyle = "#ff7700";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(width * 0.1, height * 0.75);
        ctx.lineTo(width * 0.9, height * 0.75);
        ctx.stroke();

        ctx.restore();
      }

      // Impact Shockwave Rings (Scene 06)
      if (currentScene === 6) {
        if (frameCount % 10 === 0) {
          rings.push({ radius: 10, maxRadius: width * 0.6, alpha: 1.0 });
        }
        rings.forEach((r, idx) => {
          r.radius += 12;
          r.alpha -= 0.02;
          if (r.alpha <= 0) {
            rings.splice(idx, 1);
            return;
          }
          ctx.strokeStyle = "#ff5500";
          ctx.lineWidth = 6;
          ctx.globalAlpha = r.alpha;
          ctx.beginPath();
          ctx.arc(width / 2, height / 2, r.radius, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.globalAlpha = 1.0;
      }

      // Anime Athlete Pixel Silhouette & Smash Pose (Scene 07)
      if (currentScene === 7) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        // Athlete Silhouette in jump smash stance
        ctx.fillStyle = "#ffaa00";
        ctx.shadowColor = "#ff5500";
        ctx.shadowBlur = 30;

        // Player Head
        ctx.fillRect(-15, -90, 30, 30);
        // Player Torso
        ctx.fillRect(-25, -60, 50, 60);
        // Racket Swing Arc Streak
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(10, -40, 70, -Math.PI / 4, Math.PI / 2);
        ctx.stroke();

        ctx.restore();
      }

      // Website Activation Flash (Scene 08)
      if (currentScene === 8) {
        ctx.fillStyle = "rgba(255, 85, 0, 0.08)";
        ctx.fillRect(0, 0, width, height);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [currentScene]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-10 pointer-events-none pixelated"
    />
  );
};
