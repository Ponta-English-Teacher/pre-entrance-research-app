// api/tts.js
export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text, voice = "en-US-JennyNeural", rate = "0%" } = req.body || {};

    if (!text || !String(text).trim()) {
      return res.status(400).json({ error: "Missing text" });
    }

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    if (!key || !region) {
      return res.status(500).json({
        error: "AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set",
      });
    }

    const ssml = `
<speak version="1.0" xml:lang="en-US">
  <voice name="${voice}">
    <prosody rate="${rate}">${escapeXml(String(text))}</prosody>
  </voice>
</speak>`.trim();

    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        "User-Agent": "pre-entrance-research-app",
      },
      body: ssml,
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => "");
      return res.status(500).json({
        error: "Azure TTS request failed",
        detail: errText.slice(0, 300),
      });
    }

    const arrayBuffer = await r.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audioBuffer);
  } catch (e) {
    console.error("TTS server error:", e);
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
