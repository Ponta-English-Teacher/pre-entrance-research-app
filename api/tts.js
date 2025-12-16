// api/tts.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    if (!key || !region) {
      return res
        .status(500)
        .json({ error: "AZURE_SPEECH_KEY / AZURE_SPEECH_REGION not set" });
    }

    const { text, voice, rate } = req.body || {};
    const input = (text || "").toString().trim();

    if (!input) {
      return res.status(400).json({ error: "Missing text" });
    }

    // Default voice (change anytime)
    const voiceName = (voice || "en-US-JennyNeural").toString();

    // rate examples: "0%" (normal), "-15%" (slow)
    const prosodyRate = (rate || "0%").toString();

    const ssml =
      `<speak version="1.0" xml:lang="en-US">` +
      `<voice name="${voiceName}">` +
      `<prosody rate="${prosodyRate}">${escapeXml(input)}</prosody>` +
      `</voice>` +
      `</speak>`;

    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const azureResp = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-32kbitrate-mono-mp3",
        "User-Agent": "pre-entrance-research-app",
      },
      body: ssml,
    });

    if (!azureResp.ok) {
      const errText = await azureResp.text().catch(() => "");
      console.error("Azure TTS error:", azureResp.status, errText);
      return res.status(500).json({ error: "Azure TTS failed" });
    }

    const arrayBuffer = await azureResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(buffer);
  } catch (err) {
    console.error("tts error:", err);
    return res.status(500).json({ error: "Server error in /api/tts" });
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

