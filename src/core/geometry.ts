// core/geometry.ts

/** 六角格子の基本パラメータ */
export const HEX_SIZE = 50; // ピン間隔(px)

/** 平面座標 (x, y) */
export type Point = { x: number; y: number };

/** 六角格子座標 (q, r) — axial coordinates */
export type HexCoord = { q: number; r: number };

/** 六角格子の方向ベクトル（6近傍） */
export const HEX_DIRECTIONS: HexCoord[] = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 },
];

/** 座標変換: Hex → Pixel */
export function hexToPixel(hex: HexCoord): Point {
    const x = HEX_SIZE * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r);
    const y = HEX_SIZE * ((3 / 2) * hex.r);
    return { x, y };
}

/** 座標変換: Pixel → Hex（近似） */
export function pixelToHex(p: Point): HexCoord {
    const q = ((Math.sqrt(3) / 3) * p.x - (1 / 3) * p.y) / (HEX_SIZE / 1);
    const r = ((2 / 3) * p.y) / (HEX_SIZE / 1);
    return hexRound({ q, r });
}

/** 小数座標を最近傍の六角格子点に丸める */
export function hexRound(h: HexCoord): HexCoord {
    const x = h.q;
    const z = h.r;
    const y = -x - z;

    let rx = Math.round(x);
    let ry = Math.round(y);
    let rz = Math.round(z);

    const dx = Math.abs(rx - x);
    const dy = Math.abs(ry - y);
    const dz = Math.abs(rz - z);

    if (dx > dy && dx > dz) rx = -ry - rz;
    else if (dy > dz) ry = -rx - rz;
    else rz = -rx - ry;

    return { q: rx, r: rz };
}

/** 六角格子距離（axial座標のL1距離 / 2） */
export function hexDistance(a: HexCoord, b: HexCoord): number {
    return (
        (Math.abs(a.q - b.q) +
            Math.abs(a.q + a.r - b.q - b.r) +
            Math.abs(a.r - b.r)) /
        2
    );
}

/** 六角格子の線分補間 */
export function hexLerp(a: HexCoord, b: HexCoord, t: number): HexCoord {
    return { q: a.q + (b.q - a.q) * t, r: a.r + (b.r - a.r) * t };
}

/** A→Bの六角経路（隣接ステップ列）を求める */
export function hexLine(a: HexCoord, b: HexCoord): HexCoord[] {
    const N = hexDistance(a, b);
    const results: HexCoord[] = [];
    for (let i = 0; i <= N; i++) {
        const t = N === 0 ? 0 : i / N;
        results.push(hexRound(hexLerp(a, b, t)));
    }
    return results;
}
