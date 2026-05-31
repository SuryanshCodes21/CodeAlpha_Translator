// src/App.js
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import "./App.css";

// ─── Language Selector Component ──────────────────────────────────────────────
const LanguageSelect = ({ value, onChange, languages, disableAuto }) => (
  <select
    className="lang-select"
    value={value}
    onChange={(e) => onChange(e.target.value)}
  >
    {languages
      .filter((l) => !(disableAuto && l.code === "auto"))
      .map((lang) => (
        <option key={lang.code} value={lang.code}>
          {lang.name}
        </option>
      ))}
  </select>
);

// ─── Toast notification component ─────────────────────────────────────────────
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className={`toast toast--${type}`}>
      <span>{message}</span>
      <button className="toast__close" onClick={onClose}>×</button>
    </div>
  );
};

// ─── Main App Component ────────────────────────────────────────────────────────
export default function App() {
  const [languages, setLanguages] = useState([]);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("hi");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [toast, setToast] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const MAX_CHARS = 5000;

  // Fetch available languages on mount
  useEffect(() => {
    axios
      .get("/api/languages")
      .then((res) => setLanguages(res.data))
      .catch(() =>
        setLanguages([
          { code: "en", name: "English" },
          { code: "hi", name: "Hindi" },
          { code: "es", name: "Spanish" },
          { code: "fr", name: "French" },
          { code: "de", name: "German" },
          { code: "zh", name: "Chinese" },
          { code: "ar", name: "Arabic" },
          { code: "ja", name: "Japanese" },
        ])
      );
  }, []);

  // Update character count whenever input changes
  const handleInputChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_CHARS) {
      setInputText(val);
      setCharCount(val.length);
    }
  };

  // ── Translate ──────────────────────────────────────────────────────────────
  const handleTranslate = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to translate.");
      return;
    }
    setLoading(true);
    setError("");
    setOutputText("");

    try {
      const res = await axios.post("/api/translate", {
        text: inputText,
        sourceLang,
        targetLang,
      });
      setOutputText(res.data.translatedText);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Translation failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Allow Ctrl+Enter to translate
  const handleKeyDown = (e) => {
    if (e.ctrlKey && e.key === "Enter") handleTranslate();
  };

  // ── Swap languages ─────────────────────────────────────────────────────────
  const handleSwap = () => {
    if (sourceLang === "auto") return; // Can't swap auto-detect
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    setInputText(outputText);
    setOutputText(inputText);
    setCharCount(outputText.length);
  };

  // ── Copy to clipboard ──────────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!outputText) return;
    navigator.clipboard
      .writeText(outputText)
      .then(() => setToast({ message: "Copied to clipboard!", type: "success" }))
      .catch(() => setToast({ message: "Copy failed.", type: "error" }));
  }, [outputText]);

  // ── Text-to-speech ─────────────────────────────────────────────────────────
  const handleSpeak = () => {
    if (!outputText) return;
    if (!("speechSynthesis" in window)) {
      setToast({ message: "Text-to-speech not supported in this browser.", type: "error" });
      return;
    }

    // Stop if already speaking
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(outputText);
    utterance.lang = targetLang;
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => {
      setIsSpeaking(false);
      setToast({ message: "Speech synthesis failed.", type: "error" });
    };
    window.speechSynthesis.speak(utterance);
  };

  // ── Clear input ────────────────────────────────────────────────────────────
  const handleClear = () => {
    setInputText("");
    setOutputText("");
    setError("");
    setCharCount(0);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const swapDisabled = sourceLang === "auto";

  return (
    <div className="app">
      {/* Toast notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header__inner">
          <div className="header__logo">
            <span className="header__logo-icon">🌐</span>
            <span className="header__logo-text">LinguaFlow</span>
          </div>
          <p className="header__tagline">Instant translation across 35+ languages</p>
        </div>
      </header>

      {/* ── Main translator card ────────────────────────────────────────────── */}
      <main className="main">
        <div className="translator-card">

          {/* Language bar */}
          <div className="lang-bar">
            <div className="lang-bar__side">
              <label className="lang-label">From</label>
              <LanguageSelect
                value={sourceLang}
                onChange={setSourceLang}
                languages={languages}
              />
            </div>

            <button
              className={`swap-btn ${swapDisabled ? "swap-btn--disabled" : ""}`}
              onClick={handleSwap}
              disabled={swapDisabled}
              title={swapDisabled ? "Cannot swap when source is Auto Detect" : "Swap languages"}
              aria-label="Swap languages"
            >
              ⇄
            </button>

            <div className="lang-bar__side lang-bar__side--right">
              <label className="lang-label">To</label>
              <LanguageSelect
                value={targetLang}
                onChange={setTargetLang}
                languages={languages}
                disableAuto
              />
            </div>
          </div>

          {/* Text panels */}
          <div className="panels">
            {/* Input panel */}
            <div className="panel panel--input">
              <textarea
                className="panel__textarea"
                placeholder="Enter text to translate… (Ctrl+Enter to translate)"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                aria-label="Input text"
              />
              <div className="panel__footer">
                <span className={`char-count ${charCount > MAX_CHARS * 0.9 ? "char-count--warn" : ""}`}>
                  {charCount} / {MAX_CHARS}
                </span>
                {inputText && (
                  <button className="icon-btn" onClick={handleClear} title="Clear all">
                    ✕ Clear
                  </button>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="panels__divider" aria-hidden="true" />

            {/* Output panel */}
            <div className="panel panel--output">
              {loading ? (
                <div className="loading-state">
                  <div className="loading-state__spinner" />
                  <p className="loading-state__text">Translating…</p>
                </div>
              ) : outputText ? (
                <>
                  <p className="panel__output-text" aria-live="polite">
                    {outputText}
                  </p>
                  <div className="panel__footer panel__footer--output">
                    <button
                      className={`icon-btn icon-btn--speak ${isSpeaking ? "icon-btn--active" : ""}`}
                      onClick={handleSpeak}
                      title={isSpeaking ? "Stop speaking" : "Listen to translation"}
                    >
                      {isSpeaking ? "■ Stop" : "🔊 Listen"}
                    </button>
                    <button
                      className="icon-btn icon-btn--copy"
                      onClick={handleCopy}
                      title="Copy translation"
                    >
                      📋 Copy
                    </button>
                  </div>
                </>
              ) : (
                <p className="panel__placeholder">
                  {error ? "" : "Translation will appear here…"}
                </p>
              )}

              {/* Error message */}
              {error && !loading && (
                <div className="error-box" role="alert">
                  <span className="error-box__icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Translate button */}
          <div className="translate-row">
            <button
              className={`translate-btn ${loading ? "translate-btn--loading" : ""}`}
              onClick={handleTranslate}
              disabled={loading || !inputText.trim()}
            >
              {loading ? (
                <>
                  <span className="translate-btn__spinner" />
                  Translating…
                </>
              ) : (
                <>Translate →</>
              )}
            </button>
          </div>
        </div>

        {/* Tips */}
        <p className="tip">
          💡 Tip: Press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to translate instantly
        </p>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="footer">
        <p>LinguaFlow • College Internship Project • Powered by MyMemory / Microsoft / Google Translate API</p>
      </footer>
    </div>
  );
}
