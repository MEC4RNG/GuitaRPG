// challenge.js

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
  
  //–– 10) On load: populate every select with “Random” + all items, then wire up filtering & button
  window.addEventListener("DOMContentLoaded", () => {
    console.log("challenge.js loaded!");
    const map = {
      keySelect:           ["random", ...["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"]],
      attrPhysical:        ["random", ...attributes],
      attrMental:          ["random", ...attributes],
      guitarmanshipSelect: ["random", ...[].concat(...Object.values(guitarmanship))],
      pickingSelect:       ["random", ...[].concat(...Object.values(pickingHand))],
      frettingSelect:      ["random", ...[].concat(...Object.values(frettingHand))],
      stringSelect:        ["random", ...[].concat(...Object.values(stringChallenge))],
      musicianshipSelect:  ["random", ...[].concat(...Object.values(musicianship))],
      scalesSelect:        ["random", ...[].concat(...Object.values(scales))],
      rhythmSelect:        ["random", ...[].concat(...Object.values(rhythm))],
      playStyleSelect:     ["random", ...[].concat(...Object.values(playStyle))]
    };
  
    // fill each select
    for (let [id, items] of Object.entries(map)) {
      const sel = document.getElementById(id);
      sel.innerHTML = "";
      items.forEach(v => sel.append(new Option(v, v)));
    }
  
    // helper to live-filter by mastery level checkboxes
    function bindFilter(cat) {
      const dataObj = { guitarmanship, pickingHand, frettingHand,
                        stringChallenge, musicianship, scales,
                        rhythm, playStyle }[cat];
      const selectId = cat + "Select";
      document.querySelectorAll(`input[data-category="${cat}"]`)
        .forEach(cb => cb.addEventListener("change", () =>
          populateByLevels(selectId, dataObj, cat)
        ));
      // initial
      populateByLevels(selectId, dataObj, cat);
    }
  
    function populateByLevels(selectId, dataObj, cat) {
      const sel    = document.getElementById(selectId);
      const levels = Array.from(
        document.querySelectorAll(`input[data-category="${cat}"]:checked`)
      ).map(cb => +cb.value);
      sel.innerHTML = "";
      sel.append(new Option("Random", "random"));
      const pool = levels.length
        ? levels.flatMap(l => dataObj[l]||[])
        : [].concat(...Object.values(dataObj));
      pool.forEach(v => sel.append(new Option(v, v)));
    }
  
    ["guitarmanship","pickingHand","frettingHand","stringChallenge",
     "musicianship","scales","rhythm","playStyle"]
      .forEach(cat => bindFilter(cat));
  
    // wire your button
    document.getElementById("generateBtn").onclick = () => {
        console.log("Generate Challenge button clicked");
        const out = document.getElementById("challengeOutput");
        generateChallenge(out);
      };
    });
  
  //–– 11) Actual generation + metadata append
  function generateChallenge(container){
    container.innerHTML = "";  
    // Key
    const key = document.getElementById("keySelect").value;
    container.innerHTML += `<div class="challenge-block"><strong>Key:</strong> ${key}</div>`;
  
    // all categories in order
    const cats = [
      { id:"attrPhysical",        label:"Physical Attribute" },
      { id:"guitarmanshipSelect", label:"Guitarmanship",     data:guitarmanship,     meta:guitarmanshipMeta    },
      { id:"pickingSelect",       label:"Picking Hand",      data:pickingHand,       meta:pickingHandMeta      },
      { id:"frettingSelect",      label:"Fretting Hand",     data:frettingHand,      meta:frettingHandMeta     },
      { id:"stringSelect",        label:"String Challenge",  data:stringChallenge,   meta:stringChallengeMeta  },
      { id:"attrMental",          label:"Mental Attribute" },
      { id:"musicianshipSelect",  label:"Musicianship",      data:musicianship,      meta:musicianshipMeta     },
      { id:"scalesSelect",        label:"Scales & Modes",    data:scales,            meta:scalesMeta           },
      { id:"rhythmSelect",        label:"Rhythm",            data:rhythm,            meta:rhythmMeta           },
      { id:"playStyleSelect",     label:"Play Style",        data:playStyle,         meta:playStyleMeta        }
    ];
  
    cats.forEach(cat => {
      const val = document.getElementById(cat.id).value;
      if (!cat.data) {
        // a simple attribute dropdown
        container.innerHTML += `<div class="challenge-block"><strong>${cat.label}:</strong> ${val}</div>`;
      } else {
        // a challenge category
        const choice = (val==="random")
          ? (()=>{
              const levels = Array.from(
                document.querySelectorAll(`input[data-category="${cat.id.replace("Select","")}"]:checked`)
              ).map(cb=>+cb.value);
              const pool = levels.length
                ? levels.flatMap(l=>cat.data[l]||[])
                : [].concat(...Object.values(cat.data));
              return pool.length? getRandom(pool): "— none found —";
            })()
          : val;
        appendMeta(container, cat.label, choice, cat.meta);
      }
    });
  }
  
  function appendMeta(container, label, choice, metaMap){
    if (!choice||choice==="random") return;
    const meta = (metaMap&&metaMap[choice])||{};
    const d = meta.description? `<div class="desc">${meta.description}</div>` : "";
    const e = meta.example?     `<div class="example"><em>Example:</em> ${meta.example}</div>`: "";
    container.innerHTML += `<div class="challenge-block"><strong>${label}:</strong> ${choice}${d}${e}</div>`;
  }
  
