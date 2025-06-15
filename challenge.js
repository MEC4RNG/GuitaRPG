// challenge.js

//–– 1) Guitarmanship (Mastery Level 1–5) ––
const guitarmanship = {
    1: [
      "Open Chord Fluency",
      "Proper Finger Placement",
      "Power Chord Basics",
      "Hammer-Ons & Pull-Offs",
      "Simple Slides"
    ],
    2: [
      "Fretboard Memorization",
      "Scale Box Shapes",
      "Chord Inversions",
      "Pentatonic Scale Variations",
      "Blues Scale Extensions"
    ],
    3: [
      "Diatonic Harmony (Maj/Min Keys)",
      "Modal Interchange Basics",
      "Arpeggio Sequences",
      "Approach Notes (Jazz)",
      "Melodic Minor Shapes"
    ],
    4: [
      "Hybrid Scales & Passing Chords",
      "Voice Leading",
      "Chord Substitutions",
      "Extended Chords (9th, 11th, 13th)",
      "Neoclassical Runs"
    ],
    5: [
      "Modal Interchange Advanced",
      "Counterpoint",
      "Exotic Scales (Persian, Hungarian, Byzantine)",
      "Advanced Bebop Chromaticism",
      "Polytonal Concepts"
    ]
  };
    // Mastery Level 1 → Core Technique metadata
    const guitarmanshipMeta = {
    "Open Chord Fluency": {
      description: "Switch cleanly between all common open major and minor chords (C, A, G, E, D, Am, Em, Dm) without buzz or mute.",
      example:     "Cycle through C–G–Am–F in time with a metronome at 60 BPM."
    },
    "Proper Finger Placement": {
      description: "Keep fingertips curled, fretting just behind the rail for maximum clarity and minimal buzz."
      // no example for this one
    },
    "Power Chord Basics": {
      description: "Form and move two- and three-string power chords up and down the neck.",
      example:     "Play an E5–G5–A5 riff on the low strings."
    },
    "Hammer-On & Pull-Off Foundations": {
      description: "Execute single-string hammer-ons and pull-offs cleanly at slow and medium tempos."
    },
    "Simple Slides": {
      description: "Slide into notes with control, maintaining pressure for a smooth pitch transition."
    }
    // …add more Level 1 items here if you like…
  };
  //–– 2) Picking-Hand Techniques ––
  const pickingHand = {
    1: [ "Downstrokes", "Upstrokes", "Alternate Picking", "Rest Strokes", "Free Strokes" ],
    2: [ "Fingerpicking", "Palm Muting", "Hybrid Picking", "Economy Picking", "Chicken Picking" ],
    3: [ "Tremolo Picking", "Rake Picking", "Fingerstyle Tremolo", "Pick Scrape", "Pinch Harmonics" ],
    4: [ "Sweep Picking", "Flatpicking", "Slap and Pop", "Artificial Harmonics", "Tapping (with pick)" ],
    5: [ "Gypsy Picking", "Advanced Hybrid Picking", "String Skipping", "Harp Harmonics", "Classical Fingerstyle Techniques" ]
  };
  
  //–– 3) Fretting-Hand Techniques ––
  const frettingHand = {
    1: [ "Finger Placement", "Hammer-ons", "Pull-offs", "Sliding", "Basic Chords" ],
    2: [ "Legato", "Vibrato", "Bending", "Barre Chords", "Double Stops" ],
    3: [ "Tapping (two-handed)", "Legato Runs", "Chords w/ Open Strings", "Fret-Hand Muting", "Chord Inversions" ],
    4: [ "Advanced Bends (pre-bends, release)", "Artificial Harmonics", "Microtonal Bending", "Stretching for Wide Intervals", "Chord-Melody Playing" ],
    5: [ "Finger Independence Exercises", "Counterpoint Two-Voice", "Neoclassical Fingering", "Hybrid Scales & Chords", "Classical Fingerstyle" ]
  };
  
  //–– 4) String Challenges ––
  const stringChallenge = {
    1: [ "Single String", "Single String Pentatonic", "Single String Arpeggios", "Single String Melodies", "Single String Chord Voicings" ],
    2: [ "Adjacent Strings Only", "Non-Adjacent Strings", "Double Stops", "Two Strings for Chords" ],
    3: [ "Low Strings Only", "High Strings Only", "Odd Strings Only", "Even Strings Only" ],
    4: [ "Skip Every Other String", "Skip Two Strings", "One String Rhythm + Another Lead", "Chord on One String, Melody on Another" ],
    5: [ "Hybrid Picking Non-Adjacent", "Fingerpicking on Non-Adjacent", "Changing Strings Each Bar", "Single String per Measure", "Blended Freeform" ]
  };
  
  //–– 5) Musicianship (the “Mental” Mastery 1–5) ––
  const musicianship = {
    1: [ "Basic Chord Progression (I–IV–V)", "Triad Construction", "Interval Identification", "Scale-Degree Ear Training" ],
    2: [ "Diatonic Harmony", "Secondary Dominants", "Modal Basics", "Rhythmic Subdivisions" ],
    3: [ "Chord Substitutions", "Modal Interchange", "Polyrhythms", "Metric Modulation" ],
    4: [ "Advanced Voice Leading", "Counterpoint 2-Part", "Polytonality", "Extended Modes" ],
    5: [ "Atonal & Serial Techniques", "Advanced Modulation Schemes", "Metric Modulation Mastery", "Rhythmic Displacement" ]
  };
  
  //–– 6) Scales & Modes ––
  const scales = {
    1: [ "Major (Ionian)", "Natural Minor (Aeolian)", "Pentatonic Major", "Pentatonic Minor", "Blues Scale" ],
    2: [ "Harmonic Minor", "Melodic Minor", "Dorian", "Mixolydian", "Lydian" ],
    3: [ "Phrygian", "Locrian", "Whole-Tone", "Octatonic (Half-Whole)", "Diminished (Whole-Half)" ],
    4: [ "Bebop Major", "Bebop Dominant", "Bebop Minor", "Hungarian Minor", "Persian Scale" ],
    5: [ "Enigmatic", "Byzantine", "Arabian", "In Sen", "Hirajoshi" ]
  };
  
  //–– 7) Rhythm ––
  const rhythm = {
    1: [ "Downstrokes", "Upstrokes", "Quarter Notes", "Eighth Notes", "Alternate Picking" ],
    2: [ "Syncopation", "Backbeat Emphasis", "Shuffle", "Swing Eighths", "Triplet Feel" ],
    3: [ "Odd Time (5/4, 7/8)", "Gallop Rhythm", "Ghost Notes", "Dead Notes", "Percussive Strumming" ],
    4: [ "Polyrhythms", "Cross-Rhythms", "Metric Modulation", "Chord Anticipation", "Rumba Flamenca" ],
    5: [ "Djent Groove", "Hybrid Rhythms", "Displaced Rhythms", "Tremolo Strumming", "Ska Rhythm" ]
  };
  
  //–– 8) Play Styles ––
  const playStyle = {
    1: [ "Folk", "Blues", "Pop", "Rhythm Guitar", "Lead Guitar" ],
    2: [ "Classical", "Country", "Rock", "Reggae", "Bossa Nova" ],
    3: [ "Gypsy Jazz", "Jazz Fusion", "Blues-Rock", "Percussive Fingerstyle", "Post-Rock" ],
    4: [ "Flamenco", "Flamenco Rumba", "Slide Guitar", "Ambient/Soundscapes", "Math Rock" ],
    5: [ "Metal", "Neoclassical", "Avant-Garde/Noise", "Djent", "Progressive Rock/Metal" ]
  };
  
  // 3) Attributes (same for both columns)
  const attributes = [
    "Dexterity",
    "Strength",
    "Precision",
    "Intelligence",
    "Creativity",
    "Stamina",
    "Charisma",
    "Wisdom",
    "Flexibility",
  ];
  
// Utility: pick a random element
function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
  
  window.addEventListener("DOMContentLoaded", () => {
    // map of select-IDs to data objects
    const config = {
      keySelect: ["random", ...["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"]],
      attrPhysical: attributes,
      attrMental: attributes,
      guitarmanshipSelect: [].concat(...Object.values(guitarmanship)),
      pickingSelect: [].concat(...Object.values(pickingHand)),
      frettingSelect: [].concat(...Object.values(frettingHand)),
      stringSelect: [].concat(...Object.values(stringChallenge)),
      musicianshipSelect: [].concat(...Object.values(musicianship)),
      scalesSelect: [].concat(...Object.values(scales)),
      rhythmSelect: [].concat(...Object.values(rhythm)),
      playStyleSelect: [].concat(...Object.values(playStyle)),
    };
  
    for (let [selectId, items] of Object.entries(config)) {
      const sel = document.getElementById(selectId);
      items.forEach(item => {
        const opt = document.createElement("option");
        opt.value = item;
        opt.textContent = item;
        sel.append(opt);
      });
    }
  
    document.getElementById("generateBtn").onclick = generateChallenge;
  });
  
  function getCheckedLevels(categoryKey) {
    return Array.from(
      document.querySelectorAll(`input[data-category="${categoryKey}"]:checked`)
    ).map(cb => parseInt(cb.value, 10));
  }
  
  function generateChallenge() {
    const outContainer = document.getElementById("challengeOutput");
    outContainer.innerHTML = "";
  
    // Key
    const key = document.getElementById("keySelect").value;
    outContainer.innerHTML += `<div class="challenge-block"><strong>Key:</strong> ${key}</div>`;
  
    // categories
    const cats = [
      { id: "attrPhysical",   label: "Physical Attribute"                },
      { id: "guitarmanshipSelect", label: "Guitarmanship",      data: guitarmanship, meta: guitarmanshipMeta },
      { id: "pickingSelect",      label: "Picking Hand",       data: pickingHand,     meta: pickingHandMeta    },
      { id: "frettingSelect",     label: "Fretting Hand",      data: frettingHand,    meta: frettingHandMeta   },
      { id: "stringSelect",       label: "String Challenge",   data: stringChallenge, meta: stringChallengeMeta},
      { id: "attrMental",         label: "Mental Attribute"                 },
      { id: "musicianshipSelect", label: "Musicianship",       data: musicianship,    meta: musicianshipMeta   },
      { id: "scalesSelect",       label: "Scales & Modes",     data: scales,          meta: scalesMeta         },
      { id: "rhythmSelect",       label: "Rhythm",             data: rhythm,          meta: rhythmMeta         },
      { id: "playStyleSelect",    label: "Play Style",         data: playStyle,       meta: playStyleMeta      },
    ];
  
    cats.forEach(cat => {
      const val = document.getElementById(cat.id).value;
      if (cat.data) {
        if (val === "random") {
          const levels = getCheckedLevels(cat.id.replace("Select",""));
          const pool = levels.length ? levels.flatMap(l => cat.data[l] || []) : [].concat(...Object.values(cat.data));
          const pick = pool.length ? getRandom(pool) : "— none found —";
          appendWithMeta(cat.label, pick, cat.meta);
        } else {
          appendWithMeta(cat.label, val, cat.meta);
        }
      } else {
        outContainer.innerHTML += `<div class="challenge-block"><strong>${cat.label}:</strong> ${val}</div>`;
      }
    });
  }
  
  function appendWithMeta(label, choice, metaMap) {
    if (!choice || choice === "None") return;
    const out = document.getElementById("challengeOutput");
    const meta = metaMap[choice] || {};
    const desc = meta.description ? `<div class="desc">${meta.description}</div>` : "";
    const ex   = meta.example     ? `<div class="example"><em>Example:</em> ${meta.example}</div>` : "";
    out.innerHTML += `<div class="challenge-block"><strong>${label}:</strong> ${choice}${desc}${ex}</div>`;
  }
  
