// ─── Text-to-Speech via ElevenLabs ─────────────────────────
// POST { text } → returns audio/mpeg stream

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ElevenLabs API key not configured' });
  }

  const { text } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' });
  }

  // Clean text for speech — strip markdown, commands, table markup
  const cleanText = text
    .replace(/\{\{[A-Z_]+:?[^}]*\}\}/g, '')       // strip {{COMMANDS}}
    .replace(/\{\{\/[A-Z_]+\}\}/g, '')              // strip {{/COMMANDS}}
    .replace(/\|[^|]*\|/g, '')                       // strip table cells
    .replace(/^\s*[-:]+\s*$/gm, '')                  // strip table dividers
    .replace(/\*\*(.*?)\*\*/g, '$1')                 // strip bold
    .replace(/\*(.*?)\*/g, '$1')                     // strip italic
    .replace(/`(.*?)`/g, '$1')                       // strip code
    .replace(/#{1,6}\s*/g, '')                        // strip headings
    .replace(/\n{3,}/g, '\n\n')                      // collapse blank lines
    .trim();

  if (!cleanText) {
    return res.status(400).json({ error: 'No speakable text after cleanup' });
  }

  // Voice ID — use a warm, professional female voice
  // "Rachel" is a good default; change via env var if needed
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': apiKey
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs error:', response.status, err);
      return res.status(502).json({ error: 'TTS generation failed' });
    }

    // Stream audio back
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');

    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'TTS request failed' });
  }
};
