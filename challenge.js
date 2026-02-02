// challenge.js

console.log("🎸 challenge.js loaded");

// -----------------------------
// Core data
// -----------------------------

// Keys (labels you want to SEE in the output)
const keys = [
  "A", "A# / Bb", "B", "C", "C# / Db", "D", "D# / Eb",
  "E", "F", "F# / Gb", "G", "G# / Ab"
];

// Attributes (single word)
const physicalAttributeList = [
  "Dexterity", "Strength", "Precision", "Coordination", "Rhythm", "Flexibility"
];

const mentalAttributeList = [
  "Theory", "Emotion", "Creativity", "Aural", "Focus", "Adaptability"
];

// Skills (Mastery Level 1–5)
const guitarmanship = {
  1: ["Open Chord Fluency", "Proper Finger Placement", "Power Chord Basics", "Hammer-Ons & Pull-Offs", "Simple Slides"],
  2: ["Fretboard Memorization", "Scale Box Shapes", "Chord Inversions", "Pentatonic Scale Variations", "Blues Scale Extensions"],
  3: ["Diatonic Harmony (Maj/Min Keys)", "Modal Interchange Basics", "Arpeggio Sequences", "Approach Notes (Jazz)", "Melodic Minor Shapes"],
  4: ["Hybrid Scales & Passing Chords", "Voice Leading", "Chord Substitutions", "Extended Chords (9th, 11th, 13th)", "Neoclassical Runs"],
  5: ["Modal Interchange Advanced", "Counterpoint", "Exotic Scales (Persian, Hungarian, Byzantine)", "Advanced Bebop Chromaticism", "Polytonal Concepts"]
};

const pickingHand = {
  1: ["Downstrokes", "Upstrokes", "Alternate Picking", "Rest Strokes", "Free Strokes"],
  2: ["Fingerpicking", "Palm Muting", "Hybrid Picking", "Economy Picking", "Chicken Picking"],
  3: ["Tremolo Picking", "Rake Picking", "Fingerstyle Tremolo", "Pick Scrape", "Pinch Harmonics"],
  4: ["Sweep Picking", "Flatpicking", "Slap and Pop", "Artificial Harmonics", "Tapping (with pick)"],
  5: ["Gypsy Picking", "Advanced Hybrid Picking", "String Skipping", "Harp Harmonics", "Classical Fingerstyle Techniques"]
};

const frettingHand = {
  1: ["Finger Placement", "Hammer-ons", "Pull-offs", "Sliding", "Basic Chords"],
  2: ["Legato", "Vibrato", "Bending", "Barre Chords", "Double Stops"],
  3: ["Tapping (two-handed)", "Legato Runs", "Chords w/ Open Strings", "Fret-Hand Muting", "Chord Inversions"],
  4: ["Advanced Bends (pre-bends, release)", "Artificial Harmonics", "Microtonal Bending", "Stretching for Wide Intervals", "Chord-Melody Playing"],
  5: ["Finger Independence Exercises", "Counterpoint Two-Voice", "Neoclassical Fingering", "Hybrid Scales & Chords", "Classical Fingerstyle"]
};

const stringChallenge = {
  1: ["Single String", "Single String Pentatonic", "Single String Arpeggios", "Single String Melodies", "Single String Chord Voicings"],
  2: ["Adjacent Strings Only", "Non-Adjacent Strings", "Double Stops", "Two Strings for Chords"],
  3: ["Low Strings Only", "High Strings Only", "Odd Strings Only", "Even Strings Only"],
  4: ["Skip Every Other String", "Skip Two Strings", "One String Rhythm + Another Lead", "Chord on One String, Melody on Another"],
  5: ["Hybrid Picking Non-Adjacent", "Fingerpicking on Non-Adjacent", "Changing Strings Each Bar", "Single String per Measure", "Blended Freeform"]
};

const musicianship = {
  1: ["Basic Chord Progression (I–IV–V)", "Triad Construction", "Interval Identification", "Scale-Degree Ear Training"],
  2: ["Diatonic Harmony", "Secondary Dominants", "Modal Basics", "Rhythmic Subdivisions"],
  3: ["Chord Substitutions", "Modal Interchange", "Polyrhythms", "Metric Modulation"],
  4: ["Advanced Voice Leading", "Counterpoint 2-Part", "Polytonality", "Extended Modes"],
  5: ["Atonal & Serial Techniques", "Advanced Modulation Schemes", "Metric Modulation Mastery", "Rhythmic Displacement"]
};

const scales = {
  1: ["Major (Ionian)", "Natural Minor (Aeolian)", "Pentatonic Major", "Pentatonic Minor", "Blues Scale"],
  2: ["Harmonic Minor", "Melodic Minor", "Dorian", "Mixolydian", "Lydian"],
  3: ["Phrygian", "Locrian", "Whole-Tone", "Octatonic (Half-Whole)", "Diminished (Whole-Half)"],
  4: ["Bebop Major", "Bebop Dominant", "Bebop Minor", "Hungarian Minor", "Persian Scale"],
  5: ["Enigmatic", "Byzantine", "Arabian", "In Sen", "Hirajoshi"]
};

const rhythm = {
  1: ["Quarter Notes", "Eighth Notes", "Downstrokes", "Upstrokes", "Alternate Picking"],
  2: ["Syncopation", "Backbeat Emphasis", "Shuffle", "Swing Eighths", "Triplet Feel"],
  3: ["Odd Time (5/4, 7/8)", "Gallop Rhythm", "Ghost Notes", "Dead Notes", "Percussive Strumming"],
  4: ["Polyrhythms", "Cross-Rhythms", "Metric Modulation", "Chord Anticipation", "Rumba Flamenca"],
  5: ["Djent Groove", "Hybrid Rhythms", "Displaced Rhythms", "Tremolo Strumming", "Ska Rhythm"]
};

const playStyle = {
  1: ["Folk", "Blues", "Pop", "Rhythm Guitar", "Lead Guitar"],
  2: ["Classical", "Country", "Rock", "Reggae", "Bossa Nova"],
  3: ["Gypsy Jazz", "Jazz Fusion", "Blues-Rock", "Percussive Fingerstyle", "Post-Rock"],
  4: ["Flamenco", "Flamenco Rumba", "Slide Guitar", "Ambient/Soundscapes", "Math Rock"],
  5: ["Metal", "Neoclassical", "Avant-Garde/Noise", "Djent", "Progressive Rock/Metal"]
};

// -----------------------------
// Helpers
// -----------------------------

function isRandomValue(v) {
  return String(v ?? "").trim().toLowerCase() === "random";
}

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function setSelectOptions(selectId, options) {
  const sel = document.getElementById(selectId);
  if (!sel) {
    console.warn(`setSelectOptions: missing select #${selectId}`);
    return;
  }

  sel.innerHTML = "";

  // Always include Random first
  const optRandom = document.createElement("option");
  optRandom.value = "Random";
  optRandom.textContent = "Random";
  sel.appendChild(optRandom);

  // Then actual options
  options.forEach(val => {
    const opt = document.createElement("option");
    opt.value = val;
    opt.textContent = val;
    sel.appendChild(opt);
  });
}

// Build pool based on checked mastery levels for a category (or all if none checked)
function poolFromLevels(selectId, dataObj) {
  const catKey = selectId.replace("Select", ""); // e.g. guitarmanshipSelect -> guitarmanship
  const checked = Array.from(document.querySelectorAll(`input[data-category="${catKey}"]:checked`))
    .map(cb => parseInt(cb.value, 10))
    .filter(n => Number.isFinite(n));

  if (checked.length) {
    return checked.flatMap(lvl => dataObj[lvl] || []);
  }
  return [].concat(...Object.values(dataObj));
}

function populateByLevels(selectId, dataObj) {
  const pool = poolFromLevels(selectId, dataObj);
  setSelectOptions(selectId, pool);
}

function bindFilter(selectId, dataObj) {
  const catKey = selectId.replace("Select", "");

  // When checkboxes change, rebuild select
  const boxes = Array.from(document.querySelectorAll(`input[data-category="${catKey}"]`));
  boxes.forEach(cb => cb.addEventListener("change", () => populateByLevels(selectId, dataObj)));

  // Initial fill
  populateByLevels(selectId, dataObj);
}

// Picks from the current dropdown UI.
// If Random selected, randomly picks one of the existing non-random options.
function pickFromSelect(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) throw new Error(`Missing select: ${selectId}`);

  const current = sel.value;

  if (!isRandomValue(current)) return current;

  const choices = Array.from(sel.options)
    .map(o => o.value)
    .filter(v => !isRandomValue(v));

  return choices.length ? getRandom(choices) : "— none found —";
}

// -----------------------------
// Generate Challenge (text only)
// -----------------------------
function generateChallenge(container) {
  container.innerHTML = "";

  const lines = [];

  // Key
  lines.push(["Key", pickFromSelect("keySelect")]);

  // Attributes
  lines.push(["Physical Attribute", pickFromSelect("attrPhysical")]);
  lines.push(["Mental Attribute", pickFromSelect("attrMental")]);

  // Skills
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
    lines.push([label, pickFromSelect(selectId)]);
  });

  // Render compact
  container.innerHTML = lines
    .filter(([, v]) => v && v !== "— none found —")
    .map(([k, v]) => `<div class="challenge-block"><strong>${k}:</strong> ${v}</div>`)
    .join("");
}

// -----------------------------
// Init / wiring
// -----------------------------
window.addEventListener("DOMContentLoaded", () => {
  console.log("✅ DOM ready");

  // Populate Key + Attributes from JS (NOT HTML lists)
  setSelectOptions("keySelect", keys);
  setSelectOptions("attrPhysical", physicalAttributeList);
  setSelectOptions("attrMental", mentalAttributeList);

  // Bind filtering for mastery-based dropdowns
  bindFilter("guitarmanshipSelect", guitarmanship);
  bindFilter("pickingSelect", pickingHand);
  bindFilter("frettingSelect", frettingHand);
  bindFilter("stringSelect", stringChallenge);
  bindFilter("musicianshipSelect", musicianship);
  bindFilter("scalesSelect", scales);
  bindFilter("rhythmSelect", rhythm);
  bindFilter("playStyleSelect", playStyle);

  // Wire button
  const btn = document.getElementById("generateBtn");
  const out = document.getElementById("challengeOutput");

  if (!btn) console.error("generateBtn not found");
  if (!out) console.error("challengeOutput not found");

  if (btn && out) {
    btn.onclick = () => {
      console.log("🔀 Generate Challenge clicked");
      generateChallenge(out);
    };
  }
});        


// Attribute meta (use your existing objects from the top of the file)
// If your file already has physicalAttributes / mentalAttributes objects,
// these convert them into meta maps expected by appendWithMeta.
//const attrPhysicalMeta = Object.fromEntries(
  //Object.entries(physicalAttributes || {}).map(([k, v]) => [k, { description: v.description }])
//);
//const attrMentalMeta = Object.fromEntries(
  //Object.entries(mentalAttributes || {}).map(([k, v]) => [k, { description: v.description }])
//);



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










