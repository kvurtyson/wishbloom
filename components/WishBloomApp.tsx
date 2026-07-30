"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMicrophoneLevel } from "./useMicrophoneLevel";

type Screen = "welcome" | "microphone" | "preparing" | "blowing" | "flying" | "expired";
type DandelionState = "Welcome" | "Microphone" | "Loading" | "Idle" | "Weak" | "Medium" | "Strong" | "Complete" | "Expired";

const A = "/assets/";

function Logo() {
  return (
    <div className="logo" aria-label="WishBloom">
      <span>Wish</span><i>Bloom</i>
      <img src={`${A}logo-flower.svg`} alt="" />
    </div>
  );
}

function FooterNote({ keepOpen = false }: { keepOpen?: boolean }) {
  return (
    <div className={`footer-note ${keepOpen ? "keep-open" : ""}`}>
      <img src={`${A}lock.svg`} alt="" />
      <span>{keepOpen ? "Please keep this page open." : "No audio is recorded or uploaded."}</span>
    </div>
  );
}

function GlassButton({ children, onClick, disabled = false }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      className="glass-button"
      whileTap={{ y: 3, scale: 0.991, boxShadow: "4px 4px 12.8px rgba(0,0,0,.05)" }}
      transition={{ duration: 0.12 }}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}

function Heading({ first, second, wide = false }: { first: string; second: string; wide?: boolean }) {
  return (
    <h1 className={`headline ${wide ? "wide" : ""}`}>
      <span>{first}</span>
      <em>{second}</em>
    </h1>
  );
}

function Dandelion({ state, progress = 0, countdown = "02:00" }: {
  state: DandelionState;
  progress?: number;
  countdown?: string;
}) {
  const seedAsset =
    state === "Strong" ? "seeds-strong.svg" :
    state === "Medium" ? "seeds-medium.svg" :
    state === "Weak" ? "seeds-weak.svg" :
    state === "Idle" ? "seeds-idle.svg" :
    state === "Welcome" ? "seeds-welcome.svg" :
    "head-base.svg";

  const seedStyle =
    state === "Idle" ? "seed-idle" :
    state === "Weak" ? "seed-weak" :
    state === "Medium" ? "seed-medium" :
    state === "Strong" ? "seed-strong" :
    state === "Complete" ? "seed-complete" : "seed-standard";

  const motionStrength = state === "Weak" ? 1 : state === "Medium" ? 1.8 : state === "Strong" ? 2.5 : 0.7;

  return (
    <motion.div
      className="dandelion"
      animate={{ rotate: [-0.55 * motionStrength, 0.6 * motionStrength, -0.55 * motionStrength], x: [-1, 1.3 * motionStrength, -1] }}
      transition={{ duration: 7.8 - motionStrength * 0.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <img className="stem" src={`${A}stem.svg`} alt="" />
      <motion.img
        className="glow"
        src={`${A}glow.svg`}
        alt=""
        animate={{ opacity: [0.84, 1, 0.84], scale: [0.985, 1.025, 0.985] }}
        transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
      />
      {state !== "Complete" && <img className={`seed-composition ${seedStyle}`} src={`${A}${seedAsset}`} alt="" />}
      {["Welcome", "Idle", "Weak", "Medium", "Strong"].includes(state) && (
        <img className="head-core" src={`${A}head-core.svg`} alt="" />
      )}

      {state === "Welcome" && (
        <>
          <FloatingSeed className="floating two" asset="floating-seed-2.svg" delay={0} />
          <FloatingSeed className="floating three" asset="floating-seed-3.svg" delay={0.7} />
          <FloatingSeed className="floating one" asset="floating-seed-1.svg" delay={1.4} />
        </>
      )}

      {state === "Microphone" && (
        <motion.img
          className="microphone-art"
          src={`${A}microphone.svg`}
          alt="Microphone level"
          animate={{ scaleY: [0.88, 1.08, 0.94] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {state === "Loading" && (
        <div className="timer">
          <img src={`${A}spinner-track.svg`} alt="" />
          <motion.img src={`${A}spinner-active.svg`} alt="" animate={{ rotate: 360 }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
          <span>{countdown}</span>
        </div>
      )}

      {state === "Expired" && (
        <div className="hourglass">
          <img src={`${A}hourglass-top.svg`} alt="" />
          <img src={`${A}hourglass-bottom.svg`} alt="" />
        </div>
      )}

      {progress > 0 && progress < 100 && (
        <motion.div className="wind-hint" animate={{ opacity: [0, 0.45, 0], x: [0, 22, 44] }} transition={{ duration: 2.3, repeat: Infinity }} />
      )}
    </motion.div>
  );
}

function FloatingSeed({ className, asset, delay }: { className: string; asset: string; delay: number }) {
  return (
    <motion.img
      className={className}
      src={`${A}${asset}`}
      alt=""
      animate={{ x: [0, 4, -2, 0], y: [0, -5, 2, 0], rotate: [-2, 7, -4, -2] }}
      transition={{ duration: 5.6, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function ProgressBar({ progress }: { progress: number }) {
  const visualProgress = Math.max(20, progress);
  return (
    <div className="progress-track" aria-label={`Blow progress ${Math.round(progress)} percent`}>
      <motion.div
        className="progress-fill"
        animate={{ width: `${visualProgress}%`, boxShadow: `0 0 ${8 + progress * 0.1}px rgba(239,237,205,${0.08 + progress / 500})` }}
        transition={{ type: "spring", stiffness: 115, damping: 24 }}
      />
    </div>
  );
}

type SeedPath = {
  element: SVGPathElement;
  centerX: number;
  centerY: number;
  layer: number;
  box: DOMRect;
};

const flyingSeeds = [
  { asset: "flying-seed-1.svg", left: 36, top: 349, width: 90, height: 112, rotate: 0, duration: 30, delay: 0, drift: -22 },
  { asset: "flying-seed-2.svg", left: 272, top: 295, width: 90, height: 112, rotate: 29.16, duration: 26.8, delay: 1.2, drift: 18 },
  { asset: "flying-seed-3.svg", left: 122, top: 370, width: 79, height: 97, rotate: 29.16, duration: 27.4, delay: 2.1, drift: -14 },
  { asset: "flying-seed-4.svg", left: 83, top: 594, width: 62, height: 74, rotate: 5.32, duration: 25.8, delay: 3.2, drift: -28 },
  { asset: "flying-seed-5.svg", left: 190, top: 440, width: 67, height: 81, rotate: -108.94, duration: 24.6, delay: 4.4, drift: 21 },
  { asset: "flying-seed-6.svg", left: 190, top: 529, width: 94, height: 117, rotate: 63.14, duration: 23.2, delay: 5.5, drift: 27 },
  { asset: "flying-seed-7.svg", left: 303, top: 367, width: 103, height: 130, rotate: 29.16, duration: 21.6, delay: 7.1, drift: -19 },
  { asset: "flying-seed-8.svg", left: -18, top: 470, width: 132, height: 168, rotate: 29.16, duration: 20.5, delay: 8.5, drift: 30 },
] as const;

function FlyingSeed({
  seed,
}: {
  seed: (typeof flyingSeeds)[number];
}) {
  const [vectorMarkup, setVectorMarkup] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`${A}${seed.asset}`)
      .then((response) => response.text())
      .then((markup) => {
        if (active) setVectorMarkup(markup);
      });
    return () => {
      active = false;
    };
  }, [seed.asset]);

  const distanceToRight = 390 - seed.left + seed.width + 32;
  return (
    <motion.div
      className="flying-screen-seed"
      style={{
        left: seed.left,
        top: seed.top,
        width: seed.width,
        height: seed.height,
      }}
      animate={{
        x: [0, distanceToRight],
        y: [0, seed.drift],
        rotate: [seed.rotate, seed.rotate + 12],
      }}
      transition={{
        duration: seed.duration,
        delay: seed.delay,
        ease: "linear",
      }}
      aria-hidden="true"
    >
      {vectorMarkup ? (
        <span dangerouslySetInnerHTML={{ __html: vectorMarkup }} />
      ) : (
        <img src={`${A}${seed.asset}`} alt="" />
      )}
    </motion.div>
  );
}

function FlyingScreen({ canvasScale }: { canvasScale: number }) {
  return (
    <main className="fixed-viewport">
      <section
        className="welcome-canvas flying-screen"
        style={{ transform: `translate(-50%, -50%) scale(${canvasScale})` }}
        aria-label="WishBloom your wish is flying"
      >
        <Logo />
        <h1 className="welcome-heading flying-heading">
          <span>Your wish is</span>
          <em>now flying.</em>
        </h1>
        <p className="flying-support">Watch it on the facade.</p>
        <div className="flying-seed-field">
          {flyingSeeds.map((seed) => (
            <FlyingSeed key={seed.asset} seed={seed} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ExpiredScreen({ canvasScale }: { canvasScale: number }) {
  return (
    <main className="fixed-viewport">
      <section
        className="welcome-canvas expired-screen"
        style={{ transform: `translate(-50%, -50%) scale(${canvasScale})` }}
        aria-label="WishBloom expired session"
      >
        <Logo />
        <h1 className="welcome-heading expired-heading">
          <span>Your time has</span>
          <em>expired.</em>
        </h1>
        <div className="welcome-support expired-support">
          <p>Try to connect again.</p>
        </div>
        <motion.div
          className="welcome-dandelion"
          animate={{ rotate: [-1.5, 1.5], x: [-3, 3] }}
          transition={{
            duration: 6,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
        >
          <div className="welcome-dandelion-base" aria-hidden="true">
            <img className="welcome-flower-stem" src={`${A}stem.svg`} alt="" />
            <img className="welcome-flower-glow" src={`${A}glow.svg`} alt="" />
            <img className="welcome-flower-head" src={`${A}welcome-flower-head.svg`} alt="" />
            <div className="expired-hourglass">
              <div className="hourglass-half hourglass-top">
                <img className="hourglass-base" src={`${A}expired-hourglass-top.svg`} alt="" />
                <span className="hourglass-sand hourglass-sand-top">
                  <img src={`${A}expired-hourglass-top.svg`} alt="" />
                </span>
              </div>
              <div className="hourglass-half hourglass-bottom">
                <img className="hourglass-base" src={`${A}expired-hourglass-bottom.svg`} alt="" />
                <span className="hourglass-sand hourglass-sand-bottom">
                  {Array.from({ length: 8 }, (_, index) => (
                    <img key={index} src={`${A}expired-hourglass-bottom.svg`} alt="" />
                  ))}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}

function InteractiveDandelionSeeds({ level }: { level: number }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const groupsRef = useRef<SeedPath[][]>([]);
  const levelRef = useRef(level);
  const animatedLevelRef = useRef(0);
  const completionStartedRef = useRef<number | null>(null);
  const [artwork, setArtwork] = useState({ outer: "", inner: "" });
  const outerArtwork = useMemo(() => ({ __html: artwork.outer }), [artwork.outer]);
  const innerArtwork = useMemo(() => ({ __html: artwork.inner }), [artwork.inner]);

  useEffect(() => {
    levelRef.current = Math.max(levelRef.current, level);
  }, [level]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch(`${A}welcome-flower-head.svg`).then((response) => response.text()),
      fetch(`${A}welcome-flower-core.svg`).then((response) => response.text()),
    ]).then(([outer, inner]) => {
      if (active) setArtwork({ outer, inner });
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!artwork.outer || !artwork.inner) return;

    const existingGroups = [
      ...Array.from(outerRef.current?.querySelectorAll<SVGGElement>("g[data-seed-group]") ?? []),
      ...Array.from(innerRef.current?.querySelectorAll<SVGGElement>("g[data-seed-group]") ?? []),
    ];
    const layers = [
      { root: outerRef.current, left: 29.083984, top: 76.793671, scaleX: 1, scaleY: 1 },
      { root: innerRef.current, left: 91.139648, top: 133.929901, scaleX: 1, scaleY: 1 },
    ];
    const clusters: SeedPath[][] = [];

    if (existingGroups.length) {
      groupsRef.current = existingGroups.map((group, layerIndex) => (
        Array.from(group.querySelectorAll("path")).map((element) => {
          const box = element.getBoundingClientRect();
          return {
            element,
            layer: layerIndex,
            box,
            centerX: box.left + box.width / 2,
            centerY: box.top + box.height / 2,
          };
        })
      ));
    } else layers.forEach((layer, layerIndex) => {
      const paths = Array.from(layer.root?.querySelectorAll("path") ?? []).map((element) => {
        const box = element.getBoundingClientRect();
        return {
          element,
          layer: layerIndex,
          box,
          centerX: box.left + box.width / 2,
          centerY: box.top + box.height / 2,
        };
      });

      paths.forEach((path) => {
        const matchingCluster = clusters.find((cluster) => {
          if (cluster[0].layer !== path.layer) return false;
          return cluster.some((member) => (
            Math.abs(member.centerX - path.centerX) < 9 &&
            Math.abs(member.centerY - path.centerY) < 9
          ));
        });
        if (matchingCluster) matchingCluster.push(path);
        else clusters.push([path]);
      });
    });

    if (!existingGroups.length) {
      const sortedClusters = clusters.sort((a, b) => {
        const aX = a.reduce((sum, path) => sum + path.centerX, 0) / a.length;
        const bX = b.reduce((sum, path) => sum + path.centerX, 0) / b.length;
        return aX - bX;
      });
      sortedClusters.forEach((cluster, index) => {
        const firstPath = cluster[0].element;
        const parent = firstPath.parentNode;
        if (!parent) return;
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.dataset.seedGroup = String(index);
        parent.insertBefore(group, firstPath);
        cluster.forEach(({ element }) => group.appendChild(element));
      });
      groupsRef.current = sortedClusters;
    }

    let frame = 0;
    const animateSeeds = (now: number) => {
      const groups = groupsRef.current;
      animatedLevelRef.current += (levelRef.current - animatedLevelRef.current) * 0.035;
      if (Math.abs(levelRef.current - animatedLevelRef.current) < 0.0005) {
        animatedLevelRef.current = levelRef.current;
      }
      const currentLevel = animatedLevelRef.current;
      const progress = currentLevel;
      if (levelRef.current >= 0.9995 && completionStartedRef.current === null) {
        completionStartedRef.current = now;
      }
      const reservedSeedCount = Math.min(3, groups.length);
      const regularSeedCount = groups.length - reservedSeedCount;

      groups.forEach((group, index) => {
        let localProgress = 0;
        if (index < regularSeedCount) {
          const lastRegularIndex = Math.max(1, regularSeedCount - 1);
          const start = (index / lastRegularIndex) * 0.72;
          localProgress = Math.max(0, Math.min(1, (progress - start) / 0.14));
        } else if (completionStartedRef.current !== null) {
          const finalIndex = index - regularSeedCount;
          const elapsed = now - completionStartedRef.current - finalIndex * 320;
          localProgress = Math.max(0, Math.min(1, elapsed / 1500));
        }
        const curve = localProgress * localProgress * (3 - 2 * localProgress);
        const horizontal = curve * (410 + (index % 4) * 18);
        const vertical = -curve * (28 + (index % 5) * 9);
        const rotation = curve * (-8 + (index % 5) * 5);
        const opacity = localProgress < 1 ? 1 : 0;

        const seedGroup = group[0]?.element.parentElement;
        if (!seedGroup) return;
        seedGroup.setAttribute(
          "transform",
          `translate(${horizontal} ${vertical}) rotate(${rotation})`,
        );
        seedGroup.setAttribute("opacity", String(opacity));
      });

      frame = requestAnimationFrame(animateSeeds);
    };
    frame = requestAnimationFrame(animateSeeds);
    return () => cancelAnimationFrame(frame);
  }, [artwork]);

  return (
    <>
      <div
        ref={outerRef}
        className="interactive-seeds interactive-seeds-outer"
        aria-hidden="true"
        dangerouslySetInnerHTML={outerArtwork}
      />
      <div
        ref={innerRef}
        className="interactive-seeds interactive-seeds-inner"
        aria-hidden="true"
        dangerouslySetInnerHTML={innerArtwork}
      />
    </>
  );
}

function BlowInstruction({ progress }: { progress: number }) {
  const message = progress >= 70 ? ["Almost there", "keep going."] : progress >= 25 ? ["Blow all seeds to", "make your wish come true."] : ["Time for", "your wish."];
  return (
    <AnimatePresence mode="wait">
      <motion.h1 key={message.join()} className={`headline blow-copy ${progress >= 25 && progress < 70 ? "compact" : ""}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
        <span>{message[0]}</span><em>{message[1]}</em>
      </motion.h1>
    </AnimatePresence>
  );
}

export function WishBloomApp() {
  const [canvasScale, setCanvasScale] = useState(1);
  const [screen, setScreen] = useState<Screen>("welcome");
  const [progress, setProgress] = useState(0);
  const [remaining, setRemaining] = useState(120);
  const [permissionError, setPermissionError] = useState(false);
  const { level, permission, start, stop, resetCalibration } = useMicrophoneLevel();

  useEffect(() => {
    const fitCanvas = () => setCanvasScale(Math.min(1, window.innerWidth / 390));
    fitCanvas();
    window.addEventListener("resize", fitCanvas);
    return () => window.removeEventListener("resize", fitCanvas);
  }, []);

  useEffect(() => {
    if (screen === "expired") return;

    const mobileSession = window.matchMedia("(pointer: coarse)").matches;
    if (!mobileSession) return;

    const hiddenAtKey = "wishbloom-hidden-at";
    const storedHiddenAt = Number(window.localStorage.getItem(hiddenAtKey));
    let hiddenAt: number | null =
      Number.isFinite(storedHiddenAt) && storedHiddenAt > 0
        ? storedHiddenAt
        : null;
    let expiryTimer: number | null = null;

    const expireSession = () => {
      window.localStorage.removeItem(hiddenAtKey);
      stop();
      setScreen("expired");
    };

    const scheduleExpiry = (delay = 3000) => {
      if (expiryTimer !== null) window.clearTimeout(expiryTimer);
      expiryTimer = window.setTimeout(expireSession, delay);
    };

    const markSessionHidden = () => {
      if (hiddenAt === null) {
        hiddenAt = Date.now();
        window.localStorage.setItem(hiddenAtKey, String(hiddenAt));
      }
      scheduleExpiry(Math.max(0, 3000 - (Date.now() - hiddenAt)));
    };

    const restoreSession = () => {
      if (expiryTimer !== null) {
        window.clearTimeout(expiryTimer);
        expiryTimer = null;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt >= 3000) {
        expireSession();
        return;
      }
      hiddenAt = null;
      window.localStorage.removeItem(hiddenAtKey);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) markSessionHidden();
      else restoreSession();
    };

    if (hiddenAt !== null && Date.now() - hiddenAt >= 3000) {
      expireSession();
      return;
    }
    if (document.hidden) {
      markSessionHidden();
    } else if (hiddenAt !== null) {
      hiddenAt = null;
      window.localStorage.removeItem(hiddenAtKey);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", markSessionHidden);
    window.addEventListener("beforeunload", markSessionHidden);
    window.addEventListener("pageshow", restoreSession);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", markSessionHidden);
      window.removeEventListener("beforeunload", markSessionHidden);
      window.removeEventListener("pageshow", restoreSession);
      if (expiryTimer !== null) window.clearTimeout(expiryTimer);
    };
  }, [screen, stop]);

  const countdown = useMemo(() => `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`, [remaining]);

  useEffect(() => {
    if (screen !== "preparing") return;
    const interval = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(interval);
  }, [screen]);

  useEffect(() => {
    if (screen === "preparing" && remaining === 0) {
      setProgress(0);
      setScreen("blowing");
    }
  }, [remaining, screen]);

  useEffect(() => {
    if (screen === "blowing" && permission === "granted") {
      resetCalibration();
    }
  }, [permission, resetCalibration, screen]);

  useEffect(() => {
    if (screen !== "blowing" || level < 0.9995) return;
    stop();
    setScreen("flying");
  }, [level, screen, stop]);

  const requestMicrophone = useCallback(async () => {
    setPermissionError(false);
    const granted = await start();
    if (granted) {
      setRemaining(5);
      setScreen("preparing");
    } else {
      setPermissionError(true);
    }
  }, [start]);

  const dandelionState: DandelionState =
    screen === "welcome" ? "Welcome" :
    screen === "microphone" ? "Microphone" :
    screen === "preparing" ? "Loading" :
    screen === "expired" ? "Expired" :
    screen === "flying" ? "Weak" :
    progress >= 90 ? "Strong" :
    progress >= 58 ? "Medium" :
    progress >= 28 ? "Weak" : "Idle";

  // Visual correction pass: only the Welcome frame is rendered until its
  // Figma comparison has been approved. Each visible layer below is an exact
  // render of its Figma node and is positioned by absoluteRenderBounds.
  if (screen === "welcome") {
    return (
      <main className="fixed-viewport">
        <section
          className="welcome-canvas"
          style={{ transform: `translate(-50%, -50%) scale(${canvasScale})` }}
          aria-label="WishBloom welcome"
        >
          <Logo />
          <h1 className="welcome-heading">
            <span>Make a wish.</span>
            <em>Let it fly.</em>
          </h1>
          <div className="welcome-support">
            <p>Blow into your phone and watch</p>
            <p>your wish appear on the<br />Kunsthaus facade.</p>
          </div>
          <motion.div
            className="welcome-dandelion"
            animate={{ rotate: [-1.5, 1.5], x: [-3, 3] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <div className="welcome-dandelion-base" aria-hidden="true">
              <img className="welcome-flower-stem" src={`${A}stem.svg`} alt="" />
              <img className="welcome-flower-glow" src={`${A}glow.svg`} alt="" />
              <img className="welcome-flower-head" src={`${A}welcome-flower-head.svg`} alt="" />
              <img className="welcome-flower-core" src={`${A}welcome-flower-core.svg`} alt="" />
            </div>
            <WelcomeFlyingSeed className="welcome-seed seed-one" asset="welcome-seed-1.svg" delay={0} duration={5} path={{ x: [0, 32, 91, 172], y: [0, -24, -77, -151], rotate: [0, 7, 15, 23] }} />
            <WelcomeFlyingSeed className="welcome-seed seed-two" asset="welcome-seed-2.svg" delay={1.2} duration={6.3} path={{ x: [0, 24, 76, 145], y: [0, -36, -92, -178], rotate: [0, -5, -13, -21] }} />
            <WelcomeFlyingSeed className="welcome-seed seed-three" asset="welcome-seed-3.svg" delay={2.4} duration={4.9} path={{ x: [0, 41, 103, 184], y: [0, -18, -61, -132], rotate: [0, 9, 18, 29] }} />
          </motion.div>
          <motion.button
            className="welcome-start"
            onClick={() => setScreen("microphone")}
            whileTap={{ y: 3, scale: 0.991 }}
            transition={{ duration: 0.12 }}
            aria-label="Start"
          >
            <span>Start</span>
          </motion.button>
          <FooterNote />
        </section>
      </main>
    );
  }

  if (screen === "microphone") {
    return (
      <main className="fixed-viewport">
        <section
          className="welcome-canvas"
          style={{ transform: `translate(-50%, -50%) scale(${canvasScale})` }}
          aria-label="WishBloom microphone access"
        >
          <Logo />
          <h1 className="welcome-heading">
            <span>Microphone</span>
            <em>Access.</em>
          </h1>
          <div className="welcome-support">
            <p>Wish<i>Bloom</i> uses your microphone</p>
            <p>only to detect your breath.</p>
          </div>
          <motion.div
            className="welcome-dandelion"
            animate={{ rotate: [-1.5, 1.5], x: [-3, 3] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <div className="welcome-dandelion-base" aria-hidden="true">
              <img className="welcome-flower-stem" src={`${A}stem.svg`} alt="" />
              <img className="welcome-flower-glow" src={`${A}glow.svg`} alt="" />
              <img className="welcome-flower-head" src={`${A}welcome-flower-head.svg`} alt="" />
              <motion.img
                className="welcome-microphone-art"
                src={`${A}microphone.svg`}
                alt=""
                animate={{ scaleY: [0.92, 1.06, 0.96] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
          <motion.button
            className="welcome-start"
            onClick={requestMicrophone}
            whileTap={{ y: 3, scale: 0.991 }}
            transition={{ duration: 0.12 }}
            disabled={permission === "requesting"}
            aria-label="Enable microphone"
          >
            <span>Enable</span>
          </motion.button>
          {permissionError && (
            <button className="permission-error" onClick={requestMicrophone}>
              Microphone access was denied. Tap to try again.
            </button>
          )}
          <FooterNote />
        </section>
      </main>
    );
  }

  if (screen === "preparing") {
    return (
      <main className="fixed-viewport">
        <section
          className="welcome-canvas"
          style={{ transform: `translate(-50%, -50%) scale(${canvasScale})` }}
          aria-label="WishBloom preparing your wish"
        >
          <Logo />
          <h1 className="welcome-heading">
            <span>Preparing</span>
            <em>your wish.</em>
          </h1>
          <div className="welcome-support preparing-support">
            <p>Estimated waiting time:</p>
          </div>
          <motion.div
            className="welcome-dandelion"
            animate={{ rotate: [-1.5, 1.5], x: [-3, 3] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <div className="welcome-dandelion-base" aria-hidden="true">
              <img className="welcome-flower-stem" src={`${A}stem.svg`} alt="" />
              <img className="welcome-flower-glow" src={`${A}glow.svg`} alt="" />
              <img className="welcome-flower-head" src={`${A}welcome-flower-head.svg`} alt="" />
              <div className="welcome-loading-timer">
                <img className="loading-track" src={`${A}spinner-track.svg`} alt="" />
                <motion.div
                  className="loading-active-wrap"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                >
                  <img className="loading-active" src={`${A}spinner-active.svg`} alt="" />
                  <span className="loading-rounded-cap" />
                </motion.div>
                <span className="loading-countdown">{countdown}</span>
              </div>
            </div>
          </motion.div>
          <FooterNote keepOpen />
        </section>
      </main>
    );
  }

  if (screen === "blowing") {
    return (
      <main className="fixed-viewport">
        <section
          className="welcome-canvas"
          style={{ transform: `translate(-50%, -50%) scale(${canvasScale})` }}
          aria-label="WishBloom time for your wish"
        >
          <Logo />
          <h1 className="welcome-heading blow-heading">
            <span>Time for</span>
            <em>your wish.</em>
          </h1>
          <motion.div
            className="welcome-dandelion"
            animate={{ rotate: [-1.5, 1.5], x: [-3, 3] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
          >
            <div className="welcome-dandelion-base" aria-hidden="true">
              <img className="welcome-flower-stem" src={`${A}stem.svg`} alt="" />
              <img className="welcome-flower-glow" src={`${A}glow.svg`} alt="" />
              <InteractiveDandelionSeeds level={level} />
            </div>
          </motion.div>
          <div className="welcome-blow-progress" aria-label="Blow progress">
            <motion.div
              className="welcome-blow-progress-fill"
              animate={{ width: `${20 + level * 80}%` }}
              transition={{ duration: 0.06, ease: "linear" }}
            />
          </div>
          <FooterNote keepOpen />
        </section>
      </main>
    );
  }

  if (screen === "flying") {
    return <FlyingScreen canvasScale={canvasScale} />;
  }

  if (screen === "expired") {
    return <ExpiredScreen canvasScale={canvasScale} />;
  }

  return (
    <main className="viewport">
      <div className="stage">
        <AnimatePresence mode="wait">
          <motion.section
            key={screen}
            className="screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.42, ease: "easeInOut" }}
          >
            <Logo />

          </motion.section>
        </AnimatePresence>

        <nav className="prototype-nav" aria-label="Prototype screen controls">
          {(["welcome", "microphone", "preparing", "blowing", "flying", "expired"] as Screen[]).map((item, index) => (
            <button key={item} className={screen === item ? "active" : ""} onClick={() => {
              if (item !== "blowing") stop();
              setScreen(item);
              if (item === "blowing") setProgress(0);
            }} aria-label={`Show screen ${index + 1}`} />
          ))}
        </nav>
      </div>
    </main>
  );
}

function WelcomeFlyingSeed({
  className,
  asset,
  delay,
  duration,
  path,
}: {
  className: string;
  asset: string;
  delay: number;
  duration: number;
  path: { x: number[]; y: number[]; rotate: number[] };
}) {
  const [vectorMarkup, setVectorMarkup] = useState("");

  useEffect(() => {
    let active = true;

    fetch(`${A}${asset}`)
      .then((response) => response.text())
      .then((markup) => {
        if (active) setVectorMarkup(markup);
      });

    return () => {
      active = false;
    };
  }, [asset]);

  return (
    <motion.div
      className={className}
      aria-hidden="true"
      animate={{
        x: path.x,
        y: path.y,
        rotate: path.rotate,
        opacity: [1, 1, 1, 1],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: [0.2, 0.58, 0.3, 1],
        times: [0, 0.32, 0.7, 1],
      }}
    >
      {vectorMarkup ? (
        <span
          className="welcome-seed-vector"
          dangerouslySetInnerHTML={{ __html: vectorMarkup }}
        />
      ) : (
        <img className="welcome-seed-fallback" src={`${A}${asset}`} alt="" />
      )}
    </motion.div>
  );
}
