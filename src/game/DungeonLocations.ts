/** Surface return portals, one at the end of each dungeon route. */
export const DUNGEON_EXIT_IDS = [1006, 1106, 1206] as const;
export function isDungeonExit(nodeId: number): boolean {
  return DUNGEON_EXIT_IDS.some(id => id === nodeId);
}

export function dungeonSceneGroup(nodeId: number): number {
  return nodeId >= 1000 && nodeId <= 1035 ? 1000 : nodeId >= 1100 && nodeId <= 1135 ? 1100 : nodeId >= 1200 && nodeId <= 1235 ? 1200 : 0;
}
