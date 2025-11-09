import { type MouseEvent, useEffect, useState } from "react";
import type { GridEdge, GridNode } from "../types/grid";
import "./HexagonalTriangleGrid.css";

const ROW_COUNTS = [4, 5, 6, 7, 6, 5, 4] as const;
const SIDE_LENGTH = 48;
const HORIZONTAL_SPACING = SIDE_LENGTH;
const VERTICAL_SPACING = SIDE_LENGTH * Math.sqrt(3) * 0.5;
const MAX_COUNT = Math.max(...ROW_COUNTS);
const MARGIN = SIDE_LENGTH;
const GRID_WIDTH = MARGIN * 2 + (MAX_COUNT - 1) * HORIZONTAL_SPACING;
const GRID_HEIGHT = MARGIN * 2 + (ROW_COUNTS.length - 1) * VERTICAL_SPACING;

const { nodesByRow, edges } = createGrid();
const allNodes = nodesByRow.flat();
const nodeMap = new Map<string, GridNode>(
    allNodes.map((node) => [node.id, node])
);
const baseEdgeKeys = new Set(edges.map((edge) => edge.key));

const coordinateKey = (x: number, y: number) =>
    `${x.toFixed(6)},${y.toFixed(6)}`;
const nodeCoordinateMap = new Map<string, GridNode>(
    allNodes.map((node) => [coordinateKey(node.x, node.y), node])
);

type DirectionInfo = {
    dx: number;
    dy: number;
    length: number;
};

const directionInfoMap = (() => {
    const map = new Map<string, DirectionInfo>();

    const createDirectionKey = (dx: number, dy: number) => {
        const length = Math.hypot(dx, dy);
        if (length === 0) {
            return null;
        }
        const ux = Math.round((dx / length) * 1_000_000) / 1_000_000;
        const uy = Math.round((dy / length) * 1_000_000) / 1_000_000;
        return `${ux},${uy}`;
    };

    edges.forEach((edge) => {
        const dx = edge.to.x - edge.from.x;
        const dy = edge.to.y - edge.from.y;
        const length = Math.hypot(dx, dy);
        const forwardKey = createDirectionKey(dx, dy);
        const backwardKey = createDirectionKey(-dx, -dy);

        if (forwardKey && !map.has(forwardKey)) {
            map.set(forwardKey, { dx, dy, length });
        }
        if (backwardKey && !map.has(backwardKey)) {
            map.set(backwardKey, { dx: -dx, dy: -dy, length });
        }
    });

    return map;
})();

const createEdgeKey = (a: GridNode, b: GridNode) =>
    a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;

const directionKeyFromNodes = (from: GridNode, to: GridNode) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) {
        return null;
    }
    const ux = Math.round((dx / length) * 1_000_000) / 1_000_000;
    const uy = Math.round((dy / length) * 1_000_000) / 1_000_000;
    return `${ux},${uy}`;
};

const getEdgeSegments = (from: GridNode, to: GridNode): GridEdge[] | null => {
    const directionKey = directionKeyFromNodes(from, to);
    if (!directionKey) {
        return null;
    }

    const direction = directionInfoMap.get(directionKey);
    if (!direction) {
        return null;
    }

    const totalLength = Math.hypot(to.x - from.x, to.y - from.y);
    const stepsFloat = totalLength / direction.length;
    const steps = Math.round(stepsFloat);
    if (steps <= 0 || Math.abs(steps - stepsFloat) > 1e-6) {
        return null;
    }

    const segments: GridEdge[] = [];
    let current = from;
    for (let i = 0; i < steps; i += 1) {
        const nextX = current.x + direction.dx;
        const nextY = current.y + direction.dy;
        const nextNode = nodeCoordinateMap.get(coordinateKey(nextX, nextY));
        if (!nextNode) {
            return null;
        }

        const segmentKey = createEdgeKey(current, nextNode);
        if (!baseEdgeKeys.has(segmentKey)) {
            return null;
        }

        segments.push({ key: segmentKey, from: current, to: nextNode });
        current = nextNode;
    }

    if (current.id !== to.id) {
        return null;
    }

    return segments;
};

const canCreateEdge = (from: GridNode, to: GridNode) => {
    return getEdgeSegments(from, to) !== null;
};

function createGrid() {
    const nodesByRow: GridNode[][] = [];
    const edges: GridEdge[] = [];
    const edgeKeys = new Set<string>();

    const addEdge = (a: GridNode, b: GridNode) => {
        const key = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;
        if (edgeKeys.has(key)) return;
        edgeKeys.add(key);
        edges.push({ key, from: a, to: b });
    };

    ROW_COUNTS.forEach((count, rowIndex) => {
        const offset = ((MAX_COUNT - count) * HORIZONTAL_SPACING) / 2;
        const rowNodes: GridNode[] = Array.from(
            { length: count },
            (_, colIndex) => ({
                id: `r${rowIndex}c${colIndex}`,
                x: MARGIN + offset + colIndex * HORIZONTAL_SPACING,
                y: MARGIN + rowIndex * VERTICAL_SPACING,
                row: rowIndex,
                col: colIndex,
            })
        );

        rowNodes.forEach((node, idx) => {
            const next = rowNodes[idx + 1];
            if (next) addEdge(node, next);
        });

        nodesByRow.push(rowNodes);
    });

    for (let row = 0; row < nodesByRow.length - 1; row += 1) {
        const upperRow = nodesByRow[row];
        const lowerRow = nodesByRow[row + 1];

        if (lowerRow.length === upperRow.length + 1) {
            for (let col = 0; col < upperRow.length; col += 1) {
                addEdge(upperRow[col], lowerRow[col]);
                addEdge(upperRow[col], lowerRow[col + 1]);
            }
        } else if (lowerRow.length + 1 === upperRow.length) {
            for (let col = 0; col < lowerRow.length; col += 1) {
                addEdge(upperRow[col], lowerRow[col]);
                addEdge(upperRow[col + 1], lowerRow[col]);
            }
        } else {
            for (let col = 0; col < upperRow.length; col += 1) {
                addEdge(upperRow[col], lowerRow[col]);
                if (col < upperRow.length - 1) {
                    addEdge(upperRow[col + 1], lowerRow[col]);
                }
            }
        }
    }

    return { nodesByRow, edges };
}

type HexagonalTriangleGridProps = {
    edges: GridEdge[];
    onEdgesChange?: (edges: GridEdge[]) => void;
    onClearEdges?: () => void;
    activeNodeId?: string | null;
    currentStepIndex?: number | null;
    totalSteps?: number | null;
};

export function HexagonalTriangleGrid({
    edges,
    onEdgesChange,
    onClearEdges,
    activeNodeId = null,
    currentStepIndex = null,
    totalSteps = null,
}: HexagonalTriangleGridProps) {
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

    const handleClearEdges = () => {
        if (edges.length === 0) return;
        onEdgesChange?.([]); // ← 直接props経由でクリア通知
        setSelectedNodeId(null);
    };
    const handleEdgeContextMenu = (
        event: React.MouseEvent<SVGLineElement>,
        targetEdge: GridEdge
    ) => {
        event.preventDefault();
        const nextEdges = edges.filter((edge) => edge.key !== targetEdge.key);
        onEdgesChange?.(nextEdges);
    };

    const handleNodeClick = (node: GridNode) => {
        if (selectedNodeId === null) {
            setSelectedNodeId(node.id);
            return;
        }

        if (selectedNodeId === node.id) {
            setSelectedNodeId(null);
            return;
        }

        const fromNode = nodeMap.get(selectedNodeId);
        if (!fromNode) {
            setSelectedNodeId(node.id);
            return;
        }

        if (!canCreateEdge(fromNode, node)) {
            setSelectedNodeId(node.id);
            return;
        }

        const segments = getEdgeSegments(fromNode, node);
        if (!segments) return;

        const existingKeys = new Set(edges.map((edge) => edge.key));
        const nextEdges = [...edges];
        segments.forEach((segment) => {
            if (!existingKeys.has(segment.key)) {
                existingKeys.add(segment.key);
                nextEdges.push(segment);
            }
        });

        onEdgesChange?.(nextEdges);
        setSelectedNodeId(null);
    };

    const activeNode = activeNodeId ? nodeMap.get(activeNodeId) ?? null : null;

    return (
        <div className="triangle-grid-container">
            <svg
                className="triangle-grid"
                viewBox={`0 0 ${GRID_WIDTH} ${GRID_HEIGHT}`}
            >
                <g className="triangle-grid__edges triangle-grid__edges--custom">
                    {edges.map((edge) => (
                        <line
                            key={edge.key}
                            x1={edge.from.x}
                            y1={edge.from.y}
                            x2={edge.to.x}
                            y2={edge.to.y}
                            onContextMenu={(event) =>
                                handleEdgeContextMenu(event, edge)
                            }
                        />
                    ))}
                </g>
                <g className="triangle-grid__nodes">
                    {allNodes.map((node) => (
                        <circle
                            key={node.id}
                            cx={node.x}
                            cy={node.y}
                            r={6}
                            className={
                                [
                                    selectedNodeId === node.id
                                        ? "is-selected"
                                        : null,
                                    activeNodeId === node.id
                                        ? "is-active"
                                        : null,
                                ]
                                    .filter(Boolean)
                                    .join(" ") || undefined
                            }
                            onClick={() => handleNodeClick(node)}
                        />
                    ))}
                </g>
            </svg>
            {currentStepIndex !== null && totalSteps !== null ? (
                <div className="triangle-grid__playback-indicator">
                    ステップ {currentStepIndex + 1} / {totalSteps}
                </div>
            ) : null}
        </div>
    );
}
