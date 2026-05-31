// server.js - Main Express backend for Language Translator App
// Uses MyMemory (free) API by default; swap in Microsoft or Google keys via .env

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:3000" }));
app.use(express.json());

// ─── Translation endpoint ─────────────────────────────────────────────────────
app.post("/api/translate", async (req, res) => {
  const { text, sourceLang, targetLang } = req.body;

  // Basic input validation
  if (!text || !text.trim()) {
    return res.status(400).json({ error: "Text is required for translation." });
  }
  if (!sourceLang || !targetLang) {
    return res
      .status(400)
      .json({ error: "Source and target languages are required." });
  }
  if (text.trim().length > 5000) {
    return res
      .status(400)
      .json({ error: "Text must be 5000 characters or fewer." });
  }

  try {
    // ── Option A: Microsoft Azure Translator (needs MICROSOFT_TRANSLATOR_KEY) ──
    if (process.env.MICROSOFT_TRANSLATOR_KEY) {
      const msRes = await axios.post(
        "https://api.cognitive.microsofttranslator.com/translate",
        [{ Text: text.trim() }],
        {
          params: {
            "api-version": "3.0",
            from: sourceLang === "auto" ? undefined : sourceLang,
            to: targetLang,
          },
          headers: {
            "Ocp-Apim-Subscription-Key": process.env.MICROSOFT_TRANSLATOR_KEY,
            "Ocp-Apim-Subscription-Region":
              process.env.MICROSOFT_TRANSLATOR_REGION || "global",
            "Content-Type": "application/json",
          },
        }
      );

      const translated = msRes.data[0]?.translations[0]?.text;
      const detectedLang =
        msRes.data[0]?.detectedLanguage?.language || sourceLang;
      return res.json({ translatedText: translated, detectedLang });
    }

    // ── Option B: Google Cloud Translate (needs GOOGLE_TRANSLATE_KEY) ──────────
    if (process.env.GOOGLE_TRANSLATE_KEY) {
      const googleRes = await axios.post(
        `https://translation.googleapis.com/language/translate/v2`,
        {},
        {
          params: {
            q: text.trim(),
            source: sourceLang === "auto" ? undefined : sourceLang,
            target: targetLang,
            key: process.env.GOOGLE_TRANSLATE_KEY,
            format: "text",
          },
        }
      );

      const translated =
        googleRes.data.data.translations[0]?.translatedText;
      const detectedLang =
        googleRes.data.data.translations[0]?.detectedSourceLanguage ||
        sourceLang;
      return res.json({ translatedText: translated, detectedLang });
    }

    // ── Option C: MyMemory (free, no key required – default fallback) ─────────
    const langPair =
      sourceLang === "auto"
        ? `|${targetLang}`
        : `${sourceLang}|${targetLang}`;

    const mmRes = await axios.get("https://api.mymemory.translated.net/get", {
      params: {
        q: text.trim(),
        langpair: langPair,
        de: process.env.MYMEMORY_EMAIL || "", // optional email for higher quota
      },
    });

    if (mmRes.data.responseStatus !== 200) {
      throw new Error(mmRes.data.responseDetails || "Translation failed.");
    }

    const translated = mmRes.data.responseData.translatedText;
    return res.json({ translatedText: translated, detectedLang: sourceLang });
  } catch (err) {
    console.error("Translation error:", err?.response?.data || err.message);

    // Return a friendly error message
    const status = err?.response?.status || 500;
    const message =
      err?.response?.data?.error?.message ||
      err.message ||
      "An unexpected error occurred during translation.";

    return res.status(status).json({ error: message });
  }
});

// ─── Supported languages list ─────────────────────────────────────────────────
app.get("/api/languages", (_req, res) => {
  const languages = [
    { code: "auto", name: "Auto Detect" },
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "it", name: "Italian" },
    { code: "pt", name: "Portuguese" },
    { code: "ru", name: "Russian" },
    { code: "zh", name: "Chinese (Simplified)" },
    { code: "zh-TW", name: "Chinese (Traditional)" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "ar", name: "Arabic" },
    { code: "bn", name: "Bengali" },
    { code: "tr", name: "Turkish" },
    { code: "nl", name: "Dutch" },
    { code: "pl", name: "Polish" },
    { code: "sv", name: "Swedish" },
    { code: "da", name: "Danish" },
    { code: "fi", name: "Finnish" },
    { code: "no", name: "Norwegian" },
    { code: "el", name: "Greek" },
    { code: "he", name: "Hebrew" },
    { code: "id", name: "Indonesian" },
    { code: "ms", name: "Malay" },
    { code: "th", name: "Thai" },
    { code: "vi", name: "Vietnamese" },
    { code: "uk", name: "Ukrainian" },
    { code: "cs", name: "Czech" },
    { code: "ro", name: "Romanian" },
    { code: "hu", name: "Hungarian" },
    { code: "ta", name: "Tamil" },
    { code: "te", name: "Telugu" },
    { code: "mr", name: "Marathi" },
    { code: "gu", name: "Gujarati" },
    { code: "ur", name: "Urdu" },
  ];
  res.json(languages);
});

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ─── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () =>
  console.log(`✅  Translator backend running on http://localhost:${PORT}`)
);
