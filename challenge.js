// challenge.js

// 1) Guitarmanship challenges by mastery level
const guitarmanship = {
    1: [ "Fretboard Memorization", "CAGED System", "Interval Studies" ],
    2: [ /* level-2 items */ ],
    3: [ /* … */ ],
    4: [ /* … */ ],
    5: [ /* … */ ],
  };
  
  // 2) Picking Hand, Fretting Hand, String Challenge, etc.
  const pickingHand = {
    1: [ "Downstrokes", "Upstrokes", "Alternate Picking" ],
    2: [ /* … */ ],
    // …
  };
  // Repeat for frettingHand, stringChallenge, musicianship, scales, rhythm, playStyle
  
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
  
  // 4) Utility: pick a random element
  function getRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  window.addEventListener("DOMContentLoaded", () => {
    // map of select-IDs to data objects
    const config = {
      keySelect: [ "random", ...["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"] ],
      attrPhysical: attributes,
      attrMental:  attributes,
      guitarmanshipSelect: [].concat(...Object.values(guitarmanship)),
      pickingSelect:      [].concat(...Object.values(pickingHand)),
      frettingSelect:     [].concat(...Object.values(frettingHand)),
      stringSelect:       [].concat(...Object.values(stringChallenge)),
      musicianshipSelect: [].concat(...Object.values(musicianship)),
      scalesSelect:       [].concat(...Object.values(scales)),
      rhythmSelect:       [].concat(...Object.values(rhythm)),
      playStyleSelect:    [].concat(...Object.values(playStyle)),
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
    // e.g. categoryKey = "guitarmanship"
    return Array.from(
      document.querySelectorAll(`input[data-category="${categoryKey}"]:checked`)
    ).map(cb => parseInt(cb.value, 10));
  }
    
  function generateChallenge() {
    const out = [];
    // 1) Key
    const key = document.getElementById("keySelect").value;
    out.push(`Key: ${key}`);
  
    // 2) For each “column” category:
    const cats = [
      { id: "attrPhysical",   label: "Physical Attribute"   },
      { id: "guitarmanshipSelect", label: "Guitarmanship",      data: guitarmanship },
      { id: "pickingSelect",      label: "Picking Hand",       data: pickingHand },
      { id: "frettingSelect",     label: "Fretting Hand",      data: frettingHand },
      { id: "stringSelect",       label: "String Challenge",   data: stringChallenge },
      { id: "attrMental",     label: "Mental Attribute"     },
      { id: "musicianshipSelect", label: "Musicianship",       data: musicianship },
      { id: "scalesSelect",      label: "Scales & Modes",     data: scales },
      { id: "rhythmSelect",      label: "Rhythm",             data: rhythm },
      { id: "playStyleSelect",   label: "Play Style",         data: playStyle },
    ];
  
    cats.forEach(cat => {
      const val = document.getElementById(cat.id).value;
      if (cat.data) {
        // a challenge category
        if (val !== "random") {
          out.push(`${cat.label}: ${val}`);
        } else {
          // pick from checked levels, or all if none checked
          const levels = getCheckedLevels(cat.id.replace("Select",""));
          const pool = levels.length
            ? levels.flatMap(l => cat.data[l] || [])
            : [].concat(...Object.values(cat.data));
          const pick = pool.length ? getRandom(pool) : "— none found —";
          out.push(`${cat.label}: ${pick}`);
        }
      } else {
        // just an attribute selector
        out.push(`${cat.label}: ${val}`);
      }
    });
  
    document.getElementById("challengeOutput").textContent = out.join("\n");
  }
  