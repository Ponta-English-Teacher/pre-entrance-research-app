// api/tts.js
// POST /api/tts
// Body: { text: "...", voice?: "en-US-JennyNeural", rate?: "0%" }
// Returns: audio/mpeg (mp3)

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, voice, rate } = req.body || {};
    const t = (text || "").toString().trim();

    if (!t) {
      return res.status(400).json({ error: "Missing text" });
    }

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    if (!key || !region) {
      return res
        .status(500)
        .json({ error: "AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set" });
    }

    const v = (voice || "en-US-JennyNeural").toString();
    const r = (rate || "0%").toString(); // e.g. "0%", "-10%"

    // Basic SSML
    const ssml =
      `<speak version="1.0" xml:lang="en-US">` +
      `<voice name="${v}">` +
      `<prosody rate="${r}">` +
      escapeXml(t) +
      `</prosody>` +
      `</voice>` +
      `</speak>`;

    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
        "User-Agent": "pre-entrance-research-app",
      },
      body: ssml,
    });

    if (!resp.ok) {
      const msg = await resp.text().catch(() => "");
      console.error("Azure TTS error:", resp.status, msg);
      return res.status(500).json({ error: "Azure TTS failed" });
    }

    const arrayBuf = await resp.arrayBuffer();
    const buf = Buffer.from(arrayBuf);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buf);
  } catch (err) {
    console.error("TTS API error:", err);
    return res.status(500).json({ error: "TTS server error" });
  }
}

function escapeXml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
