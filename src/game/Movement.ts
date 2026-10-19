import type { BoardNode } from './BoardMap';

/** Each turn starts with a free choice of direction, regardless of the last turn.
 * Once travelling, a U-turn is allowed only at a dead end. */
export function movementRoutes(nodes: BoardNode[], start: number, moves: number, flexible: boolean): Map<number, number[]> {
  const routes = new Map<number, number[]>();
  if (!Number.isInteger(moves) || moves <= 0) return routes;
  const byId = new Map(nodes.map(node => [node.id, node]));
  if (!byId.has(start)) return routes;
  const queue: number[][] = [[start]];
  const visited = new Set<string>();
  for (let head = 0; head < queue.length; head++) {
    const path = queue[head];
    const current = path[path.length - 1], steps = path.length - 1;
    const previous = steps > 0 ? path[path.length - 2] : null;
    const key = `${current}:${previous}:${steps}`;
    if (visited.has(key)) continue;
    visited.add(key);
    if (current !== start && steps > 0 && (flexible || steps === moves) && !routes.has(current)) {
      routes.set(current, path);
    }
    if (steps >= moves) continue;
    const node = byId.get(current)!;
    const neighbors = node.neighbors.filter(id => byId.has(id));
    for (const next of neighbors) {
      if (next === previous && neighbors.length > 1) continue;
      queue.push([...path, next]);
    }
  }
  return routes;
}

/** Reject stale selections and disconnected shortcuts before animation or effects. */
export function isLegalMovementPath(nodes: BoardNode[], start: number, moves: number, flexible: boolean, path: number[]): boolean {
  if (!Number.isInteger(moves) || moves <= 0) return false;
  const steps = path.length - 1;
  if (path[0] !== start || path[path.length - 1] === start || steps < 1 || steps > moves || (!flexible && steps !== moves)) return false;
  const byId = new Map(nodes.map(node => [node.id, node]));
  for (let i = 0; i < steps; i++) {
    const node = byId.get(path[i]);
    if (!node || !byId.has(path[i + 1]) || !node.neighbors.includes(path[i + 1])) return false;
    if (i > 0 && path[i + 1] === path[i - 1] && node.neighbors.filter(id => byId.has(id)).length > 1) return false;
  }
  return true;
}
