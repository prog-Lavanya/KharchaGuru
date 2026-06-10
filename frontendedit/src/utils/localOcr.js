const SMART_ENTRY_URL = "https://kharchaguru-0cgi.onrender.com/smart-entries/parse";

function detectAmount(text) {
  const matches = text.match(/(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d{1,2})?)/gi) || [];
  if (matches.length === 0) return 0;
  const numbers = matches
    .map((match) => Number(match.replace(/[^\d.]/g, "")))
    .filter((value) => !Number.isNaN(value));
  return numbers.length ? Math.max(...numbers) : 0;
}

function buildFallbackEntry(rawText) {
  const amount = detectAmount(rawText);
  const normalized = rawText.replace(/\s+/g, " ").trim();
  return {
    entry_type: "expense",
    amount,
    description: normalized || "Scanned expense",
    category: "Others",
    source: "ocr",
  };
}

export async function extractTextWithLocalOcr(fileOrBlob, onProgress) {
  const Tesseract = await import("tesseract.js");
  const { data } = await Tesseract.recognize(fileOrBlob, "eng", {
    logger: (message) => {
      if (message.status === "recognizing text" && typeof onProgress === "function") {
        onProgress(message.progress || 0);
      }
    },
  });

  return (data?.text || "").trim();
}

export async function parseSmartEntryFromText(rawText) {
  const cleanedText = (rawText || "").trim();
  if (!cleanedText) {
    return buildFallbackEntry("");
  }

  try {
    const response = await fetch(SMART_ENTRY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanedText }),
    });

    const data = await response.json().catch(() => ({}));
    if (response.ok && data?.amount) {
      return data;
    }
  } catch (error) {
    console.error("Smart entry parse fallback failed:", error);
  }

  return buildFallbackEntry(cleanedText);
}
