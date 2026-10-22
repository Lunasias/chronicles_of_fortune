import type { GameState } from '../game/GameState';
import type { BoardNode } from '../game/BoardMap';
import { STORYLINES, acceptStory, claimStory, recordStoryVisit, storyLedger, storyProgress } from '../game/CampaignStories';
import { chooseJourney } from './JourneyUI';

export function offerStoryline(game: GameState, node: BoardNode, resume: () => void): boolean {
  const p = game.activePlayer; recordStoryVisit(game, p, node);
  const story = STORYLINES.find(s => s.type === node.type); if (!story) return false;
  const ledger = storyLedger(game, p, story.id), visit = `${game.dayCounter}:${node.id}`;
  if (ledger.lastVisit === visit || ledger.stage >= 2) return false;
  ledger.lastVisit = visit;
  if (ledger.stage === 1) {
    if (storyProgress(game, p, story.id) < story.goal) return false;
    chooseJourney(p, story.name, 'เจ้ากลับมาแล้ว เส้นทางปลอดภัยขึ้นเพราะเจ้า ข้าจดจำคำสัญญาได้', [
      { label: 'รับคำขอบคุณ', detail: `${story.gold}${ledger.path === 'trade' ? '+40' : ''}G · ${story.xp} XP · ความสัมพันธ์เพิ่ม`, score: 10, run: () => { claimStory(game, p, story.id); resume(); } },
    ]); return true;
  }
  chooseJourney(p, story.name, story.intro, [
    { label: 'ยินดีช่วย', detail: 'รางวัลพื้นฐาน · ความสัมพันธ์เพิ่มมากกว่า · ฟื้นพลังเมื่อกลับมาส่งงาน', score: 8, run: () => { acceptStory(game, p, story.id, 'help'); resume(); } },
    { label: 'ตกลงเป็นงานรับจ้าง', detail: 'ทองเพิ่ม 40G · ความสัมพันธ์เพิ่มเล็กน้อย', score: p.aiPersonality === 'economist' ? 10 : 5, run: () => { acceptStory(game, p, story.id, 'trade'); resume(); } },
    { label: 'ไว้โอกาสหน้า', detail: 'กลับมาคุยได้ในวันถัดไป', score: 0, run: resume },
  ]); return true;
}
