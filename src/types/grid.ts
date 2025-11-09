// src/types/grid.ts

export type GridNode = {
    id: string;
    x: number;
    y: number;
    row: number;
    col: number;
};

export type GridEdge = {
    key: string;
    from: GridNode;
    to: GridNode;
};
