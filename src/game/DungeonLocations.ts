/** Surface return portals, one at the end of each dungeon route. */
export const DUNGEON_EXIT_IDS = [1006, 1106, 1206] as const;
export function isDungeonExit(nodeId: number): boolean {
  return DUNGEON_EXIT_IDS.some(id => id === nodeId);
}
