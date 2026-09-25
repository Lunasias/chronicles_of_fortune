import { Player, CompanionData } from './Player';
import { BoardNode } from './BoardMap';

export interface FantasyChoice {
  text: string;
  subtext: string;
  icon: string;
  resolve: (player: Player, node: BoardNode) => FantasyEventOutcome;
}

export interface FantasyEventOutcome {
  outcomeTitle: string;
  outcomeText: string;
  icon: string;
  soundType: 'fanfare' | 'coin' | 'level' | 'hurt' | 'magic';
  goldChange?: number;
  hpChange?: number;
  mpChange?: number;
  companionRecruited?: CompanionData;
}

export interface FantasyEventData {
  id: string;
  category:
    | 'church'
    | 'tavern'
    | 'shop_weapon'
    | 'shop_magic'
    | 'shop_item'
    | 'guild'
    | 'fishing'
    | 'vault'
    | 'dark_gate'
    | 'waterfall_forest'
    | 'sakura_shrine'
    | 'steampunk'
    | 'volcano'
    | 'snow'
    | 'desert'
    | 'abyss'
    | 'blue'
    | 'red'
    | 'empty';
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  description: string;
  bannerColor: string;
  choices: FantasyChoice[];
  actionType?: 'open_weapon_shop' | 'open_magic_shop' | 'open_item_shop' | 'open_guild' | 'open_fishing';
}

export class FantasyEventManager {
  private lastEventId: string = '';

  public events: FantasyEventData[] = [
    // =========================================================================
    // 1. CHURCH EVENTS (วิหารศักดิ์สิทธิ์)
    // =========================================================================
    {
      id: 'church_holy_nun',
      category: 'church',
      title: 'ซิสเตอร์เบียทริซ แม่ชีศักดิ์สิทธิ์แห่งวิหาร',
      subtitle: 'Sister Beatrice of the Holy Sanctuary',
      icon: '🕊️',
      badge: 'แม่ชีศักดิ์สิทธิ์ผู้เมตตา',
      bannerColor: '#38bdf8',
      description: 'ซิสเตอร์เบียทริซในชุดแม่ชีสีขาวสะอาดส่งรอยยิ้มอบอุ่นพร้อมประคองมือคุณ "ยินดีต้อนรับสู่พระวิหารจ้ะ บุตรแห่งแสง... บาดเจ็บหรือเหนื่อยล้าจากการเดินทางมาใช่ไหม?"',
      choices: [
        {
          text: 'คุกเข่าขอรับพรแห่งการรักษาศักดิ์สิทธิ์',
          subtext: 'ฟื้นฟู HP/MP จนเต็มเปี่ยม + ล้างสถานะสนิมและคำสาป',
          icon: '✨',
          resolve: (player) => {
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            player.rustTurns = 0;
            return {
              outcomeTitle: 'แสงศักดิ์สิทธิ์ชำระล้างจิตวิญญาณ!',
              outcomeText: `ละอองแสงสีทองโอบล้อมทั่วกาย บาดแผลหายสนิทและคำสาปทั้งหมดถูกขับไล่จนหมดสิ้น!`,
              icon: '🕊️',
              soundType: 'level',
              hpChange: player.maxHp,
              mpChange: player.maxMp
            };
          }
        },
        {
          text: 'สารภาพบาปและบริจาคทาน 50G',
          subtext: 'บริจาค 50G ได้รับบัฟพรคุ้มภัย +1 DEF, +1 LUK ถาวร',
          icon: '🪙',
          resolve: (player) => {
            const cost = Math.min(player.gold, 50);
            player.gold -= cost;
            player.def += 1;
            player.luk += 1;
            return {
              outcomeTitle: 'บุญกุศลหนุนนำดวงชะตา!',
              outcomeText: `ซิสเตอร์เบียทริซสวดบทสวดสรรเสริญ ทวยเทพประทานเกราะคุ้มกันจิตวิญญาณ (+1 DEF, +1 LUK ถาวร)!`,
              icon: '🛡️',
              soundType: 'fanfare',
              goldChange: -cost
            };
          }
        },
        {
          text: 'ช่วยเธอทำความสะอาดวิหารและคัมภีร์',
          subtext: 'ได้รับม้วนคัมภีร์ [Holy Sanctuary] และ 60 EXP',
          icon: '📜',
          resolve: (player) => {
            player.fieldSpells.push('holy_sanctuary');
            player.gainXP(60);
            return {
              outcomeTitle: 'ค้นพบคัมภีร์โบราณในห้องสมุด!',
              outcomeText: `ระหว่างปัดฝุ่น คุณพบคัมภีร์เวทมนตร์หลวง ซิสเตอร์มอบ [Holy Sanctuary] ให้เป็นของตอบแทน (+60 EXP)!`,
              icon: '📖',
              soundType: 'coin'
            };
          }
        }
      ]
    },
    {
      id: 'church_succubus',
      category: 'church',
      title: 'ซัคคิวบัสสาวในโบสถ์ศักดิ์สิทธิ์ ลิลิธ',
      subtitle: 'Succubus Lilith in the Confessional',
      icon: '💋',
      badge: 'ซัคคิวบัสจ้องยั่วในโบสถ์',
      bannerColor: '#a855f7',
      description: 'ใต้แสงเทียนวูบวาบของห้องสารภาพบาป ซัคคิวบัสสาวทรงโตสะบัดปีกค้างคาวโผล่ออกมาจากเงามืด ส่งสายตาหวานฉ่ำ "แหม... นักรบรูปงาม มาสารภาพบาปหรืออยากมาหาความสุขกับข้ากันแน่จ๊ะ?"',
      choices: [
        {
          text: 'ตั้งสมาธิสวดมนต์ขับไล่ด้วยพลังศรัทธา',
          subtext: 'ขับไล่สำเร็จ ได้รับ +9 Max HP ถาวร และ 80 EXP',
          icon: '✝️',
          resolve: (player) => {
            player.maxHp += 9;
            player.hp += 30;
            player.gainXP(80);
            return {
              outcomeTitle: 'แสงศักดิ์สิทธิ์ขับไล่ความมืด!',
              outcomeText: `จิตใจที่ไม่หวั่นไหวทำให้เกิดรัศมีศักดิ์สิทธิ์ขับไล่ซัคคิวบัสกรีดร้องหนีไป! ทวยเทพประสาทพรให้ (+9 Max HP ถาวร, +80 EXP)!`,
              icon: '✨',
              soundType: 'fanfare',
              hpChange: 30
            };
          }
        },
        {
          text: 'ยอมรับจุมพิตแลกเปลี่ยนพลังแห่งความมืด',
          subtext: 'เสีย 20 HP แต่ได้รับพลังปีศาจ +2 ATK, +2 MAG ถาวร',
          icon: '💋',
          resolve: (player) => {
            player.hp = Math.max(10, player.hp - 20);
            player.atk += 2;
            player.mag += 2;
            return {
              outcomeTitle: 'จุมพิตต้องห้ามแห่งรัตติกาล!',
              outcomeText: `ริมฝีปากนุ่มประกบลงมา! แม้จะถูกดูดพลังชีวิตไปบางส่วน (-20 HP) แต่คุณกลับได้พลังเพลิงปีศาจไหลเวียนในร่าง (+2 ATK, +2 MAG ถาวร)!`,
              icon: '😈',
              soundType: 'magic',
              hpChange: -20
            };
          }
        },
        {
          text: 'ยื่นไม้กางเขนเงินให้เธอเป็นของขวัญล้อเล่น',
          subtext: 'เธอชอบใจ มอบ [แหวนเสน่ห์ปีศาจ] ให้',
          icon: '🎁',
          resolve: (player) => {
            player.inventory.push({
              id: 'acc_succubus_ring',
              name: 'แหวนเสน่ห์ซัคคิวบัส (Succubus Charm Ring)',
              type: 'accessory',
              cost: 220,
              desc: 'แหวนอัญมณีสีชมพูเปล่งประกาย (+2 LUK, +2 MAG)',
              icon: '💍✨'
            });
            return {
              outcomeTitle: 'คารมทะลึ่งถูกใจปีศาจสาว!',
              outcomeText: `เธอหัวเราะคิกคักอย่างชอบใจ "แหม ร้ายไม่เบานะพ่อหนุ่ม!" เธอโยนแหวนเสน่ห์ประจำตัวให้ก่อนจะบินละลิ่วหายไปในเงา!`,
              icon: '💍',
              soundType: 'coin'
            };
          }
        }
      ]
    },
    {
      id: 'church_graveyard_zombie',
      category: 'church',
      title: 'สาวน้อยซอมบี้ ซอมบีน่า ในสุสานโบสถ์',
      subtitle: 'Zombie Girl Zombina in the Cemetery',
      icon: '🧟‍♀️',
      badge: 'สาวน้อยซอมบี้น่ารักในสุสาน',
      bannerColor: '#10b981',
      description: 'หลังกำแพงสุสานโบราณของโบสถ์ ดินหลุมศพขยับไหว สาวน้อยซอมบี้ผิวซีดแต้มแก้มชมพูโผล่ขึ้นมา เธอเอียงคอทำตาแป๋ว "ง่ำ... มนุษย์เหรอ? หม่ำสมองได้ไหม? หรือมีดอกไม้สวยๆ ให้เค้าไหมน้า?"',
      choices: [
        {
          text: 'ยื่นแอปเปิ้ลและขนมปังหอมกรุ่นให้เธอกิน',
          subtext: 'เธออิ่มท้อง มอบเครื่องรางกระดูกนำโชค +2 LUK, +1 DEF',
          icon: '🍎',
          resolve: (player) => {
            player.luk += 2;
            player.def += 1;
            player.inventory.push({
              id: 'acc_bone_charm',
              name: 'เครื่องรางกระดูกนำโชค (Lucky Bone Charm)',
              type: 'accessory',
              cost: 160,
              desc: 'เครื่องรางโบราณป้องกันเภทภัย (+1 DEF, +2 LUK)',
              icon: '🦴'
            });
            return {
              outcomeTitle: 'ซอมบี้สาวน้อยอารมณ์ดี!',
              outcomeText: `ซอมบีน่าเคี้ยวแอปเปิ้ลอย่างเอร็ดอร่อย "อร่อยกว่าสมองเยอะเลย!" เธอมอบเครื่องรางกระดูกโบราณให้เป็นการตอบแทน (+2 LUK, +1 DEF ถาวร)!`,
              icon: '🦴',
              soundType: 'coin'
            };
          }
        },
        {
          text: 'ร่ายมนตร์แสงชำระล้างร่างให้เธอขยับได้คล่อง',
          subtext: 'กล้ามเนื้อคลายตัว เธอสอนสเต็ปเดินทะลุมิติ +1 SPD',
          icon: '✨',
          resolve: (player) => {
            player.spd += 1;
            player.gainXP(60);
            return {
              outcomeTitle: 'ซอมบี้สปีดเก้ากะรัต!',
              outcomeText: `เวทมนตร์แสงทำให้ข้อต่อของเธอไม่ติดขัด เธอโชว์สเต็ปวิ่งฉิวและสอนเทคนิคการหลบหลีกให้คุณ (+1 SPD ถาวร, +60 XP)!`,
              icon: '👟',
              soundType: 'level'
            };
          }
        },
        {
          text: 'ช่วยเธอขุดหีบสมบัติที่ฝังไว้ใต้หลุมศพ',
          subtext: 'ขุดพบหีบเงินโบราณ ได้รับทอง 160G ทันที',
          icon: '⛏️',
          resolve: (player) => {
            const gold = 160;
            player.gold += gold;
            return {
              outcomeTitle: 'ขุมทรัพย์ใต้สุสานโบราณ!',
              outcomeText: `ใต้รากไม้มีหีบเงินโบราณฝังอยู่ ซอมบีน่าบอกว่าไม่รู้จะเอาไปทำอะไร ยกให้คุณหมดเลย (+${gold}G)!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        }
      ]
    },

    // =========================================================================
    // 2. TAVERN EVENTS (โรงเตี๊ยมและบาร์สุรา)
    // =========================================================================
    {
      id: 'tavern_brawl',
      category: 'tavern',
      title: 'เรื่องวิวาทในโรงเตี๊ยมกลางดึก',
      subtitle: 'Tavern Bar Brawl',
      icon: '🍺',
      badge: 'โดนหาเรื่องที่บาร์',
      bannerColor: '#d97706',
      description: 'ในบาร์สุราที่คลาคล่ำไปด้วยผู้คน จู่ๆ มีนักรบสาวขี้เมาทำเหยือกเบียร์ตกแตก แล้วหันมาชี้หน้าคุณ "เห้ย! เจ้าหน้าใหม่ เดินเข้ามาจ้องตาหาเรื่องเรอะ?!"',
      choices: [
        {
          text: 'คว่ำโต๊ะแล้วซัดหมัดสั่งสอน!',
          subtext: 'ชนะการตะลุมบอน ได้รับเงินเดิมพัน 130G + 50 EXP',
          icon: '👊',
          resolve: (player) => {
            const gold = 130;
            player.gold += gold;
            player.gainXP(50);
            return {
              outcomeTitle: 'หมัดเด็ดสยบทั้งบาร์!',
              outcomeText: `คุณซัดหมัดตรงเข้าเป้าอย่างจัง! ทุกคนในร้านส่งเสียงเฮลั่น เจ้าของบาร์ยกเงินเดิมพัน ${gold}G ให้แก่ผู้ชนะ (+50 EXP)!`,
              icon: '💥',
              soundType: 'fanfare',
              goldChange: gold
            };
          }
        },
        {
          text: 'สั่งเบียร์ถังใหญ่เลี้ยงทั้งบาร์เพื่อเคลียร์ใจ',
          subtext: 'จ่าย 40G กลายเป็นมิตร ได้รับอาหารฟื้นฟูและข่าวลับ',
          icon: '🍻',
          resolve: (player) => {
            player.gold = Math.max(0, player.gold - 40);
            player.hp = Math.min(player.maxHp, player.hp + 45);
            return {
              outcomeTitle: 'มิตรภาพก่อเกิดจากรสสุรา!',
              outcomeText: `"ชนแก้ววว!" เสียงกึกก้องดังขึ้น นักรบสาวกอดคอขอโทษคุณ และแบ่งปันกับแกล้มแสนอร่อยให้ (+45 HP, ได้รับความนับถือ)!`,
              icon: '🍖',
              soundType: 'coin',
              goldChange: -40,
              hpChange: 45
            };
          }
        },
        {
          text: 'มุดใต้โต๊ะแล้วกระโดดออกทางหน้าต่าง',
          subtext: 'หลบหลีกฉับไว ได้รับความว่องไว +1 SPD ถาวร',
          icon: '💨',
          resolve: (player) => {
            player.spd += 1;
            return {
              outcomeTitle: 'วิชาตัวเบาพริ้วไหว!',
              outcomeText: `คุณสไลด์ตัวลอดใต้โต๊ะแล้วดีดตัวออกทางหน้าต่างอย่างสวยงามโดยไม่มีใครจับได้ (+1 SPD ถาวร)!`,
              icon: '👟',
              soundType: 'level'
            };
          }
        }
      ]
    },
    {
      id: 'tavern_bard_song',
      category: 'tavern',
      title: 'นักกวีสาวพเนจรกับบทเพลงแห่งโชคลาภ เมโลดี้',
      subtitle: 'Elven Bard Melody and the Song of Fortune',
      icon: '🪕',
      badge: 'บทเพลงกวีขับขาน',
      bannerColor: '#ec4899',
      description: 'นักกวีสาวเอลฟ์ในชุดขนนกสีเขียวมรกตกำลังดีดพิณลูทเสียงใสกังวานอยู่มุมบาร์ เธอสบตาคุณพร้อมขยิบตา "นักผจญภัยผู้องอาจ สนใจฟังบทเพลงขับขานชะตากรรมเพื่อเสริมโชคลาภไหม?"',
      choices: [
        {
          text: 'นั่งฟังบทเพลงสรรเสริญผู้กล้าอย่างตั้งใจ',
          subtext: 'จิตวิญญาณฮึกเหิม ได้รับ +1 ATK, +30 MP ถาวร',
          icon: '🎶',
          resolve: (player) => {
            player.atk += 1;
            player.maxMp += 30;
            player.mp = player.maxMp;
            return {
              outcomeTitle: 'เพลงพิณปลุกพลังฮึกเหิม!',
              outcomeText: `ท่วงทำนองอันทรงพลังทำให้เลือดในกายสูบฉีด (+1 ATK ถาวร, +30 Max MP, ฟื้นฟู MP เต็มเปี่ยม)!`,
              icon: '🔥',
              soundType: 'level',
              mpChange: player.maxMp
            };
          }
        },
        {
          text: 'ร่วมร้องเพลงประสานเสียงและเป่าขลุ่ยคลอ',
          subtext: 'เรียกเสียงปรบมือจากคนทั้งร้าน ได้ทิปรวม 140G',
          icon: '🎤',
          resolve: (player) => {
            const gold = 140;
            player.gold += gold;
            return {
              outcomeTitle: 'การแสดงคู่สะกดใจคนทั้งร้าน!',
              outcomeText: `ผู้ชมต่างโยนเหรียญทองลงหมวกรางวัลอย่างล้นหลาม เมโลดี้แบ่งเงินทิปให้คุณ ${gold}G ด้วยรอยยิ้มหวาน!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'ขอซื้อแผ่นโน้ตเพลงเวทมนตร์ลับ',
          subtext: 'จ่าย 50G ได้รับ [ขลุ่ยมนตราสายลม] +2 SPD',
          icon: '🎼',
          resolve: (player) => {
            const cost = Math.min(player.gold, 50);
            player.gold -= cost;
            player.inventory.push({
              id: 'acc_wind_flute',
              name: 'ขลุ่ยมนตราสายลม (Wind Song Flute)',
              type: 'accessory',
              cost: 180,
              desc: 'ขลุ่ยไม้เอลฟ์เร่งความเร็วในการเคลื่อนไหว (+2 SPD)',
              icon: '🪈'
            });
            return {
              outcomeTitle: 'ได้รับเครื่องดนตรีเวทมนตร์!',
              outcomeText: `เมโลดี้มอบขลุ่ยไม้โบราณที่สลักเวทมนตร์สายลมให้คุณ (+2 SPD จากอุปกรณ์)!`,
              icon: '🪈',
              soundType: 'fanfare',
              goldChange: -cost
            };
          }
        }
      ]
    },
    {
      id: 'tavern_gambling_maiden',
      category: 'tavern',
      title: 'สาวน้อยนักพนันลูกเต๋าเดิมพันสูง รูเล็ตต์',
      subtitle: 'Dice Maiden Roulette High-Stakes Table',
      icon: '🎲',
      badge: 'การพนันลูกเต๋าเสี่ยงโชค',
      bannerColor: '#f59e0b',
      description: 'บนโต๊ะกำมะหยี่สีแดงมุมมืด สาวผมสั้นทรงเสน่ห์กำลังโยนลูกเต๋าเพชรในแก้วคริสตัล "อยากรวยทางลัดไหมคุณลูกค้า? ลูกเต๋าของฉันไม่เคยโกหก ใครใจกล้าก็ได้เงินก้อนโตกลับบ้านไป!"',
      choices: [
        {
          text: 'เดิมพันสูง ทายแต้มสูง (High Roll 5-6)',
          subtext: 'ทายถูกรับทอง 220G หรือเสีย 60G',
          icon: '🎲',
          resolve: (player) => {
            if (Math.random() > 0.45) {
              player.gold += 220;
              return {
                outcomeTitle: 'แต้ม 6 สีทอง! ชนะเดิมพันครั้งใหญ่!',
                outcomeText: `ลูกเต๋าหยุดที่หน้า 6 รูเล็ตต์ปรบมือยอมแพ้และผลักเหรียญทองก้อนโตให้คุณ 220G!`,
                icon: '💰',
                soundType: 'coin',
                goldChange: 220
              };
            } else {
              const lost = Math.min(player.gold, 60);
              player.gold -= lost;
              return {
                outcomeTitle: 'แต้ม 1... โชคไม่เข้าข้าง!',
                outcomeText: `ลูกเต๋าออกหน้าต่ำ คุณเสียเงินเดิมพัน ${lost}G รูเล็ตต์ยิ้มเยาะพลางกวาดชิปไป`,
                icon: '💸',
                soundType: 'hurt',
                goldChange: -lost
              };
            }
          }
        },
        {
          text: 'ดวลแข่งดื่มเหล้าเพลิงแทนการทอยเต๋า',
          subtext: 'คอแข็ง ชนะรับเงิน 100G และ +9 Max HP',
          icon: '🥃',
          resolve: (player) => {
            player.maxHp += 9;
            player.hp = Math.min(player.maxHp, player.hp + 30);
            player.gold += 100;
            return {
              outcomeTitle: 'คอทองแดงไร้พ่าย!',
              outcomeText: `คุณกระดกเหล้าเพลิงรวดเดียวหมดขวดโดยไม่สะทกสะท้าน! เธอเมาพับคอตกและยอมยกเงิน 100G ให้ (+9 Max HP ถาวร)!`,
              icon: '🏆',
              soundType: 'level',
              goldChange: 100,
              hpChange: 30
            };
          }
        },
        {
          text: 'ขอซื้อลูกเต๋าเสี่ยงโชคคู่กายของเธอ',
          subtext: 'จ่าย 70G ได้รับ [สปินเนอร์ 3 ลูกเต๋า] พกติดตัว',
          icon: '🌀',
          resolve: (player) => {
            const cost = Math.min(player.gold, 70);
            player.gold -= cost;
            player.inventory.push({
              id: 'spin_3',
              name: 'สปินเนอร์ 3 ลูกเต๋า (3-Spinner)',
              type: 'spinner',
              cost: 120,
              desc: 'ทอยลูกเต๋า 3 ลูกในเทิร์นถัดไป!',
              icon: '🌀'
            });
            return {
              outcomeTitle: 'ได้ลูกเต๋ากลโกงนำโชค!',
              outcomeText: `รูเล็ตต์ยอมแบ่งสปินเนอร์ลูกเต๋านำโชคให้คุณนำไปใช้ทอยเดินบนกระดาน Dokapon!`,
              icon: '🌀',
              soundType: 'coin',
              goldChange: -cost
            };
          }
        }
      ]
    },

    // =========================================================================
    // 3. WATERFALL FOREST (ป่าน้ำตกมรกตพันปี)
    // =========================================================================
    {
      id: 'waterfall_elf_princess',
      category: 'waterfall_forest',
      title: 'เจ้าหญิงไฮเอลฟ์ ซิลฟิร่า กลางม่านน้ำตก',
      subtitle: 'High Elf Princess Sylphira at Emerald Cascade',
      icon: '🧝‍♀️',
      badge: 'เจ้าหญิงเอลฟ์แห่งน้ำตกมรกต',
      bannerColor: '#10b981',
      description: 'ท่ามกลางละอองน้ำใสเย็นของน้ำตกมรกตพันปี เจ้าหญิงไฮเอลฟ์ผมสีเงินสว่างในชุดผ้าไหมบางเบากำลังนั่งสมาธิบนโขดหิน ผิวขาวผ่องสะท้อนประกายน้ำ เธอค่อยๆ ลืมตาสีมรกตมองคุณ',
      choices: [
        {
          text: 'นั่งสมาธิและประสานพลังเวทมนตร์ร่วมกับเธอ',
          subtext: 'พลังจิตผสานกลมกลืน +2 MAG, +1 DEF ถาวร และฟื้น MP',
          icon: '🧘‍♀️',
          resolve: (player) => {
            player.mag += 2;
            player.def += 1;
            player.mp = player.maxMp;
            return {
              outcomeTitle: 'การผสานพลังจิตวิญญาณพฤกษา!',
              outcomeText: `กระแสมานาบริสุทธิ์จากน้ำตกไหลเวียนสู่แก่นพลังของคุณ (+2 MAG, +1 DEF ถาวร, ฟื้นฟู MP เต็มเปี่ยม)!`,
              icon: '🌿✨',
              soundType: 'level',
              mpChange: player.maxMp
            };
          }
        },
        {
          text: 'ขอรับพรอาร์เชอร์แห่งเอลฟ์โบราณ',
          subtext: 'สายตาเฉียบคม ได้รับ +2 SPD และ [คันธนูมรกต]',
          icon: '🏹',
          resolve: (player) => {
            player.spd += 2;
            player.inventory.push({
              id: 'wpn_emerald_bow',
              name: 'คันธนูสายน้ำตกมรกต (Cascade Bow)',
              type: 'weapon',
              cost: 240,
              atk: 14,
              spd: 6,
              desc: 'คันธนูไม้ศักดิ์สิทธิ์ (+2 ATK, +2 SPD)',
              icon: '🏹'
            });
            return {
              outcomeTitle: 'วิชาศรสายลมแห่งพงไพร!',
              outcomeText: `ซิลฟิร่าแตะหน้าผากคุณเบาๆ มอบสัญชาตญาณนักล่าและมอบ [คันธนูสายน้ำตกมรกต] ให้ (+2 SPD ถาวร)!`,
              icon: '🏹',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'เก็บผลไม้น้ำตกมรกตมาแบ่งให้เธอกิน',
          subtext: 'เธอประทับใจ มอบน้ำทิพย์ฟูลเอลิกเซอร์ 1 ขวด',
          icon: '🍇',
          resolve: (player) => {
            player.inventory.push({
              id: 'pot_elixir',
              name: 'น้ำทิพย์ฟื้นฟูสมบูรณ์ (Full Elixir)',
              type: 'potion',
              cost: 110,
              desc: 'ฟื้นฟู HP & MP จนเต็มเปี่ยม',
              icon: '🏺'
            });
            return {
              outcomeTitle: 'ผลไม้ป่ารสหวานฉ่ำ!',
              outcomeText: `เจ้าหญิงเอลฟ์ยิ้มอย่างอ่อนโยน "ขอบใจนะนักเดินทาง" เธอมอบ [Full Elixir] หายากให้คุณพกติดตัว!`,
              icon: '🏺',
              soundType: 'coin'
            };
          }
        }
      ]
    },
    {
      id: 'waterfall_catgirl_mia',
      category: 'waterfall_forest',
      title: 'แคทเกิร์ลนักล่า มีอา ดักจับปลาลำธาร',
      subtitle: 'Catgirl Huntress Mia at the Turquoise Stream',
      icon: '🐱',
      badge: 'สาวน้อยแมวป่าจอมซน',
      bannerColor: '#f59e0b',
      description: 'สาวน้อยหูแมวและหางฟูนุ่มในชุดหนังสัตว์รัดรูปกำลังยืนจ้องปลาในน้ำใสอย่างตั้งอกตั้งใจ "งั่ม! ปลาตัวเบ้อเริ่มเลย! เมี้ยวว~ นายท่าน ช่วยมีอาต้อนปลาหน่อยสิ!"',
      choices: [
        {
          text: 'กระโดดลงน้ำช่วยมีอาจับปลาแซลมอนยักษ์',
          subtext: 'จับปลาสำเร็จ ได้รับปลาฟื้นฟู และ +1 SPD ถาวร',
          icon: '🐟',
          resolve: (player) => {
            player.spd += 1;
            player.hp = Math.min(player.maxHp, player.hp + 50);
            return {
              outcomeTitle: 'จับปลาแซลมอนทองคำยักษ์สำเร็จ!',
              outcomeText: `ทั้งคุณและมีอาเปียกปอนแต่จับปลาตัวโตได้! มีอาดีใจกอดแขนคุณแน่น (+1 SPD ถาวร, ฟื้นฟู 50 HP)!`,
              icon: '🐟',
              soundType: 'level',
              hpChange: 50
            };
          }
        },
        {
          text: 'เกาคางและลูบหัวมีอาเบาๆ',
          subtext: 'เธอครางเพลิน มอบ [กรงเล็บเงาแมวป่า] ให้',
          icon: '🐾',
          resolve: (player) => {
            player.inventory.push({
              id: 'wpn_cat_claws',
              name: 'กรงเล็บเงาแมวป่า (Shadow Cat Claws)',
              type: 'weapon',
              cost: 210,
              atk: 12,
              spd: 8,
              desc: 'กรงเล็บว่องไวไร้เสียง (+2 ATK, +2 SPD)',
              icon: '🐾'
            });
            return {
              outcomeTitle: 'ฟินจนหางส่ายดุ๊กดิ๊ก!',
              outcomeText: `มีอาครางกรรโชกเบาๆ อย่างมีความสุข เธอมอบกรงเล็บสำรองที่ลับคมไว้อย่างดีให้คุณ!`,
              icon: '💖',
              soundType: 'coin'
            };
          }
        },
        {
          text: 'ช่วยเธอวางกับดักสัตว์รอบน้ำตก',
          subtext: 'ดักจับมอนสเตอร์ได้เงิน 130G และ 65 EXP',
          icon: '🪤',
          resolve: (player) => {
            const gold = 130;
            player.gold += gold;
            player.gainXP(65);
            return {
              outcomeTitle: 'กับดักทำงานยอดเยี่ยม!',
              outcomeText: `กับดักดักจับสัตว์ป่าตัวร้ายได้สำเร็จ ชาวบ้านใกล้เคียงมอบรางวัลให้ 130G (+65 EXP)!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        }
      ]
    },
    {
      id: 'waterfall_mermaid_ondine',
      category: 'waterfall_forest',
      title: 'เทพธิดาวารี ออนดีน แห่งวังน้ำวน',
      subtitle: 'Water Archon Ondine at the Deep Basin',
      icon: '🧜‍♀️',
      badge: 'เทพธิดาวารีบรรพกาล',
      bannerColor: '#06b6d4',
      description: 'จากก้นสระน้ำสีฟ้าครามลึกใต้หน้าผาน้ำตก เทพธิดาวารีครึ่งเงือกสาวแสนสวยผุดขึ้นมา ละอองน้ำสะท้อนแสงแดดระยิบระยับ "ผู้มาเยือนแห่งสายน้ำ... เจ้ากำลังมองหาสิ่งใดในสายธารแห่งข้า?"',
      choices: [
        {
          text: 'ดำน้ำลงไปช่วยเก็บไข่มุกโบราณใต้ก้นสระ',
          subtext: 'ได้รับ [ไข่มุกสมุทรคราม] ขายได้ 200G หรือสวมใส่ +2 LUK',
          icon: '🦪',
          resolve: (player) => {
            player.luk += 2;
            player.inventory.push({
              id: 'acc_ocean_pearl',
              name: 'ไข่มุกสมุทรคราม (Deep Sea Pearl)',
              type: 'accessory',
              cost: 200,
              desc: 'ไข่มุกเรืองแสงใต้บาดาล (+2 LUK, +1 MAG)',
              icon: '🦪'
            });
            return {
              outcomeTitle: 'ไข่มุกประกายรุ้งใต้บาดาล!',
              outcomeText: `ออนดีนยิ้มหวานและมอบไข่มุกสมุทรให้คุณนำไปสวมใส่หรือขายในร้านค้า (+2 LUK ถาวร)!`,
              icon: '✨',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'ขอรับพรเกราะวารีคุ้มภัย',
          subtext: 'ได้รับเกราะฟองสบู่เวทมนตร์ +2 DEF, +12 Max HP',
          icon: '🛡️',
          resolve: (player) => {
            player.def += 2;
            player.maxHp += 12;
            player.hp += 40;
            return {
              outcomeTitle: 'ม่านเกราะวารีพิทักษ์!',
              outcomeText: `ละอองน้ำหมุนวนรอบกายกลายเป็นเกราะเวทมนตร์คุ้มกาย (+2 DEF, +12 Max HP ถาวร)!`,
              icon: '🌊',
              soundType: 'level',
              hpChange: 40
            };
          }
        },
        {
          text: 'ดื่มน้ำจากแกนน้ำพุมรกตบริสุทธิ์',
          subtext: 'ชำระล้างสารพิษ ฟื้นฟู HP & MP เต็ม และได้ 80 EXP',
          icon: '💧',
          resolve: (player) => {
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            player.gainXP(80);
            return {
              outcomeTitle: 'ความสดชื่นแห่งสายธารสวรรค์!',
              outcomeText: `รสชาติน้ำแร่หวานชื่นใจช่วยเติมเต็มพละกำลังจนล้นปรี่ (+80 EXP)!`,
              icon: '💧',
              soundType: 'magic',
              hpChange: player.maxHp,
              mpChange: player.maxMp
            };
          }
        }
      ]
    },

    // =========================================================================
    // 4. SAKURA SHRINE (ศาลเจ้าซากุระพันปี)
    // =========================================================================
    {
      id: 'kitsune_shrine_maiden',
      category: 'sakura_shrine',
      title: 'สาวจิ้งจอกเก้าหางแห่งศาลเจ้า ทามาโมะ',
      subtitle: 'Kitsune Shrine Maiden Tamamo',
      icon: '🦊',
      badge: 'มิโกะจิ้งจอกซากุระ',
      bannerColor: '#fb7185',
      description: 'ใต้ต้นซากุระโบราณที่กลีบดอกร่วงโรย สาวจิ้งจอกในชุดมิโกะสีขาวแดงกำลังนั่งจิบชา เธอส่งยิ้มหวานพลางส่ายหางฟูฟ่อง "ยินดีต้อนรับสู่อาณาเขตศักดิ์สิทธิ์จ้ะ นักเดินทาง... สนใจเสี่ยงเซียมซีชะตากับข้าไหม?"',
      choices: [
        {
          text: 'เสี่ยงเซียมซีทำนายดวงชะตา',
          subtext: 'หยิบเซียมซีมหาโชค ได้รับเงิน 150G และ +2 LUK ถาวร',
          icon: '🥠',
          resolve: (player) => {
            const gold = 150;
            player.gold += gold;
            player.luk += 2;
            return {
              outcomeTitle: 'เซียมซีมหาโชคดีเยี่ยม!',
              outcomeText: `ใบเซียมซีสีทองส่องประกาย! "เจ้ากำลังจะได้ลาภก้อนโต!" เทพเจ้าประทานเงินให้ ${gold}G พร้อมโชคชะตาหนุนนำ (+2 LUK ถาวร)!`,
              icon: '✨',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'นั่งจิบชาและกินขนมโมจิร่วมกับเธอ',
          subtext: 'จิตใจสงบสุข ฟื้นฟู HP 50 และได้รับ +1 DEF ถาวร',
          icon: '🍵',
          resolve: (player) => {
            player.hp = Math.min(player.maxHp, player.hp + 50);
            player.def += 1;
            return {
              outcomeTitle: 'ชาร้อนและโมจิเลิศรส!',
              outcomeText: `รสชาติชาเขียวหอมละมุนและขนมโมจินุ่มหนึบช่วยเสริมสร้างเกราะคุ้มกันจิตวิญญาณ (+50 HP, +1 DEF ถาวร)!`,
              icon: '🍡',
              soundType: 'level',
              hpChange: 50
            };
          }
        },
        {
          text: 'ขอสัมผัสหางจิ้งจอกขนนุ่มนิ่ม',
          subtext: 'ความนุ่มฟูฟื้นฟู MP เต็ม และมอบเครื่องรางจิ้งจอก',
          icon: '🦊',
          resolve: (player) => {
            player.mp = player.maxMp;
            player.inventory.push({
              id: 'acc_kitsune_charm',
              name: 'เครื่องรางขนจิ้งจอก (Kitsune Tail Charm)',
              type: 'accessory',
              cost: 180,
              desc: 'เครื่องรางนำโชคแห่งศาลเจ้า (+1 SPD, +2 LUK)',
              icon: '🎐'
            });
            return {
              outcomeTitle: 'ความนุ่มฟูเกินห้ามใจ!',
              outcomeText: `เธอหน้าแดงแต่ยอมให้คุณกอดหางฟูนุ่มอย่างอบอุ่น พลังเวทฟื้นฟูจนเต็มเปี่ยม พร้อมได้รับ [เครื่องรางขนจิ้งจอก]!`,
              icon: '💖',
              soundType: 'fanfare',
              mpChange: player.maxMp
            };
          }
        }
      ]
    },
    {
      id: 'sakura_samurai_maiden',
      category: 'sakura_shrine',
      title: 'โรนินสาวดาบซากุระ คาเอเดะ',
      subtitle: 'Ronin Swordswoman Kaede Under Falling Petals',
      icon: '🌸⚔️',
      badge: 'ยอดฝีมือดาบซามูไรหญิง',
      bannerColor: '#f43f5e',
      description: 'สาวซามูไรผมหางม้าในชุดกิโมโนผ่าข้างพริ้วไหว กำลังยืนสงบนิ่งฝึกฟันกลีบดอกซากุระกลางอากาศด้วยดาบคาทาน่าประกายเงิน "เพลงดาบของเจ้าคมกริบเพียงใดกัน? มาประลองแลกเปลี่ยนวิชากันหน่อยไหม?"',
      choices: [
        {
          text: 'ชักดาบประลองฝีมือเพลงดาบอย่างยุติธรรม',
          subtext: 'สู้ชนะอย่างสง่างาม ได้รับ +2 ATK ถาวร และ 85 EXP',
          icon: '⚔️',
          resolve: (player) => {
            player.atk += 2;
            player.gainXP(85);
            return {
              outcomeTitle: 'เพลงดาบสะท้านซากุระ!',
              outcomeText: `ดาบปะทะกันเกิดประกายไฟระยิบระยับ! คาเอเดะโค้งคำนับชื่นชมในวิถีดาบของคุณ (+2 ATK ถาวร, +85 EXP)!`,
              icon: '⚔️',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'แบ่งข้าวกล่องเบนโตะกินใต้ต้นซากุระ',
          subtext: 'สร้างมิตรภาพ ฟื้นฟู HP 60 และได้รับเงิน 80G',
          icon: '🍱',
          resolve: (player) => {
            player.hp = Math.min(player.maxHp, player.hp + 60);
            player.gold += 80;
            return {
              outcomeTitle: 'เบนโตะมิตรภาพใต้ร่มไม้!',
              outcomeText: `คาเอเดะชอบใจกับข้าวปั้นของคุณ เธอแบ่งเงินค่าจ้างคุ้มกันศาลเจ้าให้คุณ 80G (+60 HP)!`,
              icon: '🍱',
              soundType: 'coin',
              hpChange: 60,
              goldChange: 80
            };
          }
        },
        {
          text: 'ช่วยเธอขัดเงาและลงน้ำมันดาบคาทาน่า',
          subtext: 'เรียนรู้เทคนิคการลับคมดาบ ได้รับ +1 SPD, +1 ATK',
          icon: '✨',
          resolve: (player) => {
            player.spd += 1;
            player.atk += 1;
            return {
              outcomeTitle: 'คมดาบกระจกเงาวับ!',
              outcomeText: `ใบดาบส่องประกายดุจกระจกเงา เธอถ่ายทอดการจับจังหวะสเต็ปดาบเร็วให้คุณ (+1 SPD, +1 ATK ถาวร)!`,
              icon: '🗡️',
              soundType: 'level'
            };
          }
        }
      ]
    },
    {
      id: 'sakura_tanuki_trick',
      category: 'sakura_shrine',
      title: 'ทานูกิสาวจอมซน ปอนโกะ',
      subtitle: 'Tanuki Trickster Ponko',
      icon: '🍃',
      badge: 'สาวน้อยทานูกิใบไม้แปลงร่าง',
      bannerColor: '#d97706',
      description: 'สาวน้อยหูทานูกิเอาใบไม้วางบนหัวแล้วหมุนตัวแปลงร่างเป็นหม้อดิน จู่ๆ ควันก็ฟุ้งตลบ เธอกระโดดออกมาหัวเราะคิกคัก "โดนหลอกแล้วสิ! ข้าชื่อปอนโกะ มีกลโกงใบไม้วิเศษมาแลกเปลี่ยน!"',
      choices: [
        {
          text: 'ซื้อใบไม้แปลงร่างวิเศษด้วยเงิน 50G',
          subtext: 'ได้รับคัมภีร์เวท [Warp Swap] สลับที่กับคู่แข่ง',
          icon: '🍃',
          resolve: (player) => {
            const cost = Math.min(player.gold, 50);
            player.gold -= cost;
            player.fieldSpells.push('swap');
            return {
              outcomeTitle: 'ใบไม้วิเศษสลับมิติ!',
              outcomeText: `ปอนโกะส่งใบไม้แปลงร่างให้คุณ กลายเป็นเวทมนตร์สนาม [Warp Swap] ทันที!`,
              icon: '🌀',
              soundType: 'magic',
              goldChange: -cost
            };
          }
        },
        {
          text: 'เกาพุงนุ่มนิ่มของเธอจนกลิ้งไปมา',
          subtext: 'เธอหัวเราะลั่น ทำเหรียญทองหล่น 120G',
          icon: '🐾',
          resolve: (player) => {
            const gold = 120;
            player.gold += gold;
            return {
              outcomeTitle: 'จั๊กจี้จนเหรียญทองกระเด็น!',
              outcomeText: `ปอนโกะนอนกลิ้งหัวเราะจนเหรียญทองในย่ามตกกระจาย เธอโบกมือให้เก็บไปได้เลย (+${gold}G)!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'เล่นเกมทายปัญหาลับสมองกับเธอ',
          subtext: 'ตอบถูก ได้รับ +2 LUK, +1 MAG ถาวร',
          icon: '❓',
          resolve: (player) => {
            player.luk += 2;
            player.mag += 1;
            return {
              outcomeTitle: 'ปัญญาเฉียบแหลมไขปริศนาสำเร็จ!',
              outcomeText: `คุณตอบปริศนาของเธอได้ในทันที ปอนโกะยอมรับในสติปัญญาของคุณ (+2 LUK, +1 MAG ถาวร)!`,
              icon: '💡',
              soundType: 'level'
            };
          }
        }
      ]
    },

    // =========================================================================
    // 5. STEAMPUNK (นครจักรกลไอน้ำและฟันเฟือง)
    // =========================================================================
    {
      id: 'steampunk_inventor_alice',
      category: 'steampunk',
      title: 'ช่างกลสาวอัจฉริยะ อลิซ',
      subtitle: 'Clockwork Girl Alice',
      icon: '⚙️',
      badge: 'สาวน้อยจักรกลไอน้ำ',
      bannerColor: '#f59e0b',
      description: 'เสียงเครื่องจักรและฟันเฟืองไอน้ำดังฉึกฉัก ช่างกลสาวผมทวินเทลในชุดเอี๊ยมเปื้อนน้ำมันกำลังขันน็อตหุ่นยนต์ "ฮึ้บ! การทดลองเครื่องจักรเวทมนตร์ครั้งที่ 99... เอ๊ะ! นายท่านช่วยข้าจับเฟืองตัวนี้หน่อยสิ!"',
      choices: [
        {
          text: 'ช่วยเธอประกอบเครื่องยนต์จักรกลไอน้ำ',
          subtext: 'ได้รับอุปกรณ์ [นาฬิกาจักรกลเร่งเวลา] +1 SPD, +1 ATK',
          icon: '🔧',
          resolve: (player) => {
            player.spd += 1;
            player.atk += 1;
            player.inventory.push({
              id: 'acc_steam_watch',
              name: 'นาฬิกาจักรกลเร่งเวลา (Steam Chronometer)',
              type: 'accessory',
              cost: 210,
              desc: 'เครื่องจักรทองเหลืองเร่งจังหวะการเคลื่อนที่ (+2 SPD)',
              icon: '⏱️'
            });
            return {
              outcomeTitle: 'กลไกจักรกลทำงานสมบูรณ์แบบ!',
              outcomeText: `ฟันเฟืองหมุนวนอย่างราบรื่น อลิซยิ้มกว้างและมอบ [นาฬิกาจักรกลเร่งเวลา] ให้คุณเป็นการตอบแทน (+1 SPD, +1 ATK ถาวร)!`,
              icon: '⚙️',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'เติมพลังเวทมนตร์ลงในแกนปฏิกรณ์',
          subtext: 'แกนทำงานเต็มสูบ ได้รับทอง 150G และ 75 EXP',
          icon: '🔋',
          resolve: (player) => {
            const gold = 150;
            player.gold += gold;
            player.gainXP(75);
            return {
              outcomeTitle: 'แกนพลังงานเวทมนตร์ล้นทะลัก!',
              outcomeText: `พลังงานไอน้ำพวยพุ่งระยิบระยับเป็นทองคำ! เครื่องจักรผลิตเหรียญทองให้คุณ ${gold}G (+75 EXP)!`,
              icon: '✨',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'ขอชิ้นส่วนฟันเฟืองทองเหลืองกลับไปขาย',
          subtext: 'นำไปขายที่ร้านค้า ได้รับทองคำ 120G ทันที',
          icon: '⚙️',
          resolve: (player) => {
            const gold = 120;
            player.gold += gold;
            return {
              outcomeTitle: 'ชิ้นส่วนทองเหลืองล้ำค่า!',
              outcomeText: `อลิซแบ่งเฟืองทองเหลืองและอะไหล่จักรกลให้ นำไปแลกเป็นทองได้ทันที ${gold}G!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        }
      ]
    },
    {
      id: 'steampunk_airship_pilot',
      category: 'steampunk',
      title: 'กัปตันเรือเหาะสาว นิโคล',
      subtitle: 'Aviator Girl Nicole and the Brass Zeppelin',
      icon: '🛩️',
      badge: 'นักบินสาวท่องนภา',
      bannerColor: '#0ea5e9',
      description: 'บนแท่นเทียบเรือเหาะทองเหลือง กัปตันสาวในเสื้อแจ็กเก็ตนักบินหนังและแว่นตาก็อกเกิลกำลังตรวจเช็คใบพัด "หวัดดีพ่อหนุ่ม! พร้อมจะทะยานขึ้นสู่ท้องฟ้าไปชมวิวเมืองเมฆากับฉันไหม?"',
      choices: [
        {
          text: 'ขึ้นเรือเหาะบินสำรวจเส้นทางจากมุมสูง',
          subtext: 'มองเห็นแผนที่กระจ่างแจ้ง ได้รับ +2 SPD และ 80 EXP',
          icon: '☁️',
          resolve: (player) => {
            player.spd += 2;
            player.gainXP(80);
            return {
              outcomeTitle: 'ทัศนียภาพเหนือม่านเมฆ!',
              outcomeText: `สายลมปะทะใบหน้าขณะเรือเหาะพุ่งทะยาน คุณจดจำเส้นทางลัดบนกระดานได้แม่นยำ (+2 SPD ถาวร, +80 EXP)!`,
              icon: '🦅',
              soundType: 'level'
            };
          }
        },
        {
          text: 'ช่วยซ่อมเกจวัดความดันไอน้ำของเรือเหาะ',
          subtext: 'เธอจ่ายค่าจ้าง 160G พร้อมเลี้ยงกาแฟร้อน',
          icon: '☕',
          resolve: (player) => {
            const gold = 160;
            player.gold += gold;
            player.hp = Math.min(player.maxHp, player.hp + 30);
            return {
              outcomeTitle: 'ช่างมือทองแห่งท่าเรือเหาะ!',
              outcomeText: `ความดันไอน้ำกลับมานิ่งสนิท นิโคลตบไหล่ขอบคุณพร้อมจ่ายเงินก้อนโต ${gold}G (+30 HP)!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold,
              hpChange: 30
            };
          }
        },
        {
          text: 'ขอซื้อระเบิดไดนาไมต์ไอน้ำของเรือเหาะ',
          subtext: 'จ่าย 60G ได้รับ [ระเบิดสนามรบสตีมบอมบ์]',
          icon: '💣',
          resolve: (player) => {
            const cost = Math.min(player.gold, 60);
            player.gold -= cost;
            player.inventory.push({
              id: 'item_bomb',
              name: 'ระเบิดไดนาไมต์ไอน้ำ (Steam Bomb)',
              type: 'potion',
              cost: 100,
              desc: 'ขว้างสร้างความเสียหาย 40 ดาเมจใส่คู่ต่อสู้',
              icon: '💣'
            });
            return {
              outcomeTitle: 'ได้รับวัตถุระเบิดทรงพลัง!',
              outcomeText: `นิโคลส่งระเบิดไอน้ำอัดแน่นดินปืนให้คุณ 1 ลูก ไว้ใช้ในยามคับขัน!`,
              icon: '💣',
              soundType: 'fanfare',
              goldChange: -cost
            };
          }
        }
      ]
    },
    {
      id: 'steampunk_automaton_maid',
      category: 'steampunk',
      title: 'เมดสาวจักรกลไอน้ำ หมายเลข 0',
      subtitle: 'Clockwork Maid Unit-0',
      icon: '🤖🎀',
      badge: 'เมดสาวจักรกลไร้อารมณ์',
      bannerColor: '#94a3b8',
      description: 'เมดสาวจักรกลผิวโลหะผสมสังเคราะห์ในชุดเมดลูกไม้กำลังกวาดพื้นอย่างเป็นจังหวะ เสียงลูกสูบดังฉึกฉักเบาๆ "ตรวจพบลอร์ดผู้สูงศักดิ์... เริ่มโปรโตคอลปรนนิบัติ... นายท่านต้องการรับบริการสิ่งใดคะ?"',
      choices: [
        {
          text: 'สั่งให้เธอช่วยขัดเกลาชุดเกราะและอาวุธ',
          subtext: 'อุปกรณ์เงาวับ ได้รับ +1 DEF, +1 ATK ถาวร',
          icon: '✨',
          resolve: (player) => {
            player.def += 1;
            player.atk += 1;
            return {
              outcomeTitle: 'การบำรุงรักษาอุปกรณ์ระดับมาสเตอร์!',
              outcomeText: `หมายเลข 0 ใช้น้ำมันหล่อลื่นสูตรพิเศษขัดเงาอาวุธและเกราะของคุณจนแวววาว (+1 DEF, +1 ATK ถาวร)!`,
              icon: '🛡️',
              soundType: 'level'
            };
          }
        },
        {
          text: 'ขอชาสมุนไพรเวทมนตร์จากถังอบไอน้ำในตัวเธอ',
          subtext: 'ฟื้นฟู HP และ MP จนเต็มเปี่ยม',
          icon: '🫖',
          resolve: (player) => {
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            return {
              outcomeTitle: 'ชาร้อนอุณหภูมิเป๊ะระดับเซนติเกรด!',
              outcomeText: `ชาสมุนไพรร้อนกรุ่นกลั่นจากหม้อต้มในตัวเธอ ช่วยฟื้นฟูพละกำลังและมานาจนเต็ม 100%!`,
              icon: '🍵',
              soundType: 'level',
              hpChange: player.maxHp,
              mpChange: player.maxMp
            };
          }
        },
        {
          text: 'ปลดล็อกชิปความทรงจำเพื่อปลดล็อกฟังก์ชันลับ',
          subtext: 'ได้รับเหรียญทองโบราณที่ฝังในตัวเธอ 140G',
          icon: '💾',
          resolve: (player) => {
            const gold = 140;
            player.gold += gold;
            return {
              outcomeTitle: 'พบขุมทรัพย์ในรหัสข้อมูล!',
              outcomeText: `ช่องเก็บเหรียญนิรภัยในตัวเธอดีดตัวออก มอบเงินโบราณให้คุณ 140G!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        }
      ]
    },

    // =========================================================================
    // 6. VOLCANO / DRAGON LAIR (ภูเขาไฟและรังมังกรโบราณ)
    // =========================================================================
    {
      id: 'dragon_princess_lair',
      category: 'volcano',
      title: 'รังมังกรโบราณและเจ้าหญิงมังกรสาว อิกนิส',
      subtitle: 'Dragon Princess Ignis',
      icon: '🐉',
      badge: 'พบมังกรสาวที่ชอบเรา',
      bannerColor: '#f43f5e',
      description: 'คุณหลงเข้ามาในถ้ำสมบัติของมังกรโบราณ พบ "อิกนิส" เจ้าหญิงมังกรสาวผมแดงเพลิงมีเขาและหางมังกร ปกติเธอจะเผาผู้บุกรุกเป็นจุณ แต่คราวนี้เธอกลับจ้องมองคุณอย่างสนอกสนใจ "หืม? เจ้ามนุษย์หน้าตาดีคนนี้... ข้าเบื่อถ้ำนี้แล้ว เจ้าจะพาข้าออกไปผจญภัยด้วยไหม?"',
      choices: [
        {
          text: 'ชวนเธอมาเป็นคู่หูร่วมผจญภัย (Recruit Companion)!',
          subtext: 'รับเจ้าหญิงมังกรเป็นคู่หู สู้ด้วยกัน และพักที่บ้านคุณ',
          icon: '💖',
          resolve: (player) => {
            const companion: CompanionData = {
              id: 'ignis',
              name: 'เจ้าหญิงมังกร อิกนิส',
              title: 'Dragon Princess Ignis',
              avatar: '🐉🔥',
              role: 'striker',
              skillName: 'เพลิงมังกรเทวะ (Draconic Flare)',
              skillDesc: 'พ่นลำแสงเพลิงมังกรทำลายล้าง สร้างดาเมจมหาศาล!',
              affinity: 100,
              dialogue: 'หึ! เจ้าต้องดูแลข้าดีๆ นะ ไม่งั้นข้าจะเผาเจ้าซะ!',
              color: '#f43f5e'
            };
            player.companion = companion;
            const homeNote = player.homeNodeId !== null
              ? 'เธอได้ย้ายเข้าไปพักอาศัยที่บ้านพักส่วนตัวของคุณแล้ว!'
              : 'เธอจะร่วมเดินทางกับคุณ และหากคุณสร้างบ้าน เธอจะย้ายไปพักที่นั่น!';
            return {
              outcomeTitle: 'ได้เจ้าหญิงมังกรเป็นคู่หูแล้ว!',
              outcomeText: `"ตกลง! นับจากนี้ข้าคือคู่หูของเจ้า! มีเรื่องอะไรเรียกข้าได้เลยในฉากต่อสู้!" ${homeNote}`,
              icon: '🐉💖',
              soundType: 'fanfare',
              companionRecruited: companion
            };
          }
        },
        {
          text: 'ขอหยิบสมบัติทองคำจากรังมังกรสักหีบ',
          subtext: 'เธออนุญาต ได้รับทองคำ 260G ทันที!',
          icon: '💰',
          resolve: (player) => {
            const gold = 260;
            player.gold += gold;
            return {
              outcomeTitle: 'สมบัติมหาศาลแห่งรังมังกร!',
              outcomeText: `อิกนิสหัวเราะชอบใจ "แค่นี้จิ๊บจ๊อยมาก เอาไปเลย!" คุณกอบโกยเหรียญทองโบราณได้มากถึง ${gold}G!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'ขอให้เธอถ่ายทอดเคล็ดวิชาเพลิงมังกร',
          subtext: 'เรียนรู้เวทมนตร์สายเพลิงมังกร และ +2 ATK ถาวร',
          icon: '🔥',
          resolve: (player) => {
            player.atk += 2;
            player.fieldSpells.push('zap');
            return {
              outcomeTitle: 'เคล็ดวิชาเพลิงมังกรโบราณ!',
              outcomeText: `อิกนิสเป่าลมหายใจแห่งมังกรใส่ดาบของคุณ ประกายเพลิงลุกโชนอย่างน่าเกรงขาม (+2 ATK ถาวร, ได้รับเวทมนตร์โจมตี)!`,
              icon: '⚔️🔥',
              soundType: 'magic'
            };
          }
        }
      ]
    },
    {
      id: 'volcano_blacksmith_girl',
      category: 'volcano',
      title: 'ช่างตีเหล็กสาวซาลาแมนเดอร์ ฟลามม่า',
      subtitle: 'Salamander Blacksmith Flamma',
      icon: '🔨🔥',
      badge: 'ช่างหลอมเพลิงลาวา',
      bannerColor: '#ea580c',
      description: 'ริมปากปล่องภูเขาไฟที่ลาวาเดือดพล่าน สาวเผ่าซาลาแมนเดอร์ผมสั้นสีส้มเพลิงกำลังควงค้อนยักษ์ตีดาบอย่างช่ำชอง กล้ามเนื้อหน้าท้องฟิตเฟิร์มสะท้อนประกายไฟ "อยากได้อาวุธที่ฟันหินขาดหรืออยากตีดาบให้คมกริบอีกล่ะ เจ้าหนุ่ม?"',
      choices: [
        {
          text: 'ส่งอาวุธให้เธอตีหลอมและชุบคมใหม่ในลาวา',
          subtext: 'อาวุธคมกล้า ได้รับ +2 ATK ถาวร',
          icon: '⚔️',
          resolve: (player) => {
            player.atk += 2;
            return {
              outcomeTitle: 'ดาบเพลิงหลอมลาวาอุณหภูมิหมื่นองศา!',
              outcomeText: `ค้อนฟาดลงบนคมดาบจนเกิดประกายไฟสีส้ม คมดาบแกร่งกล้าขึ้นอย่างมหาศาล (+2 ATK ถาวร)!`,
              icon: '🔥',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'ช่วยเธอสูบลมเตาเผาลาวาเพื่อหล่อเกราะ',
          subtext: 'ได้รับชุดเกราะ [เกราะเกล็ดเพลิง] +2 DEF, +6 Max HP',
          icon: '🦺',
          resolve: (player) => {
            player.def += 2;
            player.maxHp += 6;
            player.hp += 20;
            player.inventory.push({
              id: 'eq_flame_scale',
              name: 'เกราะเกล็ดเพลิงลาวา (Magma Plate)',
              type: 'armor',
              cost: 260,
              def: 12,
              desc: 'เกราะหลอมจากเกล็ดลาวา (+2 DEF, ทนไฟ)',
              icon: '🦺🔥'
            });
            return {
              outcomeTitle: 'เกราะเหล็กไหลต้านทานเพลิง!',
              outcomeText: `คุณออกแรงสูบลมจนเตาเผาร้อนจัด ฟลามม่ามอบ [เกราะเกล็ดเพลิงลาวา] ให้เป็นรางวัล (+2 DEF, +6 Max HP ถาวร)!`,
              icon: '🛡️',
              soundType: 'level',
              hpChange: 20
            };
          }
        },
        {
          text: 'ซื้อแร่ภูเขาไฟหายากด้วยเงิน 80G',
          subtext: 'แร่คริสตัลเพลิง เพิ่มพลังเวท +2 MAG ถาวร',
          icon: '💎',
          resolve: (player) => {
            const cost = Math.min(player.gold, 80);
            player.gold -= cost;
            player.mag += 2;
            return {
              outcomeTitle: 'แร่คริสตัลเพลิงสุริยา!',
              outcomeText: `แร่คริสตัลสีส้มส่องแสงระยิบระยับ ซึมซับเข้าสู่พลังเวทมนตร์ของคุณ (+2 MAG ถาวร)!`,
              icon: '💎',
              soundType: 'coin',
              goldChange: -cost
            };
          }
        }
      ]
    },
    {
      id: 'volcano_phoenix_maiden',
      category: 'volcano',
      title: 'สาวนกฟีนิกซ์ชุบชีวิต ไพรา',
      subtitle: 'Phoenix Maiden Pyra and the Rebirth Ashes',
      icon: '🪶🔥',
      badge: 'วิหคเพลิงอมตะชุบวิญญาณ',
      bannerColor: '#f97316',
      description: 'ท่ามกลางทะเลเพลิง สาวน้อยมีปีกขนนกเพลิงกำลังสยายปีกร่ายรำ ละอองเถ้าถ่านที่ร่วงหล่นไม่ได้เผาผลาญแต่กลับเปล่งประกายแห่งการฟื้นคืนชีพ "อย่ากลัวความร้อนเลย... เปลวไฟของข้าคือพลังแห่งการเริ่มต้นใหม่"',
      choices: [
        {
          text: 'ก้าวเข้าไปอาบเปลวเพลิงบริสุทธิ์ของฟีนิกซ์',
          subtext: 'ฟื้นฟู HP/MP จนเต็มเปี่ยม + เพิ่ม Max HP +50 ถาวร',
          icon: '🔥',
          resolve: (player) => {
            player.maxHp += 15;
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            return {
              outcomeTitle: 'จุติใหม่ดั่งวิหคเพลิงอมตะ!',
              outcomeText: `เปลวเพลิงชำระล้างความอ่อนล้า ร่างกายกำยำขึ้นอย่างอัศจรรย์ (+15 Max HP ถาวร, ฟื้นฟู HP/MP เต็มเปี่ยม)!`,
              icon: '✨',
              soundType: 'level',
              hpChange: player.maxHp,
              mpChange: player.maxMp
            };
          }
        },
        {
          text: 'ขอขนนกฟีนิกซ์สีทองติดตัวไว้ 1 เส้น',
          subtext: 'ได้รับ [ขนนกฟีนิกซ์ชุบชีวิต] ชุบชีวิตอัตโนมัติหากตาย',
          icon: '🪶',
          resolve: (player) => {
            player.inventory.push({
              id: 'pot_phoenix_down',
              name: 'ขนนกฟีนิกซ์ทองคำ (Phoenix Feather)',
              type: 'potion',
              cost: 250,
              desc: 'ไอเทมชุบชีวิต ฟื้นฟู HP เต็มเปี่ยมทันทีเมื่อใช้',
              icon: '🪶'
            });
            return {
              outcomeTitle: 'ได้รับขนนกแห่งชีวิตอมตะ!',
              outcomeText: `ไพรามอบขนนกเพลิงเรืองแสงสีทองให้ 1 เส้น เก็บไว้ในกระเป๋าสำหรับยามคับขัน!`,
              icon: '🪶',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'ย่างเนื้อสัตว์ป่าแบ่งให้เธอกินอย่างเป็นกันเอง',
          subtext: 'เธอชอบใจ มอบทองคำโบราณ 150G และ 70 EXP',
          icon: '🍖',
          resolve: (player) => {
            const gold = 150;
            player.gold += gold;
            player.gainXP(70);
            return {
              outcomeTitle: 'ปาร์ตี้บาร์บีคิวข้างธารลาวา!',
              outcomeText: `เนื้อย่างไฟฟีนิกซ์หอมกรุ่นรสชาติเยี่ยมยอด ไพราหัวเราะร่าเริงและมอบเหรียญทองให้คุณ 150G (+70 EXP)!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        }
      ]
    },

    // =========================================================================
    // 7. SNOW / FROSTPEAK (แดนเหมันต์และธารน้ำแข็ง)
    // =========================================================================
    {
      id: 'frostpeak_queen_borealia',
      category: 'snow',
      title: 'ราชินีเหมันต์ โบเรียเลีย แห่งธารน้ำแข็ง',
      subtitle: 'Ice Empress Borealia of the Frozen Crags',
      icon: '❄️👑',
      badge: 'จักรพรรดินีหิมะนิรันดร์',
      bannerColor: '#38bdf8',
      description: 'บนบัลลังก์น้ำแข็งแกะสลักอันสง่างาม สตรีสูงศักดิ์ผมสีฟ้าไอซ์บลูสวมมงกุฎผลึกหิมะกำลังทอดสายตามองคุณ ลมหนาวพัดชายเสื้อคลุมขนสัตว์สีขาวของเธอ "เจ้าก้าวเข้ามาในดินแดนอันหนาวเหน็บแห่งนี้... เจ้ามีหัวใจที่อบอุ่นพอจะละลายน้ำแข็งของข้าไหม?"',
      choices: [
        {
          text: 'คุกเข่าอย่างสง่างามและกุมมืออันเย็นเยียบของเธอ',
          subtext: 'ความอบอุ่นละลายใจ ได้รับ +2 MAG, +1 DEF ถาวร',
          icon: '🤝',
          resolve: (player) => {
            player.mag += 2;
            player.def += 1;
            return {
              outcomeTitle: 'ไออุ่นละลายหัวใจราชินีน้ำแข็ง!',
              outcomeText: `โบเรียเลียยิ้มอย่างอ่อนโยน ละอองหิมะรอบตัวกลายเป็นประกายแสงอบอุ่น (+2 MAG, +1 DEF ถาวร)!`,
              icon: '❄️💖',
              soundType: 'level'
            };
          }
        },
        {
          text: 'ไขปริศนาผลึกน้ำแข็งโบราณต่อหน้าบัลลังก์',
          subtext: 'ได้รับสมบัติ [คทาเหมันต์เยือกแข็ง] +2 MAG',
          icon: '🪄',
          resolve: (player) => {
            player.inventory.push({
              id: 'wpn_frost_scepter',
              name: 'คทาเหมันต์เยือกแข็ง (Glacial Scepter)',
              type: 'weapon',
              cost: 280,
              atk: 8,
              mag: 15,
              desc: 'คทาผลึกน้ำแข็งบรรพกาล (+2 ATK, +2 MAG)',
              icon: '🪄❄️'
            });
            return {
              outcomeTitle: 'ไขปริศนาโบราณสำเร็จ!',
              outcomeText: `ผลึกน้ำแข็งแตกออก เผยคทาเวทมนตร์โบราณ ราชินีมอบให้คุณเป็นรางวัลสำหรับผู้มีปัญญา!`,
              icon: '🪄',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'ดื่มน้ำชาหิมะพันปีเพื่อปรับสมดุลธาตุ',
          subtext: 'ฟื้นฟู HP/MP จนเต็ม และได้รับทอง 120G',
          icon: '🍵',
          resolve: (player) => {
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            player.gold += 120;
            return {
              outcomeTitle: 'รสชาติชาหิมะบริสุทธิ์!',
              outcomeText: `ความเย็นสดชื่นแผ่ซ่านทั่วร่างกาย บาดแผลหายสนิทพร้อมได้รับเงินรางวัล 120G!`,
              icon: '🪙',
              soundType: 'coin',
              hpChange: player.maxHp,
              mpChange: player.maxMp,
              goldChange: 120
            };
          }
        }
      ]
    },
    {
      id: 'frostpeak_snow_leopard',
      category: 'snow',
      title: 'นักล่าสาวเสือดาวหิมะ ยูกิ',
      subtitle: 'Snow Leopard Huntress Yuki',
      icon: '🐆❄️',
      badge: 'สาวเสือดาวหิมะแห่งยอดเขา',
      bannerColor: '#94a3b8',
      description: 'สาวบีสต์คินเสือดาวหิมะลายจุดหางฟูยาวกำลังกระโดดข้ามหน้าผาน้ำแข็งอย่างคล่องแคล่ว เธอลงมาหยุดตรงหน้าคุณพลางขู่เบาๆ ก่อนจะเปลี่ยนเป็นรอยยิ้มซุกซน "ฮึ่มม... มนุษย์แปลกหน้า! มาวิ่งแข่งกันบนลานหิมะไหมล่ะ?"',
      choices: [
        {
          text: 'วิ่งแข่งสไลด์หิมะข้ามหุบเขาไปด้วยกัน',
          subtext: 'ฝึกทักษะการทรงตัว ได้รับ +2 SPD ถาวร',
          icon: '⛷️',
          resolve: (player) => {
            player.spd += 2;
            return {
              outcomeTitle: 'สปีดสายฟ้าบนลานหิมะ!',
              outcomeText: `คุณและยูกิไถลข้ามลานน้ำแข็งด้วยความเร็วสูง ทักษะความว่องไวเพิ่มขึ้นอย่างก้าวกระโดด (+2 SPD ถาวร)!`,
              icon: '👟',
              soundType: 'level'
            };
          }
        },
        {
          text: 'แบ่งผ้าห่มหนาและก่อกองไฟให้ความอบอุ่น',
          subtext: 'เธอซบไออุ่น มอบ [เสื้อคลุมขนสัตว์หิมะ] +2 DEF',
          icon: '🧥',
          resolve: (player) => {
            player.def += 2;
            player.inventory.push({
              id: 'eq_snow_fur',
              name: 'เสื้อคลุมขนสัตว์หิมะ (Snow Leopard Fur)',
              type: 'armor',
              cost: 230,
              def: 11,
              desc: 'เสื้อคลุมขนสัตว์หนานุ่มกันความหนาว (+2 DEF)',
              icon: '🧥'
            });
            return {
              outcomeTitle: 'ความอบอุ่นข้างกองไฟ!',
              outcomeText: `ยูกิกอดหางตัวเองนั่งผิงไฟอย่างสบายใจ เธอมอบเสื้อคลุมขนสัตว์ชั้นดีให้คุณ (+2 DEF ถาวร)!`,
              icon: '🧥',
              soundType: 'coin'
            };
          }
        },
        {
          text: 'เล่นปาหิมะใส่กันอย่างสนุกสนาน',
          subtext: 'คลายเครียด ได้รับ +2 LUK ถาวร และ 60 EXP',
          icon: '⛄',
          resolve: (player) => {
            player.luk += 2;
            player.gainXP(60);
            return {
              outcomeTitle: 'สงครามหิมะเปี่ยมรอยยิ้ม!',
              outcomeText: `เสียงหัวเราะดังก้องหุบเขา ยูกิยอมแพ้และยกนิ้วโป้งให้ความแม่นยำของคุณ (+2 LUK ถาวร, +60 EXP)!`,
              icon: '❄️',
              soundType: 'level'
            };
          }
        }
      ]
    },
    {
      id: 'frostpeak_frozen_valkyrie',
      category: 'snow',
      title: 'วัลคิรีสาวในผลึกน้ำแข็งพันปี แอสตริด',
      subtitle: 'Valkyrie Astrid Sealed in Glacial Amber',
      icon: '🛡️❄️',
      badge: 'นักรบสวรรค์ผู้หลับใหล',
      bannerColor: '#60a5fa',
      description: 'ในถ้ำน้ำแข็งใสกระจก ร่างของวัลคิรีสาวเกราะเงินปีกสีขาวบริสุทธิ์ถูกแช่แข็งอยู่ในผลึกใสโบราณ ดวงตาของเธอขยับมองคุณอย่างอ้อนวอนขอการปลดปล่อย',
      choices: [
        {
          text: 'จุดไฟเวทมนตร์ละลายผลึกน้ำแข็งปลดปล่อยเธอ',
          subtext: 'ปลดปล่อยสำเร็จ เธออวยพร +2 ATK, +2 DEF ถาวร',
          icon: '🔥',
          resolve: (player) => {
            player.atk += 2;
            player.def += 2;
            return {
              outcomeTitle: 'วัลคิรีตื่นจากการหลับใหล!',
              outcomeText: `ผลึกน้ำแข็งละลายสลายไป แอสตริดสยายปีกขาวบริสุทธิ์และอวยพรให้คุณ (+2 ATK, +2 DEF ถาวร)!`,
              icon: '✨',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'อ่านจารึกรูนโบราณบนฐานน้ำแข็ง',
          subtext: 'ได้รับความรู้สวรรค์ +2 MAG และ 90 EXP',
          icon: '📜',
          resolve: (player) => {
            player.mag += 2;
            player.gainXP(90);
            return {
              outcomeTitle: 'อักขระรูนเทพโบราณ!',
              outcomeText: `จารึกเปล่งแสงสีฟ้า ไหลเวียนเข้าสู่สมองของคุณ เพิ่มพูนความรู้ทางเวทมนตร์ (+2 MAG ถาวร, +90 EXP)!`,
              icon: '📖',
              soundType: 'magic'
            };
          }
        },
        {
          text: 'เก็บเศษผลึกน้ำแข็งศักดิ์สิทธิ์ที่ร่วงหล่น',
          subtext: 'นำไปขาย ได้รับเงินทอง 180G ทันที',
          icon: '💎',
          resolve: (player) => {
            const gold = 180;
            player.gold += gold;
            return {
              outcomeTitle: 'อัญมณีผลึกน้ำแข็งล้ำค่า!',
              outcomeText: `เศษผลึกส่องประกายดุจเพชรน้ำเอก พ่อค้ายินดีรับซื้อด้วยราคาสูงถึง ${gold}G!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        }
      ]
    },

    // =========================================================================
    // 8. DESERT / SUNFIRE (ทะเลทรายสุริยันและโอเอซิส)
    // =========================================================================
    {
      id: 'desert_queen_nefertia',
      category: 'desert',
      title: 'ฟาโรห์หญิง เนเฟอร์เทีย แห่งพีระมิดทองคำ',
      subtitle: 'Pharaoh Queen Nefertia of the Golden Dunes',
      icon: '👑🏜️',
      badge: 'ราชินีทะเลทรายไอยคุปต์',
      bannerColor: '#eab308',
      description: 'ในท้องพระโรงหินทรายสีทองอร่าม ฟาโรห์หญิงผู้เลอโฉมในเครื่องทรงทองคำและผ้าลินินสีขาวโปร่งกำลังเอนกายบนแท่นบรรทม สายตาคมกริบดุจนางพญาจ้องมองคุณ "ผู้กล้าแห่งแดนไกล เจ้าเดินทางมาถึงบัลลังก์แห่งดวงอาทิตย์เพื่อสิ่งใด?"',
      choices: [
        {
          text: 'ถวายการคำนับและร่ายระบำถวายความภักดี',
          subtext: 'เธอพอพระทัย ประทานทองคำหลวง 250G',
          icon: '💃',
          resolve: (player) => {
            const gold = 250;
            player.gold += gold;
            return {
              outcomeTitle: 'พระราชทานทองคำแห่งราชวงศ์!',
              outcomeText: `เนเฟอร์เทียปรบมืออย่างพึงพอใจ นางสนองพระโอษฐ์ยกหีบทองคำพระราชทานให้คุณ ${gold}G!`,
              icon: '💰',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'ขอรับน้ำอมฤตแห่งดวงสุริยาชำระกาย',
          subtext: 'ฟื้นฟู HP/MP เต็มเปี่ยม และเพิ่ม Max HP +40',
          icon: '🏺',
          resolve: (player) => {
            player.maxHp += 12;
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            return {
              outcomeTitle: 'น้ำอมฤตสุริยันชะลอวัย!',
              outcomeText: `น้ำอมฤตสีทองรสหวานล้ำ ช่วยเติมเต็มพลังชีวิตจนล้นปรี่ (+12 Max HP ถาวร, ฟื้นฟูเต็ม 100%)!`,
              icon: '✨',
              soundType: 'level',
              hpChange: player.maxHp,
              mpChange: player.maxMp
            };
          }
        },
        {
          text: 'ขอรับคทาสุริยะโบราณแห่งฟาโรห์',
          subtext: 'ได้รับ [คทาสุริยะเนเฟอร์เทีย] +2 ATK, +2 MAG',
          icon: '🪬',
          resolve: (player) => {
            player.inventory.push({
              id: 'wpn_sun_scepter',
              name: 'คทาสุริยะเนเฟอร์เทีย (Solar Scepter)',
              type: 'weapon',
              cost: 300,
              atk: 8,
              mag: 10,
              desc: 'คทาทองคำฝังอัญมณีสุริยัน (+2 ATK, +2 MAG)',
              icon: '🪬'
            });
            return {
              outcomeTitle: 'ศาสตราแห่งราชวงศ์สุริยัน!',
              outcomeText: `เนเฟอร์เทียมอบคทาสุริยะโบราณให้คุณ เพื่อนำไปใช้กำราบความชั่วร้ายบนผืนแผ่นดิน!`,
              icon: '🪬',
              soundType: 'fanfare'
            };
          }
        }
      ]
    },
    {
      id: 'desert_mirage_genie',
      category: 'desert',
      title: 'จินนี่สาวในตะเกียงแก้ว จัสมิน',
      subtitle: 'Djinn Girl Jasmine of the Magic Lamp',
      icon: '🧞‍♀️',
      badge: 'ภูติสาวแห่งตะเกียงวิเศษ',
      bannerColor: '#8b5cf6',
      description: 'ท่ามกลางทะเลทรายที่ร้อนระอุ คุณสะดุดเข้ากับตะเกียงทองเหลืองโบราณ เมื่อถูตะเกียงเบาๆ ควันสีม่วงก็พวยพุ่ง จินนี่สาวสวยสวมกำไลทองคำลอยละล่องออกมา "นายท่านขอบคุณที่ปลดปล่อยข้า! ข้าจะบันดาลพรให้ท่าน 1 ประการ!"',
      choices: [
        {
          text: 'ขอพรให้ทรัพย์สมบัติไหลมาเทมา!',
          subtext: 'บันดาลเหรียญทองคำ 300G ตกลงมาจากฟ้า',
          icon: '💰',
          resolve: (player) => {
            const gold = 300;
            player.gold += gold;
            return {
              outcomeTitle: 'ฝนเหรียญทองคำเทกระหน่ำ!',
              outcomeText: `จินนี่ดีดนิ้วเป๊าะ! เหรียญทองคำโบราณโปรยปรายลงมาจากฟ้าเต็มกระเป๋า (+${gold}G)!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'ขอพรให้พละกำลังแข็งแกร่งดั่งยักษ์ปักหลั่น',
          subtext: 'ได้รับ +2 ATK, +2 DEF, +2 SPD ถาวร',
          icon: '💪',
          resolve: (player) => {
            player.atk += 2;
            player.def += 2;
            player.spd += 2;
            return {
              outcomeTitle: 'พรแห่งพละกำลังมหาศาล!',
              outcomeText: `กล้ามเนื้อทุกมัดในร่างกายเปี่ยมด้วยพลังเวทมนตร์ของจินนี่ (+2 ATK, +2 DEF, +2 SPD ถาวร)!`,
              icon: '🔥',
              soundType: 'level'
            };
          }
        },
        {
          text: 'ขอปลดปล่อยเธอให้เป็นอิสระจากตะเกียง',
          subtext: 'เธอซาบซึ้งใจ มอบแหวนแห่งความปรารถนา +2 LUK',
          icon: '🕊️',
          resolve: (player) => {
            player.luk += 2;
            player.inventory.push({
              id: 'acc_genie_ring',
              name: 'แหวนแห่งความปรารถนา (Djinn Wish Ring)',
              type: 'accessory',
              cost: 260,
              desc: 'แหวนอัญมณีเวทมนตร์แห่งความโชคดี (+2 LUK)',
              icon: '💍'
            });
            return {
              outcomeTitle: 'อิสรภาพและการตอบแทนที่ล้ำค่า!',
              outcomeText: `จัสมินน้ำตาคลอด้วยความตื้นตัน เธอมอบแหวนวิเศษประจำตัวให้ก่อนจะบินขึ้นสู่สรวงสวรรค์ (+2 LUK ถาวร)!`,
              icon: '💖',
              soundType: 'fanfare'
            };
          }
        }
      ]
    },
    {
      id: 'desert_oasis_caravan',
      category: 'desert',
      title: 'แม่ค้าสาวกองคาราวานโอเอซิส มาริก้า',
      subtitle: 'Oasis Caravan Merchant Marika',
      icon: '🐪🌴',
      badge: 'คาราวานแม่ค้าโอเอซิส',
      bannerColor: '#10b981',
      description: 'ใต้ร่มเงาต้นอินทผลัมริมสระน้ำโอเอซิส แม่ค้าสาวชาวเบดูอินในผ้าคลุมหน้าบางเบากำลังจัดเรียงเครื่องเทศและอัญมณีบนหลังอูฐ "พักเหนื่อยก่อนสิพี่ชาย มีน้ำเย็นและสินค้าหายากจากแดนไกลเพียบเลยนะ!"',
      choices: [
        {
          text: 'ซื้อเครื่องเทศและสมุนไพรฟื้นฟูด้วยเงิน 40G',
          subtext: 'ฟื้นฟู HP 60 และได้รับบัฟเพิ่มพลังกาย',
          icon: '🌿',
          resolve: (player) => {
            const cost = Math.min(player.gold, 40);
            player.gold -= cost;
            player.hp = Math.min(player.maxHp, player.hp + 60);
            player.atk += 1;
            return {
              outcomeTitle: 'เครื่องเทศโอเอซิสหอมชื่นใจ!',
              outcomeText: `เครื่องเทศบำรุงกำลังช่วยให้ร่างกายกระปรี้กระเปร่า (+60 HP, +1 ATK ถาวร)!`,
              icon: '🍲',
              soundType: 'coin',
              goldChange: -cost,
              hpChange: 60
            };
          }
        },
        {
          text: 'ช่วยเธอเฝ้ากองคาราวานและให้อาหารอูฐ',
          subtext: 'ได้รับค่าจ้าง 140G พร้อมคำขอบคุณ',
          icon: '🐪',
          resolve: (player) => {
            const gold = 140;
            player.gold += gold;
            return {
              outcomeTitle: 'ผู้พิทักษ์คาราวานผู้ซื่อสัตย์!',
              outcomeText: `อูฐเคี้ยวหญ้าอย่างอารมณ์ดี มาริก้ายิ้มหวานและจ่ายค่าตอบแทนให้ 140G!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'ขอซื้อแผนที่ลัดข้ามทะเลทรายทรายดูน',
          subtext: 'จ่าย 50G ได้รับ [สปินเนอร์ 2 ลูกเต๋า] x2',
          icon: '🗺️',
          resolve: (player) => {
            const cost = Math.min(player.gold, 50);
            player.gold -= cost;
            player.inventory.push({
              id: 'spin_2',
              name: 'สปินเนอร์ 2 ลูกเต๋า (2-Spinner)',
              type: 'spinner',
              cost: 60,
              desc: 'ทอยลูกเต๋า 2 ลูกในเทิร์นถัดไป!',
              icon: '🎲'
            });
            return {
              outcomeTitle: 'แผนที่ลัดข้ามผืนทราย!',
              outcomeText: `แผนที่ของมาริก้าบอกจุดลัดเลาะเนินทรายอย่างแม่นยำ พร้อมมอบสปินเนอร์ช่วยเดินทาง!`,
              icon: '🧭',
              soundType: 'fanfare',
              goldChange: -cost
            };
          }
        }
      ]
    },

    // =========================================================================
    // 9. ABYSS / DARK GATE (แดนอเวจีและประตูดำ)
    // =========================================================================
    {
      id: 'abyss_void_dragon_tiamat',
      category: 'abyss',
      title: 'ราชินีมังกรแห่งความว่างเปล่า เทียแมต',
      subtitle: 'Void Dragon Empress Tiamat',
      icon: '🐉💜',
      badge: 'จักรพรรดินีแห่งความว่างเปล่า',
      bannerColor: '#9333ea',
      description: 'ในห้วงมิติอเวจีที่มืดมิด มังกรอเวจีแปลงร่างเป็นราชินีสาวทรงอำนาจผมสีม่วงเข้ม สวมมงกุฎหนามออบซิเดียน ปีกมังกรสีทมิฬสยายกว้าง "เจ้ากล้าบุกรุกมาถึงเขตแดนของข้า... เจ้าอยากได้พลังทำลายล้างเพื่อบดขยี้คู่แข่งใช่ไหม?"',
      choices: [
        {
          text: 'คุกเข่ารับพลังเวทมืดแห่งความว่างเปล่า',
          subtext: 'ได้รับ +2 ATK, +2 MAG ถาวร แต่เสีย 25 HP',
          icon: '🔮',
          resolve: (player) => {
            player.hp = Math.max(10, player.hp - 25);
            player.atk += 2;
            player.mag += 2;
            return {
              outcomeTitle: 'พลังทมิฬแห่งอเวจีหลั่งไหล!',
              outcomeText: `ไออสูรสีม่วงซึมซาบเข้าสู่กระดูก แม้จะเจ็บปวด (-25 HP) แต่พลังทำลายล้างของคุณเพิ่มขึ้นมหาศาล (+2 ATK, +2 MAG ถาวร)!`,
              icon: '⚡',
              soundType: 'magic',
              hpChange: -25
            };
          }
        },
        {
          text: 'ท้าทายจ้องตาเธอโดยไม่หลบสายตา',
          subtext: 'ใจเด็ดเดี่ยว เธอประทับใจ มอบดาบ [Void Blade] +2 ATK',
          icon: '🗡️',
          resolve: (player) => {
            player.inventory.push({
              id: 'wpn_void_blade',
              name: 'ดาบอสูรกลืนมิติ (Void Slayer)',
              type: 'weapon',
              cost: 320,
              atk: 18,
              desc: 'ดาบออบซิเดียนผ่ามิติ (+2 ATK)',
              icon: '🗡️💜'
            });
            return {
              outcomeTitle: 'จิตวิญญาณผู้กล้าที่ไร้ความกลัว!',
              outcomeText: `เทียแมตหัวเราะอย่างถูกใจ "ดีมาก! เจ้ามีแววเป็นราชาแห่งความมืด!" เธอมอบ [Void Slayer] ให้คุณ!`,
              icon: '🗡️',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'ขอหยิบอัญมณีอเวจีโบราณออกจากรัง',
          subtext: 'นำไปขาย ได้รับทองคำ 280G ทันที',
          icon: '💎',
          resolve: (player) => {
            const gold = 280;
            player.gold += gold;
            return {
              outcomeTitle: 'อัญมณีทมิฬล้ำค่าแห่งอเวจี!',
              outcomeText: `อัญมณีสีม่วงเปล่งแสงระยิบระยับ นำไปแลกเป็นเงินทองก้อนโตได้ทันที ${gold}G!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        }
      ]
    },
    {
      id: 'abyss_fallen_angel',
      category: 'abyss',
      title: 'นางฟ้าตกสวรรค์ อซาเรีย',
      subtitle: 'Fallen Angel Azaria of the Bleeding Eclipse',
      icon: '🪶🖤',
      badge: 'ทูตสวรรค์ปีกทมิฬ',
      bannerColor: '#6366f1',
      description: 'ร่างของทูตสวรรค์สาวปีกขนนกสีดำขลับนั่งกอดเข่าอยู่บนซากปรักหักพังของวิหารโบราณในเงามืด ขนนกของเธอร่วงหล่นช้าๆ "แสงสว่างทอดทิ้งข้า... แต่เจ้ายังมองเห็นข้าอยู่หรือ?"',
      choices: [
        {
          text: 'ประคองมือเธอและแบ่งปันพลังแสงสว่างบริสุทธิ์',
          subtext: 'ชะล้างความมืด ได้รับ +2 DEF, +12 Max HP ถาวร',
          icon: '✨',
          resolve: (player) => {
            player.def += 2;
            player.maxHp += 12;
            player.hp = Math.min(player.maxHp, player.hp + 40);
            return {
              outcomeTitle: 'การคืนสู่แสงสว่างแห่งสรวงสวรรค์!',
              outcomeText: `ปีกสีดำของเธอเปล่งประกายสีเงินระยิบระยับ อซาเรียมอบพรพิทักษ์กายให้คุณ (+2 DEF, +12 Max HP ถาวร)!`,
              icon: '🕊️',
              soundType: 'level',
              hpChange: 40
            };
          }
        },
        {
          text: 'รับขนนกทมิฬของเธอมาทำเป็นเครื่องราง',
          subtext: 'ได้รับ [เครื่องรางปีกทมิฬ] +2 SPD, +2 MAG',
          icon: '🪶',
          resolve: (player) => {
            player.inventory.push({
              id: 'acc_dark_feather',
              name: 'เครื่องรางปีกทมิฬ (Fallen Feather)',
              type: 'accessory',
              cost: 240,
              desc: 'ขนนกแห่งการล่องหน (+2 SPD, +2 MAG)',
              icon: '🪶'
            });
            return {
              outcomeTitle: 'เครื่องรางแห่งเงามืด!',
              outcomeText: `ขนนกสีดำช่วยพรางตัวคุณจากสายตาของศัตรู เพิ่มความเร็วและพลังเวทอย่างยิ่งยวด!`,
              icon: '🪶',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'ปลอบโยนเธอด้วยเสียงเพลงและบทกวี',
          subtext: 'จิตใจสงบ ฟื้นฟู HP/MP จนเต็ม และได้ 85 EXP',
          icon: '🎶',
          resolve: (player) => {
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            player.gainXP(85);
            return {
              outcomeTitle: 'บทเพลงเยียวยาจิตวิญญาณ!',
              outcomeText: `อซาเรียยิ้มทั้งน้ำตา ความเศร้าสลายไป ฟื้นฟูพละกำลังของคุณจนเต็มเปี่ยม (+85 EXP)!`,
              icon: '💖',
              soundType: 'magic',
              hpChange: player.maxHp,
              mpChange: player.maxMp
            };
          }
        }
      ]
    },
    {
      id: 'abyss_shadow_assassin',
      category: 'abyss',
      title: 'นักฆ่าเงาสาว เรเวน',
      subtitle: 'Shadowblade Raven in the Umbral Fog',
      icon: '🗡️🖤',
      badge: 'มือสังหารเงาไร้ร่องรอย',
      bannerColor: '#1e293b',
      description: 'มีดสั้นอาบยาพิษจ่อเข้าที่ลำคอของคุณจากด้านหลังในชั่วพริบตา สาวนักฆ่าในชุดคลุมสีดำสนิทกระซิบข้างหู "อย่าขยับ... เจ้าเดินเข้ามาในพื้นที่สังหารของข้า แต่ถ้ามีข้อเสนอดีๆ ข้าอาจไว้ชีวิตเจ้า"',
      choices: [
        {
          text: 'ตีลังกากลับหลังปลดอาวุธเธอในพริบตา',
          subtext: 'ชนะใจนักฆ่า ได้รับ +2 SPD, +1 ATK ถาวร',
          icon: '🥋',
          resolve: (player) => {
            player.spd += 2;
            player.atk += 1;
            return {
              outcomeTitle: 'ปฏิกิริยาตอบสนองระดับเทพ!',
              outcomeText: `คุณปัดมีดหลุดและกดตัวเธอลง เรเวนหัวเราะเบาๆ "ฝีมือยอดเยี่ยม... ข้ายอมรับเจ้า" (+2 SPD, +1 ATK ถาวร)!`,
              icon: '⚡',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'จ้างเธอเป็นสายสืบด้วยเงิน 70G',
          subtext: 'ได้รับม้วนคัมภีร์ [Thunderbolt] สายฟ้าฟาด',
          icon: '📜',
          resolve: (player) => {
            const cost = Math.min(player.gold, 70);
            player.gold -= cost;
            player.fieldSpells.push('zap');
            return {
              outcomeTitle: 'ว่าจ้างมือสังหารสำเร็จ!',
              outcomeText: `เรเวนเก็บเงินเข้ากระเป๋าและมอบม้วนคัมภีร์เวทสังหาร [Thunderbolt] ให้คุณเป็นการตอบแทน!`,
              icon: '⚡',
              soundType: 'coin',
              goldChange: -cost
            };
          }
        },
        {
          text: 'ขอยาพิษเคลือบใบมีดจากเธอ',
          subtext: 'ได้รับ [ยาพิษเงามรณะ] เพิ่มโอกาสคริติคอล',
          icon: '🧪',
          resolve: (player) => {
            player.luk += 2;
            player.inventory.push({
              id: 'pot_poison_vial',
              name: 'ยาพิษเงามรณะ (Shadow Poison)',
              type: 'potion',
              cost: 120,
              desc: 'ขวดสารพิษสกัดลับ (+2 LUK)',
              icon: '🧪'
            });
            return {
              outcomeTitle: 'ได้รับยาพิษสังหารหายาก!',
              outcomeText: `เรเวนส่งขวดยาพิษสีม่วงเข้มให้คุณอย่างเงียบๆ ก่อนจะสลายหายไปในหมอกควัน (+2 LUK ถาวร)!`,
              icon: '🧪',
              soundType: 'coin'
            };
          }
        }
      ]
    },

    // =========================================================================
    // 10. BLUE TILES (ช่องโชคลาภและพรเทวา)
    // =========================================================================
    {
      id: 'blue_goddess_blessing',
      category: 'blue',
      title: 'เทพีแห่งโชคลาภประทานพร ฟอร์ทูน่า',
      subtitle: 'Fortune Goddess Fortuna Celestial Shower',
      icon: '🌟',
      badge: 'พรแห่งเทพีนำโชค',
      bannerColor: '#3b82f6',
      description: 'ลำแสงสีทองส่องสว่างลงมาจากฟากฟ้า เทพีฟอร์ทูน่าปรากฏกายพร้อมเหรียญทองคำเปล่งประกายลอยวนรอบตัว "ผู้กล้าที่ก้าวลงบนช่องนำโชค... จงรับของขวัญแห่งสรวงสวรรค์ไป!"',
      choices: [
        {
          text: 'ขอรับพรอัญมณีทองคำก้อนโต',
          subtext: 'ได้รับเงินรางวัล 200G ทันที!',
          icon: '💰',
          resolve: (player) => {
            const gold = 200;
            player.gold += gold;
            return {
              outcomeTitle: 'เหรียญทองสวรรค์โปรยปราย!',
              outcomeText: `ถุงเงินของคุณหนักอึ้งด้วยเหรียญทองคำบริสุทธิ์จากสรวงสวรรค์ (+${gold}G)!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'ขอรับพรเสริมพลังกายและจิตวิญญาณ',
          subtext: 'เพิ่มสเตตัสทุกค่าอย่างละ +2 ถาวร',
          icon: '✨',
          resolve: (player) => {
            player.atk += 1;
            player.def += 1;
            player.mag += 1;
            player.spd += 1;
            player.luk += 1;
            return {
              outcomeTitle: 'พรสวรรค์เสริมสร้างทุกสรรพางค์กาย!',
              outcomeText: `เทพีประทานพรให้ทุกค่าสเตตัส (ATK, DEF, MAG, SPD, LUK) เพิ่มขึ้น +2 อย่างถาวร!`,
              icon: '🌟',
              soundType: 'level'
            };
          }
        },
        {
          text: 'ขอรับการฟื้นฟูพลังชีวิตและมานาเต็ม 100%',
          subtext: 'ฟื้นฟู HP & MP เต็ม และเพิ่ม Max HP +30',
          icon: '💖',
          resolve: (player) => {
            player.maxHp += 9;
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            return {
              outcomeTitle: 'การชำระล้างจนบริสุทธิ์ผุดผ่อง!',
              outcomeText: `พลังชีวิตและมานาฟื้นคืนเต็มเปี่ยม พร้อมขยายขีดจำกัดพลังชีวิต (+9 Max HP ถาวร)!`,
              icon: '🕊️',
              soundType: 'level',
              hpChange: player.maxHp,
              mpChange: player.maxMp
            };
          }
        }
      ]
    },
    {
      id: 'blue_fairy_merchant',
      category: 'blue',
      title: 'ภูติน้อยเร่ร่อนแจกของวิเศษ พิกซี่',
      subtitle: 'Wandering Pixie with Mystery Gift Bag',
      icon: '🧚‍♀️',
      badge: 'ภูติน้อยแจกโชค',
      bannerColor: '#38bdf8',
      description: 'ภูติน้อยตัวจิ๋วมีปีกผีเสื้อโปร่งแสงกำลังแบกถุงผ้าใบจิ๋วร่อนลงมาตรงหน้า "ปิ๊งป่อง! เจ้าผู้โชคดี วันนี้พิกซี่มีของวิเศษแจกฟรีให้เลือก 1 ชิ้นจ้า!"',
      choices: [
        {
          text: 'เลือกรับ [สปินเนอร์นำโชค 3 ลูกเต๋า]',
          subtext: 'ทอยเต๋า 3 ลูกในการเดินเทิร์นถัดไป',
          icon: '🌀',
          resolve: (player) => {
            player.inventory.push({
              id: 'spin_3',
              name: 'สปินเนอร์ 3 ลูกเต๋า (3-Spinner)',
              type: 'spinner',
              cost: 120,
              desc: 'ทอยลูกเต๋า 3 ลูกในเทิร์นถัดไป!',
              icon: '🌀'
            });
            return {
              outcomeTitle: 'ได้สปินเนอร์วิเศษ 3 ลูก!',
              outcomeText: `พิกซี่ดึงสปินเนอร์สีรุ้งออกจากกระเป๋า ส่งให้คุณไว้ใช้พุ่งทะยานบนกระดาน!`,
              icon: '🌀',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'ขอละอองผงพิกซี่เพิ่มความเร็วติดปีก',
          subtext: 'ได้รับความเร็ว +2 SPD ถาวร',
          icon: '✨',
          resolve: (player) => {
            player.spd += 2;
            return {
              outcomeTitle: 'ผงภูติวิเศษติดปีกบิน!',
              outcomeText: `ละอองผงสีทองโรยลงบนรองเท้า ร่างกายของคุณเบาหวิวดุจขนนก (+2 SPD ถาวร)!`,
              icon: '👟',
              soundType: 'level'
            };
          }
        },
        {
          text: 'ขอหินอัญมณีสีฟ้าประกายรุ้ง',
          subtext: 'ได้รับเงินรางวัล 150G ทันที',
          icon: '💎',
          resolve: (player) => {
            const gold = 150;
            player.gold += gold;
            return {
              outcomeTitle: 'อัญมณีแห่งภูติน้อย!',
              outcomeText: `พิกซี่ส่งพลอยสีฟ้าประกายแวววาวให้ นำไปแลกเป็นเงินทองได้ 150G!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        }
      ]
    },
    {
      id: 'blue_rainbow_leprechaun',
      category: 'blue',
      title: 'สาวน้อยเลเปรอคอนปลายสายรุ้ง โคลเวอร์',
      subtitle: 'Leprechaun Maiden Clover at Rainbow End',
      icon: '🌈🍀',
      badge: 'ไหทองคำปลายสายรุ้ง',
      bannerColor: '#22c55e',
      description: 'ปลายสายรุ้งเจ็ดสีทอดลงบนพื้นหญ้า สาวน้อยสวมหมวกทรงสูงสีเขียวกับชุดเอี๊ยมกำลังนั่งกอดไหทองคำใบยักษ์ "แงะ! หาข้าเจอจนได้นะ! ถ้าไม่จับข้า ข้าจะแบ่งทองในไหให้เจ้ากินจุใจเลย!"',
      choices: [
        {
          text: 'ขอแบ่งทองคำก้อนโตจากไหปลายสายรุ้ง',
          subtext: 'ได้รับเหรียญทองคำ 180G',
          icon: '🪙',
          resolve: (player) => {
            const gold = 180;
            player.gold += gold;
            return {
              outcomeTitle: 'ทองคำแท้แห่งปลายสายรุ้ง!',
              outcomeText: `โคลเวอร์หยิบกำเหรียญทองคำประกายวิบวับยื่นให้คุณก้อนโต (+${gold}G)!`,
              icon: '💰',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'ขอใบโคลเวอร์สี่แฉกนำโชคแห่งปาฏิหาริย์',
          subtext: 'ได้รับ +2 LUK ถาวร และ [แหวนโชคลาภ]',
          icon: '🍀',
          resolve: (player) => {
            player.luk += 2;
            player.inventory.push({
              id: 'eq_ring',
              name: 'แหวนแห่งโชคลาภ (Fortune Band)',
              type: 'accessory',
              cost: 160,
              luk: 10,
              desc: 'เทพีแห่งโชคประทานพร (+2 LUK)',
              icon: '💍'
            });
            return {
              outcomeTitle: 'ใบโคลเวอร์สี่แฉกศักดิ์สิทธิ์!',
              outcomeText: `โคลเวอร์ติดใบไม้สี่แฉกบนปกเสื้อของคุณ พร้อมมอบ [Fortune Band] ให้ (+2 LUK ถาวร)!`,
              icon: '🍀',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'ร่ายรำฉลองสายรุ้งร่วมกับเธอ',
          subtext: 'อารมณ์เบิกบาน ฟื้นฟู HP 50 และได้รับ 70 EXP',
          icon: '💃',
          resolve: (player) => {
            player.hp = Math.min(player.maxHp, player.hp + 50);
            player.gainXP(70);
            return {
              outcomeTitle: 'ระบำไอริชฉลองสายรุ้ง!',
              outcomeText: `จังหวะเคาะเท้าสนุกสนานช่วยเติมเต็มพลังใจ (+50 HP, +70 EXP)!`,
              icon: '🎶',
              soundType: 'level',
              hpChange: 50
            };
          }
        }
      ]
    },

    // =========================================================================
    // 11. RED TILES (ช่องเคราะห์กรรมและกับดัก)
    // =========================================================================
    {
      id: 'bandit_girl_ambush',
      category: 'red',
      title: 'โจรสาวพราวเสน่ห์ดักปล้น โรซี่',
      subtitle: 'Charming Bandit Girl Ambush',
      icon: '🗡️',
      badge: 'เหตุการณ์โจรปล้น',
      bannerColor: '#ef4444',
      description: 'โจรสาวผมแดงในชุดหนังรัดรูปกระโดดลงมาจากกิ่งไม้ "ส่งเหรียญทองมาซะดีๆ ไม่งั้นแม่จะเชือดให้เกลี้ยง!" แต่สายตาเธอดูลุกลี้ลุกลนเหมือนเพิ่งปล้นครั้งแรก',
      choices: [
        {
          text: 'ชักดาบเข้าสู้ สยบเธอให้อยู่หมัด!',
          subtext: 'สู้ชนะ ได้รับทอง 120G + 65 EXP',
          icon: '⚔️',
          resolve: (player) => {
            const gold = 120;
            player.gold += gold;
            player.gainXP(65);
            return {
              outcomeTitle: 'ปราบโจรสาวสำเร็จ!',
              outcomeText: `เพลงดาบของคุณเหนือชั้นกว่ามาก! เธอถูกสยบจนยอมจำนนและยกถุงเงินที่แอบสะสมไว้ให้ (+${gold}G, +65 EXP)!`,
              icon: '🏆',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'หยอดคำหวานชวนเธอเลิกเป็นโจร',
          subtext: 'ทำให้เธอเขินอาย มอบทองให้ 85G',
          icon: '💬',
          resolve: (player) => {
            const gold = 85;
            player.gold += gold;
            return {
              outcomeTitle: 'คารมเป็นต่อ รูปหล่อเป็นเลิศ!',
              outcomeText: `"คนสวยขนาดนี้ มาเป็นโจรทำไมกันล่ะจ๊ะ?" คำพูดของคุณทำให้เธอหน้าแดงก่ำจนทำอะไรไม่ถูก เธอทิ้งถุงเงิน ${gold}G ไว้แล้ววิ่งหนีไปด้วยความเขิน!`,
              icon: '💖',
              soundType: 'fanfare',
              goldChange: gold
            };
          }
        },
        {
          text: 'โยนเศษเหรียญหลอกล่อแล้วรีบวิ่งหนี',
          subtext: 'เสียเงิน 20G แต่เอาตัวรอดได้อย่างปลอดภัย',
          icon: '🏃',
          resolve: (player) => {
            const lost = Math.min(player.gold, 20);
            player.gold -= lost;
            player.gainXP(25);
            return {
              outcomeTitle: 'กลยุทธ์หลบหลีกฉับไว!',
              outcomeText: `คุณโยนเหรียญ ${lost}G ไปคนละทาง เธอรีบก้มลงเก็บ คุณจึงใช้จังหวะนั้นวิ่งหนีหลุดรอดมาได้อย่างปลอดภัย (+25 EXP)`,
              icon: '💨',
              soundType: 'coin',
              goldChange: -lost
            };
          }
        }
      ]
    },
    {
      id: 'red_mimic_girl',
      category: 'red',
      title: 'หีบสมบัติกลายร่างเป็นสาวมิมิกสุดซน มิมิ',
      subtitle: 'Mimic Girl Mimi Chomping Trap',
      icon: '📦🦷',
      badge: 'กับดักหีบสมบัติกินคน',
      bannerColor: '#f43f5e',
      description: 'หีบสมบัติทองคำตรงหน้าจู่ๆ ก็อ้าปากกว้าง มีฟันแหลมคมและลิ้นสีชมพูยาว สาวมิมิกน้อยโผล่ครึ่งตัวออกมาจากหีบ "ง่ำมม! ติดกับดักมิมิแล้ว! โดนกินซะเถอะ!"',
      choices: [
        {
          text: 'ยัดเนื้อย่างก้อนโตใส่ปากเธอให้อิ่มแปล้',
          subtext: 'เธออิ่มท้อง คายสมบัติทองคำ 160G ออกมา',
          icon: '🍖',
          resolve: (player) => {
            const gold = 160;
            player.gold += gold;
            return {
              outcomeTitle: 'อาหารรสเด็ดสยบมิมิก!',
              outcomeText: `มิมิเคี้ยวเนื้อย่างแก้มตุ่ยอย่างมีความสุข "อร่อยจังงง!" เธอคายเหรียญทองโบราณที่สะสมไว้ให้ ${gold}G!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'จี้เอวและเกาลิ้นเธอจนหัวเราะร่า',
          subtext: 'เธอคาย [มีดสั้นเขี้ยวมิมิก] ออกมา +2 ATK',
          icon: '🗡️',
          resolve: (player) => {
            player.inventory.push({
              id: 'wpn_mimic_dagger',
              name: 'มีดสั้นเขี้ยวมิมิก (Mimic Fang Dagger)',
              type: 'weapon',
              cost: 220,
              atk: 10,
              spd: 5,
              desc: 'มีดสั้นทำจากเขี้ยวมิมิก (+2 ATK, +2 SPD)',
              icon: '🗡️🦷'
            });
            return {
              outcomeTitle: 'จี้จุดหัวเราะมิมิกสาว!',
              outcomeText: `มิมิดิ้นพล่านหัวเราะจนเขี้ยวสำรองหลุดกระเด็น เธอยกมีดเขี้ยวให้คุณก่อนจะมุดกลับเข้าหีบ!`,
              icon: '🗡️',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'กระโดดถอยหลังหลบฟันแหลมคมอย่างฉับไว',
          subtext: 'หลบพ้น แต่เฉียดโดนงับ เสีย 15 HP แต่ได้ +1 SPD',
          icon: '🏃',
          resolve: (player) => {
            player.hp = Math.max(10, player.hp - 15);
            player.spd += 1;
            return {
              outcomeTitle: 'สัญชาตญาณหลบหลีกเสี้ยววินาที!',
              outcomeText: `คุณดีดตัวหลบได้ทันควัน แม้ชายเสื้อจะขาด (-15 HP) แต่ความเร็วและสัญชาตญาณเฉียบคมขึ้น (+1 SPD ถาวร)!`,
              icon: '💨',
              soundType: 'hurt',
              hpChange: -15
            };
          }
        }
      ]
    },
    {
      id: 'red_witch_poison',
      category: 'red',
      title: 'แม่มดยาพิษ มอร์กาน่า กับหม้อยาต้องสาป',
      subtitle: 'Poison Witch Morgana Cauldron Hazard',
      icon: '🧪💜',
      badge: 'ไอหมอกพิษและคำสาป',
      bannerColor: '#9333ea',
      description: 'ควันสีม่วงฉุนกึกพวยพุ่งจากหม้อต้มข้างทาง แม่มดสาวทรงสะบึมในชุดคลุมสีดำกำลังคนหม้อยา "ฮิๆๆ... เหยื่อหลงเข้ามาพอดี เจ้าอยากลองชิมยาวิเศษสูตรใหม่ของข้าไหมจ๊ะ?"',
      choices: [
        {
          text: 'ร่ายเวทมนตร์ปัดเป่าหมอกพิษย้อนกลับไปใส่เธอ',
          subtext: 'แก้เผ็ดสำเร็จ ได้รับ +2 MAG และเงิน 100G',
          icon: '💨',
          resolve: (player) => {
            player.mag += 2;
            player.gold += 100;
            return {
              outcomeTitle: 'สะท้อนหมอกพิษกลับอย่างเหนือชั้น!',
              outcomeText: `กระแสลมเวทมนตร์พัดควันพิษตีกลับ มอร์กาน่าสำลักควันจนต้องจ่ายค่าทำขวัญให้คุณ 100G (+2 MAG ถาวร)!`,
              icon: '✨',
              soundType: 'fanfare',
              goldChange: 100
            };
          }
        },
        {
          text: 'ยอมดื่มน้ำยาสีม่วงเพื่อพิสูจน์ธาตุทรหด',
          subtext: 'เสีย 20 HP แต่ร่างกายสร้างภูมิคุ้มกัน +2 DEF ถาวร',
          icon: '🧪',
          resolve: (player) => {
            player.hp = Math.max(10, player.hp - 20);
            player.def += 2;
            return {
              outcomeTitle: 'ร่างกายสร้างภูมิคุ้มกันเหล็กไหล!',
              outcomeText: `แม้รสชาติจะขมบาดคอ (-20 HP) แต่เส้นเลือดของคุณสร้างภูมิคุ้มกันต้านทานพิษ (+2 DEF ถาวร)!`,
              icon: '🛡️',
              soundType: 'level',
              hpChange: -20
            };
          }
        },
        {
          text: 'แอบสลับขวดน้ำยาถอนพิษในกระเป๋าเธอ',
          subtext: 'ฉก [น้ำยาแก้คำสาปดิสเปล] สำเร็จและหนีออกมา',
          icon: '🫙',
          resolve: (player) => {
            player.inventory.push({
              id: 'item_dispel',
              name: 'น้ำยาแก้คำสาปดิสเปล (Dispel Charm)',
              type: 'potion',
              cost: 80,
              desc: 'ลบล้างคำสาปสนิมและสถานะผิดปกติทั้งหมด',
              icon: '🫙'
            });
            return {
              outcomeTitle: 'ฉกยาถอนพิษสำเร็จอย่างแนบเนียน!',
              outcomeText: `คุณแอบหยิบขวดยาแก้คำสาปใส่กระเป๋าแล้วยิ้มลาอย่างสุภาพ ได้รับ [Dispel Charm] ทันที!`,
              icon: '🫙',
              soundType: 'coin'
            };
          }
        }
      ]
    },

    // =========================================================================
    // 12. EMPTY TILES (ช่องว่างธรรมชาติและเหตุการณ์ทั่วไป)
    // =========================================================================
    {
      id: 'hot_spring_peek',
      category: 'empty',
      title: 'บ่อน้ำพุร้อนกลางป่าลับแล',
      subtitle: 'Secret Hot Springs Maiden',
      icon: '♨️',
      badge: 'เหตุการณ์แอบดูสาวอาบน้ำ',
      bannerColor: '#f472b6',
      description: 'คุณเดินผ่านม่านหมอกไอน้ำร้อน พบสาวงามผมทองกำลังแช่น้ำแร่ธรรมชาติอย่างเพลิดเพลิน ผิวกายขาวนวลสะท้อนประกายน้ำ เธอฮัมเพลงเบาๆ อย่างสบายใจโดยไม่รู้ตัวว่ามีคนอยู่ใกล้ๆ',
      choices: [
        {
          text: 'แอบมองเงียบๆ ชมทัศนียภาพ',
          subtext: 'ลุ้นรับ LUK+4 และฟื้นฟูเต็มที่ หรือโดนจับได้',
          icon: '👀',
          resolve: (player) => {
            if (Math.random() > 0.4) {
              player.luk += 1;
              player.hp = player.maxHp;
              player.mp = player.maxMp;
              return {
                outcomeTitle: 'จิตใจผ่องใส เบิกบาน!',
                outcomeText: `ภาพความงดงามเบื้องหน้าทำให้จิตใจของคุณแจ่มใสอย่างประหลาด! ฟื้นฟู HP/MP จนเต็มเปี่ยม และได้รับโชคลาภ (+1 LUK ถาวร)!`,
                icon: '✨',
                soundType: 'level',
                hpChange: player.maxHp,
                mpChange: player.maxMp
              };
            } else {
              player.hp = Math.max(10, player.hp - 20);
              return {
                outcomeTitle: 'ว้ายยย! โดนจับได้คาหนังคาเขา!',
                outcomeText: `สาวงามหันมาสบตาคุณพอดี! เธอตกใจกรีดร้องพร้อมขว้างขันน้ำและก้อนสบู่เวทมนตร์ใส่หน้าคุณอย่างแม่นยำ (-20 HP)!`,
                icon: '💢',
                soundType: 'hurt',
                hpChange: -20
              };
            }
          }
        },
        {
          text: 'ทักทายอย่างสุภาพและขอน้ำศักดิ์สิทธิ์',
          subtext: 'ได้รับน้ำทิพย์ฟื้นฟูและคำอวยพร',
          icon: '👋',
          resolve: (player) => {
            player.hp = Math.min(player.maxHp, player.hp + 50);
            player.inventory.push({
              id: 'pot_elixir',
              name: 'น้ำแร่ศักดิ์สิทธิ์บ่อน้ำพุ (Sacred Spring Elixir)',
              type: 'potion',
              cost: 110,
              desc: 'ฟื้นฟู 100 HP และ 50 MP ทันที',
              icon: '🧪'
            });
            return {
              outcomeTitle: 'ความสุภาพน่าประทับใจ!',
              outcomeText: `เธอตกใจเล็กน้อยแต่ชื่นชมในความเป็นสุภาพบุรุษของคุณ จึงมอบ [น้ำแร่ศักดิ์สิทธิ์] ให้ 1 ขวด พร้อมฟื้นฟูพลังชีวิต (+50 HP)!`,
              icon: '🌸',
              soundType: 'fanfare',
              hpChange: 50
            };
          }
        },
        {
          text: 'หันหลังกลับอย่างสุภาพบุรุษ',
          subtext: 'จิตใจบริสุทธิ์ ได้รับบัฟสมาธิ +1 DEF, +1 SPD ถาวร',
          icon: '🧘',
          resolve: (player) => {
            player.def += 1;
            player.spd += 1;
            return {
              outcomeTitle: 'คุณธรรมแห่งอัศวิน!',
              outcomeText: `คุณเดินหันหลังกลับอย่างเงียบเชียบโดยไม่ล่วงเกิน จิตใจที่บริสุทธิ์ทำให้สมาธิกล้าแกร่งขึ้น (+1 DEF, +1 SPD ถาวร)!`,
              icon: '🛡️',
              soundType: 'level'
            };
          }
        }
      ]
    },
    {
      id: 'empty_lost_beastkin',
      category: 'empty',
      title: 'สาวน้อยหมาป่า ฟีน่า หลงทางในทุ่งหญ้า',
      subtitle: 'Lost Wolfgirl Fina in the Meadow',
      icon: '🐺🌾',
      badge: 'สาวน้อยหมาป่าหลงฝูง',
      bannerColor: '#64748b',
      description: 'สาวน้อยหูหมาป่าสีเงินนั่งกอดเข่าสะอึกสะอื้นอยู่กลางดงดอกไม้ "ฮึก... พลัดหลงกับขบวนคาราวาน... หิวข้าวจะแย่อยู่แล้ววว"',
      choices: [
        {
          text: 'แบ่งปันเสบียงเนื้อแห้งและน้ำดื่มให้เธอ',
          subtext: 'เธออิ่มท้อง มอบเขี้ยวหมาป่านำโชค +2 ATK ถาวร',
          icon: '🥩',
          resolve: (player) => {
            player.atk += 2;
            player.gainXP(50);
            return {
              outcomeTitle: 'รอยยิ้มสดใสของสาวน้อยหมาป่า!',
              outcomeText: `ฟีน่ากินเนื้อแห้งจนแก้มตุ่ย เธอมอบเขี้ยวหมาป่าสีเงินที่พกติดตัวให้คุณเป็นการตอบแทน (+2 ATK ถาวร, +50 XP)!`,
              icon: '🐺',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'พาเธอไปส่งที่เมืองใกล้เคียงอย่างปลอดภัย',
          subtext: 'ครอบครัวของเธอมอบเงินรางวัล 150G ตอบแทน',
          icon: '🏘️',
          resolve: (player) => {
            const gold = 150;
            player.gold += gold;
            return {
              outcomeTitle: 'ส่งตัวสู่ครอบครัวอย่างอบอุ่น!',
              outcomeText: `หัวหน้าฝูงหมาป่าซาบซึ้งในน้ำใจของคุณ มอบถุงเหรียญทองให้คุณ 150G ด้วยความขอบคุณ!`,
              icon: '🪙',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'สอนเคล็ดลับการดมกลิ่นและหาทิศทางให้เธอ',
          subtext: 'เรียนรู้ร่วมกัน ได้รับ +1 SPD, +1 LUK ถาวร',
          icon: '🧭',
          resolve: (player) => {
            player.spd += 1;
            player.luk += 1;
            return {
              outcomeTitle: 'สัญชาตญาณแห่งพงไพร!',
              outcomeText: `ฟีน่าเข้าใจทิศทางลมในที่สุด ทั้งคุณและเธอได้รับสัญชาตญาณนำทางที่เฉียบคม (+1 SPD, +1 LUK ถาวร)!`,
              icon: '🌿',
              soundType: 'level'
            };
          }
        }
      ]
    },
    {
      id: 'holy_sword_stone',
      category: 'empty',
      title: 'ดาบเทพเทวะปักบนศิลาโบราณ',
      subtitle: 'The Divine Blade in Ancient Stone',
      icon: '✨⚔️',
      badge: 'พบเจออาวุธเทพ',
      bannerColor: '#f59e0b',
      description: 'ใจกลางซากปรักหักพังโบราณ คุณพบดาบศักดิ์สิทธิ์ที่ถูกตรึงด้วยสายฟ้าสีทองปักลึกลงในหินสลักอักขระ มีเสียงกระซิบแห่งทวยเทพก้องกังวานในหัวใจ',
      choices: [
        {
          text: 'รวบรวมกำลังทั้งหมดดึงดาบขึ้นมา!',
          subtext: 'ลุ้นรับ [ดาบสุริยะเทวะ] หรือบาดเจ็บจากแรงสะท้อน',
          icon: '💪',
          resolve: (player) => {
            if (player.getTotalStat('atk') >= 14 || Math.random() > 0.45) {
              player.atk += 2;
              player.inventory.push({
                id: 'wpn_divine_sun',
                name: 'ดาบสุริยะเทวะ (Divine Sunblade)',
                type: 'weapon',
                cost: 260,
                atk: 15,
                mag: 5,
                desc: 'ดาบศักดิ์สิทธิ์เปล่งแสงออโรร่า (+2 ATK, +2 MAG)',
                icon: '⚔️✨'
              });
              return {
                outcomeTitle: 'ดาบศักดิ์สิทธิ์ยอมรับเจ้านาย!',
                outcomeText: `สายฟ้าสีทองสว่างวาบไปทั่วฟ้า! ดาบหลุดออกจากศิลาอย่างง่ายดาย คุณได้รับ [ดาบสุริยะเทวะ] และพลังกายแกร่งกล้าขึ้น (+2 ATK ถาวร)!`,
                icon: '🌟',
                soundType: 'fanfare'
              };
            } else {
              player.hp = Math.max(10, player.hp - 25);
              return {
                outcomeTitle: 'สายฟ้าศักดิ์สิทธิ์สะท้อนกลับ!',
                outcomeText: `พลังศักดิ์สิทธิ์ยังไม่ยอมรับคุณ! กระแสไฟฟ้าแรงสูงช็อตเข้าที่มืออย่างรุนแรง (-25 HP)`,
                icon: '⚡',
                soundType: 'hurt',
                hpChange: -25
              };
            }
          }
        },
        {
          text: 'ร่ายเวทมนตร์ปลดผนึกอักขระอย่างประณีต',
          subtext: 'ปลดปล่อยจิตวิญญาณแห่งดาบ +1 MAG และฟื้น MP เต็ม',
          icon: '🔮',
          resolve: (player) => {
            player.mag += 1;
            player.mp = player.maxMp;
            return {
              outcomeTitle: 'ศาสตร์มนตราแห่งการปลดผนึก!',
              outcomeText: `คุณร่ายมนตร์แกะสลักคลายผนึกโบราณได้อย่างนุ่มนวล วิญญาณภูติดาบมอบพรเวทมนตร์ให้ (+1 MAG ถาวร, MP ฟื้นเต็มเปี่ยม)!`,
              icon: '✨',
              soundType: 'magic',
              mpChange: player.maxMp
            };
          }
        },
        {
          text: 'คุกเข่าอธิษฐานขอพรโดยไม่แตะต้องดาบ',
          subtext: 'ได้รับพรแห่งแสง ฟื้นฟู HP เต็มและได้เงินบริจาค 100G',
          icon: '🙏',
          resolve: (player) => {
            player.hp = player.maxHp;
            player.gold += 100;
            return {
              outcomeTitle: 'จิตคารวะอันบริสุทธิ์!',
              outcomeText: `ทวยเทพซาบซึ้งในความเคารพของคุณ ลำแสงศักดิ์สิทธิ์ส่องลงมาชำระล้างบาดแผลจนหายสนิท พร้อมมอบเงินบริจาค 100G!`,
              icon: '🕊️',
              soundType: 'level',
              hpChange: player.maxHp,
              goldChange: 100
            };
          }
        }
      ]
    },

    // =========================================================================
    // 13. WEAPON SHOP EVENTS (คลังสรรพาวุธและช่างตีเหล็กสาว)
    // =========================================================================
    {
      id: 'shop_weapon_blacksmith',
      category: 'shop_weapon',
      title: 'เตาหลอมสรรพาวุธของสาวน้อยช่างตีเหล็ก',
      subtitle: 'ประกายไฟและควันหอมกรุ่น ช่างตีเหล็กสาวในชุดเอี๊ยมหนังเผยแผ่นหลังและเอวเอสกำลังตีดาบ',
      icon: '⚔️👩‍🏭',
      badge: 'WEAPON FORGE',
      description: 'สาวน้อยช่างตีเหล็ก คาร์ล่า ปาดเหงื่อบนหน้าผาก ยิ้มหวานต้อนรับ "ยินดีต้อนรับสู่อู่เหล็กจ้ะ! วันนี้อยากได้อาวุธคมกริบหรือจะให้อัปเกรดอะไรดี?"',
      bannerColor: '#f97316',
      actionType: 'open_weapon_shop',
      choices: [
        {
          text: '⚔️ เข้าสู่ร้านค้าคลังสรรพาวุธและชุดเกราะ',
          subtext: 'เลือกซื้อดาบ โล่ เกราะ และเครื่องประดับ T1-T5',
          icon: '⚔️',
          resolve: () => ({
            outcomeTitle: 'ยินดีต้อนรับสู่คลังอาวุธ!',
            outcomeText: 'คาร์ล่าพาคุณเข้าสู่คลังอาวุธ เลือกสรรอุปกรณ์ชั้นยอดเพื่อเสริมพลังรบของคุณ!',
            icon: '🛡️',
            soundType: 'coin'
          })
        },
        {
          text: '💖 หยอดคำหวานชื่นชมกล้ามเนื้อและฝีมือการตีเหล็กของเธอ',
          subtext: 'เธอเขินอายหน้าแดงก่ำ และแถมหินลับมีดเวทมนตร์ลับดาบให้ฟรี (+1 ATK ถาวร!)',
          icon: '💖',
          resolve: (player) => {
            player.atk += 1;
            return {
              outcomeTitle: 'ช่างสาวเขินอายหน้าแดง!',
              outcomeText: 'คาร์ล่าหน้าแดงถึงใบหู "พะ...พูดบ้าอะไรน่ะ! แต่ก็ขอบใจนะ... นี่! ข้าแถมหินลับมีดเวทมนตร์ช่วยเพิ่มคมดาบให้ (+1 ATK ถาวร)!"',
              icon: '✨',
              soundType: 'level'
            };
          }
        },
        {
          text: '🔥 อาสาช่วยเร่งเปลวไฟในเตาหลอมโบราณ',
          subtext: 'ใช้พลังช่วยตีเหล็ก ได้รับเงินค่าจ้าง 120G และพลังกาย +1 DEF',
          icon: '🔥',
          resolve: (player) => {
            player.gold += 120;
            player.def += 1;
            return {
              outcomeTitle: 'งานฝีมือประสานใจ!',
              outcomeText: 'คุณกับคาร์ล่าช่วยกันทุบตีเหล็กกล้าอย่างเข้าขา เธอประทับใจมากและมอบค่าจ้าง 120G พร้อมกล้ามเนื้อที่กระชับขึ้น (+1 DEF)!',
              icon: '💪',
              soundType: 'fanfare',
              goldChange: 120
            };
          }
        }
      ]
    },

    // =========================================================================
    // 14. MAGIC SHOP EVENTS (หอเวทมนตร์และแม่มดสาว)
    // =========================================================================
    {
      id: 'shop_magic_witch',
      category: 'shop_magic',
      title: 'หอปรุงยาและคัมภีร์เวทมนตร์ของแม่มดสาว',
      subtitle: 'กลิ่นควันกำยานหอมละมุน แม่มดสาวผมม่วงดวงตากลมโตสวมหมวกปีกกว้างกำลังคนหม้อยาเวท',
      icon: '🔮🧙‍♀️',
      badge: 'ARCANE EMPORIUM',
      description: 'แม่มดสาว เมอร์ลินด้า เงยหน้าขึ้นมองด้วยแววตาซุกซน "อ๊ะ แขกผู้มาเยือน... สนใจมนตราลึกลับ น้ำยาเพิ่มพลัง หรือจะมาฟังคำทำนายแห่งชะตาชีวิตดีล่ะ?"',
      bannerColor: '#a855f7',
      actionType: 'open_magic_shop',
      choices: [
        {
          text: '🔮 เข้าสู่ร้านค้าคัมภีร์เวทมนตร์และโอสถทิพย์',
          subtext: 'เลือกซื้อเวทฟิลด์ น้ำยาเพิ่มสเตตัสถาวร และสปินเนอร์',
          icon: '🔮',
          resolve: () => ({
            outcomeTitle: 'เข้าสู่หอคัมภีร์เวทมนตร์!',
            outcomeText: 'เมอร์ลินด้าเปิดตำราเวทมนตร์โบราณให้คุณเลือกซื้อคาถาอาคมชั้นสูง!',
            icon: '📜',
            soundType: 'magic'
          })
        },
        {
          text: '✨ ให้แม่มดสาวตรวจดูลายมือทำนายดวงชะตาชีวิต',
          subtext: 'ได้รับพรแห่งดวงดาว ฟื้นฟู MP เต็มเปี่ยม และโชคลาภ +2 LUK ถาวร!',
          icon: '✨',
          resolve: (player) => {
            player.luk += 2;
            player.mp = player.maxMp;
            return {
              outcomeTitle: 'คำทำนายแห่งโชคชะตาส่องประกาย!',
              outcomeText: 'เมอร์ลินด้ากุมมือของคุณอย่างแผ่วเบา ร่ายมนตร์ประสานจิต "เส้นลายมือของท่านสุกสกาวดั่งดวงดาว... จะมีโชคลาภหลั่งไหลมา!" (+2 LUK, ฟื้นฟู MP เต็ม)',
              icon: '🌟',
              soundType: 'level',
              mpChange: player.maxMp
            };
          }
        },
        {
          text: '🧪 อาสาเป็นผู้ทดลองชิมน้ำยาสูตรลับแปลกใหม่',
          subtext: 'ดื่มน้ำยาสีรุ้งเรืองแสง ลุ้นรับพลังเวทมนตร์มหาศาล (+1 MAG ถาวร)',
          icon: '🧪',
          resolve: (player) => {
            player.mag += 1;
            return {
              outcomeTitle: 'รสชาติหวานซ่านถึงแก่นวิญญาณ!',
              outcomeText: 'น้ำยาในหม้อต้มมีรสชาติหวานเปรี้ยวซาบซ่า วงจรมานาในกายคุณแผ่ขยายพลังเวทพุ่งสูงขึ้นอย่างถาวร (+1 MAG)!',
              icon: '⚡',
              soundType: 'level'
            };
          }
        }
      ]
    },

    // =========================================================================
    // 15. ITEM SHOP EVENTS (ร้านเบ็ดเตล็ดและสาวหูแมว)
    // =========================================================================
    {
      id: 'shop_item_gachapon',
      category: 'shop_item',
      title: 'ร้านสะดวกซื้อแสนสุขของแม่ค้าสาวหูแมว',
      subtitle: 'กระดิ่งหน้าร้านดังกริ๊ง สาวน้อยหูแมว เหมียวเหมียว โบกหางนุ่มฟูต้อนรับอย่างร่าเริง',
      icon: '🏪🐱',
      badge: 'GENERAL STORE',
      description: 'เหมียวเหมียว กระดิกหูแมวไปมา "เนียะฮ่า! ยินดีต้อนรับเมี๊ยว! ร้านเรามีทั้งสปินเนอร์นำโชค ยาฟื้นพลัง และตู้กาชาปองไข่ทองคำด้วยน้า!"',
      bannerColor: '#22c55e',
      actionType: 'open_item_shop',
      choices: [
        {
          text: '🏪 เข้าสู่ร้านค้าไอเทมและอุปกรณ์ทั่วไป',
          subtext: 'เลือกซื้อสปินเนอร์ลูกเต๋า ระเบิด คัมภีร์วาร์ป และน้ำยา',
          icon: '🏪',
          resolve: () => ({
            outcomeTitle: 'เลือกชมสินค้าในร้าน!',
            outcomeText: 'เหมียวเหมียวพาคุณเดินชมชั้นวางสินค้าที่เต็มไปด้วยไอเทมมีประโยชน์สำหรับการเดินทาง!',
            icon: '🛍️',
            soundType: 'coin'
          })
        },
        {
          text: '🎰 หยอดเหรียญ 50G หมุนตู้กาชาปองนำโชคหน้าร้าน',
          subtext: 'ลุ้นสุ่มรับสปินเนอร์ 3 ลูกเต๋า หรือน้ำยาเพิ่มพลังถาวร!',
          icon: '🎰',
          resolve: (player) => {
            if (player.gold < 50) {
              return {
                outcomeTitle: 'ทองไม่พอหมุนกาชา!',
                outcomeText: 'คุณมีเงินไม่พอ 50G เหมียวเหมียวปลอบใจด้วยลูกกวาดหวานๆ ชิ้นหนึ่ง (+10 HP)',
                icon: '🍬',
                soundType: 'magic',
                hpChange: 10
              };
            }
            player.gold -= 50;
            player.activeSpinnerMultiplier = 3;
            return {
              outcomeTitle: 'แจ็กพอตไข่ทองคำแตก!',
              outcomeText: 'ไข่ทองคำกลิ้งออกมาจากตู้กาชาปอง! ข้างในคือสปินเนอร์ 3 ลูกเต๋า (การเดินครั้งถัดไปจะทอยเต๋าได้ 3 ลูกเต็ม!)',
              icon: '🌀',
              soundType: 'fanfare',
              goldChange: -50
            };
          }
        },
        {
          text: '📦 ช่วยแม่ค้าสาวจัดสต็อกลังสินค้าหน้าร้าน',
          subtext: 'ช่วยยกของสร้างความประทับใจ ได้รับเงิน 100G และน้ำยาฟื้นเลือดฟรี',
          icon: '📦',
          resolve: (player) => {
            player.gold += 100;
            player.hp = Math.min(player.maxHp, player.hp + 50);
            return {
              outcomeTitle: 'เหมียวเหมียวซาบซึ้งใจยิ่งนัก!',
              outcomeText: 'เหมียวเหมียวเอาแก้มคลอเคลียขอบคุณอย่างมีความสุข มอบเงินตอบแทน 100G และช่วยทายารักษาแผลให้ (+50 HP)!',
              icon: '💖',
              soundType: 'fanfare',
              goldChange: 100,
              hpChange: 50
            };
          }
        }
      ]
    },

    // =========================================================================
    // 16. GUILD EVENTS (กิลด์นักผจญภัย & สัญญาจ้างคู่หู 3 เทิร์น)
    // =========================================================================
    {
      id: 'guild_mercenary_hall',
      category: 'guild',
      title: 'ห้องโถงกิลด์นักผจญภัยและศูนย์ว่าจ้าง',
      subtitle: 'เสียงชนแก้วเบียร์เคล้าเสียงหัวเราะ สาวๆ นักผจญภัยหลากหลายเผ่าพันธุ์กำลังรอคอยภารกิจ',
      icon: '📜🍻',
      badge: 'ADVENTURER GUILD',
      description: 'พนักงานต้อนรับสาวกิลด์ เอริน ยิ้มต้อนรับ "ยินดีต้อนรับสู่กิลด์ค่ะ! มีทั้งกระดานเควสต์ล่าค่าหัว และเหล่านักรบสาวรับจ้างพร้อมเซ็นสัญญาร่วมรบระยะสั้น (3 เทิร์น) ค่ะ!"',
      bannerColor: '#eab308',
      actionType: 'open_guild',
      choices: [
        {
          text: '📜 ตรวจดูกระดานเควสต์ล่าค่าหัวประจำกิลด์',
          subtext: 'รับภารกิจล่ามอนสเตอร์หรือปลดปล่อยเมืองเพื่อรับรางวัลเงินก้อนโต',
          icon: '📜',
          resolve: () => ({
            outcomeTitle: 'เข้าสู่กระดานเควสต์กิลด์!',
            outcomeText: 'เอรินนำแผ่นประกาศเควสต์ล่าสุดมาแสดงให้คุณเลือกรับภารกิจ!',
            icon: '📋',
            soundType: 'coin'
          })
        },
        {
          text: '🐾 จ้างสาวหูแมวนักล่า "มิอา" ร่วมรบ (สัญญา 3 เทิร์น: 180G)',
          subtext: 'มิอาจะร่วมต่อสู้และกระโดดเข้าช่วยโจมตีในสมรภูมิตลอด 3 เทิร์นเต็ม!',
          icon: '🐾',
          resolve: (player) => {
            if (player.gold < 180) {
              return {
                outcomeTitle: 'ทองไม่เพียงพอสำหรับค่าจ้าง!',
                outcomeText: 'คุณมีเงินไม่พอ 180G มิอาเอียงคอทำตาละห้อย "ไว้มีตังค์ค่อยมาจ้างเค้าน้าเมี๊ยว..."',
                icon: '💸',
                soundType: 'magic'
              };
            }
            player.gold -= 180;
            player.companion = {
              id: 'comp_hired_mia',
              name: 'สาวหูแมวนักล่า มิอา',
              title: 'มือสังหารกิลด์รับจ้าง',
              avatar: '🐱🗡️',
              role: 'striker',
              skillName: 'Lupine Cat Claw Rush',
              skillDesc: 'พุ่งกระโจนข่วนศัตรูต่อเนื่องด้วยกรงเล็บลมกรด!',
              affinity: 100,
              dialogue: 'สัญญาสามเทิร์นนี้ เหมียวจะปกป้องเจ้านายด้วยชีวิตเลยเมี๊ยว!',
              color: '#10b981',
              contractTurnsRemaining: 3
            };
            return {
              outcomeTitle: 'เซ็นสัญญาว่าจ้างมิอาสำเร็จ!',
              outcomeText: 'สาวหูแมว มิอา กระโดดกอดแขนคุณอย่างสนิทสนม! เธอจะร่วมทัพช่วยต่อสู้เป็นเวลา 3 เทิร์นเต็มนับจากนี้!',
              icon: '🎉',
              soundType: 'fanfare',
              goldChange: -180,
              companionRecruited: player.companion
            };
          }
        },
        {
          text: '🧝‍♀️ จ้างเจ้าหญิงเอลฟ์นักเวท "ซิลฟิรา" ร่วมรบ (สัญญา 3 เทิร์น: 220G)',
          subtext: 'ซิลฟิราจะร่ายมนตร์ม่านพฤกษาคุ้มกันและยิงบีมเวทช่วยรบ 3 เทิร์น!',
          icon: '🧝‍♀️',
          resolve: (player) => {
            if (player.gold < 220) {
              return {
                outcomeTitle: 'ทองไม่เพียงพอสำหรับค่าจ้าง!',
                outcomeText: 'คุณมีเงินไม่พอ 220G เจ้าหญิงซิลฟิรายิ้มสง่างาม "ฝึกฝนและสะสมทรัพย์อีกนิดนะท่านผู้กล้า"',
                icon: '💸',
                soundType: 'magic'
              };
            }
            player.gold -= 220;
            player.companion = {
              id: 'comp_hired_sylphira',
              name: 'เจ้าหญิงเอลฟ์ ซิลฟิรา',
              title: 'มหาจอมเวทพฤกษาแห่งป่าน้ำตก',
              avatar: '🧝‍♀️✨',
              role: 'mage',
              skillName: 'Emerald Waterfall Deluge',
              skillDesc: 'อัญเชิญสายน้ำตกมรกตชำระล้างศัตรูและฟื้นฟูเลือด!',
              affinity: 100,
              dialogue: 'สายลมและผืนป่าจะคอยปกปักรักษาท่านตลอดการเดินทางนี้',
              color: '#38bdf8',
              contractTurnsRemaining: 3
            };
            return {
              outcomeTitle: 'เซ็นสัญญาว่าจ้างซิลฟิราสำเร็จ!',
              outcomeText: 'เจ้าหญิงเอลฟ์ ซิลฟิรา โบกคทาประกายแสงมรกต เธอจะร่วมทัพช่วยต่อสู้และคุ้มครองคุณเป็นเวลา 3 เทิร์นเต็ม!',
              icon: '🌟',
              soundType: 'fanfare',
              goldChange: -220,
              companionRecruited: player.companion
            };
          }
        }
      ]
    },

    // =========================================================================
    // 17. FISHING EVENTS (เวิ้งน้ำตกมรกตและเงือกสาว)
    // =========================================================================
    {
      id: 'fishing_mermaid_cove',
      category: 'fishing',
      title: 'เวิ้งน้ำตกมรกตและเสียงเพลงของไซเรน',
      subtitle: 'ผิวน้ำประกายแสงระยิบระยับ ปรากฏเงือกสาวแสนสวยแหวกว่ายเข้ามาหยอกล้อ',
      icon: '🎣🧜‍♀️',
      badge: 'SIREN COVE',
      description: 'เงือกสาวไซเรน เนริดา เกาะโขดหินริมน้ำ เผยหน้าอกอวบอิ่มและครีบหางประกายสีรุ้ง "เจ้ามนุษย์รูปงาม... แวะมาตกปลาหรือแวะมาชมความงามของข้ากันแน่จ๊ะ?"',
      bannerColor: '#06b6d4',
      actionType: 'open_fishing',
      choices: [
        {
          text: '🎣 หย่อนเบ็ดตกปลาธรรมดาในเวิ้งน้ำ',
          subtext: 'ตกปลาเพื่อลุ้นไอเทม อาหารบัฟ หรือมอนสเตอร์ใต้สมุทร',
          icon: '🎣',
          resolve: () => ({
            outcomeTitle: 'หย่อนเบ็ดตกปลา!',
            outcomeText: 'คุณเตรียมคันเบ็ดและเหยื่อตกปลา ท้าทายสิ่งมีชีวิตลึกลับใต้ผิวน้ำ!',
            icon: '🐟',
            soundType: 'coin'
          })
        },
        {
          text: '🧜‍♀️ ร้องเพลงคู่ประสานเสียงกับเงือกสาวเนริดา',
          subtext: 'ฟื้นฟู HP & MP เต็ม 100% พร้อมได้รับพรเสน่ห์ดวงชะตา (+2 LUK ถาวร)',
          icon: '🎵',
          resolve: (player) => {
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            player.luk += 2;
            return {
              outcomeTitle: 'บทเพลงแห่งไซเรนสะกดวิญญาณ!',
              outcomeText: 'เสียงเพลงของคุณและเนริดากังวานไปทั่วผืนน้ำ ละอองน้ำศักดิ์สิทธิ์รักษาบาดแผลจนหายสนิท และชะตาชีวิตของคุณเปล่งประกาย (+2 LUK)!',
              icon: '💖',
              soundType: 'level',
              hpChange: player.maxHp,
              mpChange: player.maxMp
            };
          }
        },
        {
          text: '⚓ ดำน้ำลึกตามหาหีบสมบัติใต้ก้นทะเลสาบ',
          subtext: 'เนริดาช่วยนำทางพาไปค้นพบหีบทองคำเรืออับปาง (+320G)',
          icon: '⚓',
          resolve: (player) => {
            player.gold += 320;
            return {
              outcomeTitle: 'ค้นพบหีบสมบัติใต้สมุทร!',
              outcomeText: 'เนริดาจับมือคุณดำดิ่งลงสู่ก้นบึงมรกต ชี้ทางให้คุณเปิดหีบโบราณที่เต็มไปด้วยเหรียญทองคำ (+320G)!',
              icon: '🎁',
              soundType: 'fanfare',
              goldChange: 320
            };
          }
        }
      ]
    },

    // =========================================================================
    // 18. VAULT EVENTS (ห้องนิรภัยโบราณ)
    // =========================================================================
    {
      id: 'vault_ancient_chamber',
      category: 'vault',
      title: 'ห้องนิรภัยทองคำของอารยธรรมโบราณ',
      subtitle: 'ประตูป้อมปราการศิลาปิดผนึกด้วยโซ่ตรวนและรูนเวทมนตร์เรืองแสงสีทอง',
      icon: '🗝️🎁',
      badge: 'ANCIENT VAULT',
      description: 'วิญญาณสาวผู้เฝ้าห้องนิรภัยปรากฏกายขึ้นเตือน "เฉพาะผู้ที่มีสติปัญญา พละกำลัง หรือโชคชะตาอันล้ำเลิศเท่านั้น ที่จะได้ครอบครองสมบัติข้างในนี้!"',
      bannerColor: '#fbbf24',
      choices: [
        {
          text: '🗝️ ถอดรหัสอักขระรูนโบราณบนบานประตูอย่างประณีต',
          subtext: 'ใช้พลังเวทมนตร์ปลดล็อกกลไก ได้รับทอง 350G และปัญญาเวท +1 MAG',
          icon: '🔮',
          resolve: (player) => {
            player.gold += 350;
            player.mag += 1;
            return {
              outcomeTitle: 'ถอดรหัสรูนสำเร็จ!',
              outcomeText: 'รูนเวทมนตร์ส่องแสงจ้า ประตูนิรภัยค่อยๆ เลื่อนเปิดออก เผยสมบัติทองคำ 350G และภูมิปัญญาโบราณ (+1 MAG)!',
              icon: '✨',
              soundType: 'level',
              goldChange: 350
            };
          }
        },
        {
          text: '🗡️ ใช้ความชำนาญโจรสะเดาะสลักกลอนชั้นสูง',
          subtext: 'สะเดาะกลอนโดยไร้เสียงรบกวน ได้รับทองคำ 450G และโชคลาภ +2 LUK',
          icon: '🗝️',
          resolve: (player) => {
            player.gold += 450;
            player.luk += 2;
            return {
              outcomeTitle: 'สะเดาะกลอนสมบูรณ์แบบ!',
              outcomeText: 'เสียงสลักปลดล็อกดัง "คลิก!" กล่องสมบัติภายในห้องเปิดออก มอบทองคำ 450G และความมั่นใจในโชคชะตา (+2 LUK)!',
              icon: '👑',
              soundType: 'fanfare',
              goldChange: 450
            };
          }
        },
        {
          text: '💥 ใช้แรงกายเกร็งกล้ามเนื้อกระแทกพังประตู',
          subtext: 'พังประตูบุกเข้าไป ได้รับทอง 380G (รับดาเมจจากเศษหิน -15 HP)',
          icon: '💥',
          resolve: (player) => {
            player.gold += 380;
            player.hp = Math.max(1, player.hp - 15);
            return {
              outcomeTitle: 'พลังทำลายล้างมหาศาล!',
              outcomeText: 'ประตูศิลาแตกกระจายเป็นเสี่ยงๆ! คุณกวาดทองคำมาได้ 380G แม้จะมีรอยฟกช้ำจากเศษหินเล็กน้อย (-15 HP)!',
              icon: '💰',
              soundType: 'coin',
              goldChange: 380,
              hpChange: -15
            };
          }
        }
      ]
    },

    // =========================================================================
    // 19. DARK GATE EVENTS (ประตูนรก & แท่นบูชามารดำ)
    // =========================================================================
    {
      id: 'dark_gate_sanctuary',
      category: 'dark_gate',
      title: 'ประตูนรกและแท่นบูชามารดำ Rico',
      subtitle: 'ไอหมอกสีม่วงเข้มปกคลุม ซัคคิวบัสสาวในชุดเปิดเผยร่ายรำอยู่หน้าประตูมิติ',
      icon: '😈💋',
      badge: 'DARK GATE',
      description: 'ซัคคิวบัสสาวแห่งความมืด ลิลิธ หัวเราะคิกคัก "ยินดีต้อนรับสู่ธรณีประตูแห่งความมืด... เจ้าปรารถนาพลังอันไร้ขีดจำกัดเพื่อล้างแค้น หรือจะมาหาความสำราญกับข้ากันแน่จ๊ะ?"',
      bannerColor: '#c084fc',
      choices: [
        {
          text: '😈 สวดอัญเชิญ Rico ทำพันธสัญญาจุติร่างดาร์คลิง',
          subtext: 'หากเป็นผู้เล่นอันดับสุดท้าย จะแปลงร่างเป็นอสูรดาร์คลิงสุดแกร่งทันที!',
          icon: '😈',
          resolve: () => {
            return {
              outcomeTitle: 'พันธสัญญามารดำดาร์คลิง!',
              outcomeText: 'หากคุณเป็นผู้เล่นที่ตามหลังอันดับสุดท้าย แท่นบูชาจะตอบรับและมอบพลังจุติร่างดาร์คลิงทันที!',
              icon: '🔥',
              soundType: 'magic'
            };
          }
        },
        {
          text: '💋 ยอมรับจุมพิตแห่งความมืดจากซัคคิวบัสสาวลิลิธ',
          subtext: 'ได้รับพลังเสน่ห์มืด เพิ่มพลังรบมหาศาล (+1 ATK, +1 MAG ถาวร!)',
          icon: '💋',
          resolve: (player) => {
            player.atk += 1;
            player.mag += 1;
            return {
              outcomeTitle: 'จุมพิตต้องมนตร์มหาเสน่ห์!',
              outcomeText: 'ลิลิธประกบริมฝีปากอันเย้ายวนมอบไอพลังมารอันอบอุ่น พลังโจมตีและเวทมนตร์ของคุณทะยานสูงขึ้น (+1 ATK, +1 MAG)!',
              icon: '💖',
              soundType: 'level'
            };
          }
        },
        {
          text: '🕊️ สวดมนต์ศักดิ์สิทธิ์ขับไล่หมอกพิษหน้าประตูนรก',
          subtext: 'ชำระล้างไอทมิฬ ฟื้นฟู HP เต็มเปี่ยม และได้รับค่าประสบการณ์ 120 XP',
          icon: '🕊️',
          resolve: (player) => {
            player.hp = player.maxHp;
            player.gainXP(120);
            return {
              outcomeTitle: 'แสงศักดิ์สิทธิ์ชำระล้างความมืด!',
              outcomeText: 'ละอองแสงขับไล่ไอพิษจนจางหาย ลิลิธกรีดร้องและล่าถอยเข้าประตูมิติ คุณได้รับค่าประสบการณ์ 120 XP และเลือดเต็ม!',
              icon: '✨',
              soundType: 'fanfare',
              hpChange: player.maxHp
            };
          }
        }
      ]
    }
  ];

  // =========================================================================
  // SMART CONTEXTUAL EVENT SELECTOR (Guarantees Location/Biome Match & Variety)
  // =========================================================================
  public getRandomEvent(node: BoardNode): FantasyEventData {
    let candidateCategory: FantasyEventData['category'] = 'empty';

    if (node.type === 'shop_weapon') {
      candidateCategory = 'shop_weapon';
    } else if (node.type === 'shop_magic') {
      candidateCategory = 'shop_magic';
    } else if (node.type === 'shop_item') {
      candidateCategory = 'shop_item';
    } else if (node.type === 'guild') {
      candidateCategory = 'guild';
    } else if (node.type === 'fishing') {
      candidateCategory = 'fishing';
    } else if (node.type === 'vault') {
      candidateCategory = 'vault';
    } else if (node.type === 'dark_gate') {
      candidateCategory = 'dark_gate';
    } else if (node.type === 'church') {
      candidateCategory = 'church';
    } else if (node.type === 'tavern') {
      candidateCategory = 'tavern';
    } else if (node.type === 'blue') {
      candidateCategory = 'blue';
    } else if (node.type === 'red') {
      candidateCategory = 'red';
    } else if (node.type === 'boss') {
      candidateCategory = 'volcano';
    } else if (node.biome === 'waterfall_forest') {
      candidateCategory = 'waterfall_forest';
    } else if (node.biome === 'sakura_shrine') {
      candidateCategory = 'sakura_shrine';
    } else if (node.biome === 'steampunk') {
      candidateCategory = 'steampunk';
    } else if (node.biome === 'volcano') {
      candidateCategory = 'volcano';
    } else if (node.biome === 'snow') {
      candidateCategory = 'snow';
    } else if (node.biome === 'desert') {
      candidateCategory = 'desert';
    } else if (node.biome === 'abyss') {
      candidateCategory = 'abyss';
    } else {
      candidateCategory = 'empty';
    }

    let matching = this.events.filter(e => e.category === candidateCategory);
    if (matching.length === 0) {
      matching = this.events;
    }

    // Filter out the last triggered event to prevent back-to-back repeats
    let pool = matching.filter(e => e.id !== this.lastEventId);
    if (pool.length === 0) pool = matching;

    const selected = pool[Math.floor(Math.random() * pool.length)];
    this.lastEventId = selected.id;

    // Clone event and its choices so dynamically added choices don't contaminate the static definition
    const eventCopy: FantasyEventData = {
      ...selected,
      choices: [...selected.choices]
    };

    // If node is an unowned empty tile (ไม่มีสิ่งปลูกสร้าง), inject Choice 4: Buy Personal Home!
    if (node.type === 'empty' && !node.homeData) {
      eventCopy.choices.push({
        text: '🏡 ซื้อที่ดินสร้างบ้านพักส่วนตัว (150G)',
        subtext: 'เป็นเจ้าของที่ดินผืนนี้! หากพ่ายแพ้หรือตายในการต่อสู้ จะมาเกิดใหม่ที่นี่ด้วย HP/MP เต็ม 100%!',
        icon: '🏡',
        resolve: (player, targetNode) => {
          if (player.gold < 150) {
            return {
              outcomeTitle: 'ทองไม่เพียงพอสำหรับซื้อที่ดิน!',
              outcomeText: `คุณมีเงินเพียง ${player.gold}G (ต้องการ 150G) นายหน้าค้าที่ดินจึงเดินจากไป...`,
              icon: '💸',
              soundType: 'magic'
            };
          }
          player.gold -= 150;
          player.homeNodeId = targetNode.id;
          targetNode.type = 'home';
          targetNode.homeData = {
            ownerId: player.id,
            ownerName: player.displayName,
            level: 1,
            purchasePrice: 150,
            visitorsCount: 0,
            tollFee: 35
          };
          return {
            outcomeTitle: 'ยินดีด้วย! คุณมีบ้านเป็นของตัวเองแล้ว!',
            outcomeText: `คุณได้สร้างคฤหาสน์พักส่วนตัวบนที่ดินนี้สำเร็จ! เมื่อใดก็ตามที่คุณพ่ายแพ้หรือตายในการต่อสู้ คุณจะมาเกิดใหม่ที่นี่ทันทีด้วย HP & MP เต็ม 100%!`,
            icon: '🎉',
            soundType: 'fanfare',
            goldChange: -150
          };
        }
      });
    }

    return eventCopy;
  }
}

export const fantasyEventManager = new FantasyEventManager();
