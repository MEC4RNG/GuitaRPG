import { readFileSync, writeFileSync } from "node:fs";

const taxonomy = JSON.parse(
  readFileSync(new URL("../domain/taxonomy/canonical-taxonomy.json", import.meta.url), "utf8"),
);
const eligible = new Set(["SKILL", "CONCEPT", "CONTEXT", "CONSTRAINT"]);

const exact = {
  alternate_picking:
    "The coordinated use of alternating downstrokes and upstrokes to articulate consecutive notes with an even attack and reliable timing.",
  dorian:
    "A minor-type mode whose natural sixth distinguishes it from the natural-minor pattern, giving minor harmony a brighter characteristic color.",
  dadgad:
    "A six-string tuning arranged D–A–D–G–A–D from low to high, often used for drones and open-voiced harmony.",
  target_tempo:
    "A beats-per-minute requirement that sets the intended pacing for a Quest without defining how difficult that tempo is for a particular Player.",
  tonal_center:
    "The pitch that functions as the perceived center of a passage; a Quest supplies the particular pitch as a parameter.",
  barre_chord_fretting:
    "The ability to hold several strings with one fretting finger while forming a chord cleanly with the remaining fingers.",
  arpeggio_sequencing:
    "The ability to perform ordered note patterns through an arpeggio while preserving its chord-tone structure and rhythmic continuity.",
  atonality: "An approach that avoids establishing one pitch as a governing tonal center.",
  serialism:
    "A compositional method that organizes musical elements through a predetermined series, commonly an ordering of the twelve pitch classes.",
};

const skillHints = {
  picking: "coordinate the pick across strings with clear attacks and steady timing",
  fretting: "place and release the fretting hand accurately while keeping notes clear",
  bending: "raise a fretted pitch by controlling string tension and intonation",
  vibrato: "shape a sustained pitch with controlled, repeated variation",
  muting: "silence unwanted string vibration while preserving intended notes",
  harmonics: "produce and control overtone-based notes with accurate contact and attack",
  tapping:
    "sound fretted notes by striking the fingerboard rather than relying only on a picked attack",
  fingerstyle: "coordinate independent picking-hand fingers to articulate strings",
  rhythm: "perform layered rhythmic motion accurately against a stable pulse",
  chord: "form, connect, and apply chord shapes with clear voice movement",
  scale: "organize and perform scale material across the instrument",
  interval: "identify and use the distance between pitches by sound and position",
  voice: "control independent musical lines while preserving their continuity",
  note: "locate, recognize, and deliberately articulate notes on the instrument",
  stroke: "control the direction, depth, and follow-through of a picking-hand stroke",
  strumming: "coordinate repeated multi-string attacks with consistent rhythm and dynamics",
  string: "move deliberately between strings without unintended contact or noise",
  modulation: "move musical material between tonal centers while making the harmonic change clear",
  syncopation:
    "place and sustain accents away from expected strong beats while retaining the pulse",
  subdivision: "divide the beat evenly and place notes reliably within those divisions",
};

const conceptHints = {
  scale:
    "a defined collection and ordering of pitch relationships used to organize melody and harmony",
  minor: "a minor-oriented pitch collection with characteristic altered scale degrees",
  major: "a major-oriented pitch collection with characteristic interval relationships",
  rhythm: "a recurring organization of durations and accents against a pulse",
  chord: "a harmonic idea describing the selection or arrangement of simultaneous pitches",
  harmony: "a principle for organizing chords and their movement within a tonal setting",
  progression: "an ordered harmonic motion whose functions create direction and resolution",
  subdivision: "a way of dividing each beat into consistent smaller rhythmic units",
  meter: "a recurring grouping of beats that defines the measure's rhythmic framework",
  modulation: "a change of tonal center that reorganizes the harmonic reference point",
  pentatonic: "a five-note scale organization used as melodic and harmonic material",
};

const contextHints = {
  tuning: "a tuning environment that determines the open-string pitches and available resonances",
  guitar: "a playing-role context that focuses the instrument's function within an arrangement",
  default:
    "a musical setting in which practice material can be framed without implying proficiency",
};

const constraintHints = {
  count: "a parameter that limits how many specified musical items a Quest may use or produce",
  range: "a boundary that limits the usable span during a Quest",
  duration: "a time parameter that bounds the intended practice period",
  length: "a parameter that bounds the size of the requested musical output",
  string:
    "a restriction that controls which guitar strings may be used or how they may be traversed",
  tempo: "a beats-per-minute requirement for the requested performance",
  time: "a time boundary within which the requested activity is performed",
  ratio: "a proportional requirement between two quantities in the Quest",
};

function hintFor(slug, hints, fallback) {
  const key = Object.keys(hints).find((candidate) => slug.includes(candidate));
  return key ? hints[key] : fallback;
}

function definition(entity) {
  if (exact[entity.slug]) return exact[entity.slug];
  if (entity.kind === "SKILL") {
    const hint = hintFor(
      entity.slug,
      skillHints,
      `execute ${entity.name.toLowerCase()} deliberately with coordinated movement, clean sound, and stable timing`,
    );
    return `${entity.name} is the trainable ability to ${hint}.`;
  }
  if (entity.kind === "CONCEPT") {
    const hint = hintFor(
      entity.slug,
      conceptHints,
      `a musical idea that describes how ${entity.name.toLowerCase()} organizes pitch, rhythm, texture, or harmony`,
    );
    return `${entity.name} is ${hint}.`;
  }
  if (entity.kind === "CONTEXT") {
    const family = entity.metadata?.context_family;
    const hint =
      family === "TUNING"
        ? contextHints.tuning
        : hintFor(
            entity.slug,
            contextHints,
            `a musical setting associated with ${entity.name}, used to frame the style, role, or environment of practice`,
          );
    return `${entity.name} is ${hint}.`;
  }
  const hint = hintFor(
    entity.slug,
    constraintHints,
    `a reusable restriction that specifies how ${entity.name.toLowerCase()} must be handled in a Quest`,
  );
  return `${entity.name} is ${hint}.`;
}

const aliases = {
  barre_chord_fretting: ["Barre Chords"],
  arpeggio_sequencing: ["Arpeggio Sequences"],
  major_pentatonic: ["Major Pentatonic"],
  minor_pentatonic: ["Minor Pentatonic"],
};

const entries = taxonomy.entities
  .filter((entity) => entity.lifecycle === "ACTIVE" && eligible.has(entity.kind))
  .map((entity) => ({
    entity_id: entity.id,
    slug: entity.slug,
    kind: entity.kind,
    definition: definition(entity),
    aliases: aliases[entity.slug] ?? [],
  }));

const artifact = {
  schema_version: 1,
  content_version: "CODEX_CONTENT_V1",
  taxonomy_authority: "domain/taxonomy/canonical-taxonomy.json",
  entries,
};

writeFileSync(
  new URL("../domain/codex/codex-content-v1.json", import.meta.url),
  `${JSON.stringify(artifact, null, 2)}\n`,
);
