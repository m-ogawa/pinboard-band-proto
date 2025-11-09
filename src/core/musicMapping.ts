import type { GridEdge } from "../types/grid";

/**
 * 隣接リストを構築
 */
export function buildAdjacency(edges: GridEdge[]) {
    const adj = new Map<string, Set<string>>();
    for (const e of edges) {
        if (!adj.has(e.from.id)) adj.set(e.from.id, new Set());
        if (!adj.has(e.to.id)) adj.set(e.to.id, new Set());
        adj.get(e.from.id)!.add(e.to.id);
        adj.get(e.to.id)!.add(e.from.id);
    }
    return adj;
}

/**
 * 最長経路探索（単純DFS）
 */
export function longestTrail(adj: Map<string, Set<string>>): string[] {
    let longest: string[] = [];

    function dfs(node: string, visited: Set<string>, path: string[]) {
        visited.add(node);
        path.push(node);
        if (path.length > longest.length) longest = [...path];

        for (const next of adj.get(node) ?? []) {
            if (!visited.has(next)) dfs(next, new Set(visited), [...path]);
        }
    }

    for (const start of adj.keys()) dfs(start, new Set(), []);
    return longest;
}

/**
 * 経路をping-pong反射で指定長に伸ばす
 */
export function pingPongToLength(
    path: string[],
    targetLength: number
): string[] {
    if (path.length === 0) return [];
    const result: string[] = [];
    let forward = true;
    let i = 0;
    while (result.length < targetLength) {
        result.push(path[i]);
        if (forward) i++;
        else i--;
        if (i === path.length - 1) forward = false;
        else if (i === 0) forward = true;
    }
    return result;
}

/**
 * 頂点ごとの接続数を計算
 */
export function computeDegreeMap(edges: GridEdge[]): Map<string, number> {
    const degree = new Map<string, number>();
    for (const e of edges) {
        degree.set(e.from.id, (degree.get(e.from.id) ?? 0) + 1);
        degree.set(e.to.id, (degree.get(e.to.id) ?? 0) + 1);
    }
    return degree;
}
