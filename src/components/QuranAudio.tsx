import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import api from "../services/api";

interface Ayah {
  number: number;
  audio: string;
  text: string;
  transliteration?: string;
  translation?: string;
  surah: {
    number: number;
    name: string;
    englishName: string;
  };
}

interface QuranResponse {
  data: {
    surahs: {
      number: number;
      name: string;
      englishName: string;
      ayahs: {
        number: number;
        audio?: string;
        text: string;
      }[];
    }[];
  };
}

const QuranAudio: React.FC = () => {
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [surahs, setSurahs] = useState<
    { number: number; name: string; englishName: string }[]
  >([]);
  const [currentSurah, setCurrentSurah] = useState<number | null>(null);
  const [currentAyah, setCurrentAyah] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);
  const surahDesktopRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const surahMobileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const surahScrollRef = useRef<HTMLDivElement | null>(null);
  const surahMobileScrollRef = useRef<HTMLDivElement | null>(null);
  const ayahScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);

        const [arabicRes, translitRes, englishRes] = await Promise.all([
          api.get<QuranResponse>("/quran/ar.alafasy"),
          api.get<QuranResponse>("/quran/en.transliteration"),
          api.get<QuranResponse>("/quran/en.asad"),
        ]);

        const ar = arabicRes.data.data;
        const tr = translitRes.data.data;
        const en = englishRes.data.data;

        const surahList = ar.surahs.map((s) => ({
          number: s.number,
          name: s.name,
          englishName: s.englishName,
        }));

        const combined: Ayah[] = ar.surahs.flatMap((s, si) =>
          s.ayahs.map((a, ai) => ({
            number: a.number,
            audio: a.audio || "",
            text: a.text,
            transliteration: tr.surahs?.[si]?.ayahs?.[ai]?.text ?? "",
            translation: en.surahs?.[si]?.ayahs?.[ai]?.text ?? "",
            surah: {
              number: s.number,
              name: s.name,
              englishName: s.englishName,
            },
          }))
        );

        setSurahs(surahList);
        setAyahs(combined);
      } catch (err) {
        console.error(err);
        setError("Failed to load Qur’an data.");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const filteredAyahs = currentSurah
    ? ayahs.filter((a) => a.surah.number === currentSurah)
    : [];

  const handlePlayAyah = (index: number) => {
    const ayah = filteredAyahs[index];
    if (!ayah || !audioRef.current) return;

    audioRef.current.src = ayah.audio;
    audioRef.current.play().catch(console.error);
    setCurrentAyah(index);
  };

  const handleEnded = async () => {
    if (currentAyah === null || !filteredAyahs.length || !audioRef.current)
      return;

    const next = currentAyah + 1;
    if (next < filteredAyahs.length) {
      setCurrentAyah(next);
      const nextAyah = filteredAyahs[next];
      audioRef.current.src = nextAyah.audio;
      await new Promise((r) => setTimeout(r, 1000)); // 1s pause between ayahs
      audioRef.current.play().catch(console.error);
    } else {
      // Move to next surah after 2s delay
      const nextSurahIndex =
        surahs.findIndex((s) => s.number === currentSurah) + 1;
      const nextSurah = surahs[nextSurahIndex];
      if (nextSurah) {
        await new Promise((r) => setTimeout(r, 2000));
        setCurrentSurah(nextSurah.number);
        setCurrentAyah(0);

        const nextSurahAyahs = ayahs.filter(
          (a) => a.surah.number === nextSurah.number
        );
        if (nextSurahAyahs.length && audioRef.current) {
          audioRef.current.src = nextSurahAyahs[0].audio;
          audioRef.current.play().catch(console.error);
        }
      }
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;
    const audio = audioRef.current;
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [handleEnded]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    const updatePreference = (
      event: MediaQueryListEvent | MediaQueryList
    ) => {
      setPrefersReducedMotion(event.matches);
    };

    updatePreference(media);

    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updatePreference);
      return () => media.removeEventListener("change", updatePreference);
    }

    media.addListener(updatePreference);
    return () => media.removeListener(updatePreference);
  }, []);

  const getActiveSurahContext = (index: number) => {
    const mobileContainer = surahMobileScrollRef.current;
    const desktopContainer = surahScrollRef.current;
    const mobileNode = surahMobileRefs.current[index];
    const desktopNode = surahDesktopRefs.current[index];

    const isVisible = (el: HTMLElement | null) =>
      !!el && el.offsetParent !== null;

    if (isVisible(mobileContainer) && mobileNode) {
      return { container: mobileContainer, node: mobileNode };
    }

    if (isVisible(desktopContainer) && desktopNode) {
      return { container: desktopContainer, node: desktopNode };
    }

    return {
      container: mobileContainer ?? desktopContainer ?? null,
      node: mobileNode ?? desktopNode ?? null,
    };
  };

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (currentSurah === null) return;

    const index = surahs.findIndex((s) => s.number === currentSurah);
    if (index === -1) return;

    const { container, node } = getActiveSurahContext(index);
    if (!container || !node) return;

    const frame = window.requestAnimationFrame(() => {
      const offset =
        node.offsetTop -
        container.clientHeight / 2 +
        node.offsetHeight / 2;

      container.scrollTo({
        top: Math.max(offset, 0),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentSurah, surahs, prefersReducedMotion]);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if (currentAyah === null) return;

    const container = ayahScrollRef.current;
    const node = ayahRefs.current[currentAyah];
    if (!container || !node) return;

    const frame = window.requestAnimationFrame(() => {
      const offset =
        node.offsetTop -
        container.clientHeight / 2 +
        node.offsetHeight / 2;

      container.scrollTo({
        top: Math.max(offset, 0),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentAyah, currentSurah, prefersReducedMotion]);

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center text-gray-500">
        Loading Qur’an...
      </div>
    );
  if (error)
    return (
      <div className="flex h-screen items-center justify-center text-red-500">
        {error}
      </div>
    );

  const totalSurahs = surahs.length;
  const totalAyahs = ayahs.length;

  return (
    <div
      className={`relative flex min-h-svh w-full flex-col overflow-hidden transition-colors duration-700 ${
        darkMode
          ? "bg-slate-950 text-slate-100"
          : "bg-gradient-to-br from-emerald-50 via-white to-slate-100 text-slate-900"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div
          className={`absolute top-0 right-6 h-72 w-72 -translate-y-1/2 rounded-full blur-3xl transition-opacity duration-700 ${
            darkMode ? "bg-emerald-500/20" : "bg-emerald-300/40"
          }`}
        />
        <div
          className={`absolute bottom-0 left-8 h-80 w-80 translate-y-1/2 rounded-full blur-3xl transition-opacity duration-700 ${
            darkMode ? "bg-cyan-500/10" : "bg-sky-300/30"
          }`}
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-8 sm:py-10 lg:px-8 lg:py-12">
        <header
          className={`flex flex-col gap-6 rounded-3xl border px-6 py-6 shadow-2xl backdrop-blur ${
            darkMode
              ? "border-white/10 bg-white/5"
              : "border-emerald-100/70 bg-white/80"
          }`}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p
                className={`text-xs font-medium uppercase tracking-[0.35em] ${
                  darkMode ? "text-emerald-300/70" : "text-emerald-600/70"
                }`}
              >
                Listen & Reflect
              </p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                The Holy Qur’an
              </h1>
              <p
                className={`mt-2 text-sm ${
                  darkMode ? "text-slate-400" : "text-slate-600"
                }`}
              >
                Stream the recitation with transliteration and translation,
                curated for a calm study experience.
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 sm:self-auto ${
                darkMode
                  ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
              }`}
            >
              <span>{darkMode ? "Light mode" : "Night mode"}</span>
              <span className="text-base">{darkMode ? "☀️" : "🌙"}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm sm:max-w-xs">
            <div
              className={`rounded-2xl border p-4 transition ${
                darkMode
                  ? "border-white/10 bg-white/5 text-emerald-200"
                  : "border-emerald-100 bg-white/90 text-emerald-600"
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-current/70">
                Surahs
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {totalSurahs || "—"}
              </div>
            </div>
            <div
              className={`rounded-2xl border p-4 transition ${
                darkMode
                  ? "border-white/10 bg-white/5 text-emerald-200"
                  : "border-emerald-100 bg-white/90 text-emerald-600"
              }`}
            >
              <div className="text-xs uppercase tracking-wide text-current/70">
                Ayahs Loaded
              </div>
              <div className="mt-1 text-2xl font-semibold">
                {totalAyahs || "—"}
              </div>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside
            className={`hidden overflow-hidden rounded-3xl border p-5 shadow-xl transition-colors duration-500 lg:sticky lg:top-24 lg:flex lg:max-h-[68vh] lg:flex-col ${
              darkMode
                ? "border-white/10 bg-white/5"
                : "border-emerald-100/80 bg-white/90"
            }`}
          >
            <div className="flex items-center justify-between pb-4">
              <h2
                className={`text-lg font-semibold ${
                  darkMode ? "text-emerald-200" : "text-emerald-600"
                }`}
              >
                Surah Library
              </h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  darkMode
                    ? "bg-emerald-500/10 text-emerald-200"
                    : "bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {totalSurahs} total
              </span>
            </div>
            <div
              ref={surahScrollRef}
              className="relative flex-1 space-y-2 overflow-y-auto pr-1 hide-scrollbar scroll-smooth"
            >
              {surahs.map((s, si) => (
                <button
                  key={s.number}
                  ref={(el) => {
                    surahDesktopRefs.current[si] = el;
                  }}
                  onClick={() => {
                    setCurrentSurah(s.number);
                    setCurrentAyah(0);
                    const firstAyah = ayahs.find(
                      (a) => a.surah.number === s.number
                    );
                    if (audioRef.current && firstAyah) {
                      audioRef.current.src = firstAyah.audio;
                      audioRef.current.play().catch(console.error);
                    }
                  }}
                  className={`group relative w-full overflow-hidden rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                    currentSurah === s.number
                      ? darkMode
                        ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200 shadow-lg shadow-emerald-900/40"
                        : "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-200/70"
                      : darkMode
                      ? "border-white/5 bg-white/[0.02] text-slate-200 hover:border-emerald-400/60 hover:bg-emerald-500/10"
                      : "border-emerald-100 bg-white/70 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-current/60">
                      Surah {s.number}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        darkMode
                          ? "bg-white/10 text-emerald-100"
                          : "bg-emerald-100 text-emerald-600"
                      }`}
                    >
                      {s.name}
                    </span>
                  </div>
                  <div className="mt-2 text-base font-semibold">
                    {s.englishName}
                  </div>
                  <div
                    className={`mt-1 text-right text-xl font-arabic ${
                      darkMode ? "text-emerald-200" : "text-emerald-600"
                    }`}
                  >
                    {s.name}
                  </div>
                </button>
              ))}
            </div>
          </aside>

          <main
            className={`flex h-full flex-col overflow-hidden rounded-3xl border shadow-xl transition-colors duration-500 ${
              darkMode
                ? "border-white/10 bg-white/5"
                : "border-emerald-100 bg-white/90"
            }`}
          >
            <div
              className={`border-b px-6 py-5 lg:hidden ${
                darkMode ? "border-white/5" : "border-emerald-100"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className={`text-base font-semibold ${
                      darkMode ? "text-emerald-100" : "text-emerald-700"
                    }`}
                  >
                    Surah Library
                  </h2>
                  <p
                    className={`mt-1 text-xs ${
                      darkMode ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Swipe to pick a surah and follow the recitation.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    darkMode
                      ? "bg-emerald-500/10 text-emerald-200"
                      : "bg-emerald-500/10 text-emerald-700"
                  }`}
                >
                  {totalSurahs} Total
                </span>
              </div>
              <div
                ref={surahMobileScrollRef}
                className="mt-4 overflow-x-auto pb-1 hide-scrollbar"
              >
                <div className="flex gap-3">
                  {surahs.map((s, si) => (
                    <button
                      key={`mobile-${s.number}`}
                      ref={(el) => {
                        surahMobileRefs.current[si] = el;
                      }}
                      onClick={() => {
                        setCurrentSurah(s.number);
                        setCurrentAyah(0);
                        const firstAyah = ayahs.find(
                          (a) => a.surah.number === s.number
                        );
                        if (audioRef.current && firstAyah) {
                          audioRef.current.src = firstAyah.audio;
                          audioRef.current.play().catch(console.error);
                        }
                      }}
                      className={`flex min-w-[150px] flex-col rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                        currentSurah === s.number
                          ? darkMode
                            ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200 shadow-lg shadow-emerald-900/40"
                            : "border-emerald-400 bg-white text-emerald-700 shadow-lg shadow-emerald-200/70"
                          : darkMode
                          ? "border-white/10 bg-white/5 text-slate-200 hover:border-emerald-400/40 hover:bg-emerald-500/10"
                          : "border-emerald-100 bg-white/80 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"
                      }`}
                    >
                      <span className="text-[0.65rem] uppercase tracking-[0.3em] text-current/60">
                        Surah {s.number}
                      </span>
                      <span className="mt-2 text-sm font-semibold">
                        {s.englishName}
                      </span>
                      <span
                        className={`mt-3 text-right text-lg font-arabic ${
                          darkMode ? "text-emerald-200" : "text-emerald-600"
                        }`}
                      >
                        {s.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {currentSurah ? (
              <>
                <div
                  className={`border-b px-6 py-6 lg:px-8 ${
                    darkMode ? "border-white/5" : "border-emerald-100"
                  }`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h2
                        className={`text-2xl font-semibold ${
                          darkMode ? "text-emerald-200" : "text-emerald-700"
                        }`}
                      >
                        {filteredAyahs[0]?.surah.englishName}
                      </h2>
                      <p
                        className={`text-sm ${
                          darkMode ? "text-slate-400" : "text-slate-600"
                        }`}
                      >
                        Tap any ayah to jump the recitation.
                      </p>
                    </div>
                    <div
                      className={`rounded-full px-4 py-1 text-sm font-medium ${
                        darkMode
                          ? "bg-emerald-500/10 text-emerald-200"
                          : "bg-emerald-500/10 text-emerald-700"
                      }`}
                    >
                      {filteredAyahs.length} Ayahs
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div
                      className={`text-3xl font-arabic ${
                        darkMode ? "text-emerald-100" : "text-emerald-600"
                      }`}
                    >
                      {filteredAyahs[0]?.surah.name}
                    </div>
                    <audio
                      ref={audioRef}
                      controls
                      className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm transition-all duration-300 lg:w-auto ${
                        darkMode
                          ? "border-white/10 bg-white/5 text-emerald-100 hover:border-emerald-400/60"
                          : "border-emerald-100 bg-white/90 text-emerald-700 hover:border-emerald-300"
                      }`}
                    />
                  </div>

                  {currentAyah !== null && filteredAyahs[currentAyah] && (
                    <div
                      className={`mt-5 overflow-hidden rounded-3xl border p-5 transition-all duration-500 ${
                        darkMode
                          ? "border-white/5 bg-gradient-to-r from-emerald-500/10 via-slate-900/40 to-cyan-500/10"
                          : "border-emerald-100 bg-gradient-to-r from-emerald-100/80 via-white to-sky-100/80"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div
                            className={`text-xs font-semibold uppercase tracking-[0.35em] ${
                              darkMode ? "text-emerald-200/80" : "text-emerald-600/80"
                            }`}
                          >
                            Now Playing Ayah {currentAyah + 1}
                          </div>
                          <p
                            className={`mt-2 text-lg font-medium ${
                              darkMode ? "text-emerald-100" : "text-emerald-700"
                            }`}
                          >
                            {filteredAyahs[currentAyah]?.transliteration || "Transliteration unavailable"}
                          </p>
                        </div>
                        <div
                          className={`rounded-full px-4 py-2 text-sm font-medium shadow-sm ${
                            darkMode
                              ? "bg-white/10 text-emerald-100"
                              : "bg-white/90 text-emerald-700"
                          }`}
                        >
                          Surah {filteredAyahs[currentAyah]?.surah.number}
                        </div>
                      </div>
                      {filteredAyahs[currentAyah]?.translation && (
                        <p
                          className={`mt-4 text-sm leading-relaxed ${
                            darkMode ? "text-slate-200" : "text-slate-600"
                          }`}
                        >
                          “{filteredAyahs[currentAyah]?.translation}”
                        </p>
                      )}

                      <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full w-1/3 animate-[pulse_6s_ease-in-out_infinite] rounded-full ${
                            darkMode
                              ? "bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400"
                              : "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div
                  ref={ayahScrollRef}
                  className="relative flex-1 overflow-y-auto px-6 pb-12 pt-6 lg:px-8 lg:pt-8 hide-scrollbar scroll-smooth"
                >
                  <div className="space-y-5">
                    {filteredAyahs.map((a, i) => (
                      <div
                        key={a.number}
                        ref={(el) => {
                          ayahRefs.current[i] = el;
                        }}
                        onClick={() => handlePlayAyah(i)}
                        className={`group relative cursor-pointer overflow-hidden rounded-3xl border px-5 py-6 transform transition-all duration-500 ease-out ${
                          i === currentAyah
                            ? darkMode
                              ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-50 shadow-lg shadow-emerald-900/40 scale-100 opacity-100 lyric-active"
                              : "border-emerald-400 bg-emerald-50 text-emerald-800 shadow-lg shadow-emerald-200/60 scale-[1.01] opacity-100 lyric-active"
                            : darkMode
                            ? "border-white/5 bg-white/[0.03] text-slate-100 hover:border-emerald-400/60 hover:bg-emerald-500/10 scale-[0.98] opacity-70"
                            : "border-emerald-100 bg-white/70 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 scale-[0.98] opacity-75"
                        }`}
                      >
                        <div
                          className={`mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors duration-500 ${
                            i === currentAyah
                              ? darkMode
                                ? "bg-emerald-500/20 text-emerald-100 lyric-pulse"
                                : "bg-emerald-100 text-emerald-700 lyric-pulse"
                              : darkMode
                              ? "bg-white/5 text-slate-300"
                              : "bg-emerald-50 text-slate-500"
                          }`}
                        >
                          <span>Ayah {i + 1}</span>
                          {i === currentAyah && (
                            <span className="text-[0.7rem] uppercase tracking-[0.3em]">
                              Playing…
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-xl text-right font-arabic leading-relaxed transition-colors duration-500 ${
                            i === currentAyah
                              ? darkMode
                                ? "text-emerald-50"
                                : "text-emerald-800"
                              : darkMode
                              ? "text-slate-200"
                              : "text-slate-700"
                          }`}
                        >
                          {a.text}
                        </p>
                        {a.transliteration && (
                          <p
                            className={`mt-3 text-sm italic transition-colors duration-500 ${
                              darkMode ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {a.transliteration}
                          </p>
                        )}
                        {a.translation && (
                          <p
                            className={`mt-3 text-sm transition-colors duration-500 ${
                              darkMode ? "text-slate-200" : "text-slate-600"
                            }`}
                          >
                            {a.translation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <div
                  className={`rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] ${
                    darkMode
                      ? "bg-emerald-500/10 text-emerald-200"
                      : "bg-emerald-100 text-emerald-600"
                  }`}
                >
                  Start your journey
                </div>
                <h2
                  className={`text-2xl font-semibold ${
                    darkMode ? "text-emerald-100" : "text-emerald-700"
                  }`}
                >
                  Select a Surah to begin listening
                </h2>
                <p
                  className={`max-w-sm text-sm ${
                    darkMode ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Choose any surah from the library to load the recitation,
                  transliteration, and translation.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default QuranAudio;
