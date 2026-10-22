import { WorldState, bindWorld } from './WorldState';
import { validRoyalContractState } from './RoyalContracts';
import { aiSystem } from './AISystem';
import { royalDecreeSystem, RoyalDecree } from './RoyalDecreeSystem';
import type { CombatMoveHistory } from './AISystem';
import { GameState } from './GameState';
import { Player, FoodBuff, GuildQuest, CompanionData, JOB_PROMOTIONS, TIER3_PROMOTIONS } from './Player';
import { TownData, HomeData } from './BoardMap';
import { EquipmentItem, PrankState } from '../engine/PixelSpriteGenerator';
import { dungeonSystem } from './DungeonSystem';
import { worldCalamitySystem } from './WorldCalamitySystem';

export interface SaveMetadata {
  saveVersion?: number;
  savedAt: number;
  dateStr: string;
  day: number;
  week: number;
  activeHeroName: string;
  activeHeroClass: string;
  activeHeroLevel: number;
  activeHeroGold: number;
  totalPlayers: number;
}

export interface SaveOperationResult {
  success: boolean;
  error?: string;
  warning?: string;
  recoveredFromBackup?: boolean;
  bossState?: { currentHp: number; maxHp: number };
}

export interface SerializedPlayer {
  id: number;
  name: string;
  classKey: string;
  isAI: boolean;
  skinVariant: number;
  level: number;
  xp: number;
  xpNeeded: number;
  maxHp: number;
  hp: number;
  maxMp: number;
  mp: number;
  atk: number;
  def: number;
  mag: number;
  spd: number;
  luk: number;
  gold: number;
  townsControlled: number;
  townDeeds: number[];
  nodeId: number;
  prevNodeId: number | null;
  dungeonReturnNodeId?: number | null;
  gridX: number;
  gridY: number;
  gridZ: number;
  facing: string;
  activeSpinnerMultiplier: number;
  hasFlexibleMovement?: boolean;
  equipment: {
    weapon: EquipmentItem | null;
    shield: EquipmentItem | null;
    armor: EquipmentItem | null;
    accessory: EquipmentItem | null;
  };
  inventory: EquipmentItem[];
  fieldSpells: string[];
  rustTurns: number;
  poisonTurns?: number;
  freezeTurns?: number;
  blindTurns?: number;
  curseTurns?: number;
  sleepTurns?: number;
  squidInkTurns?: number;
  downerTurns?: number;
  bountyReward?: number;
  foodBuff: FoodBuff | null;
  activeGuildQuest: GuildQuest | null;
  guildRank: string;
  completedQuestsCount: number;
  isDarkling: boolean;
  darklingTurnsLeft: number;
  backupNormalStats: { maxHp: number; atk: number; def: number; mag: number; spd: number } | null;
  prank: PrankState;
  color: string;
  className: string;
  avatar: string;
  skillName?: string;
  homeNodeId: number | null;
  companion: CompanionData | null;
  originalClassKey?: string;
  isPromoted?: boolean;
  promotionTier?: number;
  aiPersonality?: 'balanced' | 'economist' | 'hunter' | 'tactician';
  matchStats?: {
    monstersKilled: number;
    pvpWins: number;
    goldEarnedTotal: number;
    townsCapturedTotal: number;
    pranksGiven: number;
    pranksReceived: number;
  };
  burstGauge?: number;
  relics?: string[];
  weaponUpgradeLevel?: number;
  weaponRune?: 'fire' | 'ice' | 'thunder' | 'poison' | null;
  polymorphTurns?: number;
  polymorphType?: 'pig' | 'mole' | null;
  mockeryTitle?: string;
  cursedBoxTurns?: number;
  darklingSpecialization?: 'destroyer' | 'reaper' | 'tormentor' | null;
}

export interface SaveGameData {
  world: WorldState;
  gameMode?: GameState['gameMode'];
  calamityState?: {
    chaosMeter: number;
    maxChaos: number;
    corruptedNodes: number[];
    calamityCount: number;
  };
  allowDarkling: boolean;
  blitzDayLimit: number;
  coopRaidDayLimit: number;
  aiState: { grudgeMatrix: Record<number, Record<number, number>>; moveHistory: Record<number, CombatMoveHistory> };
  decree: { activeDecree: RoyalDecree; bountyClaimed: boolean; activeWantedBounty: typeof royalDecreeSystem.activeWantedBounty };

  version: number;
  savedAt: number;
  dateStr: string;
  dayCounter: number;
  weekCounter: number;
  winGoal: string;
  activePlayerIdx: number;
  phase: string;
  players: SerializedPlayer[];
  townStates: Array<{ nodeId: number; townData: TownData }>;
  homeStates?: Array<{ nodeId: number; homeData: HomeData; type: string }>;
  logs: Array<{ text: string; type: 'info' | 'gold' | 'battle' | 'level' | 'darkling' }>;
  bossCurrentHp?: number;
  bossMaxHp?: number;
  aiDifficulty?: 'casual' | 'tactical' | 'ruthless';
  placedTraps?: Array<{ nodeId: number; ownerId: number; damage: number; type?: 'damage' | 'pitfall' | 'greed' | 'rust' }>;
}

const STORAGE_KEY = 'chronicles_of_fortune_savegame';
const META_KEY = 'chronicles_of_fortune_savemeta';

/**
 * Current on-disk save format. Bump this whenever the shape of SaveGameData changes and
 * add the corresponding migration in `load` - before this existed the field was written
 * but never read, so an incompatible save silently produced NaN stats instead of failing.
 */
const SAVE_VERSION = 2;

/** Reads a finite number out of untrusted JSON, falling back when it is missing or NaN. */
function numOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Equipment slots that always exist on a Player. */
const DEFAULT_EQUIPMENT = { weapon: null, shield: null, armor: null, accessory: null };
const isRecord = (value: unknown): value is Record<string, any> => !!value && typeof value === 'object' && !Array.isArray(value);
const MAX_IMPORT_LENGTH = 8 * 1024 * 1024;
const GAME_MODES = ['standard', 'blitz', 'coop_raid', 'endless_spire', 'roguelike_draft'];

export class SaveManager {
  private static getStorageKeys(slot: number = 1): { saveKey: string; metaKey: string; backupKey: string } {
    if (!Number.isInteger(slot) || slot < 0 || slot > 3) throw new Error('Invalid save slot');
    if (slot === 0) {
      return { saveKey: `${STORAGE_KEY}_auto`, metaKey: `${META_KEY}_auto`, backupKey: `${STORAGE_KEY}_auto_backup` };
    }
    if (slot === 1) {
      return { saveKey: STORAGE_KEY, metaKey: META_KEY, backupKey: `${STORAGE_KEY}_backup` };
    }
    return { saveKey: `${STORAGE_KEY}_slot_${slot}`, metaKey: `${META_KEY}_slot_${slot}`, backupKey: `${STORAGE_KEY}_slot_${slot}_backup` };
  }

  /** Validate before touching either the active world or an existing save slot. */
  public static validateSaveData(data: unknown): SaveOperationResult {
    if (!isRecord(data)) return { success: false, error: 'ข้อมูลบันทึกเสียหาย (โครงสร้างไม่ถูกต้อง)' };
    const version = numOr(data.version, 0);
    if (version < SAVE_VERSION) return { success: false, error: 'เซฟนี้เป็นกติกาเดิม กรุณาเริ่มการเดินทางใหม่' };
    if (version > SAVE_VERSION) return { success: false, error: `ไฟล์บันทึกเป็นเวอร์ชัน ${version} ซึ่งใหม่กว่าที่เกมนี้รองรับ (สูงสุด v${SAVE_VERSION})` };
    if (!Array.isArray(data.players) || data.players.length === 0 || data.players.length > 8) return { success: false, error: 'ไฟล์บันทึกไม่มีข้อมูลผู้เล่นที่ถูกต้อง' };
    if (!isRecord(data.world) || data.world.rulesVersion !== 2) return { success: false, error: 'ไม่พบสถานะโลกของกติกาใหม่' };
    const fail = (): SaveOperationResult => ({ success: false, error: 'ข้อมูลบันทึกเสียหาย (ข้อมูลโลกหรือผู้เล่นไม่สมบูรณ์)' });
    const pending: unknown[] = [data];
    let entries = 0;
    while (pending.length) {
      const value = pending.pop();
      if (++entries > 100000) return fail();
      if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
          if (['__proto__', 'prototype', 'constructor'].includes(key)) return fail();
          if (child && typeof child === 'object') pending.push(child);
        }
      }
    }
    if (Object.keys(data.world).some(key => Object.prototype.hasOwnProperty.call(WorldState.prototype, key))) return fail();
    if (data.gameMode != null && !GAME_MODES.includes(data.gameMode) || data.world.mode != null && !GAME_MODES.includes(data.world.mode)) return fail();
    if (data.aiDifficulty != null && !['casual', 'tactical', 'ruthless'].includes(data.aiDifficulty)) return fail();
    const ids = new Set<number>();
    for (const p of data.players) {
      if (!isRecord(p) || !Number.isInteger(p.id) || ids.has(p.id) || typeof p.name !== 'string' || typeof p.classKey !== 'string') return fail();
      ids.add(p.id);
      for (const key of ['inventory', 'fieldSpells', 'townDeeds', 'relics']) if (p[key] != null && !Array.isArray(p[key])) return fail();
      for (const key of ['equipment', 'prank', 'foodBuff', 'activeGuildQuest', 'companion', 'backupNormalStats', 'matchStats']) if (p[key] != null && !isRecord(p[key])) return fail();
      if (p.inventory?.some((item: unknown) => !isRecord(item) || typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.type !== 'string')) return fail();
      if (p.fieldSpells?.some((spell: unknown) => typeof spell !== 'string') || p.relics?.some((relic: unknown) => typeof relic !== 'string')) return fail();
      if (p.equipment && Object.values(p.equipment).some(item => item != null && !isRecord(item))) return fail();
    }
    for (const key of ['weather', 'forecast', 'threat', 'events', 'expeditions', 'bossHealth', 'bossKillers']) if (key in data.world && !isRecord(data.world[key])) return fail();
    for (const key of ['defeatedBosses', 'raidTargets', 'claimedTreasures', 'calamityHistory']) if (key in data.world && !Array.isArray(data.world[key])) return fail();
    if (!validRoyalContractState(data.world.royalContracts)) return fail();
    if (data.world.result != null && !isRecord(data.world.result)) return fail();
    if (data.world.calamity != null && !isRecord(data.world.calamity)) return fail();
    if (data.world.modifier != null && !isRecord(data.world.modifier)) return fail();
    if (Object.values(data.world.events ?? {}).some(memory => !isRecord(memory) || !Array.isArray(memory.recent) || !isRecord(memory.lastSeen) || !isRecord(memory.flags))) return fail();
    if (Object.values(data.world.expeditions ?? {}).some(run => !isRecord(run) || ['opened', 'visited', 'guardians', 'claimedFloors'].some(key => !Array.isArray(run[key])))) return fail();
    for (const key of ['townStates', 'homeStates', 'logs', 'placedTraps']) if (data[key] != null && !Array.isArray(data[key])) return fail();
    if (data.townStates?.some((entry: unknown) => !isRecord(entry) || !isRecord(entry.townData))) return fail();
    if (data.homeStates?.some((entry: unknown) => !isRecord(entry) || !isRecord(entry.homeData))) return fail();
    if (data.logs?.some((entry: unknown) => !isRecord(entry) || typeof entry.text !== 'string' || !['info', 'gold', 'battle', 'level', 'darkling'].includes(entry.type))) return fail();
    if (data.placedTraps?.some((entry: unknown) => !isRecord(entry) || !Number.isFinite(entry.nodeId) || !Number.isFinite(entry.damage))) return fail();
    for (const key of ['aiState', 'decree', 'calamityState']) if (data[key] != null && !isRecord(data[key])) return fail();
    if (data.aiState && (data.aiState.grudgeMatrix != null && !isRecord(data.aiState.grudgeMatrix) || data.aiState.moveHistory != null && !isRecord(data.aiState.moveHistory))) return fail();
    if (data.decree && (!isRecord(data.decree.activeDecree) || typeof data.decree.activeDecree.id !== 'string')) return fail();
    if (data.calamityState?.corruptedNodes != null && !Array.isArray(data.calamityState.corruptedNodes)) return fail();
    return { success: true };
  }

  private static metadataFor(data: SaveGameData): SaveMetadata {
    const index = Math.max(0, Math.min(data.players.length - 1, Math.trunc(numOr(data.activePlayerIdx, 0))));
    const hero = data.players[index];
    return {
      saveVersion: numOr(data.version, SAVE_VERSION), savedAt: numOr(data.savedAt, 0), dateStr: typeof data.dateStr === 'string' ? data.dateStr : '',
      day: Math.max(1, numOr(data.dayCounter, 1)), week: Math.max(1, numOr(data.weekCounter, 1)),
      activeHeroName: hero.name || 'Unknown Hero', activeHeroClass: typeof hero.className === 'string' ? hero.className : 'Warrior',
      activeHeroLevel: Math.max(1, numOr(hero.level, 1)), activeHeroGold: Math.max(0, numOr(hero.gold, 0)), totalPlayers: data.players.length
    };
  }

  private static parseStoredData(raw: string | null): { data?: SaveGameData; error?: string } {
    if (!raw) return {};
    try {
      const data: unknown = JSON.parse(raw);
      const validation = this.validateSaveData(data);
      return validation.success ? { data: data as SaveGameData } : { error: validation.error };
    } catch { return { error: 'ไฟล์บันทึกเสียหาย (อ่านรูปแบบข้อมูลไม่ได้)' }; }
  }

  /** The payload is authoritative; a failed metadata write never makes it disappear. */
  private static writeStoredData(data: SaveGameData, slot: number): SaveOperationResult {
    try {
      const { saveKey, metaKey, backupKey } = this.getStorageKeys(slot);
      const previous = localStorage.getItem(saveKey);
      let warning: string | undefined;
      // Never replace the recovery copy with a damaged primary file.
      if (this.parseStoredData(previous).data) {
        try { localStorage.setItem(backupKey, previous!); }
        catch { warning = 'บันทึกสำเร็จ แต่พื้นที่ไม่พอสำหรับสำเนาสำรองรอบก่อน'; }
      }
      localStorage.setItem(saveKey, JSON.stringify(data));
      try { localStorage.setItem(metaKey, JSON.stringify(this.metadataFor(data))); }
      catch { /* The slot list derives its metadata from the committed payload. */ }
      return { success: true, warning };
    } catch {
      return { success: false, error: 'บันทึกไม่สำเร็จ พื้นที่จัดเก็บเต็มหรือเบราว์เซอร์ไม่อนุญาตให้บันทึก ข้อมูลเดิมยังอยู่' };
    }
  }

  public static getSlotMetas(): Array<{ slot: number; meta: SaveMetadata | null }> {
    return [0, 1, 2, 3].map(slot => ({ slot, meta: this.getSaveMetadata(slot) }));
  }

  public static autoSave(game: GameState, bossState?: { currentHp: number; maxHp: number }): boolean {
    return this.save(game, bossState, 0);
  }

  public static exportSaveData(slot: number = 1): string | null {
    try {
      const { saveKey } = this.getStorageKeys(slot);
      const recoverable = this.readSlotData(slot);
      const raw = recoverable.data ? JSON.stringify(recoverable.data) : localStorage.getItem(saveKey);
      if (!raw) return null;
      const bytes = new TextEncoder().encode(raw);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    } catch (err) {
      console.error('Failed to export save data:', err);
      return null;
    }
  }

  public static importSaveData(game: GameState, encodedStr: string, slot: number = 1): SaveOperationResult {
    try {
      if (typeof encodedStr !== 'string' || !encodedStr.trim() || encodedStr.length > MAX_IMPORT_LENGTH) {
        return { success: false, error: 'รหัสข้อมูลบันทึกไม่ถูกต้องหรือมีขนาดใหญ่เกินไป' };
      }
      const trimmed = encodedStr.trim();
      let jsonStr: string;
      if (trimmed.startsWith('{')) jsonStr = trimmed;
      else {
        const binary = atob(trimmed);
        const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
        jsonStr = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      }
      const data = JSON.parse(jsonStr) as SaveGameData;
      const prepared = this.prepareSaveData(game, data);
      if (!prepared.success || !prepared.preparedGame) return prepared;
      const stored = this.writeStoredData(data, slot);
      if (!stored.success) return stored;
      this.commitPreparedSave(game, prepared.preparedGame, data, true);
      return { success: true, bossState: prepared.bossState, warning: stored.warning };
    } catch {
      return { success: false, error: 'ถอดรหัสข้อมูลบันทึกไม่สำเร็จ โปรดตรวจสอบรหัสที่คัดลอกมา' };
    }
  }

  public static clearSave(slot: number = 1): void {
    this.clear(slot);
  }

  public static serializeGameState(game: GameState, bossState?: { currentHp: number; maxHp: number }): SaveGameData {
    const now = new Date();
    const dateStr = now.toLocaleDateString('th-TH', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    const nodeById = new Map(game.allNodes.map(n => [n.id, n]));

    const serializedPlayers: SerializedPlayer[] = game.players.map(p => {
      const here = nodeById.get(p.nodeId);
      return {
        id: p.id, name: p.name, classKey: p.classKey, isAI: p.isAI,
        skinVariant: p.skinVariant || 0, level: p.level, xp: p.xp, xpNeeded: p.xpNeeded,
        maxHp: p.maxHp, hp: p.hp, maxMp: p.maxMp, mp: p.mp,
        atk: p.atk, def: p.def, mag: p.mag, spd: p.spd, luk: p.luk, gold: p.gold,
        townsControlled: p.townsControlled, townDeeds: [...p.townDeeds],
        nodeId: p.nodeId, prevNodeId: p.prevNodeId, dungeonReturnNodeId: p.dungeonReturnNodeId,
        gridX: here ? here.gx : p.gridX,
        gridY: here ? here.gy : p.gridY,
        gridZ: here ? here.gz : p.gridZ,
        facing: p.facing, activeSpinnerMultiplier: p.activeSpinnerMultiplier,
        hasFlexibleMovement: p.hasFlexibleMovement,
        equipment: JSON.parse(JSON.stringify(p.equipment)),
        inventory: JSON.parse(JSON.stringify(p.inventory)),
        fieldSpells: [...p.fieldSpells],
        sleepTurns: p.sleepTurns, squidInkTurns: p.squidInkTurns, downerTurns: p.downerTurns, bountyReward: p.bountyReward,
        rustTurns: p.rustTurns,
        poisonTurns: p.poisonTurns,
        freezeTurns: p.freezeTurns,
        blindTurns: p.blindTurns,
        curseTurns: p.curseTurns,
        foodBuff: p.foodBuff ? JSON.parse(JSON.stringify(p.foodBuff)) : null,
        activeGuildQuest: p.activeGuildQuest ? JSON.parse(JSON.stringify(p.activeGuildQuest)) : null,
        guildRank: p.guildRank, completedQuestsCount: p.completedQuestsCount,
        isDarkling: p.isDarkling, darklingTurnsLeft: p.darklingTurnsLeft,
        backupNormalStats: p.backupNormalStats ? JSON.parse(JSON.stringify(p.backupNormalStats)) : null,
        prank: JSON.parse(JSON.stringify(p.prank)),
        color: p.color, className: p.className, avatar: p.avatar, skillName: p.skillName,
        homeNodeId: p.homeNodeId,
        companion: p.companion ? JSON.parse(JSON.stringify(p.companion)) : null,
        originalClassKey: p.originalClassKey,
        isPromoted: p.isPromoted,
        promotionTier: p.promotionTier,
        aiPersonality: p.aiPersonality,
        matchStats: JSON.parse(JSON.stringify(p.matchStats)),
        burstGauge: p.burstGauge,
        relics: [...p.relics],
        weaponUpgradeLevel: p.weaponUpgradeLevel,
        weaponRune: p.weaponRune,
        polymorphTurns: p.polymorphTurns,
        polymorphType: p.polymorphType,
        mockeryTitle: p.mockeryTitle,
        cursedBoxTurns: p.cursedBoxTurns,
        darklingSpecialization: p.darklingSpecialization
      };
    });

    const townStates: Array<{ nodeId: number; townData: TownData }> = [];
    const homeStates: Array<{ nodeId: number; homeData: any; type: string }> = [];
    game.allNodes.forEach(n => {
      if (n.townData) {
        townStates.push({ nodeId: n.id, townData: JSON.parse(JSON.stringify(n.townData)) });
      }
      if (n.homeData) {
        homeStates.push({ nodeId: n.id, homeData: JSON.parse(JSON.stringify(n.homeData)), type: n.type });
      }
    });

    return {
      world: JSON.parse(JSON.stringify(game.world)),
      gameMode: game.gameMode,
      calamityState: {
        chaosMeter: worldCalamitySystem.chaosMeter,
        maxChaos: worldCalamitySystem.maxChaos,
        corruptedNodes: [...worldCalamitySystem.corruptedNodes],
        calamityCount: worldCalamitySystem.calamityCount
      },
      allowDarkling: game.allowDarkling, blitzDayLimit: game.blitzDayLimit, coopRaidDayLimit: game.coopRaidDayLimit,
      aiState: JSON.parse(JSON.stringify({ grudgeMatrix: aiSystem.grudgeMatrix, moveHistory: aiSystem.moveHistory })),
      decree: JSON.parse(JSON.stringify({ activeDecree: royalDecreeSystem.activeDecree, bountyClaimed: royalDecreeSystem.bountyClaimed, activeWantedBounty: royalDecreeSystem.activeWantedBounty })),
      version: SAVE_VERSION, savedAt: Date.now(), dateStr,
      dayCounter: game.dayCounter, weekCounter: game.weekCounter,
      winGoal: game.winGoal, activePlayerIdx: game.activePlayerIdx,
      phase: (game.phase as string) === 'BATTLE' || (game.phase as string) === 'PVP_CHOICE' ? 'BOARD_TURN' : game.phase,
      players: serializedPlayers, townStates, homeStates,
      logs: JSON.parse(JSON.stringify(game.logs.slice(0, 30))),
      bossCurrentHp: bossState?.currentHp,
      bossMaxHp: bossState?.maxHp,
      aiDifficulty: game.aiDifficulty || 'tactical',
      placedTraps: JSON.parse(JSON.stringify(game.placedTraps || []))
    };
  }

  private static prepareSaveData(game: GameState, data: SaveGameData): SaveOperationResult & { preparedGame?: GameState } {
    try {
      const validation = this.validateSaveData(data);
      if (!validation.success) return validation;
      // Hydrate a private candidate. No running board, RNG or shared subsystem changes
      // until every player and map entry has been constructed successfully.
      data = structuredClone(data);
      game = Object.assign(Object.create(Object.getPrototypeOf(game)), game) as GameState;
      game.world = WorldState.restore(data.world);
      const defaults = new WorldState(data.world.seed);
      for (const realm of Object.keys(defaults.weather) as Array<keyof WorldState['weather']>) {
        const weather = data.world.weather?.[realm];
        const forecast = data.world.forecast?.[realm];
        const weatherTypes = ['sunny', 'rain', 'snow', 'heatwave', 'miasma', 'blood_moon', 'sandstorm'];
        game.world.weather[realm] = weatherTypes.includes(weather) ? weather : defaults.weather[realm];
        game.world.forecast[realm] = weatherTypes.includes(forecast) ? forecast : defaults.forecast[realm];
        game.world.threat[realm] = Math.max(0, Math.min(100, numOr(data.world.threat?.[realm], 0)));
      }
      game.world.seed = (numOr(data.world.seed, game.world.seed) >>> 0) || 1;
      game.world.rng = (numOr(data.world.rng, game.world.seed) >>> 0) || 1;
      game.world.day = Math.max(1, Math.trunc(numOr(data.world.day, 1)));
      game.world.round = Math.max(0, Math.trunc(numOr(data.world.round, 0)));
      game.world.hour = Math.max(0, Math.min(23, numOr(data.world.hour, 8)));
      if (data.gameMode) game.gameMode = data.gameMode;
      game.allowDarkling = typeof data.allowDarkling === 'boolean' ? data.allowDarkling : true;
      game.blitzDayLimit = Math.max(1, numOr(data.blitzDayLimit, 20));
      game.coopRaidDayLimit = Math.max(1, numOr(data.coopRaidDayLimit, 30));
      game.resetBoard();
      if (data.players.some(p => dungeonSystem.isInDungeon(p.nodeId))) dungeonSystem.ensureDungeonLoaded(game);
      const nodesById = new Map(game.allNodes.map(n => [n.id, n]));

      const savedRandomState = game.world.rng;
      game.players = data.players.map(sp => {
        const p = new Player(numOr(sp.id, 1), sp.name, sp.classKey, sp.isAI, numOr(sp.nodeId, 0), numOr(sp.skinVariant, 0));
        p.level = Math.max(1, numOr(sp.level, 1));
        p.xp = Math.max(0, numOr(sp.xp, 0));
        p.xpNeeded = Math.max(1, numOr(sp.xpNeeded, 100));
        p.maxHp = Math.max(1, numOr(sp.maxHp, 100));
        p.hp = Math.min(p.maxHp, Math.max(0, numOr(sp.hp, p.maxHp)));
        p.maxMp = Math.max(0, numOr(sp.maxMp, 0));
        p.mp = Math.min(p.maxMp, Math.max(0, numOr(sp.mp, p.maxMp)));
        p.atk = Math.max(0, numOr(sp.atk, 10));
        p.def = Math.max(0, numOr(sp.def, 10));
        p.mag = Math.max(0, numOr(sp.mag, 10));
        p.spd = Math.max(0, numOr(sp.spd, 10));
        p.luk = Math.max(0, numOr(sp.luk, 10));
        p.gold = Math.max(0, numOr(sp.gold, 300));
        p.townDeeds = Array.isArray(sp.townDeeds) ? sp.townDeeds.filter(d => nodesById.has(d)) : [];
        p.townsControlled = p.townDeeds.length;
        p.prevNodeId = nodesById.has(numOr(sp.prevNodeId, -1)) ? numOr(sp.prevNodeId, -1) : null;
        p.dungeonReturnNodeId = nodesById.has(numOr(sp.dungeonReturnNodeId, -1)) ? numOr(sp.dungeonReturnNodeId, -1) : null;
        if (!nodesById.has(p.nodeId)) p.nodeId = 0;
        const here = nodesById.get(p.nodeId);
        p.gridX = here ? here.gx : numOr(sp.gridX, 0);
        p.gridY = here ? here.gy : numOr(sp.gridY, 0);
        p.gridZ = here ? here.gz : numOr(sp.gridZ, 0);
        p.facing = (sp.facing as any) || 'SE';
        p.activeSpinnerMultiplier = Math.max(1, numOr(sp.activeSpinnerMultiplier, 1));
        p.hasFlexibleMovement = Boolean(sp.hasFlexibleMovement);
        p.equipment = { ...DEFAULT_EQUIPMENT, ...(sp.equipment || {}) };
        p.inventory = Array.isArray(sp.inventory) ? sp.inventory : [];
        p.fieldSpells = Array.isArray(sp.fieldSpells) ? sp.fieldSpells : [];
        p.sleepTurns = Math.max(0, numOr(sp.sleepTurns, 0)); p.squidInkTurns = Math.max(0, numOr(sp.squidInkTurns, 0)); p.downerTurns = Math.max(0, numOr(sp.downerTurns, 0)); p.bountyReward = Math.max(0, numOr(sp.bountyReward, 0));
        p.rustTurns = Math.max(0, numOr(sp.rustTurns, 0));
        p.poisonTurns = Math.max(0, numOr(sp.poisonTurns, 0));
        p.freezeTurns = Math.max(0, numOr(sp.freezeTurns, 0));
        p.blindTurns = Math.max(0, numOr(sp.blindTurns, 0));
        p.curseTurns = Math.max(0, numOr(sp.curseTurns, 0));
        p.foodBuff = sp.foodBuff || null;
        p.activeGuildQuest = sp.activeGuildQuest || null;
        p.guildRank = (sp.guildRank as any) || 'F';
        p.completedQuestsCount = Math.max(0, numOr(sp.completedQuestsCount, 0));
        p.isDarkling = !!sp.isDarkling;
        p.darklingTurnsLeft = Math.max(0, numOr(sp.darklingTurnsLeft, 0));
        p.backupNormalStats = sp.backupNormalStats || null;
        p.prank = sp.prank || { hasGraffiti: false, turnsRemaining: 0 };
        p.color = sp.color || p.color;
        p.className = sp.className || p.className;
        p.avatar = sp.avatar || p.avatar;
        p.skillName = sp.skillName || p.skillName;
        p.homeNodeId = nodesById.has(numOr(sp.homeNodeId, -1)) ? numOr(sp.homeNodeId, -1) : null;
        p.companion = sp.companion ?? null;
        p.originalClassKey = sp.originalClassKey || sp.classKey || 'warrior';
        p.isPromoted = Boolean(sp.isPromoted);
        p.promotionTier = Math.max(1, Math.min(3, numOr(sp.promotionTier, p.isPromoted ? 2 : 1)));
        if (p.isPromoted && !sp.skillName) {
          const allPromos = [...Object.values(JOB_PROMOTIONS), ...Object.values(TIER3_PROMOTIONS)].flat();
          const matchedPromo = allPromos.find(pr => pr.tier2Key === p.classKey);
          if (matchedPromo) p.skillName = matchedPromo.skillName;
        }
        p.aiPersonality = (sp.aiPersonality as any) || 'balanced';
        p.matchStats = {
          monstersKilled: numOr(sp.matchStats?.monstersKilled, 0),
          pvpWins: numOr(sp.matchStats?.pvpWins, 0),
          goldEarnedTotal: numOr(sp.matchStats?.goldEarnedTotal, p.gold),
          townsCapturedTotal: numOr(sp.matchStats?.townsCapturedTotal, p.townsControlled),
          pranksGiven: numOr(sp.matchStats?.pranksGiven, 0),
          pranksReceived: numOr(sp.matchStats?.pranksReceived, 0)
        };
        p.burstGauge = Math.max(0, Math.min(100, numOr(sp.burstGauge, 0)));
        p.relics = Array.isArray(sp.relics) ? [...sp.relics] : [];
        p.dragonHeartBonusApplied = p.relics.includes('dragon_heart');
        p.weaponUpgradeLevel = Math.max(0, Math.min(9, numOr(sp.weaponUpgradeLevel, 0)));
        p.weaponRune = sp.weaponRune || null;
        p.polymorphTurns = Math.max(0, numOr(sp.polymorphTurns, 0));
        p.polymorphType = sp.polymorphType || null;
        p.mockeryTitle = sp.mockeryTitle || '';
        p.cursedBoxTurns = Math.max(0, numOr(sp.cursedBoxTurns, 0));
        p.darklingSpecialization = sp.darklingSpecialization || null;
        return p;
      });

      game.world.rng = savedRandomState;
      if (Array.isArray(data.townStates)) {
        data.townStates.forEach(ts => {
          const node = nodesById.get(numOr(ts?.nodeId, -1));
          if (node?.townData && ts?.townData) {
            node.townData = ts.townData;
          }
        });
      }

      if (Array.isArray(data.homeStates)) {
        data.homeStates.forEach(hs => {
          const node = nodesById.get(numOr(hs?.nodeId, -1));
          if (node && hs?.homeData) {
            node.homeData = hs.homeData;
            if (hs.type) node.type = hs.type as any;
          }
        });
      }

      for (const player of game.players) {
        player.townDeeds = game.allNodes.filter(n => n.townData?.ownerId === player.id).map(n => n.id);
        player.townsControlled = player.townDeeds.length;
      }
      game.dayCounter = Math.max(1, numOr(data.dayCounter, 1));
      game.weekCounter = Math.max(1, numOr(data.weekCounter, 1));
      game.winGoal = data.winGoal || 'networth';
      if (data.aiDifficulty) {
        game.aiDifficulty = data.aiDifficulty;
      }
      game.placedTraps = Array.isArray(data.placedTraps) ? data.placedTraps.filter(trap => nodesById.has(trap.nodeId)) : [];
      game.activePlayerIdx = Math.min(Math.max(0, Math.trunc(numOr(data.activePlayerIdx, 0))), game.players.length - 1);
      game.phase = game.world.result ? 'VICTORY' : 'BOARD_TURN';
      game.remainingMoves = 0;
      game.highlightedNodes = [];
      game.activePreviewPath = [];
      game.activeBattle = null;
      game.activeBattleEnemyCombatant = null;
      game.pendingTileNode = null;
      game.pendingPvPVictim = null;
      game.logs = Array.isArray(data.logs) ? data.logs.slice(0, 60) : [];
      return {
        success: true, preparedGame: game,
        bossState: numOr(data.bossCurrentHp, 0) > 0
          ? { currentHp: numOr(data.bossCurrentHp, 0), maxHp: numOr(data.bossMaxHp, 380) }
          : undefined
      };
    } catch (err) {
      console.error('Failed to apply save data:', err);
      return { success: false, error: 'เกิดข้อผิดพลาดขณะโหลดข้อมูลบันทึก' };
    }
  }

  private static commitPreparedSave(game: GameState, prepared: GameState, data: SaveGameData, announceLog: boolean): void {
    Object.assign(game, prepared);
    bindWorld(game.world);
    const calamity = data.calamityState;
    worldCalamitySystem.chaosMeter = Math.max(0, numOr(calamity?.chaosMeter, 0));
    worldCalamitySystem.maxChaos = Math.max(1, numOr(calamity?.maxChaos, 100));
    worldCalamitySystem.corruptedNodes = Array.isArray(calamity?.corruptedNodes) ? [...calamity.corruptedNodes] : [];
    worldCalamitySystem.calamityCount = Math.max(0, numOr(calamity?.calamityCount, 0));
    aiSystem.grudgeMatrix = structuredClone(data.aiState?.grudgeMatrix ?? {});
    aiSystem.moveHistory = structuredClone(data.aiState?.moveHistory ?? {});
    if (data.decree) {
      royalDecreeSystem.activeDecree = structuredClone(data.decree.activeDecree);
      royalDecreeSystem.bountyClaimed = !!data.decree.bountyClaimed;
      royalDecreeSystem.activeWantedBounty = structuredClone(data.decree.activeWantedBounty);
    } else royalDecreeSystem.reset();
    if (announceLog) {
      // A UI callback failure must not turn an already committed load into a false failure.
      try { game.addLog(`📂 โหลดบันทึกสำเร็จ! (วันที่ ${game.dayCounter}, สัปดาห์ที่ ${game.weekCounter})`, 'info'); }
      catch (error) { console.error('Save loaded, but its notification could not be displayed:', error); }
    }
  }

  public static applySaveData(game: GameState, data: SaveGameData, announceLog: boolean = true): SaveOperationResult {
    const prepared = this.prepareSaveData(game, data);
    if (!prepared.success || !prepared.preparedGame) return { success: false, error: prepared.error };
    this.commitPreparedSave(game, prepared.preparedGame, data, announceLog);
    return { success: true, bossState: prepared.bossState };
  }

  public static save(game: GameState, bossState?: { currentHp: number; maxHp: number }, slot: number = 1): boolean {
    return this.saveWithResult(game, bossState, slot).success;
  }

  public static saveWithResult(game: GameState, bossState?: { currentHp: number; maxHp: number }, slot: number = 1): SaveOperationResult {
    try {
      if (!game || game.players.length === 0) return { success: false, error: 'ยังไม่มีการเดินทางให้บันทึก' };
      const data = this.serializeGameState(game, bossState);
      const validation = this.validateSaveData(data);
      if (!validation.success) return validation;
      return this.writeStoredData(data, slot);
    } catch {
      return { success: false, error: 'สร้างข้อมูลบันทึกไม่สำเร็จ ข้อมูลเดิมยังอยู่' };
    }
  }

  private static readSlotData(slot: number): { data?: SaveGameData; error?: string; recoveredFromBackup?: boolean } {
    const { saveKey, backupKey } = this.getStorageKeys(slot);
    const raw = localStorage.getItem(saveKey);
    const primary = this.parseStoredData(raw);
    if (primary.data) return primary;
    if (raw) {
      try {
        const version = JSON.parse(raw)?.version;
        // An older/newer format is not corruption. Never silently substitute an old run.
        if (typeof version === 'number' && version !== SAVE_VERSION) return primary;
      } catch { /* An unreadable primary can be recovered from its last good copy. */ }
    }
    const backup = this.parseStoredData(localStorage.getItem(backupKey));
    if (backup.data) return { data: backup.data, recoveredFromBackup: true };
    return { error: primary.error || backup.error || `ไม่พบข้อมูลบันทึกในช่องที่ ${slot}` };
  }

  public static load(game: GameState, slot: number = 1): SaveOperationResult {
    try {
      const stored = this.readSlotData(slot);
      if (!stored.data) return { success: false, error: stored.error };
      const applied = this.applySaveData(game, stored.data);
      return { ...applied, recoveredFromBackup: applied.success && stored.recoveredFromBackup || undefined };
    } catch {
      return { success: false, error: 'เกิดข้อผิดพลาดในการโหลดข้อมูลบันทึก' };
    }
  }

  public static hasSave(slot: number = 1): boolean {
    try {
      const { saveKey, backupKey } = this.getStorageKeys(slot);
      return !!(localStorage.getItem(saveKey) || localStorage.getItem(backupKey));
    } catch { return false; }
  }

  public static getSaveMetadata(slot: number = 1): SaveMetadata | null {
    try {
      const stored = this.readSlotData(slot);
      if (stored.data) return this.metadataFor(stored.data);
      // Keep incompatible saves visible so the player can export them or see the version error.
      const { saveKey } = this.getStorageKeys(slot);
      const data = JSON.parse(localStorage.getItem(saveKey) || 'null');
      if (isRecord(data) && typeof data.version === 'number' && data.version !== SAVE_VERSION && Array.isArray(data.players) && data.players.length &&
        data.players.every((player: unknown) => isRecord(player) && typeof player.name === 'string')) {
        return this.metadataFor(data as SaveGameData);
      }
      return null;
    } catch { return null; }
  }

  public static clear(slot: number = 1): void {
    try {
      const { saveKey, metaKey, backupKey } = this.getStorageKeys(slot);
      localStorage.removeItem(saveKey);
      localStorage.removeItem(backupKey);
      localStorage.removeItem(metaKey);
    } catch (err) {
      console.error('Failed to clear savegame:', err);
    }
  }
}
