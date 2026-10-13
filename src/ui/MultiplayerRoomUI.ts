/**
 * MultiplayerRoomUI.ts
 * P2P Room Code Lobby UI for Chronicles of Fortune
 */

import { networkRoomManager, RoomInfo } from '../engine/NetworkRoomManager';
import { audio } from '../engine/AudioSynthesizer';

export class MultiplayerRoomUI {
  private modal: HTMLElement;
  private onStartGameCallback?: () => void;

  constructor() {
    let el = document.getElementById('multiplayerRoomModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'multiplayerRoomModal';
      el.className = 'hidden fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4';
      document.body.appendChild(el);
    }
    this.modal = el;

    // Listen to network status changes to auto-update view
    networkRoomManager.onStateChange(() => {
      if (!this.modal.classList.contains('hidden')) {
        this.render();
      }
    });

    networkRoomManager.onPacket(pkt => {
      if (pkt.type === 'CHAT_MSG') {
        audio.click();
        const chatBox = document.getElementById('netRoomChatList');
        if (chatBox) {
          const row = document.createElement('div');
          row.className = 'text-[11px] text-cyan-200';
          row.innerText = `💬 [${pkt.senderName}]: ${pkt.payload?.text || ''}`;
          chatBox.appendChild(row);
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      }
    });
  }

  public open(onStartGame?: () => void) {
    this.onStartGameCallback = onStartGame;
    audio.click();
    this.modal.classList.remove('hidden');
    this.render();
  }

  public close() {
    audio.click();
    this.modal.classList.add('hidden');
  }

  private render() {
    const room = networkRoomManager.getRoomInfo();

    if (!room) {
      // Room Lobby Selection View
      this.modal.innerHTML = `
        <div class="pixel-box-gold max-w-md w-full p-4 flex flex-col gap-3 bg-slate-900 border-amber-500/80">
          <div class="flex justify-between items-center border-b border-amber-600/40 pb-2">
            <h3 class="text-sm font-bold text-amber-300 flex items-center gap-1.5">
              <span>🌐</span>
              <span>ห้องเล่นหลายคน (Room Code P2P)</span>
            </h3>
            <button id="btnCloseNetRoom" class="pixel-close text-xs px-2 py-0.5">✖</button>
          </div>
          <p class="text-[11px] text-slate-300">
            เล่นหลายคนผ่านระบบจำลองเครือข่าย P2P Room Code / Broadcast Channel สามารถเปิดเล่นข้ามหน้าต่างเบราว์เซอร์ได้ทันที!
          </p>

          <div class="flex flex-col gap-2.5 my-2">
            <button id="btnCreateHostRoom" class="pixel-btn pixel-btn-gold py-2.5 text-xs font-bold text-slate-950 flex items-center justify-center gap-2">
              <span>👑</span>
              <span>สร้างห้องใหม่ (Host Game)</span>
            </button>

            <div class="flex items-center gap-2 my-1">
              <div class="h-px bg-slate-700 flex-1"></div>
              <span class="text-[10px] text-slate-400">หรือเข้าร่วมห้องด้วยรหัส</span>
              <div class="h-px bg-slate-700 flex-1"></div>
            </div>

            <div class="flex gap-2">
              <input id="inputJoinRoomCode" type="text" maxlength="8" placeholder="เช่น CF-1234" class="flex-1 bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-amber-300 uppercase outline-none focus:border-amber-400" />
              <button id="btnSubmitJoinRoom" class="pixel-btn pixel-btn-blue px-4 py-1.5 text-xs font-bold text-cyan-200">
                เข้าร่วม ➔
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btnCloseNetRoom')?.addEventListener('click', () => this.close());
      document.getElementById('btnCreateHostRoom')?.addEventListener('click', () => {
        audio.fanfare();
        networkRoomManager.createRoom('Player 1 (Host)');
      });
      document.getElementById('btnSubmitJoinRoom')?.addEventListener('click', () => {
        const input = document.getElementById('inputJoinRoomCode') as HTMLInputElement;
        const code = input?.value?.trim();
        if (code) {
          audio.click();
          networkRoomManager.joinRoom(code, 'Player 2 (Guest)');
        }
      });
      return;
    }

    // Inside Active Room View
    this.renderActiveRoom(room);
  }

  private renderActiveRoom(room: RoomInfo) {
    this.modal.innerHTML = `
      <div class="pixel-box-gold max-w-lg w-full p-4 flex flex-col gap-3 bg-slate-900 border-amber-500/80">
        <div class="flex justify-between items-center border-b border-amber-600/40 pb-2">
          <div>
            <span class="text-[10px] text-amber-400 uppercase tracking-widest block font-bold">ห้องออนไลน์</span>
            <h3 class="text-base font-extrabold text-amber-300 tracking-wider">
              รหัสห้อง: <span class="text-white select-all bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40">${room.code}</span>
            </h3>
          </div>
          <button id="btnLeaveNetRoom" class="pixel-btn px-2.5 py-1 text-xs text-rose-300 hover:text-white">ออกจากห้อง</button>
        </div>

        <div class="flex flex-col gap-1.5">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-300 font-bold">ผู้เล่นในห้อง (${room.connectedPeers.length}/4):</span>
            <span class="text-[10px] text-emerald-400">● เชื่อมต่อช่องสัญญาณแล้ว</span>
          </div>
          <div class="bg-slate-950 border border-slate-800 p-2 rounded flex flex-col gap-1 max-h-32 overflow-y-auto">
            ${room.connectedPeers.map(p => `
              <div class="flex items-center justify-between text-xs px-1.5 py-0.5 rounded bg-slate-900/60 text-slate-200">
                <span class="font-bold flex items-center gap-1.5">
                  <span>${p.id === 'host' ? '👑' : '⚔️'}</span>
                  <span>${p.name}</span>
                </span>
                <span class="text-[9px] text-amber-400 font-mono">${p.id === 'host' ? 'HOST' : 'PEER'}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Chat / Ping box -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] text-slate-400">ข้อความด่วน & การตอบสนองห้อง:</span>
          <div id="netRoomChatList" class="bg-slate-950 border border-slate-800 p-2 h-20 overflow-y-auto space-y-1 rounded text-slate-300">
            <div class="text-[10px] text-slate-500">ห้องเตรียมพร้อมแล้ว ส่งสัญญาณทักทายเพื่อนร่วมห้องได้เลย</div>
          </div>
          <div class="flex gap-2 mt-1">
            <input id="inputRoomChat" type="text" placeholder="พิมพ์ข้อความทักทาย..." class="flex-1 bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-white outline-none" />
            <button id="btnSendRoomChat" class="pixel-btn pixel-btn-blue px-3 py-1 text-xs text-cyan-200">ส่ง</button>
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button id="btnStartLobbyGame" class="pixel-btn pixel-btn-gold px-5 py-2 text-xs font-bold text-slate-950">
            ${room.isHost ? 'เข้าสู่อาณาจักร (เริ่มเกม) ➔' : 'รอ Host เริ่มเกม...'}
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnLeaveNetRoom')?.addEventListener('click', () => {
      audio.click();
      networkRoomManager.leaveRoom();
    });

    const sendChat = () => {
      const input = document.getElementById('inputRoomChat') as HTMLInputElement;
      const text = input?.value?.trim();
      if (text) {
        audio.click();
        networkRoomManager.broadcast({
          type: 'CHAT_MSG',
          roomCode: room.code,
          senderId: room.isHost ? 'host' : 'guest',
          senderName: room.isHost ? 'Host' : 'Guest',
          payload: { text },
          timestamp: Date.now()
        });
        const chatBox = document.getElementById('netRoomChatList');
        if (chatBox) {
          const row = document.createElement('div');
          row.className = 'text-[11px] text-amber-300';
          row.innerText = `💬 [ฉัน]: ${text}`;
          chatBox.appendChild(row);
          chatBox.scrollTop = chatBox.scrollHeight;
        }
        input.value = '';
      }
    };

    document.getElementById('btnSendRoomChat')?.addEventListener('click', sendChat);
    document.getElementById('inputRoomChat')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') sendChat();
    });

    document.getElementById('btnStartLobbyGame')?.addEventListener('click', () => {
      audio.fanfare();
      this.close();
      if (this.onStartGameCallback) {
        this.onStartGameCallback();
      }
    });
  }
}

export const multiplayerRoomUI = new MultiplayerRoomUI();
