import * as Tone from "tone";

type RhythmEvent = "kick" | "snare" | "clap" | "hihat";
type PhraseEvent = { type: "note"; note: number; velocity: number };
export type ChordEvent = { type: "chord"; notes: number[] };

type TrackType = "Rhythm" | "Phrase" | "Chord";

export class MidiScheduler {
    private type: TrackType;
    private sequence: (RhythmEvent | PhraseEvent | ChordEvent | null)[] = [];
    private pattern?: Tone.Pattern<any>;
    private callback?: (stepIndex: number) => void;
    private isMuted = false;

    // === 音源群 ===
    private drumSynths = {
        kick: new Tone.MembraneSynth().toDestination(),
        snare: new Tone.NoiseSynth({
            noise: { type: "white" },
            envelope: { attack: 0.001, decay: 0.2, sustain: 0 },
        }).toDestination(),
        clap: new Tone.NoiseSynth({
            noise: { type: "pink" },
            envelope: { attack: 0.001, decay: 0.15, sustain: 0 },
        }).toDestination(),
        hihat: new Tone.MetalSynth({
            envelope: { attack: 0.001, decay: 0.05, release: 0.01 },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5,
        }).toDestination(),
    };

    private phraseSynth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.2 },
    }).toDestination();

    private chordSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sine" },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
    }).toDestination();

    constructor(type: TrackType = "Rhythm") {
        this.type = type;
    }

    setType(type: TrackType) {
        this.type = type;
    }

    load(sequence: (RhythmEvent | PhraseEvent | ChordEvent | null)[]) {
        this.sequence = [...sequence];
    }

    setOnStep(callback: (stepIndex: number) => void) {
        this.callback = callback;
    }

    setMuted(muted: boolean) {
        this.isMuted = muted;
    }

    attachToTransport(delay = 0) {
        if (this.pattern) {
            this.pattern.stop();
            this.pattern.dispose();
            this.pattern = undefined;
        }
        if (!this.sequence.length || this.sequence.every((v) => v === null)) {
            console.warn("⚠️ sequence is empty — skipping");
            return;
        }

        let stepIndex = 0;

        this.pattern = new Tone.Pattern(
            (time, value) => {
                this.callback?.(stepIndex);
                if (this.isMuted || value === null) {
                    stepIndex++;
                    return;
                }

                switch (this.type) {
                    case "Rhythm":
                        this.triggerDrum(time, value as RhythmEvent);
                        break;
                    case "Phrase":
                        this.triggerPhrase(time, value as PhraseEvent);
                        break;
                    case "Chord":
                        this.triggerChord(time, value as ChordEvent);
                        break;
                }
                stepIndex++;
            },
            this.sequence,
            "up"
        );

        this.pattern.start(0);
    }

    private triggerDrum(time: number, hit: RhythmEvent) {
        const synth = this.drumSynths[hit];
        if (!synth) return;

        if (hit === "kick" || hit === "hihat") {
            synth.triggerAttackRelease("C2", "8n", time);
        } else {
            synth.triggerAttackRelease("8n", time);
        }
    }

    private triggerPhrase(time: number, ev: PhraseEvent) {
        if (!ev || !ev.note) return;
        const freq = Tone.Frequency(ev.note, "midi").toFrequency();
        this.phraseSynth.triggerAttackRelease(freq, "8n", time, ev.velocity);
    }

    private triggerChord(time: number, ev: ChordEvent) {
        if (!ev || !ev.notes?.length) return;
        const freqs = ev.notes.map((n) =>
            Tone.Frequency(n, "midi").toFrequency()
        );
        this.chordSynth.triggerAttackRelease(freqs, "1m", time);
    }

    stop() {
        if (this.pattern) {
            this.pattern.stop();
            this.pattern.dispose();
            this.pattern = undefined;
        }
    }
}
