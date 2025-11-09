// src/types/track.ts
import type { GridEdge } from "./grid";

export type TrackType = "Rhythm" | "Chord" | "Phrase";

export interface Track {
    id: number;
    type: TrackType;
    edges: GridEdge[];
    isMuted: boolean;
    activeNodeId: string | null;
}
