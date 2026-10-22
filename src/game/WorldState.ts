import type { BoardNode, RealmId } from './BoardMap';
import type { CalamityEvent } from './WorldCalamitySystem';
import type { GameModeType, RoguelikeModifier } from './GameState';
import type { RoyalContractLedger } from './RoyalContracts';
import type { MatchConfig } from './MatchConfig';
import type { StoryLedger, MatchMoment } from './CampaignStories';
import type { TutorialState } from './Tutorial';

export type WorldWeather = 'sunny' | 'rain' | 'snow' | 'heatwave' | 'miasma' | 'blood_moon' | 'sandstorm';
export type WorldTime = 'DAWN' | 'DAY' | 'DUSK' | 'NIGHT';
export const REALMS: RealmId[] = ['solaria', 'frostpeak', 'sunfire', 'abyss', 'celestial', 'emerald'];
const CLIMATES: Record<RealmId, WorldWeather[]> = {
  solaria: ['sunny', 'sunny', 'rain'], frostpeak: ['snow', 'snow', 'sunny'],
  sunfire: ['sunny', 'heatwave', 'sandstorm'], abyss: ['miasma', 'miasma', 'rain'],
  celestial: ['sunny', 'sunny', 'rain'], emerald: ['rain', 'rain', 'sunny']
};
export interface EventMemory { recent: string[]; lastSeen: Record<string, number>; flags: Record<string, number>; }
export interface Expedition {
  entrance: number; depth: number; torch: number; opened: number[]; visited: number[];
  guardians: number[]; claimedFloors: number[];
}
export interface MatchResult { winnerId?: number; teamVictory?: boolean; reason: string; }

/** Serializable rules state. Rendering consumes this state and never advances it. */
export class WorldState {
  rulesVersion = 2;
  mode: GameModeType = 'standard';
  modifier: RoguelikeModifier | null = null;
  seed: number;
  rng: number;
  day = 1;
  round = 0;
  hour = 8;
  focusRealm: RealmId = 'solaria';
  focusPlayerId = 1;
  weather: Record<RealmId, WorldWeather> = { solaria: 'sunny', frostpeak: 'snow', sunfire: 'heatwave', abyss: 'miasma', celestial: 'sunny', emerald: 'rain' };
  forecast: Record<RealmId, WorldWeather>;
  threat: Record<RealmId, number> = { solaria: 0, frostpeak: 0, sunfire: 0, abyss: 0, celestial: 0, emerald: 0 };
  events: Record<number, EventMemory> = {};
  expeditions: Record<number, Expedition> = {};
  defeatedBosses: number[] = [];
  raidTargets: number[] = [];
  spireFloor = 1;
  bossHealth: Record<number, number> = {};
  bossKillers: Record<number, number> = {};
  campaignBossId: number | null = null;
  claimedTreasures: number[] = [];
  royalContracts: Record<number, RoyalContractLedger> = {};
  matchConfig?: MatchConfig;
  storylines: Record<number, Record<string, StoryLedger>> = {};
  matchHistory: MatchMoment[] = [];
  tutorial: Record<number, TutorialState> = {};
  calamity: CalamityEvent | null = null;
  calamityHistory: string[] = [];
  result: MatchResult | null = null;
  constructor(seed = Date.now()) {
    this.seed = this.rng = (seed >>> 0) || 1;
    this.forecast = { ...this.weather };
    this.rollForecast();
  }
  random(): number {
    let x = this.rng;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.rng = x >>> 0;
    return this.rng / 4294967296;
  }
  pick<T>(values: readonly T[]): T { return values[Math.floor(this.random() * values.length)]; }
  get timeOfDay(): WorldTime {
    return this.hour < 5 || this.hour >= 21 ? 'NIGHT' : this.hour < 10 ? 'DAWN' : this.hour < 17 ? 'DAY' : 'DUSK';
  }
  memory(playerId: number): EventMemory {
    return this.events[playerId] ??= { recent: [], lastSeen: {}, flags: {} };
  }
  weatherAt(node: BoardNode): WorldWeather {
    if (node.id >= 1000) return node.biome === 'snow' ? 'snow' : node.biome === 'volcano' ? 'heatwave' : 'miasma';
    return this.weather[node.realmId] ?? 'sunny';
  }
  advanceRound(day: number): void {
    if (day <= this.day) return;
    this.day = day; this.round++;
    this.hour = (8 + (day - 1) * 6) % 24;
    this.weather = { ...this.forecast };
    for (const realm of REALMS) this.threat[realm] = Math.min(100, this.threat[realm] + (this.weather[realm] === 'miasma' || this.weather[realm] === 'blood_moon' ? 9 : 4));
    this.rollForecast();
  }
  private rollForecast(): void {
    for (const realm of REALMS) this.forecast[realm] = this.day >= 8 && this.random() < 0.06 ? 'blood_moon' : this.pick(CLIMATES[realm]);
  }
  static restore(data: WorldState): WorldState {
    return Object.assign(new WorldState(data.seed), structuredClone(data));
  }
}

// Compatibility view for renderers; the owning GameState binds its world on creation/load.
let currentWorld = new WorldState(1);
export const getWorld = (): WorldState => currentWorld;
export const bindWorld = (world: WorldState): void => { currentWorld = world; };
