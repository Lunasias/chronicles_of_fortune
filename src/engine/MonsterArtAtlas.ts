import { atlasRowCuts } from './ClassArtAtlas';
import { isolateAtlasCell } from './AtlasSprites';
import type { CharacterAnimState, IsoDirection } from './PixelSpriteGenerator';

const GROUPS: Record<string, string[]> = {
  wild: ['slime_princess', 'goblin_girl', 'beast_maiden', 'dark_knightress', 'dragon_princess_ignis', 'sakura_kitsune'],
  frontier: ['skeletal_maid', 'yeti_maiden', 'siren_demoness', 'clockwork_maid', 'bandit_pirate', 'dragon_wyrm'],
  mythic: ['kraken_maiden', 'sphinx_queen', 'dryad_nymph', 'arachne_weaver', 'vampire_countess', 'ghost_maiden']
};

/** Battle-facing monster poses; the original eight-direction files remain the fallback. */
class MonsterArtAtlas {
  private failed = new Set<string>();
  private sheets = new Map<string, { image: HTMLImageElement; cuts: number[]; ready: boolean }>();
  private frames = new Map<string, HTMLCanvasElement>();
  hasFailed(archetype: string): boolean {
    return Object.keys(GROUPS).some(group => GROUPS[group].includes(archetype) && this.failed.has(group));
  }
  getFrame(archetype: string, dir: IsoDirection, state: CharacterAnimState, frame: number): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;
    const group = Object.keys(GROUPS).find(key => GROUPS[key].includes(archetype));
    if (!group) return null;
    const actions = ['magic', 'defeat', 'victory'].includes(state);
    const sheetKey = `${group}_${actions ? 'actions' : 'motion'}`;
    let sheet = this.sheets.get(sheetKey);
    if (!sheet) {
      const image = new Image(); sheet = { image, cuts: [], ready: false }; this.sheets.set(sheetKey, sheet);
      const entry = sheet;
      image.onload = () => {
        const scratch = document.createElement('canvas'); scratch.width = image.naturalWidth; scratch.height = image.naturalHeight;
        const out = scratch.getContext('2d')!; out.drawImage(image, 0, 0);
        entry.cuts = atlasRowCuts(out.getImageData(0, 0, scratch.width, scratch.height).data, scratch.width, scratch.height, 6);
        entry.ready = true;
        window.dispatchEvent(new CustomEvent('monster-art-loaded'));
      };
      image.onerror = () => { if (!actions) this.failed.add(group); };
      image.src = `/assets/art-v2/monsters-${group}${actions ? '-actions' : ''}-atlas.png`;
    }
    if (!sheet.ready) return actions ? this.getFrame(archetype, dir, state === 'magic' ? 'attack' : state === 'defeat' ? 'hurt' : 'idle', frame) : null;
    const beat = ((Math.floor(frame) % 8) + 8) % 8;
    const pose = actions ? state === 'defeat' ? 2 : state === 'victory' ? 3 : beat < 3 ? 0 : 1
      : state === 'hurt' ? 3 : state === 'counter' ? 1 : ['attack', 'strike'].includes(state) ? [0, 0, 1, 2, 2, 2, 1, 0][beat] : 0;
    const sourceFacesRight = !actions && (archetype === 'goblin_girl' || archetype === 'dark_knightress');
    const facingRight = ['E', 'SE', 'NE', 'S'].includes(dir);
    const flip = facingRight !== sourceFacesRight;
    const row = GROUPS[group].indexOf(archetype), key = `${archetype}_${actions}_${pose}_${flip}`;
    const cached = this.frames.get(key); if (cached) return cached;
    const image = sheet.image, top = sheet.cuts[row], bottom = sheet.cuts[row + 1];
    const left = Math.round(pose * image.naturalWidth / 4), right = Math.round((pose + 1) * image.naturalWidth / 4);
    const scale = 64 / (image.naturalHeight / 6);
    const canvas = document.createElement('canvas'); canvas.width = 112; canvas.height = 96;
    const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false;
    ctx.drawImage(image, left, top, right - left, bottom - top, 8, 0, Math.min(104, Math.round((right - left) * scale)), Math.min(96, Math.round((bottom - top) * scale)));
    const pixels = ctx.getImageData(0, 0, 112, 96); isolateAtlasCell(pixels.data, 112, 96);
    let footY = 0;
    for (let y = 0; y < 96; y++) for (let x = 0; x < 112; x++) if (pixels.data[(y * 112 + x) * 4 + 3]) footY = y;
    let sum = 0, count = 0;
    for (let y = Math.max(0, footY - 3); y <= footY; y++) for (let x = 0; x < 112; x++) if (pixels.data[(y * 112 + x) * 4 + 3]) { sum += x; count++; }
    ctx.putImageData(pixels, 0, 0);
    const settled = document.createElement('canvas'); settled.width = 112; settled.height = 96;
    const out = settled.getContext('2d')!; out.imageSmoothingEnabled = false;
    if (flip) { out.translate(112, 0); out.scale(-1, 1); }
    out.drawImage(canvas, 56 - Math.round(sum / Math.max(1, count)), 80 - footY);
    this.frames.set(key, settled); return settled;
  }
}
export const monsterArtAtlas = new MonsterArtAtlas();
