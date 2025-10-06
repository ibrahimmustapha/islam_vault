import React, { useEffect, useRef, useState } from "react";
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ayahRefs = useRef<(HTMLDivElement | null)[]>([]);

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

  return (
    <div
      className={`min-h-screen flex justify-center items-center p-8 overflow-hidden transition-colors duration-500 ${
        darkMode
          ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-gray-100"
          : "bg-gradient-to-br from-white via-slate-50 to-slate-100 text-gray-900"
      }`}
    >
      <div
        className={`w-full max-w-7xl grid grid-cols-[280px_1fr] gap-6 backdrop-blur-xl border shadow-xl rounded-3xl overflow-hidden transition-colors duration-500 ${
          darkMode
            ? "bg-slate-800/50 border-slate-700"
            : "bg-white/60 border-slate-200"
        }`}
      >
        {/* Sidebar */}
        <aside
          className={`p-4 backdrop-blur-md h-[90vh] sticky top-0 overflow-y-auto transition-colors duration-500 ${
            darkMode ? "bg-slate-900/40 border-slate-700" : "bg-white/50 border-slate-200"
          } border-r`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2
              className={`text-lg font-semibold ${
                darkMode ? "text-emerald-400" : "text-emerald-600"
              }`}
            >
              The Holy Al-Quran
            </h2>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`text-sm px-3 py-1 rounded-xl transition ${
                darkMode
                  ? "bg-emerald-600/30 hover:bg-emerald-600/50"
                  : "bg-emerald-500/20 hover:bg-emerald-500/30"
              }`}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
          <div className="space-y-2">
            {surahs.map((s) => (
              <button
                key={s.number}
                onClick={() => {
                  setCurrentSurah(s.number);
                  setCurrentAyah(0);
                  const firstAyah = ayahs.find((a) => a.surah.number === s.number);
                  if (audioRef.current && firstAyah) {
                    audioRef.current.src = firstAyah.audio;
                    audioRef.current.play().catch(console.error);
                  }
                }}
                className={`w-full text-left p-3 rounded-xl transition ${
                  currentSurah === s.number
                    ? darkMode
                      ? "bg-emerald-700/40 text-emerald-300"
                      : "bg-emerald-100 text-emerald-700 font-medium"
                    : darkMode
                    ? "hover:bg-emerald-800/20"
                    : "hover:bg-emerald-50"
                }`}
              >
                <div className="text-sm font-medium">{s.englishName}</div>
                <div
                  className={`text-right text-lg font-arabic ${
                    darkMode ? "text-emerald-400" : "text-emerald-600"
                  }`}
                >
                  {s.name}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <main className="overflow-y-auto h-[90vh] p-8">
          {currentSurah ? (
            <>
              <h1
                className={`text-2xl font-bold mb-6 ${
                  darkMode ? "text-emerald-300" : "text-emerald-700"
                }`}
              >
                {filteredAyahs[0]?.surah.englishName}{" "}
                <span
                  className={`ml-2 text-3xl font-arabic ${
                    darkMode ? "text-emerald-400" : "text-emerald-500"
                  }`}
                >
                  {filteredAyahs[0]?.surah.name}
                </span>
              </h1>

              <audio
                ref={audioRef}
                controls
                className={`w-full mb-6 rounded-xl border shadow-sm transition ${
                  darkMode
                    ? "bg-slate-900 border-slate-700"
                    : "bg-emerald-50 border-slate-200"
                }`}
              />

              <div className="space-y-5 pb-10">
                {filteredAyahs.map((a, i) => (
                  <div
                    key={a.number}
                    ref={(el) => { ayahRefs.current[i] = el; }}
                    onClick={() => handlePlayAyah(i)}
                    className={`p-5 rounded-2xl cursor-pointer border transition ${
                      i === currentAyah
                        ? darkMode
                          ? "bg-emerald-900/40 border-emerald-400 ring-1 ring-emerald-400 text-emerald-100"
                          : "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300"
                        : darkMode
                        ? "bg-slate-900/60 border-slate-700 hover:border-emerald-700 text-gray-100"
                        : "bg-white/80 border-slate-200 hover:border-emerald-200"
                    }`}
                  >
                    <div className="text-xs mb-2 text-slate-500 dark:text-emerald-300">
                      Ayah {i + 1}
                    </div>
                    <p className="text-xl text-right font-arabic leading-relaxed">
                      {a.text}
                    </p>
                    {a.transliteration && (
                      <p className="italic mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {a.transliteration}
                      </p>
                    )}
                    {a.translation && (
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                        {a.translation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-gray-500">
              Select a Surah to start
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default QuranAudio;
