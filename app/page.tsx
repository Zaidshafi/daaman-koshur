"use client";

import { useEffect, useMemo, useState } from "react";

type Phrase = {
  id: string;
  english: string;
  kashmiri: string;
  latin: string;
  aliases?: string[];
  note?: string;
  category: "Everyday" | "Affection" | "Family" | "Food";
};

const phrases: Phrase[] = [
  { id: "hello", english: "Hello, how are you?", kashmiri: "آداب، تُہۍ چھِو واریاہ؟", latin: "Aadaab, toh' chhiv vaaryah?", category: "Everyday" },
  { id: "fine", english: "I am fine.", kashmiri: "بہٕ چھُس ٹھیک۔", latin: "Bi chhus theek.", category: "Everyday" },
  { id: "name", english: "What is your name?", kashmiri: "تُہند ناو چھُ کیاہ؟", latin: "Tohund naav chhu kyaah?", category: "Everyday" },
  { id: "thanks", english: "Thank you.", kashmiri: "شُکریہ۔", latin: "Shukriya.", category: "Everyday" },
  { id: "understand", english: "I don’t understand.", kashmiri: "مےٚ چھُنہٕ سمجھ یِوان۔", latin: "Me chhuna samajh yiwaan.", category: "Everyday" },
  { id: "slow", english: "Please speak slowly.", kashmiri: "مہربانی کٔرِتھ وٕنِو آہستہ۔", latin: "Meharbaani karith waniv aahista.", category: "Everyday" },
  { id: "love", english: "I love you.", kashmiri: "بہٕ چھُس تۄہہِ پیار کران۔", latin: "Bi chhus toh' pyaar karaan.", note: "A warm, respectful form", category: "Affection" },
  { id: "miss", english: "I miss you.", kashmiri: "مےٚ چھِ تُہند یاد یِوان۔", latin: "Me chhi tohund yaad yiwaan.", category: "Affection" },
  { id: "beautiful", english: "You look beautiful.", kashmiri: "تُہۍ چھِو واریاہ خوبصورت باسان۔", latin: "Toh' chhiv vaaryah khoobsurat baasaan.", category: "Affection" },
  { id: "home", english: "Welcome to our home.", kashmiri: "سونِس گَرِس منز خۄش آمدید۔", latin: "Sonis garis manz khosh aamdeed.", category: "Family" },
  { id: "family", english: "This is my family.", kashmiri: "یہِ چھُ میون خاندان۔", latin: "Yi chhu myon khaandaan.", category: "Family" },
  { id: "mother", english: "How is your mother?", kashmiri: "تُہنز موج کِتھ پٲٹھۍ چھِ؟", latin: "Tohanz maaj kith paeth chhi?", category: "Family" },
  { id: "shy-mother", english: "Did you feel shy, mother?", kashmiri: "ژےٚ لَجیا، موج؟", latin: "Che lajiya, mouj?", aliases: ["che lajiya mouj", "tse lajiya maaj", "che lajya mouj", "tse lajya maaj"], note: "Roman Kashmiri spelling varies by speaker", category: "Family" },
  { id: "eat", english: "Have you eaten?", kashmiri: "تُہۍ کھٮ۪وٕا؟", latin: "Toh' khewa?", category: "Food" },
  { id: "delicious", english: "The food is delicious.", kashmiri: "بَتہٕ چھُ واریاہ مَزٕدار۔", latin: "Batta chhu vaaryah mazedaar.", category: "Food" },
  { id: "tea", english: "Would you like some tea?", kashmiri: "تۄہہِ چای چھا پَسند؟", latin: "Toh' chaay chha pasand?", category: "Food" },
];

const categories = ["Everyday", "Affection", "Family", "Food"] as const;

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[’'.,?!،؟]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const searchableText = (phrase: Phrase) =>
  normalize([phrase.english, phrase.kashmiri, phrase.latin, ...(phrase.aliases ?? [])].join(" "));

export default function Home() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Phrase>(phrases[0]);
  const [category, setCategory] = useState<(typeof categories)[number]>("Everyday");
  const [reverse, setReverse] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("daaman-saved");
    if (stored) setSaved(JSON.parse(stored));
  }, []);

  const matches = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return phrases.filter((item) => item.category === category);
    return phrases.filter((item) =>
      searchableText(item).includes(normalize(clean))
    );
  }, [query, category]);

  const findTranslation = async () => {
    if (!query.trim()) return;
    const exact = phrases.find((item) =>
      [item.english, item.kashmiri, item.latin, ...(item.aliases ?? [])].some(
        (value) => normalize(value) === normalize(query),
      ),
    );
    if (exact) {
      setSelected(exact);
      setNotFound(false);
      return;
    }

    setLoading(true);
    setNotFound(false);

    try {
      const response = await fetch(
        "https://daaman-translate.zainnnbs.workers.dev/translate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: query.trim(),
            direction: reverse ? "toEnglish" : "toKashmiri",
          }),
        },
      );
      if (!response.ok) throw new Error("Translation unavailable");

      const translation = await response.json();
      setSelected({
        id: `ai-${Date.now()}`,
        english: translation.english,
        kashmiri: translation.kashmiri,
        latin: translation.latin,
        category: "Everyday",
        note: "AI translation · check important wording with a fluent speaker",
      });
      return;
    } catch {
      // Keep the hand-checked phrasebook available if the free AI service is busy.
    } finally {
      setLoading(false);
    }

    const clean = normalize(query);
    const words = clean.split(" ").filter((word) => word.length > 1);
    const best = phrases
      .map((item) => ({
        item,
        score:
          (searchableText(item).includes(clean) ? 100 : 0) +
          words.filter((word) => searchableText(item).includes(word)).length,
      }))
      .sort((a, b) => b.score - a.score)[0];
    if (best?.score > Math.max(1, words.length / 2)) {
      setSelected(best.item);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
  };

  const speak = (text: string, lang: string) => {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.82;
    speechSynthesis.speak(utterance);
  };

  const toggleSaved = () => {
    const next = saved.includes(selected.id)
      ? saved.filter((id) => id !== selected.id)
      : [...saved, selected.id];
    setSaved(next);
    localStorage.setItem("daaman-saved", JSON.stringify(next));
  };

  const copyTranslation = async () => {
    await navigator.clipboard.writeText(
      `${selected.kashmiri}\n${selected.latin}\n${selected.english}`
    );
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#" aria-label="Daaman home">
          <span className="brand-mark">د</span>
          <span>
            <strong>Daaman</strong>
            <small>A thread between two worlds</small>
          </span>
        </a>
        <div className="private-pill"><span /> Private to this device</div>
      </header>

      <section className="hero">
        <div className="eyebrow">KOSHUR · ENGLISH</div>
        <h1>Speak from the <em>heart,</em><br />not from a phrasebook.</h1>
        <p>A gentle Kashmiri companion for the conversations that bring two families closer.</p>
      </section>

      <section className="translator-shell" aria-label="Translator">
        <div className="language-row">
          <button className={!reverse ? "active" : ""} onClick={() => setReverse(false)}>English</button>
          <button className="swap" onClick={() => setReverse(!reverse)} aria-label="Swap languages">⇄</button>
          <button className={reverse ? "active" : ""} onClick={() => setReverse(true)}>کٲشُر</button>
        </div>

        <div className="translation-grid">
          <div className="input-panel">
            <label htmlFor="phrase-input">{reverse ? "Kashmiri phrase · script or English letters" : "What would you like to say?"}</label>
            <textarea
              id="phrase-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void findTranslation();
                }
              }}
              placeholder={reverse ? "Type Kashmiri in script or English letters…" : "Try “I love you” or “Have you eaten?”"}
              dir="auto"
            />
            <div className="input-footer">
              <span>{query.length}/180</span>
              <button className="translate-button" onClick={() => void findTranslation()} disabled={loading}>
                {loading ? "Translating…" : "Translate"} <kbd>↵</kbd>
              </button>
            </div>
          </div>

          <article className="result-panel">
            <div className="result-topline">
              <span>KASHMIRI</span>
              <button onClick={toggleSaved} aria-label="Save phrase" className={saved.includes(selected.id) ? "saved" : ""}>
                {saved.includes(selected.id) ? "♥" : "♡"}
              </button>
            </div>
            {notFound ? (
              <div className="not-found" role="status">
                <span>ROMAN KASHMIRI</span>
                <h3>I don’t know this phrase yet.</h3>
                <p>Daaman currently knows a growing collection of everyday phrases. Try another spelling, or send this phrase to Zaid to add its exact meaning.</p>
              </div>
            ) : (
              <>
                <p className="kashmiri" dir="rtl">{selected.kashmiri}</p>
                {selected.latin && <p className="pronunciation">{selected.latin}</p>}
                <p className="meaning">{selected.english}</p>
                {selected.note && <span className="note">✦ {selected.note}</span>}
                <div className="result-actions">
                  <button onClick={() => speak(selected.kashmiri, "ks-IN")}>◖)) Listen</button>
                  <button onClick={copyTranslation}>{copied ? "✓ Copied" : "▣ Copy"}</button>
                </div>
              </>
            )}
          </article>
        </div>
      </section>

      <section className="phrase-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">START WITH SOMETHING SIMPLE</span>
            <h2>Phrases for real moments</h2>
          </div>
          <span className="phrase-count">{phrases.length} essentials</span>
        </div>
        <div className="category-tabs" role="tablist">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => { setCategory(item); setQuery(""); }}
              className={category === item && !query ? "active" : ""}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="phrase-list">
          {matches.slice(0, 5).map((item, index) => (
            <button
              key={item.id}
              className="phrase-card"
              onClick={() => { setSelected(item); setNotFound(false); window.scrollTo({ top: 310, behavior: "smooth" }); }}
            >
              <span className="number">{String(index + 1).padStart(2, "0")}</span>
              <span className="phrase-english">{item.english}</span>
              <span className="phrase-kashmiri" dir="rtl">{item.kashmiri}</span>
              <span className="arrow">↗</span>
            </button>
          ))}
          {matches.length === 0 && <p className="empty">That phrase isn’t in the starter collection yet. Try a simpler word.</p>}
        </div>
      </section>

      <footer>
        <span>Made with care for two families.</span>
        <span>Daaman · دامن · 2026</span>
      </footer>
    </main>
  );
}
