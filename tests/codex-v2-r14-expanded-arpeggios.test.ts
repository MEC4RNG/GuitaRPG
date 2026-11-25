import { describe, expect, it } from "vitest";
import { ARPEGGIO_CHORDS, arpeggioTones, arpeggioPositions, arpeggioVoicings, buildExpandedBar, expandedPattern, type ArpeggioQuality } from "@/lib/codex/v2/expanded-arpeggios";
import { CHROMATIC_ROOTS, TUNINGS, pitchAt, type FretboardTuning } from "@/lib/codex/v2/fretboard-engine";

describe("Expanded arpeggio engine",()=>{
  it("spells distinct sevenths, suspended and altered chords",()=>{
    const names=(q:ArpeggioQuality)=>arpeggioTones("C",q).map(t=>t.name);
    expect(names("major7")).toEqual(["C","E","G","B"]);
    expect(names("dominant7")).toEqual(["C","E","G","B♭"]);
    expect(names("minor7")).toEqual(["C","E♭","G","B♭"]);
    expect(names("diminished7")).toEqual(["C","E♭","G♭","B♭♭"]);
    expect(names("sus2")).toEqual(["C","D","G"]);
    expect(arpeggioTones("C♯","major7").map(t=>t.name)).toEqual(["C♯","E♯","G♯","B♯"]);
  });
  it("maps all qualities and tunings to exact available positions",()=>{
    for(const root of CHROMATIC_ROOTS)for(const q of Object.keys(ARPEGGIO_CHORDS) as ArpeggioQuality[])for(const tuning of Object.keys(TUNINGS) as FretboardTuning[]){
      const positions=arpeggioPositions(root,q,tuning,[6,4,1],0,24);
      const tones=arpeggioTones(root,q);
      expect(new Set(positions.map(p=>p.role)).size).toBe(tones.length);
      for(const p of positions){
        expect([6,4,1]).toContain(p.stringNumber);
        expect(p.midi).toBe(pitchAt(tuning,p.stringNumber,p.fret));
        expect(p.midi%12).toBe(tones.find(t=>t.role===p.role)?.pitchClass);
      }
    }
  });
  it("finds complete nonadjacent shapes and third inversion, retaining original triad example",()=>{
    const triad=arpeggioVoicings(arpeggioPositions("C","major","standard",[3,2,1],0,12),"major");
    expect(triad.find(v=>v.inversion===0)?.positions.map(p=>p.note)).toEqual(["C4","E4","G4"]);
    expect(triad.find(v=>v.inversion===1)?.positions.map(p=>p.note)).toEqual(["E4","G4","C5"]);
    const shapes=arpeggioVoicings(arpeggioPositions("C","major7","standard",[6,4,3,1],0,24),"major7");
    expect(shapes.length).toBeGreaterThan(0);
    for(const shape of shapes){
      expect(shape.positions.map(p=>p.stringNumber)).toEqual([6,4,3,1]);
      expect(new Set(shape.positions.map(p=>p.role)).size).toBe(4);
      expect(shape.span).toBeLessThanOrEqual(4);
    }
    const all=arpeggioVoicings(arpeggioPositions("C","major7","standard",[6,5,4,3,2,1],0,24),"major7");
    expect(all.some(v=>v.inversion===3)).toBe(true);
  });
  it("sequences multiple octaves on one string and retains precise fret and silence",()=>{
    const positions=arpeggioPositions("C","minor7","standard",[5],0,24);
    const bar=buildExpandedBar(positions,"quarter",120,["s5-f3","s5-f15","seventh","rest"]);
    expect(bar.events.map(e=>e.note)).toEqual(["C3","C4","B♭2",null]);
    expect(bar.events.map(e=>e.fret)).toEqual([3,15,1,null]);
    expect(bar.durationSeconds).toBe(2);
    expect(()=>buildExpandedBar(positions,"quarter",120,["s4-f3","rest","rest","rest"])).toThrow(/Unavailable/);
  });
  it("uses four tones by default for seventh chords, handles restricted strings and no available notes",()=>{
    const positions=arpeggioPositions("C","major7","dadgad",[6,5,4,3,2,1],0,12);
    expect(expandedPattern("quarter","arch","major7",positions)).toEqual(["root","third","fifth","seventh"]);
    expect(buildExpandedBar(positions,"triplet",60,expandedPattern("triplet","ascending","major7",positions)).events).toHaveLength(12);
    expect(expandedPattern("quarter","arch","major7",[])).toEqual(["rest","rest","rest","rest"]);
    expect(arpeggioVoicings(arpeggioPositions("C","major7","standard",[1],0,24),"major7")).toEqual([]);
    expect(()=>arpeggioPositions("C","major","standard",[7],0,12)).toThrow(/string/);
  });
});
