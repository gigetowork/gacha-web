"use client";

import { useEffect, useRef, useState } from "react";
import { RARITY_COLORS } from "@/lib/caisses";

const PANEL = "#161b22";
const BORDER = "#2a313c";
const GOLD_LIGHT = "#FFD778";

export type ReelItem = { name: string; weapon: string; rarity: string; image: string };

// Dimensions d'un objet du rouleau, en px -- DOIVENT correspondre exactement aux styles
// ci-dessous (flex: 0 0 ITEM_WIDTH + gap: GAP), sinon le calcul de position d'arrêt de
// l'animation atterrit à côté de l'objet gagnant plutôt que pile dessus.
const ITEM_WIDTH = 172;
const GAP = 14;
const ITEM_PITCH = ITEM_WIDTH + GAP;
const REEL_DURATION_MS = 6200;

export default function CaseReel({
  items,
  winIndex,
  onDone,
  big = false,
}: {
  items: ReelItem[];
  winIndex: number;
  onDone: () => void;
  big?: boolean;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [landed, setLanded] = useState(false);
  const [spinning, setSpinning] = useState(true);

  const height = big ? 230 : 150;
  const itemHeight = big ? 200 : 126;

  useEffect(() => {
    const containerWidth = wrapRef.current?.clientWidth ?? 340;
    // Petit décalage aléatoire à l'intérieur de la case gagnante (comme sur CS:GO, l'arrêt n'est
    // jamais pile au pixel près). Bornée à une fraction de la largeur de l'OBJET (pas du pitch,
    // qui inclut l'espacement) : un jitter trop large ferait déborder le marqueur sur l'objet
    // voisin.
    const jitter = (Math.random() - 0.5) * (ITEM_WIDTH * 0.5);
    const target = -(winIndex * ITEM_PITCH + ITEM_WIDTH / 2 - containerWidth / 2) + jitter;

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

    // La détection de fin d'animation passe par l'événement transitionend (précis), avec un
    // setTimeout de secours si jamais l'événement ne se déclenche pas (onglet en arrière-plan,
    // etc.).
    const track = trackRef.current;
    function handleTransitionEnd(e: TransitionEvent) {
      if (e.propertyName !== "transform") return;
      finish();
    }
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      setSpinning(false);
      setLanded(true);
      setTimeout(onDone, 650); // laisse le temps à l'effet d'impact de jouer avant de révéler le résultat
    }
    track?.addEventListener("transitionend", handleTransitionEnd);
    const fallback = setTimeout(finish, REEL_DURATION_MS + 400);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fallback);
      track?.removeEventListener("transitionend", handleTransitionEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const winColor = RARITY_COLORS[items[winIndex]?.rarity] ?? "#666";

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        height,
        margin: "0 auto",
        borderRadius: 14,
        background: "#0a0d12",
        border: `1px solid ${BORDER}`,
        boxShadow: landed ? `inset 0 0 60px ${winColor}55` : "none",
        transition: "box-shadow 0.4s ease",
      }}
    >
      {/* Flash radial coloré par la rareté à l'atterrissage. */}
      {landed && (
        <div
          className="reel-flash"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 3,
            pointerEvents: "none",
            background: `radial-gradient(circle at 50% 50%, ${winColor}66 0%, transparent 65%)`,
          }}
        />
      )}

      {/* Traînée de vitesse pendant le défilement rapide. */}
      {spinning && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 20%, rgba(255,255,255,0) 80%, rgba(255,255,255,0.05) 100%)",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Fondus sur les bords pour que les objets apparaissent/disparaissent en douceur plutôt
          que d'être coupés net. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 4,
          pointerEvents: "none",
          background:
            "linear-gradient(90deg, #0a0d12 0%, rgba(10,13,18,0) 14%, rgba(10,13,18,0) 86%, #0a0d12 100%)",
        }}
      />
      {/* Marqueur central */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 0,
          bottom: 0,
          width: 3,
          background: GOLD_LIGHT,
          zIndex: 5,
          transform: "translateX(-1.5px)",
          boxShadow: `0 0 14px ${GOLD_LIGHT}`,
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
          transform: "translateX(-8px)",
          borderLeft: "8px solid transparent",
          borderRight: "8px solid transparent",
          borderTop: `9px solid ${GOLD_LIGHT}`,
        }}
      />

      <div
        ref={trackRef}
        // IMPORTANT : `transform` n'est PAS déclaré ici. Il est posé uniquement de façon
        // impérative (voir l'effet ci-dessous), pour que React ne le "possède" jamais en tant que
        // prop -- s'il était déclaré ici, le moindre re-rendu du composant (pour n'importe quelle
        // raison, même sans rapport avec le rouleau) réappliquerait cette valeur déclarée et
        // écraserait la position atteinte par l'animation en cours, désynchronisant visuellement
        // le point d'arrêt du vrai gain déjà acquis côté serveur. C'était le bug signalé.
        style={{
          display: "flex",
          gap: GAP,
          padding: `${(height - itemHeight) / 2}px 0`,
          transition: `transform ${REEL_DURATION_MS}ms cubic-bezier(0.09, 0.79, 0.13, 1)`,
          willChange: "transform",
        }}
      >
        {items.map((it, i) => {
          const color = RARITY_COLORS[it.rarity] ?? "#666";
          const isWinner = i === winIndex;
          return (
            <div
              key={i}
              className={landed && isWinner ? "reel-item-pop" : undefined}
              style={{
                position: "relative",
                flex: `0 0 ${ITEM_WIDTH}px`,
                width: ITEM_WIDTH,
                height: itemHeight,
                background: PANEL,
                border: `1px solid ${color}55`,
                borderBottom: `4px solid ${color}`,
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 10,
                overflow: "hidden",
                boxShadow: landed && isWinner ? `0 0 34px ${color}` : "none",
              }}
            >
              {/* L'image est volontairement floutée et masquée d'un "?" pour TOUS les objets du
                  rouleau (pas seulement le gagnant) : tant que le décalage visuel entre l'endroit
                  où le rouleau s'arrête et le vrai résultat (déjà déterminé côté serveur) n'est pas
                  résolu, on évite de montrer une image nette qui pourrait ne pas correspondre au
                  résultat réel révélé ensuite dans la carte de résultat. */}
              {it.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.image}
                  alt=""
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    filter: "blur(9px) brightness(0.55)",
                    transform: "scale(1.15)", // évite que le flou laisse voir les bords nets de l'image
                  }}
                />
              )}
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 34,
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.85)",
                  textShadow: "0 2px 10px rgba(0,0,0,0.8)",
                }}
              >
                ?
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
