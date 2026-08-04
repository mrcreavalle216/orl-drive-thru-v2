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

  const { text, voiceStyle } = req.body || {};
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Missing text' });
  }

  // Voice style presets
  const VOICE_STYLES = {
    warm:      { stability: 0.65, similarity_boost: 0.8,  style: 0.15, use_speaker_boost: true },
    balanced:  { stability: 0.5,  similarity_boost: 0.75, style: 0.3,  use_speaker_boost: true },
    energetic: { stability: 0.35, similarity_boost: 0.7,  style: 0.55, use_speaker_boost: true }
  };
  const voiceSettings = VOICE_STYLES[voiceStyle] || VOICE_STYLES.balanced;

  // Clean text for speech — strip markdown, commands, table markup
  let cleanText = text
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

  // ── Comprehensive number-to-speech conversion ──────────────
  // ElevenLabs misreads multi-digit numbers (e.g. "37400" as "thirty-four seventy-four").
  // We convert ALL numbers to spoken English words before sending to TTS.

  const ones = ['','one','two','three','four','five','six','seven','eight','nine',
    'ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const tens = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

  function numberToWords(n) {
    if (n === 0) return 'zero';
    if (n < 0) return 'negative ' + numberToWords(-n);

    let words = '';

    if (n >= 1000000000) {
      words += numberToWords(Math.floor(n / 1000000000)) + ' billion ';
      n %= 1000000000;
    }
    if (n >= 1000000) {
      words += numberToWords(Math.floor(n / 1000000)) + ' million ';
      n %= 1000000;
    }
    if (n >= 1000) {
      words += numberToWords(Math.floor(n / 1000)) + ' thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      words += ones[Math.floor(n / 100)] + ' hundred ';
      n %= 100;
    }
    if (n >= 20) {
      words += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      words += ones[n] + ' ';
    }

    return words.trim();
  }

  // Strip commas from numbers first
  cleanText = cleanText.replace(/(\d),(\d{3})/g, '$1$2');
  cleanText = cleanText.replace(/(\d),(\d{3})/g, '$1$2'); // second pass for millions
  cleanText = cleanText.replace(/(\d),(\d{3})/g, '$1$2'); // third pass for billions

  // 1) Dollar amounts with K/M shorthand: $25K → twenty-five thousand dollars
  cleanText = cleanText.replace(/\$(\d+(?:\.\d+)?)K\b/gi, (_, num) => {
    const val = Math.round(parseFloat(num) * 1000);
    return numberToWords(val) + ' dollars';
  });
  cleanText = cleanText.replace(/\$(\d+(?:\.\d+)?)M\b/gi, (_, num) => {
    const val = Math.round(parseFloat(num) * 1000000);
    return numberToWords(val) + ' dollars';
  });

  // 2) Dollar amounts with decimals (cents): $8.50 → eight dollars and fifty cents
  cleanText = cleanText.replace(/\$(\d+)\.(\d{1,2})\b/g, (_, dollars, cents) => {
    const d = parseInt(dollars, 10);
    const c = parseInt(cents.padEnd(2, '0'), 10);
    if (c === 0) return numberToWords(d) + ' dollars';
    return numberToWords(d) + ' dollars and ' + numberToWords(c) + ' cents';
  });

  // 3) All remaining dollar amounts: $37400 → thirty-seven thousand four hundred dollars
  cleanText = cleanText.replace(/\$(\d+)/g, (_, num) => {
    const n = parseInt(num, 10);
    return numberToWords(n) + ' dollars';
  });

  // 4) Percentages: 20% → twenty percent
  cleanText = cleanText.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, num) => {
    if (num.includes('.')) {
      const [whole, dec] = num.split('.');
      return numberToWords(parseInt(whole, 10)) + ' point ' + dec.split('').map(d => ones[parseInt(d,10)] || d).join(' ') + ' percent';
    }
    return numberToWords(parseInt(num, 10)) + ' percent';
  });

  // 5) Decimal numbers: 33.9 → thirty-three point nine
  cleanText = cleanText.replace(/\b(\d+)\.(\d+)\b/g, (_, whole, dec) => {
    const w = parseInt(whole, 10);
    // Don't expand if it looks like a version or IP
    if (dec.length > 3) return _;
    return numberToWords(w) + ' point ' + dec.split('').map(d => ones[parseInt(d,10)] || d).join(' ');
  });

  // 6) Standalone numbers 1000+ (skip years 1900-2099)
  cleanText = cleanText.replace(/\b(\d{4,})\b/g, (match) => {
    const n = parseInt(match, 10);
    if (n >= 1900 && n <= 2099) return match;
    return numberToWords(n);
  });

  // 7) Two and three digit standalone numbers for consistency
  cleanText = cleanText.replace(/\b(\d{2,3})\b/g, (match) => {
    const n = parseInt(match, 10);
    // Skip if already part of a word expansion or if it's a single-use number
    if (n === 0) return match;
    return numberToWords(n);
  });

  // Expand abbreviations so TTS reads them naturally
  const abbrevs = [
    // Time & measurement
    [/\bmo\b/gi, 'month'],
    [/\bmos\b/gi, 'months'],
    [/\byr\b/gi, 'year'],
    [/\byrs\b/gi, 'years'],
    [/\bhrs?\b/gi, match => match.length > 2 ? 'hours' : 'hour'],
    [/\bmin\b/gi, 'minute'],
    [/\bmins\b/gi, 'minutes'],

    // Rate shorthand
    [/\/mo\b/gi, ' per month'],
    [/\/yr\b/gi, ' per year'],
    [/\/hr\b/gi, ' per hour'],
    [/\/day\b/gi, ' per day'],

    // Business abbreviations
    [/\bROI\b/g, 'return on investment'],
    [/\bTCO\b/g, 'total cost of ownership'],
    [/\bOTP\b/g, 'one-time purchase'],
    [/\bSLA\b/g, 'service level agreement'],
    [/\bSLAs\b/g, 'service level agreements'],
    [/\bpmt\b/gi, 'payment'],
    [/\best\.\b/gi, 'estimated'],
    [/\bincl\.\b/gi, 'including'],
    [/\bapprox\.?\b/gi, 'approximately'],
    [/\bvs\.?\b/gi, 'versus'],
    [/\binfra\b/gi, 'infrastructure'],
    [/\bmaint\b/gi, 'maintenance'],

    // ORL / lending domain
    [/\bORL\b/g, 'O.R.L.'],
    [/\bAI\b/g, 'A.I.'],
    [/\bHITL\b/g, 'human in the loop'],
    [/\bAPI\b/g, 'A.P.I.'],
    [/\bCES\b/g, 'customer experience specialist'],
    [/\bLCA\b/g, 'loan closing advisor'],
    [/\bLCAs\b/g, 'loan closing advisors'],
    [/\bLP\b/g, 'loan processing'],
    [/\bLOS\b/g, 'loan origination system'],
    [/\bTRID\b/g, 'TRID'],  // already a pronounceable acronym
    [/\bSAR\b/g, 'suspicious activity report'],
    [/\bOFAC\b/g, 'OFAC'],  // commonly spoken as a word
    [/\bSSN\b/g, 'social security number'],
    [/\bDL\b/g, 'driver\'s license'],
    [/\bVIN\b/g, 'vehicle identification number'],
    [/\bLE\/CD\b/g, 'loan estimate and closing disclosure'],

    // Month/Year shorthand
    [/\bM(\d+)\b/g, 'month $1'],
    [/\bY(\d)\b/g, 'year $1'],

    // Math operators
    [/(\d)\s*×\s*(\d)/g, '$1 times $2'],
    [/(\d)\s*x\s*(\d)/gi, '$1 times $2'],
    [/(\d)\s*÷\s*(\d)/g, '$1 divided by $2'],

    // Misc
    [/\be\.g\.\b/gi, 'for example'],
    [/\bi\.e\.\b/gi, 'that is'],
    [/\bw\/\b/gi, 'with'],
    [/\bw\/o\b/gi, 'without'],
    [/\b&\b/g, 'and'],
  ];
  for (const [pattern, replacement] of abbrevs) {
    cleanText = cleanText.replace(pattern, replacement);
  }

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
        voice_settings: voiceSettings
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
