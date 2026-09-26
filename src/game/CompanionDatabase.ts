import rawCompanions from './companions.json';
import type { CompanionData } from './Player';

/**
 * The single source of truth for every companion in the game.
 *
 * Names, skill text and the art descriptors live in `companions.json` rather than in
 * TypeScript because two consumers need them: the runtime (this module) and the off-line
 * sprite generator in `scripts/generate_companion_sprites.cjs`. Keeping one file means a new
 * companion can never exist in the game without also getting a 64x64 model.
 *
 * The `art` block is a compact recipe - palette plus silhouette features - that the generator
 * turns into a 64x64 pixel-art sprite at `public/assets/companions/<key>.png`.
 */

export type CompanionRole = 'striker' | 'healer' | 'guardian' | 'mage';

export interface CompanionArt {
  skin: string;
  hair: string;
  hairStyle: 'long' | 'twin' | 'short' | 'bun' | 'ponytail';
  outfit: string;
  accent: string;
  eyes: string;
  body: 'human' | 'slime' | 'ghost' | 'mech' | 'mermaid';
  ears: 'none' | 'goblin' | 'dog' | 'wolf' | 'cat' | 'fox' | 'elf' | 'yeti';
  horns: 'none' | 'dragon' | 'imp' | 'demon';
  wings: 'none' | 'dragon' | 'bat' | 'feather';
  tail: 'none' | 'dog' | 'fox9' | 'cat' | 'scorpion' | 'mermaid' | 'dragon' | 'slime';
  headwear: 'none' | 'maid' | 'hat' | 'crown' | 'turban' | 'bandana' | 'bandage' | 'mask' | 'flower' | 'halo';
  weapon: 'none' | 'dagger' | 'sword' | 'staff' | 'gun' | 'fan' | 'claw';
  aura: string | null;
}

export interface CompanionProfile {
  key: string;
  name: string;
  title: string;
  avatar: string;
  role: CompanionRole;
  skillName: string;
  skillDesc: string;
  dialogue: string;
  color: string;
  art: CompanionArt;
}

interface CompanionsFile {
  version: number;
  spriteSize: number;
  assetDir: string;
  fallbackKey: string;
  companions: CompanionProfile[];
  roster: Record<string, string>;
}

const data = rawCompanions as unknown as CompanionsFile;

export const COMPANION_SPRITE_SIZE = data.spriteSize;
export const COMPANION_ASSET_DIR = data.assetDir;
export const COMPANION_FALLBACK_KEY = data.fallbackKey;

const byKey = new Map(data.companions.map(profile => [profile.key, profile]));

/**
 * Companion ids written by earlier builds, before every companion had a stable key.
 * Without this an old save would fall back to the generic beast-girl model.
 */
const LEGACY_ID_MAP: Record<string, string> = {
  comp_hired_mia: 'mia',
  comp_hired_sylphira: 'sylphira'
};

export function listCompanionProfiles(): CompanionProfile[] {
  return data.companions;
}

export function getCompanionProfile(key: string | null | undefined): CompanionProfile {
  const resolved = (key && byKey.get(key)) || byKey.get(data.fallbackKey);
  if (!resolved) {
    throw new Error(`companions.json is missing the fallback entry "${data.fallbackKey}"`);
  }
  return resolved;
}

/** Resolves the model key for a companion carried by a hero, tolerating older save data. */
export function resolveCompanionKey(companion: Pick<CompanionData, 'id' | 'spriteKey' | 'name'>): string {
  if (companion.spriteKey && byKey.has(companion.spriteKey)) return companion.spriteKey;
  if (companion.id && byKey.has(companion.id)) return companion.id;
  if (companion.id && LEGACY_ID_MAP[companion.id]) return LEGACY_ID_MAP[companion.id];
  const byName = data.companions.find(profile => profile.name === companion.name);
  return byName ? byName.key : data.fallbackKey;
}

/** Public URL of a companion's 64x64 model. */
export function companionSpritePath(key: string): string {
  return `/${data.assetDir}/${getCompanionProfile(key).key}.png`;
}

/** The companion a defeated monster can befriend, if any. */
export function companionKeyForDefeatedMonster(monsterName: string): string {
  return data.roster[monsterName] || data.fallbackKey;
}

/** Every key that must have a generated model on disk. */
export function allCompanionKeys(): string[] {
  return data.companions.map(profile => profile.key);
}

/** Builds the runtime record a hero carries once a companion joins. */
export function createCompanion(
  key: string,
  options: { contractTurnsRemaining?: number } = {}
): CompanionData {
  const profile = getCompanionProfile(key);
  return {
    id: `comp_${profile.key}`,
    spriteKey: profile.key,
    name: profile.name,
    title: profile.title,
    avatar: profile.avatar,
    role: profile.role,
    skillName: profile.skillName,
    skillDesc: profile.skillDesc,
    affinity: 100,
    dialogue: profile.dialogue,
    bonusDesc: profile.skillDesc,
    color: profile.color,
    contractTurnsRemaining: options.contractTurnsRemaining
  };
}
