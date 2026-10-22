export const CURRENT_SAVE_VERSION = 3;

/** Checksum detects damaged storage/exports; it is not an anti-cheat signature. */
export function saveChecksum(data: Record<string, unknown>): string {
  const { integrity: _ignored, ...body } = data;
  const text = JSON.stringify(body);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** Migrations are pure and idempotent. Never guess a map for pre-rules-2 saves. */
export function migrateSaveData(input: any): { data?: any; warning?: string; error?: string } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return { error: 'ข้อมูลบันทึกไม่ถูกต้อง' };
  if (input.version > CURRENT_SAVE_VERSION) return { error: `ไฟล์บันทึกเป็นเวอร์ชัน ${input.version} ซึ่งใหม่กว่าที่เกมนี้รองรับ (สูงสุด v${CURRENT_SAVE_VERSION})` };
  if (!Array.isArray(input.players) || !input.players.length) return { error: 'ไฟล์บันทึกไม่มีข้อมูลผู้เล่นที่ถูกต้อง' };
  if (input.integrity && input.integrity !== saveChecksum(input)) return { error: 'ข้อมูลบันทึกเสียหาย (checksum ไม่ตรง)' };
  if (!Number.isInteger(input.version) || input.version < 1 || input.world?.rulesVersion !== 2) return { error: 'เซฟกติกาเก่านี้ใช้แผนที่ต่างกัน กรุณาส่งออกเก็บไว้แล้วเปิดด้วยเกมเวอร์ชันเดิม' };
  const data = structuredClone(input);
  if (data.version < 3) {
    const from = data.version;
    delete data.integrity;
    data.version = 3;
    data.world.royalContracts ??= {};
    data.world.tutorial ??= {};
    data.world.storylines ??= {};
    data.world.matchHistory ??= [];
    for (const player of data.players || []) player.talents ??= [];
    return { data, warning: `อัปเกรดเซฟ v${from} → v3 แล้ว ความคืบหน้าเดิมยังอยู่` };
  }
  return { data };
}
