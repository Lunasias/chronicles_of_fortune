/**
 * MultiplayerRoomUI.ts
 * P2P Room Code Lobby UI for Chronicles of Fortune
 * Provides real-time lobby matchmaking, character selection, and synchronized game start.
 */

import { networkRoomManager, RoomInfo, ConnectedPeer } from '../engine/NetworkRoomManager';
import { escapeHtml } from '../util/Html';
import { audio } from '../engine/AudioSynthesizer';
import { HERO_CLASSES, HERO_SKINS } from '../game/Player';
import type { SaveGameData } from '../game/SaveManager';

export interface MultiplayerStartOptions {
  partyConfig: Array<{
    name: string;
    classKey: string;
    isAI: boolean;
    skinVariant: number;
    peerId?: string;
  }>;
  gameMode: string;
  winGoal: string;
  aiDifficulty: 'casual' | 'tactical' | 'ruthless';
  isMultiplayer: boolean;
  saveData?: SaveGameData;
}

export class MultiplayerRoomUI {
  private modal: HTMLElement;
  private onStartGameCallback?: (opts: MultiplayerStartOptions) => void;
  private chatHistory: Array<{ name: string; text: string }> = [];
  private localName: string = 'Hero 1';
  private localClass: string = 'warrior';
  private localSkin: number = 0;
  private partySize: number = 3;
  private gameMode: string = 'standard';
  private aiDifficulty: 'casual' | 'tactical' | 'ruthless' = 'tactical';
  private botSlots: boolean[] = [false, false, true, true]; // whether slot 0..3 is an AI bot

  constructor() {
    let el = document.getElementById('multiplayerRoomModal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'multiplayerRoomModal';
      el.className = 'hidden fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4';
      document.body.appendChild(el);
    }
    this.modal = el;

    // Check URL parameters for ?room=CF-XXXX
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam && !networkRoomManager.getActiveSession()) {
        setTimeout(() => {
          this.open();
          const input = document.getElementById('inputJoinRoomCode') as HTMLInputElement;
          if (input) input.value = roomParam.toUpperCase();
        }, 300);
      }
    }

    // Listen to network status changes to auto-update view
    networkRoomManager.onStateChange(() => {
      if (!this.modal.classList.contains('hidden')) {
        this.render();
      }
    });

    // Listen to network packets
    networkRoomManager.onPacket(pkt => {
      if (pkt.type === 'ROOM_ERROR' && pkt.payload?.peerId === networkRoomManager.getMyPeerId()) {
        networkRoomManager.leaveRoom();
        this.open();
        const error = document.createElement('p'); error.textContent = pkt.payload.message;
        this.modal.firstElementChild?.appendChild(error);
      } else if (pkt.type === 'CHAT_MSG') {
        this.chatHistory.push({ name: pkt.senderName, text: String(pkt.payload?.text || '') });
        this.chatHistory = this.chatHistory.slice(-100);
        audio.click();
        const chatBox = document.getElementById('netRoomChatList');
        if (chatBox) {
          const row = document.createElement('div');
          row.className = 'text-[11px] text-cyan-200';
          row.innerText = `💬 [${pkt.senderName}]: ${pkt.payload?.text || ''}`;
          chatBox.appendChild(row);
          chatBox.scrollTop = chatBox.scrollHeight;
        }
      } else if (pkt.type === 'START_GAME') {
        // Guest receives start game signal from Host
        audio.fanfare();
        this.close();
        if (this.onStartGameCallback) {
          const payload = pkt.payload;
          this.onStartGameCallback({
            partyConfig: payload.partyConfig,
            gameMode: payload.gameMode || 'standard',
            winGoal: payload.winGoal || 'networth',
            aiDifficulty: payload.aiDifficulty || 'tactical',
            isMultiplayer: true,
            saveData: payload.saveData
          });
        }
      }
    });
  }

  public setStartGameCallback(callback: (opts: MultiplayerStartOptions) => void) {
    this.onStartGameCallback = callback;
  }

  public open(onStartGame?: (opts: MultiplayerStartOptions) => void) {
    if (onStartGame) {
      this.onStartGameCallback = onStartGame;
    }
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
      // Room Lobby Selection View (Create or Join)
      this.modal.innerHTML = `
        <div class="pixel-box-gold max-w-md w-full p-4 flex flex-col gap-3 bg-slate-900 border-amber-500/80 shadow-2xl">
          <div class="flex justify-between items-center border-b border-amber-600/40 pb-2">
            <h3 class="text-sm font-bold text-amber-300 flex items-center gap-1.5">
              <span>🌐</span>
              <span>ห้องเล่นหลายคน (Online P2P Room)</span>
            </h3>
            <button id="btnCloseNetRoom" class="pixel-close text-xs px-2 py-0.5">✖</button>
          </div>
          <p class="text-[11px] text-slate-300 leading-relaxed">
            เล่นกับเพื่อนผ่านระบบรหัสห้อง P2P (WebRTC & Network) สามารถเล่นข้ามเครื่อง คอมพิวเตอร์ มือถือ หรือเปิดข้ามแท็บบนเครื่องเดียวกันได้ทันที!
          </p>

          <!-- Player Initial Customization -->
          <div class="bg-slate-950 p-2.5 border border-slate-800 flex flex-col gap-2">
            <span class="text-[10px] text-amber-400 font-bold uppercase tracking-wider">โปรไฟล์ของคุณ:</span>
            <div class="grid grid-cols-2 gap-2">
              <div class="flex flex-col gap-1">
                <span class="text-[9px] text-slate-400">ชื่อของคุณ</span>
                <input id="inputLobbyMyName" type="text" maxlength="12" value="${escapeHtml(this.localName)}" class="bg-slate-900 border border-slate-700 text-xs px-2 py-1 text-white outline-none focus:border-amber-400" />
              </div>
              <div class="flex flex-col gap-1">
                <span class="text-[9px] text-slate-400">อาชีพเริ่มต้น</span>
                <select id="selectLobbyMyClass" class="bg-slate-900 border border-slate-700 text-xs px-1.5 py-1 text-amber-300 outline-none">
                  ${Object.keys(HERO_CLASSES).map(ck => `
                    <option value="${ck}" ${ck === this.localClass ? 'selected' : ''}>
                      ${HERO_CLASSES[ck].name} ${HERO_CLASSES[ck].avatar}
                    </option>
                  `).join('')}
                </select>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2.5 my-1">
            <button id="btnCreateHostRoom" class="pixel-btn pixel-btn-gold py-2.5 text-xs font-bold text-slate-950 flex items-center justify-center gap-2">
              <span>👑</span>
              <span>สร้างห้องใหม่ (Host Game)</span>
            </button>

            <div class="flex items-center gap-2 my-1">
              <div class="h-px bg-slate-700 flex-1"></div>
              <span class="text-[10px] text-slate-400">หรือเข้าร่วมห้องของเพื่อนด้วยรหัส</span>
              <div class="h-px bg-slate-700 flex-1"></div>
            </div>

            <div class="flex gap-2">
              <input id="inputJoinRoomCode" type="text" maxlength="8" placeholder="เช่น CF-1234" class="flex-1 bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-amber-300 uppercase tracking-widest font-mono outline-none focus:border-amber-400" />
              <button id="btnSubmitJoinRoom" class="pixel-btn pixel-btn-blue px-4 py-1.5 text-xs font-bold text-cyan-200">
                เข้าร่วม ➔
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btnCloseNetRoom')?.addEventListener('click', () => this.close());

      const updateLocalProfile = () => {
        const nameInput = document.getElementById('inputLobbyMyName') as HTMLInputElement;
        const classSelect = document.getElementById('selectLobbyMyClass') as HTMLSelectElement;
        if (nameInput?.value.trim()) this.localName = nameInput.value.trim();
        if (classSelect?.value) this.localClass = classSelect.value;
      };

      document.getElementById('btnCreateHostRoom')?.addEventListener('click', () => {
        updateLocalProfile();
        audio.fanfare();
        networkRoomManager.createRoom(this.localName, this.localClass, this.localSkin);
      });

      document.getElementById('btnSubmitJoinRoom')?.addEventListener('click', () => {
        updateLocalProfile();
        const input = document.getElementById('inputJoinRoomCode') as HTMLInputElement;
        const code = input?.value?.trim();
        if (code) {
          audio.click();
          if (!networkRoomManager.joinRoom(code, this.localName, this.localClass, this.localSkin)) {
            input.setCustomValidity('ใช้รหัสรูปแบบ CF-1234'); input.reportValidity();
          }
        }
      });
      return;
    }

    // Inside Active Room View
    this.renderActiveRoom(room);
  }

  private renderActiveRoom(room: RoomInfo) {
    const isHost = room.isHost;
    const connectedPeers = room.connectedPeers || [];
    const partySize = room.partySize || 3;
    this.partySize = partySize;
    this.gameMode = room.gameMode || 'standard';
    const canStart = isHost && room.status === 'lobby' && Array.from({ length: partySize }, (_, i) => connectedPeers[i] ? !connectedPeers[i].isDisconnected : !!this.botSlots[i]).every(Boolean);
    const myPeerId = room.myPeerId;
    const connected = connectedPeers.some(p => p.isHost && !p.isDisconnected);
    const onlineMessage = networkRoomManager.getOnlineMessage();
    const me = connectedPeers.find(p => p.id === myPeerId);
    if (me) { this.localName = me.name; this.localClass = me.classKey; this.localSkin = me.skinVariant; }

    // Build the slot list for display
    const slots: Array<{
      index: number;
      peer?: ConnectedPeer;
      isAI: boolean;
      name: string;
      classKey: string;
      skinVariant: number;
    }> = [];

    for (let i = 0; i < partySize; i++) {
      const peer = connectedPeers[i];
      if (peer) {
        slots.push({
          index: i,
          peer,
          isAI: false,
          name: peer.name,
          classKey: peer.classKey,
          skinVariant: peer.skinVariant
        });
      } else {
        const isBot = this.botSlots[i];
        const defaultNames = ['Valeria', 'Lyra', 'Jaxine', 'Aria'];
        const defaultClasses = ['warrior', 'magician', 'thief', 'cleric'];
        slots.push({
          index: i,
          isAI: isBot,
          name: isBot ? `Bot ${defaultNames[i]}` : `(รอผู้เล่น...)`,
          classKey: defaultClasses[i] || 'warrior',
          skinVariant: 0
        });
      }
    }

    this.modal.innerHTML = `
      <div class="pixel-box-gold max-w-lg w-full p-4 flex flex-col gap-3 bg-slate-900 border-amber-500/80 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between items-center border-b border-amber-600/40 pb-2">
          <div>
            <span class="text-[10px] text-amber-400 uppercase tracking-widest block font-bold">ห้องออนไลน์ (P2P Room)</span>
            <div class="flex items-center gap-2 mt-0.5">
              <h3 class="text-base font-extrabold text-amber-300 tracking-wider">
                รหัสห้อง: <span class="text-white select-all bg-amber-950/80 px-2 py-0.5 border border-amber-500/60 font-mono">${room.code}</span>
              </h3>
              <button id="btnCopyRoomCode" class="pixel-btn px-2 py-0.5 text-[10px] text-cyan-300 hover:text-white" title="คัดลอกรหัสห้อง">📋 คัดลอก</button>
              <button id="btnCopyInviteLink" class="pixel-btn px-2 py-0.5 text-[10px] text-amber-300 hover:text-white" title="คัดลอกลิงก์เชิญ">🔗 ลิงก์เชิญ</button>
            </div>
          </div>
          <button id="btnCloseActiveNetRoom" class="pixel-close text-xs px-2 py-0.5">✖</button>
          <button id="btnLeaveNetRoom" class="pixel-btn px-2.5 py-1 text-xs text-rose-300 hover:text-white">ออกจากห้อง</button>
        </div>

        <!-- Party size and mode controls (Host only) -->
        ${isHost ? `
          <div class="flex flex-wrap items-center justify-between gap-2 bg-slate-950/70 p-2 border border-slate-800 text-xs">
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-slate-400 font-bold">จำนวนผู้เล่น:</span>
              ${[2, 3, 4].map(c => {
                const activeClass = partySize === c ? 'pixel-btn-gold text-slate-950 font-bold' : 'text-slate-300';
                return `
                  <button type="button" class="btn-lobby-party-size pixel-btn px-2 py-0.5 text-xs ${activeClass}" data-count="${c}">
                    ${c} คน
                  </button>
                `;
              }).join('')}
            </div>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] text-slate-400 font-bold">โหมด:</span>
              <select id="selectLobbyGameMode" class="bg-slate-900 border border-slate-700 text-[10px] px-1.5 py-0.5 text-amber-300 outline-none">
                <option value="standard" ${this.gameMode === 'standard' ? 'selected' : ''}>มาตรฐาน (Standard)</option>
                <option value="blitz" ${this.gameMode === 'blitz' ? 'selected' : ''}>Blitz (จำกัด ${room.matchConfig?.days ?? 20} วัน)</option>
                <option value="coop_raid" ${this.gameMode === 'coop_raid' ? 'selected' : ''}>Co-op Demon Lord Raid</option>
                <option value="roguelike_draft" ${this.gameMode === 'roguelike_draft' ? 'selected' : ''}>Roguelike Draft</option>
                <option value="endless_spire" ${this.gameMode === 'endless_spire' ? 'selected' : ''}>Endless Spire</option>
              </select>
            </div>
          </div>
        ` : `
          <div class="flex items-center justify-between text-xs px-2 py-1 bg-slate-950/60 border border-slate-800 text-slate-300">
            <span>โหมดเกม: <strong class="text-amber-300">${escapeHtml(room.gameMode || 'Standard')}</strong></span>
            <span>ความจุห้อง: <strong class="text-cyan-300">${partySize} คน</strong></span>
          </div>
        `}

        <!-- Slots Roster -->
        ${onlineMessage ? `<div class="text-[11px] text-slate-300" role="status">
          <p>${escapeHtml(onlineMessage)}</p>
          ${networkRoomManager.canRetryConnection() ? '<button id="btnRetryRoomConnection" class="pixel-btn px-2 py-1 text-xs">ลองเชื่อมต่อใหม่</button>' : ''}
        </div>` : ''}
        <div class="flex flex-col gap-1.5">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-300 font-bold">ผู้เล่นในห้อง (${connectedPeers.length}/${partySize}):</span>
            <span class="text-[10px] text-emerald-400 flex items-center gap-1">
              <span class="w-1.5 h-1.5 bg-emerald-400 animate-pulse"></span>
              <span>${connected ? (isHost ? 'คุณเป็น Host' : 'เข้าร่วมห้องแล้ว') : 'กำลังเชื่อมต่อ Host...'}</span>
            </span>
          </div>

          <div class="flex flex-col gap-2">
            ${slots.map((s, idx) => {
              const isMe = s.peer?.id === myPeerId;
              const isAssigned = !!s.peer;
              const heroClass = HERO_CLASSES[s.classKey] || HERO_CLASSES['warrior'];
              const slotBgClass = isMe ? 'bg-amber-950/30 border-amber-500/70' : 'bg-slate-950/80 border-slate-800';
              const aiBtnClass = s.isAI ? 'text-amber-300' : 'text-slate-400';
              return `
                <div class="p-2 border ${slotBgClass} flex items-center justify-between gap-2">
                  <div class="flex items-center gap-2">
                    <span class="text-base">${isAssigned ? (s.peer?.isHost ? '👑' : '⚔️') : (s.isAI ? '🤖' : '⏳')}</span>
                    <div>
                      <div class="flex items-center gap-1.5">
                        <span class="text-xs font-bold text-white">${escapeHtml(s.name)}</span>
                        ${isMe ? `<span class="text-[9px] bg-amber-500 text-slate-950 font-bold px-1">คุณ</span>` : ''}
                        ${s.peer?.isHost ? `<span class="text-[9px] text-amber-400 border border-amber-600/60 px-1">HOST</span>` : ''}
                      </div>
                      <span class="text-[10px] text-slate-400 flex items-center gap-1">
                        <span>${heroClass.avatar}</span>
                        <span>${heroClass.name}</span>
                      </span>
                    </div>
                  </div>

                  <!-- Slot Controls -->
                  <div class="flex items-center gap-2">
                    ${isMe ? `
                      <select class="lobby-change-class bg-slate-900 border border-slate-700 text-[10px] px-1.5 py-1 text-amber-300 outline-none cursor-pointer">
                        ${Object.keys(HERO_CLASSES).map(ck => `
                          <option value="${ck}" ${ck === s.classKey ? 'selected' : ''}>${HERO_CLASSES[ck].name}</option>
                        `).join('')}
                      </select>
                    ` : ''}

                    ${isHost && !isAssigned ? `
                      <button type="button" class="btn-toggle-slot-ai pixel-btn px-2 py-0.5 text-[10px] ${aiBtnClass}" data-slot="${idx}">
                        ${s.isAI ? '🤖 AI Bot' : '⏳ รอเพื่อน'}
                      </button>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        ${isHost && room.status === 'lobby' ? '<button type="button" id="btnLobbyQuickMatch" class="pixel-btn">ดวลแปดวัน · Lv.2 · 500G · รางวัล ×1.5</button>' : ''}
        ${room.matchConfig ? `<p>กติกา: ${room.matchConfig.days} วัน · เริ่ม Lv.${room.matchConfig.startingLevel} · ${room.matchConfig.startingGold}G · รางวัล ×${room.matchConfig.rewardRate}</p>` : ''}
        <!-- Chat / Ping box -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] text-slate-400">แชทในห้อง:</span>
          <div id="netRoomChatList" class="bg-slate-950 border border-slate-800 p-2 h-16 overflow-y-auto space-y-1 text-slate-300">
            ${this.chatHistory.map(msg => `<div class="text-[11px] text-cyan-200">💬 [${escapeHtml(msg.name)}]: ${escapeHtml(msg.text)}</div>`).join('')}
            <div class="text-[10px] text-slate-500">ห้องเตรียมพร้อมแล้ว สามารถส่งข้อความคุยกับเพื่อนร่วมห้องได้</div>
          </div>
          <div class="flex gap-2 mt-0.5">
            <input id="inputRoomChat" type="text" placeholder="พิมพ์ข้อความคุยในห้อง..." class="flex-1 bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-white outline-none focus:border-amber-400" />
            <button id="btnSendRoomChat" class="pixel-btn pixel-btn-blue px-3 py-1 text-xs text-cyan-200">ส่ง</button>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between items-center pt-2 border-t border-slate-800">
          <span class="text-[10px] text-slate-400">
            ${isHost ? 'พร้อมแล้วกดเริ่มเกมเพื่อส่งทุกคนเข้าสู่กระดาน' : 'กำลังรอ Host กดเริ่มเกม...'}
          </span>
          <button id="btnStartLobbyGame" ${!canStart ? 'disabled' : ''} class="pixel-btn pixel-btn-gold px-5 py-2 text-xs font-bold text-slate-950 ${!isHost ? 'opacity-60 cursor-not-allowed' : ''}">
            ${room.status === 'playing' ? 'เกมกำลังดำเนินอยู่' : isHost ? (canStart ? 'เข้าสู่อาณาจักร (เริ่มเกม) ➔' : 'รอผู้เล่น หรือ เปิด AI ให้ครบ') : '⏳ รอ Host เริ่มเกม...'}
          </button>
        </div>
      </div>
    `;

    document.getElementById('btnRetryRoomConnection')?.addEventListener('click', () => networkRoomManager.reconnectWebRTC());
    document.getElementById('btnLobbyQuickMatch')?.addEventListener('click', () => networkRoomManager.updateLobbySettings({ gameMode: 'blitz', matchConfig: { days: 8, startingLevel: 2, startingGold: 500, rewardRate: 1.5 } }));

    if (room.status === 'playing') {
      this.modal.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('.btn-lobby-party-size, #selectLobbyGameMode, .btn-toggle-slot-ai, .lobby-change-class').forEach(el => el.disabled = true);
    }
    document.getElementById('btnCloseActiveNetRoom')?.addEventListener('click', () => this.close());
    // Event Bindings
    document.getElementById('btnLeaveNetRoom')?.addEventListener('click', () => {
      audio.click();
      networkRoomManager.leaveRoom();
    });

    document.getElementById('btnCopyRoomCode')?.addEventListener('click', () => {
      audio.click();
      navigator.clipboard.writeText(room.code).then(() => {
        const btn = document.getElementById('btnCopyRoomCode');
        if (btn) btn.innerText = '✅ คัดลอกแล้ว!';
        setTimeout(() => {
          if (btn) btn.innerText = '📋 คัดลอก';
        }, 1500);
      });
    });

    document.getElementById('btnCopyInviteLink')?.addEventListener('click', () => {
      audio.click();
      const inviteUrl = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
      navigator.clipboard.writeText(inviteUrl).then(() => {
        const btn = document.getElementById('btnCopyInviteLink');
        if (btn) btn.innerText = '✅ ลิงก์แล้ว!';
        setTimeout(() => {
          if (btn) btn.innerText = '🔗 ลิงก์เชิญ';
        }, 1500);
      });
    });

    // Party size buttons (Host only)
    if (isHost) {
      document.querySelectorAll('.btn-lobby-party-size').forEach(btn => {
        btn.addEventListener('click', e => {
          audio.click();
          const target = e.currentTarget as HTMLElement;
          networkRoomManager.updateLobbySettings({ partySize: parseInt(target.getAttribute('data-count') || '3', 10) });
        });
      });

      document.getElementById('selectLobbyGameMode')?.addEventListener('change', e => {
        networkRoomManager.updateLobbySettings({ gameMode: (e.target as HTMLSelectElement).value });
      });

      document.querySelectorAll('.btn-toggle-slot-ai').forEach(btn => {
        btn.addEventListener('click', e => {
          audio.click();
          const target = e.currentTarget as HTMLElement;
          const slotIdx = parseInt(target.getAttribute('data-slot') || '0', 10);
          this.botSlots[slotIdx] = !this.botSlots[slotIdx];
          this.render();
        });
      });
    }

    // Change Class for myself
    document.querySelectorAll('.lobby-change-class').forEach(el => {
      el.addEventListener('change', e => {
        const ck = (e.target as HTMLSelectElement).value;
        this.localClass = ck;
        networkRoomManager.updatePlayerProfile(this.localName, this.localClass, this.localSkin);
      });
    });

    // Chat
    const sendChat = () => {
      const input = document.getElementById('inputRoomChat') as HTMLInputElement;
      const text = input?.value?.trim();
      if (text) {
        this.chatHistory.push({ name: this.localName, text });
        this.chatHistory = this.chatHistory.slice(-100);
        audio.click();
        networkRoomManager.broadcast({
          packetId: `${myPeerId}_chat_${Date.now()}`,
          type: 'CHAT_MSG',
          roomCode: room.code,
          senderId: myPeerId,
          senderName: this.localName,
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

    // Start Game Button
    if (isHost) {
      document.getElementById('btnStartLobbyGame')?.addEventListener('click', () => {
        if (!canStart || networkRoomManager.getRoomInfo()?.status !== 'lobby') return;
        audio.fanfare();
        this.close();

        // Construct final partyConfig from slots
        const finalPartyConfig = slots.map((s, idx) => ({
          name: s.name,
          classKey: s.classKey,
          isAI: s.isAI,
          skinVariant: s.skinVariant,
          peerId: s.peer?.id || `bot_${idx}`
        }));

        if (this.onStartGameCallback) {
          this.onStartGameCallback({
            partyConfig: finalPartyConfig,
            gameMode: this.gameMode,
            winGoal: 'networth',
            aiDifficulty: this.aiDifficulty,
            isMultiplayer: true
          });
        }
      });
    }
  }
}

export const multiplayerRoomUI = new MultiplayerRoomUI();
