import { NetworkManager } from '../network/NetworkManager';
import { isSupabaseConfigured, RoomPlayer } from '../network/supabase';
import { audio } from '../engine/AudioSynthesizer';

export class LobbyUI {
  private container: HTMLDivElement;
  private net: NetworkManager;
  private onStartGameCallback: ((players: RoomPlayer[], isOnline: boolean) => void) | null = null;

  constructor() {
    this.net = NetworkManager.getInstance();
    this.container = document.createElement('div');
    this.container.id = 'lobby-ui-container';
    this.container.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      background: radial-gradient(circle at center, #1b162b 0%, #0c0915 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      color: #fff;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    document.body.appendChild(this.container);
    this.showMainMenu();
  }

  public onStart(cb: (players: RoomPlayer[], isOnline: boolean) => void): void {
    this.onStartGameCallback = cb;
  }

  public show(): void {
    this.container.style.display = 'flex';
  }

  public hide(): void {
    this.container.style.display = 'none';
  }

  private showMainMenu(): void {
    this.container.innerHTML = `
      <div style="background: rgba(25, 20, 45, 0.95); border: 2px solid #e2b714; border-radius: 16px; padding: 36px 48px; width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); text-align: center;">
        <h1 style="color: #ffd700; margin: 0 0 10px 0; font-size: 30px; letter-spacing: 2px;">CHRONICLES OF FORTUNE</h1>
        <p style="color: #aaa; margin: 0 0 30px 0; font-size: 14px;">เกมกระดานผจญภัยสไตล์อนิเมะ</p>

        <button id="btn-local-play" style="width: 100%; padding: 14px; margin-bottom: 14px; background: linear-gradient(135deg, #4f46e5, #3730a3); border: none; border-radius: 8px; color: #fff; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s;">
          🎮 เล่นคนเดียว (Single Player / Local)
        </button>

        <button id="btn-online-play" style="width: 100%; padding: 14px; margin-bottom: 20px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; color: #fff; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.2s;">
          🌐 เล่นออนไลน์ (Online Multiplayer)
        </button>

        ${!isSupabaseConfigured ? `
          <div style="padding: 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; font-size: 12px; color: #fca5a5;">
            ⚠️ ระบบออนไลน์ต้องการการตั้งค่า Supabase ใน .env
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('btn-local-play')?.addEventListener('click', () => {
      audio.click();
      this.hide();
      if (this.onStartGameCallback) {
        this.onStartGameCallback([], false);
      }
    });

    document.getElementById('btn-online-play')?.addEventListener('click', () => {
      audio.click();
      if (!isSupabaseConfigured) {
        alert('กรุณาตั้งค่า VITE_SUPABASE_URL และ VITE_SUPABASE_ANON_KEY ใน .env เพื่อเปิดโหมดออนไลน์');
        return;
      }
      this.showOnlineLobby();
    });
  }

  private showOnlineLobby(): void {
    this.container.innerHTML = `
      <div style="background: rgba(25, 20, 45, 0.95); border: 2px solid #10b981; border-radius: 16px; padding: 32px 40px; width: 440px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
        <h2 style="color: #6ee7b7; margin: 0 0 20px 0; text-align: center; font-size: 24px;">🌐 เมนูออนไลน์</h2>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 13px; color: #ccc; margin-bottom: 6px;">ชื่อตัวละครของคุณ:</label>
          <input id="input-player-name" type="text" value="ผู้กล้า_${Math.floor(Math.random()*900 + 100)}" style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; background: #120e24; border: 1px solid #4b5563; color: #fff; font-size: 14px;" />
        </div>

        <div style="margin-bottom: 24px;">
          <label style="display: block; font-size: 13px; color: #ccc; margin-bottom: 6px;">คลาสเริ่มต้น:</label>
          <select id="select-class-key" style="width: 100%; box-sizing: border-box; padding: 10px; border-radius: 6px; background: #120e24; border: 1px solid #4b5563; color: #fff; font-size: 14px;">
            <option value="warrior">🗡️ นักรบ (Warrior) - ถึกทน ดาเมจกายภาพสูง</option>
            <option value="magician">✨ จอมเวท (Magician) - พลังเวทระเบิดรุนแรง</option>
            <option value="cleric">✝️ นักบวช (Cleric) - ฟื้นฟูและทัณฑ์ศักดิ์สิทธิ์</option>
            <option value="thief">👥 โจรเงา (Thief) - ว่องไว หลบหลีกและขโมยเงิน</option>
          </select>
        </div>

        <div style="display: flex; gap: 10px; margin-bottom: 16px;">
          <button id="btn-create-room" style="flex: 1; padding: 12px; background: #3b82f6; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer;">
            🏠 สร้างห้องใหม่
          </button>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
          <input id="input-room-code" type="text" placeholder="รหัสห้อง 4 หลัก" maxlength="6" style="flex: 1; padding: 10px; border-radius: 6px; background: #120e24; border: 1px solid #4b5563; color: #fff; text-transform: uppercase; font-size: 14px; text-align: center; letter-spacing: 2px;" />
          <button id="btn-join-room" style="padding: 10px 20px; background: #10b981; border: none; border-radius: 6px; color: #fff; font-weight: bold; cursor: pointer;">
            เข้าร่วม
          </button>
        </div>

        <div id="lobby-status-msg" style="color: #f87171; font-size: 13px; text-align: center; min-height: 20px; margin-bottom: 10px;"></div>

        <button id="btn-back-menu" style="width: 100%; padding: 10px; background: transparent; border: 1px solid #6b7280; border-radius: 6px; color: #bbb; cursor: pointer;">
          ย้อนกลับ
        </button>
      </div>
    `;

    const getFormValues = () => {
      const name = (document.getElementById('input-player-name') as HTMLInputElement)?.value.trim() || 'Hero';
      const cls = (document.getElementById('select-class-key') as HTMLSelectElement)?.value || 'warrior';
      return { name, cls };
    };

    const statusEl = document.getElementById('lobby-status-msg')!;

    document.getElementById('btn-create-room')?.addEventListener('click', async () => {
      audio.click();
      statusEl.style.color = '#93c5fd';
      statusEl.textContent = 'กำลังสร้างห้อง...';
      const { name, cls } = getFormValues();
      const res = await this.net.createRoom(name, cls);
      if (res.success) {
        this.showWaitingRoom();
      } else {
        statusEl.style.color = '#f87171';
        statusEl.textContent = res.error || 'เกิดข้อผิดพลาดในการสร้างห้อง';
      }
    });

    document.getElementById('btn-join-room')?.addEventListener('click', async () => {
      audio.click();
      const code = (document.getElementById('input-room-code') as HTMLInputElement)?.value.trim();
      if (!code) {
        statusEl.style.color = '#f87171';
        statusEl.textContent = 'กรุณากรอกรหัสห้อง';
        return;
      }
      statusEl.style.color = '#93c5fd';
      statusEl.textContent = 'กำลังค้นหาห้อง...';
      const { name, cls } = getFormValues();
      const res = await this.net.joinRoom(code, name, cls);
      if (res.success) {
        this.showWaitingRoom();
      } else {
        statusEl.style.color = '#f87171';
        statusEl.textContent = res.error || 'เกิดข้อผิดพลาดในการเข้าห้อง';
      }
    });

    document.getElementById('btn-back-menu')?.addEventListener('click', () => {
      audio.click();
      this.showMainMenu();
    });
  }


  private showWaitingRoom(): void {
    const room = this.net.currentRoom;
    if (!room) return;

    this.container.innerHTML = `
      <div style="background: rgba(25, 20, 45, 0.95); border: 2px solid #e2b714; border-radius: 16px; padding: 32px 40px; width: 480px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="font-size: 13px; color: #aaa;">รหัสห้องสำหรับชวนเพื่อน</div>
          <div style="font-size: 36px; font-weight: bold; color: #ffd700; letter-spacing: 4px; margin: 4px 0;">${room.room_code}</div>
          <div style="font-size: 12px; color: #6ee7b7;">ผู้เล่นในห้อง (<span id="waiting-count">1</span>/4)</div>
        </div>

        <div id="waiting-players-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px;"></div>

        <div id="waiting-action-area">
          ${this.net.isHost ? `
            <button id="btn-start-game" style="width: 100%; padding: 14px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; color: #fff; font-weight: bold; font-size: 16px; cursor: pointer; margin-bottom: 10px;">
              🚀 เริ่มเกมทันที (Host Only)
            </button>
          ` : `
            <div style="text-align: center; color: #93c5fd; font-size: 14px; padding: 12px; margin-bottom: 10px;">
              ⏳ รอหัวหน้าห้องกดเริ่มเกม...
            </div>
          `}
          <button id="btn-leave-room" style="width: 100%; padding: 10px; background: transparent; border: 1px solid #ef4444; border-radius: 6px; color: #fca5a5; cursor: pointer;">
            ออกจากห้อง
          </button>
        </div>
      </div>
    `;

    this.renderWaitingPlayers(this.net.players);

    this.net.onPlayersUpdated((players) => {
      this.renderWaitingPlayers(players);
    });

    this.net.onGameStart(() => {
      audio.levelUp();
      this.hide();
      if (this.onStartGameCallback) {
        this.onStartGameCallback(this.net.players, true);
      }
    });

    document.getElementById('btn-start-game')?.addEventListener('click', async () => {
      audio.click();
      const res = await this.net.startGame();
      if (!res.success) {
        alert(res.error || 'ไม่สามารถเริ่มเกมได้');
      }
    });

    document.getElementById('btn-leave-room')?.addEventListener('click', async () => {
      audio.click();
      await this.net.leaveRoom();
      this.showOnlineLobby();
    });
  }

  private renderWaitingPlayers(players: RoomPlayer[]): void {
    const listEl = document.getElementById('waiting-players-list');
    const countEl = document.getElementById('waiting-count');
    if (!listEl) return;
    if (countEl) countEl.textContent = players.length.toString();

    const classNames: Record<string, string> = {
      warrior: 'นักรบ (Warrior)',
      magician: 'จอมเวท (Magician)',
      cleric: 'นักบวช (Cleric)',
      thief: 'โจรเงา (Thief)'
    };

    listEl.innerHTML = players.map((p, idx) => `
      <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.06); padding: 10px 14px; border-radius: 8px; border-left: 4px solid ${p.is_host ? '#ffd700' : '#3b82f6'};">
        <div>
          <span style="font-weight: bold; color: ${p.player_id === this.net.playerId ? '#6ee7b7' : '#fff'};">
            ${idx + 1}. ${p.player_name} ${p.player_id === this.net.playerId ? '(คุณ)' : ''}
          </span>
          <div style="font-size: 11px; color: #9ca3af;">${classNames[p.class_key] || p.class_key}</div>
        </div>
        <div style="font-size: 12px; color: ${p.is_host ? '#fcd34d' : '#93c5fd'}; font-weight: 500;">
          ${p.is_host ? '👑 Host' : '✅ Ready'}
        </div>
      </div>
    `).join('');
  }

  }
