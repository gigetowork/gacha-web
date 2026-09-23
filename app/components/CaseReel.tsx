"use client";

import { useEffect, useRef } from "react";
import { RARITY_COLORS } from "@/lib/caisses";

const PANEL = "#161b22";
const BORDER = "#2a313c";
const GOLD_LIGHT = "#FFD778";

export type ReelItem = { name: string; weapon: string; rarity: string; image: string };

// Largeur d'un objet + son espacement (gap) dans le rouleau, en px -- DOIT correspondre
// exactement aux styles ci-dessous (flex: 0 0 88px + gap: 8px), sinon le calcul de position
// d'arrêt de l'animation atterrit à côté de l'objet gagnant plutôt que pile dessus.
const ITEM_PITCH = 96;
const REEL_DURATION_MS = 5200;

export default function CaseReel({
  items,
  winIndex,
  onDone,
}: {
  items: ReelItem[];
  winIndex: number;
  onDone: () => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const containerWidth = wrapRef.current?.clientWidth ?? 340;
    // Petit décalage aléatoire à l'intérieur de la case gagnante (comme sur CS:GO, l'arrêt n'est
    // jamais pile au pixel près au centre de l'objet).
    const jitter = (Math.random() - 0.5) * (ITEM_PITCH * 0.5);
    const target = -(winIndex * ITEM_PITCH + ITEM_PITCH / 2 - containerWidth / 2) + jitter;

    // Le rouleau démarre à translateX(0) (peint sur l'écran une frame), PUIS on lui donne sa
    // position finale sur la frame suivante -- c'est ce décalage d'une frame qui permet à la
    // transition CSS de s'animer au lieu de sauter instantanément à la position finale.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(${target}px)`;
        }
      });
    });

    const t = setTimeout(onDone, REEL_DURATION_MS + 200);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        maxWidth: 380,
        height: 96,
        margin: "0 auto",
        borderRadius: 10,
        background: "#0a0d12",
        border: `1px solid ${BORDER}`,
      }}
    >
      {/* Fondus sur les bords pour que les objets apparaissent/disparaissent en douceur plutôt
          que d'être coupés net. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 4,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, #0a0d12 0%, rgba(10,13,18,0) 12%, rgba(10,13,18,0) 88%, #0a0d12 100%)",
        }}
      />
      {/* Marqueur central */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 2,
          background: GOLD_LIGHT,
          zIndex: 5,
          transform: "translateX(-1px)",
          boxShadow: `0 0 10px ${GOLD_LIGHT}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          width: 0,
          height: 0,
          zIndex: 5,
          transform: "translateX(-6px)",
          borderLeft: "6px solid transparent",
          borderRight: "6px solid transparent",
          borderTop: `7px solid ${GOLD_LIGHT}`,
        }}
      />

      <div
        ref={trackRef}
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 0",
          transform: "translateX(0px)",
          transition: `transform ${REEL_DURATION_MS}ms cubic-bezier(0.11, 0.82, 0.16, 1)`,
          willChange: "transform",
        }}
      >
        {items.map((it, i) => {
          const color = RARITY_COLORS[it.rarity] ?? "#666";
          return (
            <div
              key={i}
              style={{
                flex: "0 0 88px",
                width: 88,
                height: 78,
                background: PANEL,
                border: `1px solid ${color}55`,
                borderBottom: `3px solid ${color}`,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 4,
              }}
            >
              {it.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.image}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
