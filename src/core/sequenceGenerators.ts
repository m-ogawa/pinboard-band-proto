import type { GridEdge } from "../types/grid";
import {
    buildAdjacency,
    longestTrail,
    pingPongToLength,
    computeDegreeMap,
} from "./musicMapping";
import type { ChordEvent } from "../core/midiScheduler";
import noteMap from "../assets/pin_note_map.json";

/**
 * Rhythm: 図形→リズムシーケンス
 */
export function generateRhythmSequence(edges: GridEdge[]) {
    const adj = buildAdjacency(edges);
    const path = longestTrail(adj);
    const nodeOrder = pingPongToLength(path, 64);
    const degreeMap = computeDegreeMap(edges);

    const DRUMS = ["kick", "snare", "clap", "hihat"];

    const sequence = nodeOrder.map((id) => {
        const d = degreeMap.get(id) ?? 0;
        if (d <= 2) return null;
        if (d === 3) return "kick";
        if (d === 4) return "snare";
        if (d === 5) return "clap";
        if (d >= 6) return "hihat";
        return null;
    });

    return { sequence, nodeOrder };
}

/**
 * Chord: 図形→コード進行生成（仕様 §5）
 * - 直線グループ化
 * - 長さ順に4本抽出
 * - 各線の頂点ノートをコード化
 */
export function generateChordSequence(edges: GridEdge[]) {
    if (edges.length === 0) return { sequence: [], nodeOrder: [] };

    // === 1️⃣ 直線グループ化 ===
    const lines: GridEdge[][] = [];
    edges.forEach((edge) => {
        const { from, to } = edge;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const len = Math.hypot(dx, dy);
        const nx = dx / len;
        const ny = dy / len;

        const sameLine = lines.find((group) => {
            if (group.length === 0) return false;
            const first = group[0];
            const dx2 = first.to.x - first.from.x;
            const dy2 = first.to.y - first.from.y;
            const len2 = Math.hypot(dx2, dy2);
            const nx2 = dx2 / len2;
            const ny2 = dy2 / len2;
            const dot = nx * nx2 + ny * ny2;
            return Math.abs(dot) > 0.999;
        });

        if (sameLine) sameLine.push(edge);
        else lines.push([edge]);
    });

    // === 2️⃣ 総延長でソート ===
    const lineInfo = lines.map((group) => {
        const totalLength = group.reduce(
            (acc, e) => acc + Math.hypot(e.to.x - e.from.x, e.to.y - e.from.y),
            0
        );
        return { group, totalLength };
    });
    const top4 = lineInfo
        .sort((a, b) => b.totalLength - a.totalLength)
        .slice(0, 4);

    // === 3️⃣ 各線のノート集合 ===
    const chords: number[][] = top4.map((line) => {
        const pins = new Set<number>();
        line.group.forEach((e) => {
            [e.from, e.to].forEach((n) => {
                const note = getNoteFromNode(n.row, n.col);
                if (note !== null) pins.add(note);
            });
        });
        return Array.from(pins);
    });

    // === 4️⃣ 4本未満なら折り返し ===

    const fullProgression: number[][] = [];
    for (let i = 0; i < 4; i++) {
        fullProgression.push(chords[i % chords.length]);
    }

    const nodeOrder = fullProgression.flat().map(String);
    const sequence = fullProgression.map(
        (notes): ChordEvent => ({
            type: "chord",
            notes,
        })
    );

    return { sequence, nodeOrder };
}

/**
 * Phrase: 図形→メロディ生成
 * - 接続数2以下は休符
 * - 3以上で頂点ノートを発音（Velocityは仮）
 */
export function generatePhraseSequence(edges: GridEdge[]) {
    const adj = buildAdjacency(edges);
    const path = longestTrail(adj);
    const nodeOrder = pingPongToLength(path, 64);
    const degreeMap = computeDegreeMap(edges);

    const sequence = nodeOrder.map((id) => {
        const d = degreeMap.get(id) ?? 0;
        if (d <= 2) return null;
        const { row, col } = parseNodeId(id);
        const note = getNoteFromNode(row, col);
        return note !== null
            ? { type: "note" as const, note, velocity: Math.min(1, d / 6) }
            : null;
    });

    return { sequence, nodeOrder };
}

/**
 * 頂点ID (r3c2) → {row:3,col:2}
 */
function parseNodeId(id: string): { row: number; col: number } {
    const match = id.match(/r(\d+)c(\d+)/);
    if (!match) return { row: 0, col: 0 };
    return { row: parseInt(match[1]), col: parseInt(match[2]) };
}

/**
 * ピン座標→MIDIノート
 */
function getNoteFromNode(row: number, col: number): number | null {
    const layout = (noteMap as any).layout as number[][];
    if (row < 0 || row >= layout.length) return null;
    const rowData = layout[row];
    if (col < 0 || col >= rowData.length) return null;
    return rowData[col];
}
