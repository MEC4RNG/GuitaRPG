// challenge.js

// Key definitions: internal value → display label
const KEY_MAP = {
  "A":  "A",
  "A#": "A#/Bb",
  "B":  "B",
  "C":  "C",
  "C#": "C#/Db",
  "D":  "D",
  "D#": "D#/Eb",
  "E":  "E",
  "F":  "F",
  "F#": "F#/Gb",
  "G":  "G",
  "G#": "G#/Ab"
};

// Used ONLY for random selection
const KEY_POOL = Object.keys(KEY_MAP);

  
  const physicalAttributes = {
    "Dexterity": {
      description:
        "Alternate fingering patterns (e.g. C–Am–F–G with different voicings); " +
        "String-skipping exercises; Chromatic fingertip drills (1–2–3–4 on each string)"
    },
    "Strength": {
      description:
        "Barre-chord conditioning (long holds, shifting shapes); " +
        "Sustained bends and vibrato (hold for counts); " +
        "Long-form practice pieces (15+ minute runs without break)"
    },
    "Precision": {
      description:
        "Targeted fret-hand muting (ghost-note drills); " +
        "Pinpoint picking on single strings; " +
        "Slow-tempo metronome practice with increasing subdivisions"
    },
    "Coordination": {
      description:
        "Hybrid-picking vs. strict flat-picking switches; " +
        "Finger-style vs. pick toggles; " +
        "Two-hand tapping patterns"
    },
    "Rhythm": {
      description:
        "Dynamic palm-mute vs. open strum transitions; " +
        "Polyrhythm drills (3:2, 5:4 against a click); " +
        "Accent-shift practice"
    },
    "Flexibility": {
      description:
        "Rapid position shifts (e.g., shift across 5 frets in one move); " +
        "Alternate tunings workout; " +
        "Quick style-switch (folk ↔ funk ↔ metal) within a single jam"
    }
  };
  
  const mentalAttributes = {
    "Theory": {
      description:
        "Chord–scale relationships (e.g. ii–V–I in every key); " +
        "Interval recognition on the neck; " +
        "Modal application (e.g. Dorian over minor vamp)"
    },
    "Emotion": {
      description:
        "Crafting tension/release via chord progressions; " +
        "Dynamics shading (pp → ff in a solo); " +
        "Melodic contour writing"
    },
    "Creativity": {
      description:
        "Riff-writing prompts (use only one string, or only three notes); " +
        "Thematic development; Call-and-response solos"
    },
    "Aural": {
      description:
        "Singing intervals before playing them; " +
        "Transcribing short licks by ear; " +
        "Harmonic dictation"
    },
    "Focus": {
      description:
        "Structured practice sessions (warm-up → technique → repertoire); " +
        "Goal-setting; Mental rehearsal away from the guitar"
    },
    "Adaptability": {
      description:
        "Reacting to backing-track changes in real time; " +
        "Genre-jump improvisation; " +
        "Spontaneous motif development"
    }
  };

  //–– 1) Guitarmanship (Mastery Level 1–5) ––
  const guitarmanship = {
    1: [ "Open Chord Fluency", "Proper Finger Placement", "Power Chord Basics", "Hammer-Ons & Pull-Offs", "Simple Slides" ],
    2: [ "Fretboard Memorization", "Scale Box Shapes", "Chord Inversions", "Pentatonic Scale Variations", "Blues Scale Extensions" ],
    3: [ "Diatonic Harmony (Maj/Min Keys)", "Modal Interchange Basics", "Arpeggio Sequences", "Approach Notes (Jazz)", "Melodic Minor Shapes" ],
    4: [ "Hybrid Scales & Passing Chords", "Voice Leading", "Chord Substitutions", "Extended Chords (9th, 11th, 13th)", "Neoclassical Runs" ],
    5: [ "Modal Interchange Advanced", "Counterpoint", "Exotic Scales (Persian, Hungarian, Byzantine)", "Advanced Bebop Chromaticism", "Polytonal Concepts" ]
  };
  
  //–– Core Technique metadata for Level 1 only (expand as you go) ––
  const guitarmanshipMeta = {
    "Open Chord Fluency": {
      description: "Switch cleanly between all common open major and minor chords (C, A, G, E, D, Am, Em, Dm) without buzz or mute.",
      example:     "Cycle through C–G–Am–F in time with a metronome at 60 BPM."
    },
    "Proper Finger Placement": {
      description: "Keep fingertips curled, fretting just behind the rail for maximum clarity and minimal buzz."
    },
    "Power Chord Basics": {
      description: "Form and move two- and three-string power chords up and down the neck.",
      example:     "Play an E5–G5–A5 riff on the low strings."
    },
    "Hammer-Ons & Pull-Offs": {
      description: "Execute single-string hammer-ons and pull-offs cleanly at slow and medium tempos."
    },
    "Simple Slides": {
      description: "Slide into notes with control, maintaining pressure for a smooth pitch transition."
    }
  };
  
  //–– 2) Picking-Hand Techniques ––
  const pickingHand = {
    1: [ "Downstrokes", "Upstrokes", "Alternate Picking", "Rest Strokes", "Free Strokes" ],
    2: [ "Fingerpicking", "Palm Muting", "Hybrid Picking", "Economy Picking", "Chicken Picking" ],
    3: [ "Tremolo Picking", "Rake Picking", "Fingerstyle Tremolo", "Pick Scrape", "Pinch Harmonics" ],
    4: [ "Sweep Picking", "Flatpicking", "Slap and Pop", "Artificial Harmonics", "Tapping (with pick)" ],
    5: [ "Gypsy Picking", "Advanced Hybrid Picking", "String Skipping", "Harp Harmonics", "Classical Fingerstyle Techniques" ]
  };
  // (and its meta…)
  const pickingHandMeta = { /* …fill in like above… */ };

  //–– 3) Fretting-Hand Techniques ––
  const frettingHand = {
    1: [ "Finger Placement", "Hammer-ons", "Pull-offs", "Sliding", "Basic Chords" ],
    2: [ "Legato", "Vibrato", "Bending", "Barre Chords", "Double Stops" ],
    3: [ "Tapping (two-handed)", "Legato Runs", "Chords w/ Open Strings", "Fret-Hand Muting", "Chord Inversions" ],
    4: [ "Advanced Bends (pre-bends, release)", "Artificial Harmonics", "Microtonal Bending", "Stretching for Wide Intervals", "Chord-Melody Playing" ],
    5: [ "Finger Independence Exercises", "Counterpoint Two-Voice", "Neoclassical Fingering", "Hybrid Scales & Chords", "Classical Fingerstyle" ]
  };
  const frettingHandMeta = { /* … */ };
  
  //–– 4) String Challenges ––
  const stringChallenge = {
    1: [ "Single String", "Single String Pentatonic", "Single String Arpeggios", "Single String Melodies", "Single String Chord Voicings" ],
    2: [ "Adjacent Strings Only", "Non-Adjacent Strings", "Double Stops", "Two Strings for Chords" ],
    3: [ "Low Strings Only", "High Strings Only", "Odd Strings Only", "Even Strings Only" ],
    4: [ "Skip Every Other String", "Skip Two Strings", "One String Rhythm + Another Lead", "Chord on One String, Melody on Another" ],
    5: [ "Hybrid Picking Non-Adjacent", "Fingerpicking on Non-Adjacent", "Changing Strings Each Bar", "Single String per Measure", "Blended Freeform" ]
  };
  const stringChallengeMeta = { /* … */ };
  
  //–– 5) Musicianship (Mental Mastery) ––
  const musicianship = {
    1: [ "Basic Chord Progression (I–IV–V)", "Triad Construction", "Interval Identification", "Scale-Degree Ear Training" ],
    2: [ "Diatonic Harmony", "Secondary Dominants", "Modal Basics", "Rhythmic Subdivisions" ],
    3: [ "Chord Substitutions", "Modal Interchange", "Polyrhythms", "Metric Modulation" ],
    4: [ "Advanced Voice Leading", "Counterpoint 2-Part", "Polytonality", "Extended Modes" ],
    5: [ "Atonal & Serial Techniques", "Advanced Modulation Schemes", "Metric Modulation Mastery", "Rhythmic Displacement" ]
  };
  const musicianshipMeta = { /* … */ };
  
  //–– 6) Scales & Modes ––
  const scales = {
    1: [ "Major (Ionian)", "Natural Minor (Aeolian)", "Pentatonic Major", "Pentatonic Minor", "Blues Scale" ],
    2: [ "Harmonic Minor", "Melodic Minor", "Dorian", "Mixolydian", "Lydian" ],
    3: [ "Phrygian", "Locrian", "Whole-Tone", "Octatonic (Half-Whole)", "Diminished (Whole-Half)" ],
    4: [ "Bebop Major", "Bebop Dominant", "Bebop Minor", "Hungarian Minor", "Persian Scale" ],
    5: [ "Enigmatic", "Byzantine", "Arabian", "In Sen", "Hirajoshi" ]
  };
  const scalesMeta = { /* … */ };
  
  //–– 7) Rhythm ––
  const rhythm = {
    1: [ "Downstrokes", "Upstrokes", "Quarter Notes", "Eighth Notes", "Alternate Picking" ],
    2: [ "Syncopation", "Backbeat Emphasis", "Shuffle", "Swing Eighths", "Triplet Feel" ],
    3: [ "Odd Time (5/4, 7/8)", "Gallop Rhythm", "Ghost Notes", "Dead Notes", "Percussive Strumming" ],
    4: [ "Polyrhythms", "Cross-Rhythms", "Metric Modulation", "Chord Anticipation", "Rumba Flamenca" ],
    5: [ "Djent Groove", "Hybrid Rhythms", "Displaced Rhythms", "Tremolo Strumming", "Ska Rhythm" ]
  };
  const rhythmMeta = { /* … */ };
  
  //–– 8) Play Styles ––
  const playStyle = {
    1: [ "Folk", "Blues", "Pop", "Rhythm Guitar", "Lead Guitar" ],
    2: [ "Classical", "Country", "Rock", "Reggae", "Bossa Nova" ],
    3: [ "Gypsy Jazz", "Jazz Fusion", "Blues-Rock", "Percussive Fingerstyle", "Post-Rock" ],
    4: [ "Flamenco", "Flamenco Rumba", "Slide Guitar", "Ambient/Soundscapes", "Math Rock" ],
    5: [ "Metal", "Neoclassical", "Avant-Garde/Noise", "Djent", "Progressive Rock/Metal" ]
  };
  const playStyleMeta = { /* … */ };
  
  //–– 9) Attributes –– (same for both columns)
  const attributes = [
    "Dexterity","Strength","Precision","Intelligence",
    "Creativity","Stamina","Charisma","Wisdom","Flexibility"
  ];
  
  // Utility
  function getRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  function populateSimple(id, items) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = "";
    items.forEach(val => {
      const opt = document.createElement("option");
      opt.value = val.toLowerCase() === "random" ? "random" : val;
      opt.textContent = val;
      sel.append(opt);
    });
  }

  // Random/random helper
  function isRandomValue(v) {
  return String(v ?? "").trim().toLowerCase() === "random";
  }

  function getRandomFromList(list) {
  const pool = list.filter(x => !isRandomValue(x));
  return pool[Math.floor(Math.random() * pool.length)];
  }

  
  //–– 10) On load: populate every select with “Random” + all items, then wire up filtering & button
  // -----------------------------
// DOM + wiring
// -----------------------------

// Treat "Random" and "random" the same
function isRandomValue(v) {
  return String(v ?? "").trim().toLowerCase() === "random";
}

// --- Keys (value vs label) ---
const KEY_OPTIONS = [
  { value: "A",  label: "A" },
  { value: "A#/Bb", label: "A# / Bb" },
  { value: "B",  label: "B" },
  { value: "C",  label: "C" },
  { value: "C#/Db", label: "C# / Db" },
  { value: "D",  label: "D" },
  { value: "D#/Eb", label: "D# / Eb" },
  { value: "E",  label: "E" },
  { value: "F",  label: "F" },
  { value: "F#/Gb", label: "F# / Gb" },
  { value: "G",  label: "G" },
  { value: "G#/Ab", label: "G# / Ab" },
];

// Pool used ONLY for random selection (excludes Random)
const KEY_POOL = KEY_OPTIONS
  .map(k => k.value)
  .filter(v => String(v).toLowerCase() !== "random");

function isRandomValue(v) {
  return String(v ?? "").trim().toLowerCase() === "random";
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function populateKeySelect() {
  const sel = document.getElementById("keySelect");
  if (!sel) {
    console.error("keySelect not found in HTML");
    return;
  }

  sel.innerHTML = ""; // clear then repopulate

  KEY_OPTIONS.forEach(k => {
    const opt = document.createElement("option");
    opt.textContent = k.label; // label can be "A# / Bb"
    sel.appendChild(opt);
  });
}


// Attribute meta (use your existing objects from the top of the file)
// If your file already has physicalAttributes / mentalAttributes objects,
// these convert them into meta maps expected by appendWithMeta.
const attrPhysicalMeta = Object.fromEntries(
  Object.entries(physicalAttributes || {}).map(([k, v]) => [k, { description: v.description }])
);
const attrMentalMeta = Object.fromEntries(
  Object.entries(mentalAttributes || {}).map(([k, v]) => [k, { description: v.description }])
);

window.addEventListener("DOMContentLoaded", () => {
  console.log("🎸 challenge.js loaded");

  // 1) Populate Key + Attribute dropdowns from JS
  populateKeySelect();
  populateAttributeSelect("attrPhysical", physicalAttributes);
  populateAttributeSelect("attrMental", mentalAttributes);

  // 2) Populate + bind mastery filtering for skill dropdowns
  bindFilter("guitarmanshipSelect", guitarmanship);
  bindFilter("pickingSelect", pickingHand);
  bindFilter("frettingSelect", frettingHand);
  bindFilter("stringSelect", stringChallenge);
  bindFilter("musicianshipSelect", musicianship);
  bindFilter("scalesSelect", scales);
  bindFilter("rhythmSelect", rhythm);
  bindFilter("playStyleSelect", playStyle);

  // 3) Wire button
  const btn = document.getElementById("generateBtn");
  if (!btn) {
    console.error("generateBtn not found");
    return;
  }

  btn.onclick = () => {
    console.log("🔀 Generate Challenge button clicked");
    const out = document.getElementById("challengeOutput");
    if (!out) {
      console.error("challengeOutput not found");
      return;
    }
    generateChallenge(out);
  };
});

// -----------------------------
// Random helpers
// -----------------------------
function isRandomValue(v) {
  return String(v ?? "").trim().toLowerCase() === "random";
}

// -----------------------------
// Key + Attribute population
// -----------------------------

// If you want the output to read "A# / Bb", set label/value to that exact string.
// (This also prevents the "A#" vs "A# / Bb" mismatch you noticed.)
const KEY_OPTIONS = [
  "Random",
  "A",
  "A# / Bb",
  "B",
  "C",
  "C# / Db",
  "D",
  "D# / Eb",
  "E",
  "F",
  "F# / Gb",
  "G",
  "G# / Ab",
];

function populateKeySelect() {
  const sel = document.getElementById("keySelect");
  if (!sel) {
    console.warn("populateKeySelect: keySelect not found");
    return;
  }
  sel.innerHTML = "";
  KEY_OPTIONS.forEach(label => {
    const opt = document.createElement("option");
    opt.value = label;       // value matches label so output matches what user sees
    opt.textContent = label;
    sel.appendChild(opt);
  });
}

function populateAttributeSelect(selectId, metaObj) {
  const sel = document.getElementById(selectId);
  if (!sel) {
    console.warn(`populateAttributeSelect: select not found: ${selectId}`);
    return;
  }

  sel.innerHTML = "";

  // Always include Random first
  const optRandom = document.createElement("option");
  optRandom.value = "Random";
  optRandom.textContent = "Random";
  sel.appendChild(optRandom);

  // Then the attribute keys (Dexterity, Theory, etc.)
  Object.keys(metaObj || {}).forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = k;
    sel.appendChild(opt);
  });
}

// -----------------------------
// Filtering population helpers
// -----------------------------
function populateByLevels(selectId, dataObj) {
  const sel = document.getElementById(selectId);
  if (!sel) {
    console.warn(`populateByLevels: select not found: ${selectId}`);
    return;
  }

  sel.innerHTML = "";

  // Always include Random first
  const optRandom = document.createElement("option");
  optRandom.value = "Random";
  optRandom.textContent = "Random";
  sel.appendChild(optRandom);

  // Determine checkbox group name from selectId (guitarmanshipSelect -> guitarmanship)
  const catKey = selectId.replace("Select", "");

  // Which mastery levels are checked?
  const checkedLevels = Array.from(
    document.querySelectorAll(`input[data-category="${catKey}"]:checked`)
  )
    .map(cb => parseInt(cb.value, 10))
    .filter(n => Number.isFinite(n));

  // Build pool based on checked levels (or all levels if none checked)
  const pool = checkedLevels.length
    ? checkedLevels.flatMap(lvl => dataObj[lvl] || [])
    : [].concat(...Object.values(dataObj));

  // Fill dropdown
  pool.forEach(val => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    sel.appendChild(opt);
  });
}

function bindFilter(selectId, dataObj) {
  const catKey = selectId.replace("Select", "");

  // When checkboxes change, rebuild options
  Array.from(document.querySelectorAll(`input[data-category="${catKey}"]`))
    .forEach(cb => cb.addEventListener("change", () => populateByLevels(selectId, dataObj)));

  // Initial fill
  populateByLevels(selectId, dataObj);
}

function pickFromSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) throw new Error(`Missing select: ${selectId}`);

  const current = sel.value;

  // If user chose a real value, return it
  if (!isRandomValue(current)) return current;

  // Otherwise pick randomly from existing options (excluding Random)
  const choices = Array.from(sel.options)
    .map(o => o.value)
    .filter(v => !isRandomValue(v));

  return choices.length
    ? choices[Math.floor(Math.random() * choices.length)]
    : "— none found —";
}

// -----------------------------
// Generate Challenge (text only)
// -----------------------------
function generateChallenge(container) {
  container.innerHTML = "";

  // Helper to render one line (skips empty/Random/none)
  function appendLine(label, value) {
    if (!value || isRandomValue(value) || value === "— none found —") return;

    container.innerHTML += `
      <div class="challenge-block">
        <strong>${label}:</strong> ${value}
      </div>
    `;
  }

  // Key
  const keyPick = pickFromSelect("keySelect");
  appendLine("Key", keyPick);

  // Physical + Mental Attributes
  const physAttr = pickFromSelect("attrPhysical");
  const mentAttr = pickFromSelect("attrMental");
  appendLine("Physical Attribute", physAttr);
  appendLine("Mental Attribute", mentAttr);

  // Skills (pulls from the CURRENT dropdown options, so mastery filters are honored)
  const skills = [
    ["Guitarmanship", "guitarmanshipSelect"],
    ["Picking Hand", "pickingSelect"],
    ["Fretting Hand", "frettingSelect"],
    ["String Challenge", "stringSelect"],
    ["Musicianship", "musicianshipSelect"],
    ["Scales & Modes", "scalesSelect"],
    ["Rhythm", "rhythmSelect"],
    ["Play Style", "playStyleSelect"],
  ];

  skills.forEach(([label, selectId]) => {
    const pick = pickFromSelect(selectId);
    appendLine(label, pick);
  });
}



// -----------------------------
// Rendering
// -----------------------------
function appendLine(container, label, value) {
  if (!value || isRandomValue(value) || value === "— none found —") return;

  container.innerHTML += `
    <div class="challenge-block">
      <strong>${label}:</strong> ${value}
    </div>
  `;
}

//function appendWithMeta(container, label, choice, metaMap) {
  //if (!choice || isRandomValue(choice) || choice === "— none found —") return;

  //const meta = (metaMap && metaMap[choice]) || {};
  //const desc = meta.description ? `<div class="desc">${meta.description}</div>` : "";
  //const ex   = meta.example ? `<div class="example"><em>Example:</em> ${meta.example}</div>` : "";

  //container.innerHTML += `
    //<div class="challenge-block">
      //<strong>${label}:</strong> ${choice}
      //${desc}
      //${ex}
    //</div>
  //`;
//}







