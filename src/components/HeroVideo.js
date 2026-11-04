"use client";

import { useEffect, useRef, useState } from "react";

const CUTS = [
  "9P6q_BMXuuE",
  "MDKt1rtnJD8",
  "msp3ATqpaU0",
  "4VdGdRftkuY",
  "R1YYVrwPJXo",
  "9PYTSL4d1aw",
];

function loadYoutubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === "function") {
        previous();
      }
      resolve();
    };
    if (!document.querySelector("script[data-yt-iframe]")) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.dataset.ytIframe = "1";
      document.head.appendChild(script);
    }
  });
}

function takeRandom(pool) {
  const index = Math.floor(Math.random() * pool.length);
  return pool.splice(index, 1)[0];
}

export function HeroVideo() {
  const frameRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) {
      return undefined;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReady(true);
      return undefined;
    }

    const pool = [...CUTS];
    let cancelled = false;

    function mount(videoId) {
      frame.replaceChildren();
      const node = document.createElement("div");
      frame.appendChild(node);
      playerRef.current = new window.YT.Player(node, {
        videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          rel: 0,
          loop: 1,
          playlist: videoId,
          modestbranding: 1,
          playsinline: 1,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            event.target.mute();
            event.target.setVolume(0);
            event.target.playVideo();
          },
          onStateChange: (event) => {
            const state = window.YT.PlayerState;
            if (event.data === state.PLAYING) {
              setReady(true);
            }
            if (event.data === state.ENDED) {
              event.target.seekTo(0, true);
              event.target.playVideo();
            }
          },
          onError: () => {
            const next = pool.length ? takeRandom(pool) : null;
            playerRef.current?.destroy?.();
            playerRef.current = null;
            if (!next || cancelled) {
              setReady(true);
              return;
            }
            mount(next);
          },
        },
      });
    }

    loadYoutubeApi().then(() => {
      if (!cancelled) {
        mount(takeRandom(pool));
      }
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, []);

  return (
    <div className="hero-video" aria-hidden="true">
      <div ref={frameRef} className="hero-video-frame" />
      <div className="hero-video-veil" />
      {ready ? null : (
        <div className="hero-loader" role="status">
          <span className="hero-loader-ring" />
          <span className="sr-only">Загружаем ролик</span>
        </div>
      )}
    </div>
  );
}
