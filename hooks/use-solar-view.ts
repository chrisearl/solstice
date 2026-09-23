"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SolarMotionRefs } from "@/components/solar-motion";
import type { ParsedView } from "@/lib/view-query";
import { serializeViewQuery, viewHistoryState } from "@/lib/view-query";
import { coordinateStatus } from "@/lib/format";
import {
  ORLANDO,
  altitudeSamples,
  buildMoonModel,
  buildSolarModel,
  daysInYear,
  placeMoon,
  placeSun,
} from "@/lib/solar";
import {
  ALL_PLANET_IDS,
  buildOrreryModel,
  orbitalPhaseSamples,
  type PlanetId,
} from "@/lib/orrery";
import {
  DEFAULT_STUDIO_VIEW,
  type StudioModel,
  type StudioTheme,
  type StudioView,
} from "@/lib/studio-view";
import {
  advanceOrreryClock,
  advanceSolarClock,
  clockFromInstant,
  DAY_MINUTES,
  initialClock,
  ORRERY_PLAYBACK_SPEEDS,
  PLAYBACK_SPEEDS,
  type OrreryPlaybackSpeed,
  type PlaybackSpeed,
  type SolarClock,
} from "@/lib/timeline";

export function useSolarView(initial?: ParsedView) {
  const stageRef = useRef<HTMLDivElement>(null);
  const bootLongitude = initial?.longitude ?? ORLANDO.lng;
  const [clock, setClock] = useState(() => clockFromInstant(new Date(), bootLongitude));
  const clockRef = useRef(clock);
  const { year, dayIndex, minutes } = clock;
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(false);
  const [loopDay, setLoopDay] = useState(false);
  const loopDayRef = useRef(false);
  const [astrolabeSpeed, setAstrolabeSpeedState] = useState<PlaybackSpeed>(PLAYBACK_SPEEDS[0]);
  const [orrerySpeed, setOrrerySpeedState] = useState<OrreryPlaybackSpeed>(ORRERY_PLAYBACK_SPEEDS[0]);
  const [studioModel, setStudioModelState] = useState<StudioModel>(
    () => initial?.model ?? DEFAULT_STUDIO_VIEW.model,
  );
  const [studioTheme, setStudioThemeState] = useState<StudioTheme>(
    () => initial?.theme ?? DEFAULT_STUDIO_VIEW.theme,
  );
  const [focusPlanet, setFocusPlanet] = useState<PlanetId | "moon">("earth");
  const [visiblePlanets, setVisiblePlanets] = useState<Set<PlanetId>>(
    () => new Set(ALL_PLANET_IDS),
  );
  const [loopYear, setLoopYear] = useState(false);
  const loopYearRef = useRef(false);
  const [latText, setLatText] = useState(String(initial?.latitude ?? ORLANDO.lat));
  const [lngText, setLngText] = useState(String(initial?.longitude ?? ORLANDO.lng));
  const [latitude, setLatitude] = useState(initial?.latitude ?? ORLANDO.lat);
  const [longitude, setLongitude] = useState(initial?.longitude ?? ORLANDO.lng);
  const latitudeRef = useRef(initial?.latitude ?? ORLANDO.lat);
  const longitudeRef = useRef(bootLongitude);
  const [motion] = useState<SolarMotionRefs>(() => ({
    clock: clockRef,
    latitude: latitudeRef,
    longitude: longitudeRef,
    playing: playingRef,
  }));
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [showSun, setShowSun] = useState(true);
  const [showMoon, setShowMoon] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  const setPlayback = (value: boolean) => {
    playingRef.current = value;
    setPlaying(value);
  };

  const setDayLoop = (value: boolean) => {
    loopDayRef.current = value;
    setLoopDay(value);
  };

  const setYearLoop = (value: boolean) => {
    loopYearRef.current = value;
    setLoopYear(value);
  };

  const setStudioModel = (value: StudioModel) => {
    setStudioModelState(value);
    setPlayback(false);
  };

  const setStudioTheme = (value: StudioTheme) => {
    setStudioThemeState(value);
  };

  const setStudioView = (next: StudioView) => {
    setStudioModelState(next.model);
    setStudioThemeState(next.theme);
    setPlayback(false);
  };

  const togglePlanetVisibility = (id: PlanetId) => {
    setVisiblePlanets((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        if (next.size <= 1) return current;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const publishClock = (next: SolarClock, stopPlayback = false) => {
    if (stopPlayback) setPlayback(false);
    clockRef.current = next;
    setClock(next);
  };

  const syncClockToNow = () => {
    publishClock(clockFromInstant(new Date(), longitudeRef.current));
  };

  const setAstrolabeSpeed = (speed: PlaybackSpeed) => {
    setAstrolabeSpeedState(speed);
    if (speed.realtime) syncClockToNow();
  };

  const setOrrerySpeed = (speed: OrreryPlaybackSpeed) => {
    setOrrerySpeedState(speed);
    if (speed.realtime) syncClockToNow();
  };

  const seekMinutes = (value: number) => {
    const nextMinutes = value >= DAY_MINUTES ? DAY_MINUTES - 0.001 : Math.max(0, value);
    publishClock({ ...clockRef.current, minutes: nextMinutes }, true);
  };

  const seekDate = (nextYear: number, nextDay: number) => {
    publishClock({ ...clockRef.current, year: nextYear, dayIndex: nextDay }, true);
  };

  useEffect(() => {
    syncClockToNow();
  }, []);

  useEffect(() => {
    latitudeRef.current = latitude;
    longitudeRef.current = longitude;
  }, [latitude, longitude]);

  const studioModelRef = useRef(studioModel);
  useEffect(() => {
    studioModelRef.current = studioModel;
  }, [studioModel]);

  useEffect(() => {
    if (!playing) return;
    playingRef.current = true;
    let frame = 0;
    let last = performance.now();
    let lastPublish = 0;
    let publishedDay = `${clockRef.current.year}:${clockRef.current.dayIndex}`;
    const tick = (now: number) => {
      if (!playingRef.current) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const step =
        studioModelRef.current === "orrery"
          ? orrerySpeed.realtime
            ? { clock: clockFromInstant(new Date(), longitudeRef.current), blocked: false }
            : advanceOrreryClock(clockRef.current, dt * orrerySpeed.daysPerSecond, {
                loopYear: loopYearRef.current,
              })
          : astrolabeSpeed.realtime
            ? { clock: clockFromInstant(new Date(), longitudeRef.current), blocked: false }
            : advanceSolarClock(clockRef.current, dt * astrolabeSpeed.minutesPerSecond, {
                loopDay: loopDayRef.current,
              });
      clockRef.current = step.clock;
      const dayKey = `${step.clock.year}:${step.clock.dayIndex}`;
      const dayChanged = dayKey !== publishedDay;
      if (step.blocked || dayChanged || now - lastPublish >= 100) {
        lastPublish = now;
        publishedDay = dayKey;
        setClock(step.clock);
      }
      if (step.blocked) {
        setPlayback(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      playingRef.current = false;
      cancelAnimationFrame(frame);
      setClock(clockRef.current);
    };
  }, [playing, astrolabeSpeed, orrerySpeed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      event.preventDefault();
      setPlayback(!playingRef.current);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    if (!fullscreen) {
      if (document.fullscreenElement === node) {
        document.exitFullscreen().catch(() => {});
      }
      return;
    }
    if (document.fullscreenElement === node) return;
    node.requestFullscreen?.().catch(() => {});
  }, [fullscreen]);

  useEffect(() => {
    const onChange = () => {
      const node = stageRef.current;
      if (!node) return;
      if (document.fullscreenElement !== node) setFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const model = useMemo(
    () =>
      buildSolarModel({
        year,
        dayIndex,
        latitude,
        longitude,
      }),
    [year, dayIndex, latitude, longitude],
  );

  const sun = useMemo(
    () => placeSun(model.date, minutes, latitude, longitude, model.times),
    [model, minutes, latitude, longitude],
  );

  const moonModel = useMemo(
    () => buildMoonModel(model.date, latitude, longitude),
    [model.date, latitude, longitude],
  );

  const moon = useMemo(
    () => placeMoon(model.date, minutes, latitude, longitude),
    [model.date, minutes, latitude, longitude],
  );

  const samples = useMemo(
    () => altitudeSamples(model.date, latitude, longitude),
    [model.date, latitude, longitude],
  );

  const orreryModel = useMemo(
    () =>
      buildOrreryModel({
        clock,
        longitude,
        focusId: focusPlanet,
        visiblePlanets,
      }),
    [clock, longitude, focusPlanet, visiblePlanets],
  );

  const dayCount = daysInYear(year);
  const orbitalSamples = useMemo(
    () =>
      orbitalPhaseSamples({
        planetId: focusPlanet === "moon" ? "moon" : focusPlanet,
        year,
        longitude,
        dayCount,
      }),
    [focusPlanet, year, longitude, dayCount],
  );

  const roundedMinute = ((Math.round(minutes) % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  const viewRef = useRef({
    latitude,
    longitude,
    date: model.date,
    minutes: roundedMinute,
    model: studioModel,
    theme: studioTheme,
  });
  const syncUrlRef = useRef<() => void>(() => {});

  useEffect(() => {
    const minGapMs = 500;
    let lastWrite = 0;
    let pending: number | null = null;

    const write = () => {
      const query = serializeViewQuery(viewRef.current);
      const next = `?${query}`;
      if (window.location.search === next) return;
      const state = viewHistoryState(window.history.state);
      if (!state) return;
      try {
        window.history.replaceState(state, "", next);
      } catch {
        // Safari throws SecurityError after 100 replaceState calls in 30s.
      }
    };

    const sync = () => {
      const wait = minGapMs - (performance.now() - lastWrite);
      if (wait <= 0) {
        if (pending !== null) {
          window.clearTimeout(pending);
          pending = null;
        }
        lastWrite = performance.now();
        write();
        return;
      }
      if (pending !== null) return;
      pending = window.setTimeout(() => {
        pending = null;
        lastWrite = performance.now();
        write();
      }, wait);
    };

    const flush = () => {
      if (pending !== null) {
        window.clearTimeout(pending);
        pending = null;
      }
      lastWrite = performance.now();
      write();
    };

    syncUrlRef.current = sync;
    const interval = window.setInterval(sync, minGapMs);
    sync();
    window.addEventListener("pagehide", flush);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", flush);
      syncUrlRef.current = () => {};
      flush();
    };
  }, []);

  useEffect(() => {
    viewRef.current = {
      latitude,
      longitude,
      date: model.date,
      minutes: roundedMinute,
      model: studioModel,
      theme: studioTheme,
    };
    if (playing) return;
    syncUrlRef.current();
  }, [playing, latitude, longitude, model.date, roundedMinute, studioModel, studioTheme]);

  const applyLatitude = (value: string) => {
    setLatText(value);
    if (coordinateStatus(value, -90, 90) === "valid") {
      setLatitude(Number(value.trim()));
    }
  };

  const applyLongitude = (value: string) => {
    setLngText(value);
    if (coordinateStatus(value, -180, 180) === "valid") {
      setLongitude(Number(value.trim()));
    }
  };

  const applyPreset = (lat: number, lng: number) => {
    setLatText(String(lat));
    setLngText(String(lng));
    setLatitude(lat);
    setLongitude(lng);
    setGeoError(null);
  };

  const locate = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Location is unavailable in this browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        applyPreset(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError("Location permission was denied.");
        } else if (error.code === error.TIMEOUT) {
          setGeoError("Location request timed out.");
        } else {
          setGeoError("This location is unavailable.");
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  };

  const resetPlace = () => {
    applyPreset(ORLANDO.lat, ORLANDO.lng);
    publishClock(initialClock(undefined, ORLANDO.lng, new Date()), true);
    setGeoError(null);
    setShowSun(true);
    setShowMoon(true);
  };

  return {
    stageRef,
    motion,
    year,
    dayIndex,
    minutes,
    dayCount,
    playing,
    loopDay,
    setDayLoop,
    loopYear,
    setYearLoop,
    astrolabeSpeed,
    setAstrolabeSpeed,
    orrerySpeed,
    setOrrerySpeed,
    studioModel,
    studioTheme,
    setStudioModel,
    setStudioTheme,
    setStudioView,
    focusPlanet,
    setFocusPlanet,
    visiblePlanets,
    togglePlanetVisibility,
    latitude,
    longitude,
    latText,
    lngText,
    locating,
    geoError,
    resetSignal,
    bumpResetSignal: () => setResetSignal((value) => value + 1),
    showSun,
    showMoon,
    setShowSun,
    setShowMoon,
    fullscreen,
    setFullscreen,
    model,
    orreryModel,
    sun,
    moonModel,
    moon,
    samples,
    orbitalSamples,
    seekMinutes,
    seekDate,
    setPlayback,
    applyLatitude,
    applyLongitude,
    applyPreset,
    locate,
    resetPlace,
  };
}
