import { useState } from "react";
import * as Tone from "tone";
import { HexagonalTriangleGrid } from "./components/HexagonalTriangleGrid";
import {
    generatePhraseSequence,
    generateChordSequence,
    generateRhythmSequence,
} from "./core/sequenceGenerators";
import { MidiScheduler } from "./core/midiScheduler";
import type { Track, TrackType } from "./types/track";

const TRACK_COUNT = 4;
const TRACK_TYPES: TrackType[] = ["Rhythm", "Phrase", "Chord"];

export default function App() {
    const [tracks, setTracks] = useState<Track[]>(
        Array.from({ length: TRACK_COUNT }, (_, i) => ({
            id: i,
            type: "Rhythm" as TrackType,
            edges: [],
            isMuted: false,
            activeNodeId: null,
        }))
    );

    const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
    const [selectedTrackId, setSelectedTrackId] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [tempo, setTempo] = useState(120);

    const schedulers = useState(() =>
        Array.from({ length: TRACK_COUNT }, () => new MidiScheduler())
    )[0];

    // テンポ変更ハンドラ
    const handleTempoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const bpm = parseInt(e.target.value, 10);
        setTempo(bpm);
        Tone.Transport.bpm.value = bpm; // 即時反映
        console.log(bpm);
    };

    // トラックタイプ変更
    const handleTrackTypeChange = (id: number, newType: TrackType) => {
        setTracks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, type: newType } : t))
        );
    };

    // 🎵 再生処理
    const handlePlay = async () => {
        await Tone.start();
        Tone.Transport.cancel();
        Tone.Transport.bpm.value = tempo;

        tracks.forEach((track, i) => {
            const scheduler = schedulers[i];
            scheduler.setType(track.type); // 🆕 タイプを反映

            let sequenceData;
            switch (track.type) {
                case "Phrase":
                    sequenceData = generatePhraseSequence(track.edges);
                    break;
                case "Chord":
                    sequenceData = generateChordSequence(track.edges);
                    break;
                default:
                    sequenceData = generateRhythmSequence(track.edges);
            }

            const { sequence } = sequenceData;
            scheduler.load(sequence);
            if (!track.isMuted) scheduler.attachToTransport(i * 0.02);
        });

        Tone.Transport.start();
        setIsPlaying(true);
    };

    const handleStop = () => {
        Tone.Transport.stop();
        schedulers.forEach((s) => s.stop());
        setIsPlaying(false);
        setTracks(
            (prev) => prev.map((t) => ({ ...t, activeNodeId: null })) // 全トラックのハイライト消去
        );
    };

    const handleTrackEdgesChange = (id: number, edges: any[]) => {
        // 🎨 ステート更新（描画用）
        setTracks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, edges } : t))
        );

        // 🎵 即時反映（再生中のみ）
        if (isPlaying) {
            const track = tracks.find((t) => t.id === id);
            if (!track) return;

            const scheduler = schedulers[id];
            let sequenceData;

            // 🧩 トラックタイプに応じて再生成
            switch (track.type) {
                case "Phrase":
                    sequenceData = generatePhraseSequence(edges);
                    break;
                case "Chord":
                    sequenceData = generateChordSequence(edges);
                    break;
                default:
                    sequenceData = generateRhythmSequence(edges);
            }

            const { sequence } = sequenceData;
            console.log(
                `🎵 [Realtime Update] Track ${id} (${track.type}) sequence:`,
                sequence
            );

            scheduler.stop();
            scheduler.setType(track.type); // 🆕 現在のタイプ反映
            scheduler.load(sequence);
            scheduler.attachToTransport(id * 0.02);
        }
    };

    const selectedTrack = tracks[selectedTrackId];

    return (
        <div style={{ padding: "1rem", textAlign: "center" }}>
            <h1>Pinboard Band</h1>

            {/* ▶ 再生／停止とテンポ設定 */}
            <div
                style={{
                    marginTop: 24,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: "1rem",
                }}
            >
                {!isPlaying ? (
                    <button onClick={handlePlay}>▶ 再生</button>
                ) : (
                    <button onClick={handleStop}>⏹ 停止</button>
                )}
                {/* 🆕 テンポスライダー */}
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                    }}
                >
                    <span>Tempo: {tempo} BPM</span>
                    <input
                        type="range"
                        min="60"
                        max="180"
                        step="1"
                        value={tempo}
                        onChange={handleTempoChange}
                    />
                </label>
            </div>

            {/* 🟢 上段：選択中トラック（大きく表示） */}
            <div
                style={{
                    border: "2px solid #888",
                    borderRadius: 8,
                    marginBottom: "1.5rem",
                    padding: "0.5rem",
                    position: "relative", // 🆕 絶対配置用
                }}
            >
                {/* 🆕 トラックタイプ選択ドロップダウン */}
                <div
                    style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                    }}
                >
                    <label htmlFor="trackType">タイプ:</label>
                    <select
                        id="trackType"
                        value={selectedTrack.type}
                        onChange={(e) =>
                            handleTrackTypeChange(
                                selectedTrack.id,
                                e.target.value as TrackType
                            )
                        }
                    >
                        <option value="Rhythm">Rhythm</option>
                        <option value="Phrase">Phrase</option>
                        <option value="Chord">Chord</option>
                    </select>
                </div>

                <h2>
                    Track {selectedTrackId + 1} ({selectedTrack.type})
                    <button
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                            setTracks((prev) =>
                                prev.map((t) =>
                                    t.id === selectedTrack.id
                                        ? { ...t, isMuted: !t.isMuted }
                                        : t
                                )
                            );
                            const scheduler = schedulers[selectedTrack.id];
                            scheduler.setMuted(!selectedTrack.isMuted);
                        }}
                    >
                        {selectedTrack.isMuted ? "🔇" : "🔊"}
                    </button>
                    {/* 🆕 トラック単体の全削除ボタン */}
                    <button
                        style={{ marginLeft: 8 }}
                        onClick={() => {
                            if (selectedTrack.edges.length === 0) return;

                            setTracks((prev) =>
                                prev.map((t) =>
                                    t.id === selectedTrack.id
                                        ? { ...t, edges: [] }
                                        : t
                                )
                            );
                        }}
                    >
                        🗑️
                    </button>
                </h2>
                <div style={{ width: "600px", margin: "0 auto" }}>
                    <HexagonalTriangleGrid
                        edges={selectedTrack.edges}
                        onEdgesChange={(edges) =>
                            handleTrackEdgesChange(selectedTrack.id, edges)
                        }
                        activeNodeId={selectedTrack.activeNodeId}
                    />
                </div>
            </div>

            {/* 🔲 下段：全8トラックのタイルビュー */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "0.5rem",
                    justifyItems: "center",
                }}
            >
                {tracks.map((track) => (
                    <div
                        key={track.id}
                        onClick={() => setSelectedTrackId(track.id)} // 🖱️ クリックで選択
                        style={{
                            width: "160px",
                            height: "140px",
                            border:
                                selectedTrackId === track.id
                                    ? "3px solid #e74c3c"
                                    : "1px solid #aaa",
                            borderRadius: 6,
                            cursor: "pointer",
                            padding: "0.3rem",
                            background:
                                selectedTrackId === track.id
                                    ? "#fff8f7"
                                    : "#f8f8f8",
                            transition:
                                "border 0.15s ease, background 0.15s ease",
                        }}
                    >
                        <div style={{ fontWeight: "bold", fontSize: "0.9rem" }}>
                            Track {track.id + 1}
                        </div>
                        <div
                            style={{
                                transform: "scale(0.3)",
                                transformOrigin: "top left",
                                width: "520px",
                                height: "520px",
                                pointerEvents: "none", // プレビューではクリック無効
                            }}
                        >
                            <HexagonalTriangleGrid
                                edges={track.edges}
                                onEdgesChange={(edges) =>
                                    handleTrackEdgesChange(track.id, edges)
                                }
                                activeNodeId={selectedTrack.activeNodeId}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
