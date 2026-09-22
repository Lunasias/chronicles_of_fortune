import { Player, CompanionData } from './Player';
import { BoardNode } from './BoardMap';
import { audio } from '../engine/AudioSynthesizer';

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
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  description: string;
  bannerColor: string;
  choices: [FantasyChoice, FantasyChoice, FantasyChoice];
}

export class FantasyEventManager {
  public events: FantasyEventData[] = [
    // 1. Secret Hot Springs Maiden
    {
      id: 'hot_spring_peek',
      title: 'บ่อน้ำพุร้อนกลางป่าลับแล',
      subtitle: 'Secret Hot Springs Maiden',
      icon: '♨️',
      badge: 'เหตุการณ์แอบดูสาวอาบน้ำ',
      bannerColor: '#f472b6',
      description: 'คุณเดินผ่านม่านหมอกไอน้ำร้อน พบสาวงามผมทองกำลังแช่น้ำแร่ธรรมชาติอย่างเพลิดเพลิน ผิวกายขาวนวลสะท้อนประกายน้ำ เธอฮัมเพลงเบาๆ อย่างสบายใจโดยไม่รู้ตัวว่ามีคนอยู่ใกล้ๆ',
      choices: [
        {
          text: 'แอบมองเงียบๆ ชมทัศนียภาพ',
          subtext: 'ลุ้นรับ LUK+3 และฟื้นฟูเต็มที่ หรือโดนจับได้',
          icon: '👀',
          resolve: (player) => {
            if (Math.random() > 0.4) {
              player.luk += 3;
              player.hp = player.maxHp;
              player.mp = player.maxMp;
              return {
                outcomeTitle: 'จิตใจผ่องใส เบิกบาน!',
                outcomeText: `ภาพความงดงามเบื้องหน้าทำให้จิตใจของคุณแจ่มใสอย่างประหลาด! ฟื้นฟู HP/MP จนเต็มเปี่ยม และได้รับโชคลาภ (+3 LUK ถาวร)!`,
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
            player.hp = Math.min(player.maxHp, player.hp + 40);
            player.inventory.push({
              id: 'pot_elixir',
              name: 'น้ำแร่ศักดิ์สิทธิ์บ่อน้ำพุ (Sacred Spring Elixir)',
              type: 'potion',
              cost: 80,
              desc: 'ฟื้นฟู 100 HP และ 40 MP ทันที',
              icon: '🧪'
            });
            return {
              outcomeTitle: 'ความสุภาพน่าประทับใจ!',
              outcomeText: `เธอตกใจเล็กน้อยแต่ชื่นชมในความเป็นสุภาพบุรุษของคุณ จึงมอบ [น้ำแร่ศักดิ์สิทธิ์] ให้ 1 ขวด พร้อมฟื้นฟูพลังชีวิต (+40 HP)!`,
              icon: '🌸',
              soundType: 'fanfare',
              hpChange: 40
            };
          }
        },
        {
          text: 'หันหลังกลับอย่างสุภาพบุรุษ',
          subtext: 'จิตใจบริสุทธิ์ ได้รับบัฟสมาธิ +2 DEF, +2 SPD',
          icon: '🧘',
          resolve: (player) => {
            player.def += 2;
            player.spd += 2;
            return {
              outcomeTitle: 'คุณธรรมแห่งอัศวิน!',
              outcomeText: `คุณเดินหันหลังกลับอย่างเงียบเชียบโดยไม่ล่วงเกิน จิตใจที่บริสุทธิ์ทำให้สมาธิกล้าแกร่งขึ้น (+2 DEF, +2 SPD ถาวร)!`,
              icon: '🛡️',
              soundType: 'level'
            };
          }
        }
      ]
    },

    // 2. Charming Bandit Girl Ambush
    {
      id: 'bandit_girl_ambush',
      title: 'โจรสาวพราวเสน่ห์ดักปล้น',
      subtitle: 'Charming Bandit Girl Ambush',
      icon: '🗡️',
      badge: 'เหตุการณ์โจรปล้น',
      bannerColor: '#ef4444',
      description: 'โจรสาวผมแดงในชุดหนังรัดรูปกระโดดลงมาจากกิ่งไม้ "ส่งเหรียญทองมาซะดีๆ ไม่งั้นแม่จะเชือดให้เกลี้ยง!" แต่สายตาเธอดูลุกลี้ลุกลนเหมือนเพิ่งปล้นครั้งแรก',
      choices: [
        {
          text: 'ชักดาบเข้าสู้ สยบเธอให้อยู่หมัด!',
          subtext: 'สู้ชนะ ได้รับทอง 120G + EXP',
          icon: '⚔️',
          resolve: (player) => {
            const gold = 120;
            const xp = 65;
            player.gold += gold;
            player.gainXP(xp);
            return {
              outcomeTitle: 'ปราบโจรสาวสำเร็จ!',
              outcomeText: `เพลงดาบของคุณเหนือชั้นกว่ามาก! เธอถูกสยบจนยอมจำนนและยกถุงเงินที่แอบสะสมไว้ให้ (+${gold}G, +${xp} XP)!`,
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
              outcomeText: `คุณโยนเหรียญ ${lost}G ไปคนละทาง เธอรีบก้มลงเก็บ คุณจึงใช้จังหวะนั้นวิ่งหนีหลุดรอดมาได้อย่างปลอดภัย (+25 XP)`,
              icon: '💨',
              soundType: 'coin',
              goldChange: -lost
            };
          }
        }
      ]
    },

    // 3. Holy Blade in the Ancient Stone
    {
      id: 'holy_sword_stone',
      title: 'ดาบเทพเทวะปักบนศิลาโบราณ',
      subtitle: 'The Divine Blade in Stone',
      icon: '✨',
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
              player.atk += 6;
              player.inventory.push({
                id: 'wpn_divine_sun',
                name: 'ดาบสุริยะเทวะ (Divine Sunblade)',
                type: 'weapon',
                cost: 260,
                desc: 'ดาบศักดิ์สิทธิ์เปล่งแสงออโรร่า (+15 ATK, +5 MAG)',
                icon: '⚔️✨'
              });
              return {
                outcomeTitle: 'ดาบศักดิ์สิทธิ์ยอมรับเจ้านาย!',
                outcomeText: `สายฟ้าสีทองสว่างวาบไปทั่วฟ้า! ดาบหลุดออกจากศิลาอย่างง่ายดาย คุณได้รับ [ดาบสุริยะเทวะ] และพลังกายแกร่งกล้าขึ้น (+6 ATK ถาวร)!`,
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
          subtext: 'ปลดปล่อยจิตวิญญาณแห่งดาบ +4 MAG และฟื้น MP เต็ม',
          icon: '🔮',
          resolve: (player) => {
            player.mag += 4;
            player.mp = player.maxMp;
            return {
              outcomeTitle: 'ศาสตร์มนตราแห่งการปลดผนึก!',
              outcomeText: `คุณร่ายมนตร์แกะสลักคลายผนึกโบราณได้อย่างนุ่มนวล วิญญาณภูติดาบมอบพรเวทมนตร์ให้ (+4 MAG ถาวร, MP ฟื้นเต็มเปี่ยม)!`,
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

    // 4. Tavern Bar Brawl
    {
      id: 'tavern_brawl',
      title: 'เรื่องวิวาทในโรงเตี๊ยมกลางดึก',
      subtitle: 'Tavern Bar Brawl',
      icon: '🍺',
      badge: 'โดนหาเรื่องที่บาร์',
      bannerColor: '#d97706',
      description: 'ในบาร์สุราที่คลาคล่ำไปด้วยผู้คน จู่ๆ มีนักรบสาวขี้เมาทำเหยือกเบียร์ตกแตก แล้วหันมาชี้หน้าคุณ "เห้ย! เจ้าหน้าใหม่ เดินเข้ามาจ้องตาหาเรื่องเรอะ?!"',
      choices: [
        {
          text: 'คว่ำโต๊ะแล้วซัดหมัดสั่งสอน!',
          subtext: 'ชนะการตะลุมบอน ได้รับเงินเดิมพัน 110G + EXP',
          icon: '👊',
          resolve: (player) => {
            const gold = 110;
            const xp = 50;
            player.gold += gold;
            player.gainXP(xp);
            return {
              outcomeTitle: 'หมัดเด็ดสยบทั้งบาร์!',
              outcomeText: `คุณซัดหมัดตรงเข้าเป้าอย่างจัง! ทุกคนในร้านส่งเสียงเฮลั่น เจ้าของบาร์ยกเงินเดิมพัน ${gold}G ให้แก่ผู้ชนะ (+${xp} XP)!`,
              icon: '💥',
              soundType: 'fanfare',
              goldChange: gold
            };
          }
        },
        {
          text: 'สั่งเบียร์ถังใหญ่เลี้ยงทั้งบาร์เพื่อเคลียร์ใจ',
          subtext: 'จ่าย 40G กลายเป็นมิตร ได้รับอาหารและข่าวลับ',
          icon: '🍻',
          resolve: (player) => {
            player.gold = Math.max(0, player.gold - 40);
            player.hp = Math.min(player.maxHp, player.hp + 35);
            return {
              outcomeTitle: 'มิตรภาพก่อเกิดจากรสสุรา!',
              outcomeText: `"ชนแก้ววว!" เสียงกึกก้องดังขึ้น นักรบสาวกอดคอขอโทษคุณ และแบ่งปันกับแกล้มแสนอร่อยให้ (+35 HP, ได้รับความนับถือ)!`,
              icon: '🍖',
              soundType: 'coin',
              goldChange: -40,
              hpChange: 35
            };
          }
        },
        {
          text: 'มุดใต้โต๊ะแล้วกระโดดออกทางหน้าต่าง',
          subtext: 'หลบหลีกฉับไว ได้รับความว่องไว +3 SPD',
          icon: '💨',
          resolve: (player) => {
            player.spd += 3;
            return {
              outcomeTitle: 'วิชาตัวเบาพริ้วไหว!',
              outcomeText: `คุณสไลด์ตัวลอดใต้โต๊ะแล้วดีดตัวออกทางหน้าต่างอย่างสวยงามโดยไม่มีใครจับได้ (+3 SPD ถาวร)!`,
              icon: '👟',
              soundType: 'level'
            };
          }
        }
      ]
    },

    // 5. Church Succubus Temptress
    {
      id: 'church_succubus',
      title: 'ซัคคิวบัสสาวในโบสถ์ศักดิ์สิทธิ์',
      subtitle: 'Succubus in the Holy Church',
      icon: '💋',
      badge: 'ซัคคิวบัสจ้องยั่วในโบสถ์',
      bannerColor: '#a855f7',
      description: 'ใต้แสงเทียนวูบวาบของแท่นบูชา ซัคคิวบัสสาวทรงโตสะบัดปีกค้างคาวโผล่ออกมาจากเงามืด ส่งสายตาหวานเยิ้ม "แหม... นักรบรูปงาม มาสารภาพบาปหรืออยากมาหาความสุขกับข้ากันแน่จ๊ะ?"',
      choices: [
        {
          text: 'ตั้งสมาธิสวดมนต์ขับไล่ด้วยพลังศรัทธา',
          subtext: 'ขับไล่สำเร็จ ได้รับ +30 Max HP ถาวร และ 80 EXP',
          icon: '✝️',
          resolve: (player) => {
            player.maxHp += 30;
            player.hp += 30;
            player.gainXP(80);
            return {
              outcomeTitle: 'แสงศักดิ์สิทธิ์ขับไล่ความมืด!',
              outcomeText: `จิตใจที่ไม่หวั่นไหวทำให้เกิดรัศมีศักดิ์สิทธิ์ขับไล่ซัคคิวบัสกรีดร้องหนีไป! ทวยเทพประสาทพรให้ (+30 Max HP ถาวร, +80 EXP)!`,
              icon: '✨',
              soundType: 'fanfare',
              hpChange: 30
            };
          }
        },
        {
          text: 'ยอมรับจุมพิตแลกเปลี่ยนพลังแห่งความมืด',
          subtext: 'เสีย 20 HP แต่ได้รับพลังปีศาจ +5 ATK, +5 MAG',
          icon: '💋',
          resolve: (player) => {
            player.hp = Math.max(10, player.hp - 20);
            player.atk += 5;
            player.mag += 5;
            return {
              outcomeTitle: 'จุมพิตต้องห้ามแห่งรัตติกาล!',
              outcomeText: `ริมฝีปากนุ่มประกบลงมา! แม้จะถูกดูดพลังชีวิตไปบางส่วน (-20 HP) แต่คุณกลับได้พลังเพลิงปีศาจไหลเวียนในร่าง (+5 ATK, +5 MAG ถาวร)!`,
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
              cost: 180,
              desc: 'แหวนอัญมณีสีชมพูเปล่งประกาย (+4 LUK, +5 MAG)',
              icon: '💍✨'
            });
            return {
              outcomeTitle: 'คารมทะลึ่งถูกใจปีศาจสาว!',
              outcomeText: `เธอหัวเราะคิกคักอย่างสนุกสนาน "แหม ร้ายไม่เบานะพ่อหนุ่ม!" เธอโยนแหวนเสน่ห์ประจำตัวให้ก่อนจะบินละลิ่วหายไปในเงา!`,
              icon: '💍',
              soundType: 'coin'
            };
          }
        }
      ]
    },

    // 6. Ancient Dragon Princess Ignis (COMPANION RECRUITMENT!)
    {
      id: 'dragon_princess_lair',
      title: 'รังมังกรโบราณและเจ้าหญิงมังกรสาว',
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
          subtext: 'เธออนุญาต ได้รับทองคำ 250G ทันที!',
          icon: '💰',
          resolve: (player) => {
            const gold = 250;
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
          subtext: 'เรียนรู้เวทมนตร์สายเพลิงมังกร และ +4 ATK',
          icon: '🔥',
          resolve: (player) => {
            player.atk += 4;
            player.fieldSpells.push('zap');
            return {
              outcomeTitle: 'เคล็ดวิชาเพลิงมังกรโบราณ!',
              outcomeText: `อิกนิสเป่าลมหายใจแห่งมังกรใส่ดาบของคุณ ประกายเพลิงลุกโชนอย่างน่าเกรงขาม (+4 ATK ถาวร, ได้รับเวทสายฟ้าเพลิง)!`,
              icon: '⚔️🔥',
              soundType: 'magic'
            };
          }
        }
      ]
    },

    // 7. Cute Slime Girl Spa
    {
      id: 'slime_girl_spa',
      title: 'บ่อน้ำแร่สไลม์สาวน้อย',
      subtitle: 'Cute Slime Girl Spa',
      icon: '🫧',
      badge: 'สไลม์สาวน้อยนุ่มนิ่ม',
      bannerColor: '#38bdf8',
      description: 'สไลม์สีฟ้าใสกลายร่างเป็นสาวน้อยน่ารักกำลังลอยตุ๊บป่องในบ่อน้ำแร่ "ปิ๊ง! นายท่าน~ ตัวเปื้อนฝุ่นมาใช่ไหมคะ? มาแช่น้ำด้วยกันเถอะ นุ่มลื่นสบายตัวที่สุดเลยนะ!"',
      choices: [
        {
          text: 'ลงไปแช่น้ำร่วมกับน้องสไลม์',
          subtext: 'ฟื้นฟู HP และ MP จนเต็มเปี่ยม + ลบล้างสถานะผิดปกติ',
          icon: '🛁',
          resolve: (player) => {
            player.hp = player.maxHp;
            player.mp = player.maxMp;
            player.rustTurns = 0;
            return {
              outcomeTitle: 'นุ่มนิ่ม สบายตัวขั้นสุดยอด!',
              outcomeText: `ผิวกายนุ่มนิ่มของน้องสไลม์ช่วยดูดซับความเหนื่อยล้าจนหมดสิ้น! HP และ MP ฟื้นฟูเต็มเปี่ยม พร้อมลบล้างคำสาปทั้งหมด!`,
              icon: '🫧',
              soundType: 'level',
              hpChange: player.maxHp,
              mpChange: player.maxMp
            };
          }
        },
        {
          text: 'ช่วยน้องสไลม์เก็บเจลลี่วิเศษ',
          subtext: 'ได้รับไอเทมเจลลี่ฟื้นฟู และทอง 60G',
          icon: '🥣',
          resolve: (player) => {
            player.gold += 60;
            player.inventory.push({
              id: 'pot_slime_jelly',
              name: 'เจลลี่สไลม์นุ่มนิ่ม (Slime Berry Jelly)',
              type: 'potion',
              cost: 50,
              desc: 'ฟื้นฟู 60 HP ทันที',
              icon: '🍮'
            });
            return {
              outcomeTitle: 'เจลลี่รสหวานหอม!',
              outcomeText: `น้องสไลม์ยิ้มแฉ่งด้วยความดีใจ มอบเจลลี่รสหวานและเหรียญทอง 60G ให้เป็นรางวัลตอบแทน!`,
              icon: '🍮',
              soundType: 'coin',
              goldChange: 60
            };
          }
        },
        {
          text: 'ลูบหัวน้องสไลม์เบาๆ แล้วเดินทางต่อ',
          subtext: 'ความน่ารักเยียวยาจิตใจ ได้รับ +4 LUK ถาวร',
          icon: '👋',
          resolve: (player) => {
            player.luk += 4;
            return {
              outcomeTitle: 'เยียวยาหัวใจอันเหนื่อยล้า!',
              outcomeText: `น้องสไลม์ทำเสียงดุ๊กดิ๊กอย่างมีความสุข ความน่ารักของเธอทำให้คุณรู้สึกโชคดีไปตลอดทั้งวัน (+4 LUK ถาวร)!`,
              icon: '💖',
              soundType: 'level'
            };
          }
        }
      ]
    },

    // 8. Clumsy Witch Apprentice
    {
      id: 'witch_apprentice_lab',
      title: 'แม่มดน้อยหม้อปรุงยาระเบิด',
      subtitle: 'Clumsy Witch Apprentice',
      icon: '🧙‍♀️',
      badge: 'แม่มดน้อยซุ่มซ่าม',
      bannerColor: '#c084fc',
      description: 'แม่มดน้อยสวมหมวกปีกกว้างสะดุดล้ม หม้อปรุงยาของเธอระเบิดกลายเป็นควันสีชมพูฟุ้งตลบอบอวล "แงงง! น้ำยาเสน่ห์ของข้าหกกระจายหมดแล้ว ช่วยข้าด้วยยย!"',
      choices: [
        {
          text: 'ช่วยเธอเก็บสมุนไพรและปรุงยาใหม่',
          subtext: 'เธอซาบซึ้ง มอบยาวิเศษเพิ่มสเตตัสทุกค่า +1',
          icon: '🌿',
          resolve: (player) => {
            player.atk += 1;
            player.def += 1;
            player.mag += 1;
            player.spd += 1;
            player.luk += 1;
            return {
              outcomeTitle: 'ยาวิเศษสรรพคุณรอบด้าน!',
              outcomeText: `ด้วยความช่วยเหลือของคุณ น้ำยาปรุงออกมาสำเร็จอย่างงดงาม! เธอแบ่งยาวิเศษให้ดื่ม (+1 สเตตัสทุกค่าอย่างถาวร)!`,
              icon: '✨',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'ลองจิบน้ำยาที่เหลืออยู่ในหม้อดู!',
          subtext: 'ลุ้นรับสปินเนอร์เดิน x2 หรือเพิ่ม EXP',
          icon: '🧪',
          resolve: (player) => {
            if (Math.random() > 0.4) {
              player.activeSpinnerMultiplier = 2;
              return {
                outcomeTitle: 'ตัวเบาดั่งปุยเมฆ!',
                outcomeText: `น้ำยารสหวานซ่าซาบซ่าน ร่างกายเบาหวิวเหมือนติดปีก (การเดินครั้งถัดไปจะหมุนสปินเนอร์ 2 ลูก x2)!`,
                icon: '🎲',
                soundType: 'level'
              };
            } else {
              player.gainXP(80);
              return {
                outcomeTitle: 'แสงนีออนเรืองแสง!',
                outcomeText: `น้ำยาทำให้ผิวหนังของคุณเรืองแสงสีชมพูน่ารัก ได้รับความรู้เวทมนตร์ (+80 EXP)!`,
                icon: '💡',
                soundType: 'magic'
              };
            }
          }
        },
        {
          text: 'มอบเงิน 30G ให้เธอไปซื้อวัตถุดิบใหม่',
          subtext: 'ตอบแทนด้วยม้วนคัมภีร์เวทมนตร์สลับมิติ [Swap]',
          icon: '🪙',
          resolve: (player) => {
            player.gold = Math.max(0, player.gold - 30);
            player.fieldSpells.push('swap');
            return {
              outcomeTitle: 'ม้วนคัมภีร์เวทมนตร์โบราณ!',
              outcomeText: `แม่มดน้อยดีใจจนกระโดดกอดคุณ "ขอบคุณนะคะนายท่าน!" เธอมอบม้วนคัมภีร์เวท [สลับมิติ (Swap)] ให้เป็นการตอบแทน!`,
              icon: '📜',
              soundType: 'coin',
              goldChange: -30
            };
          }
        }
      ]
    },

    // 9. Kitsune Shrine Maiden
    {
      id: 'kitsune_shrine_maiden',
      title: 'สาวจิ้งจอกเก้าหางแห่งศาลเจ้า',
      subtitle: 'Kitsune Shrine Maiden',
      icon: '🦊',
      badge: 'มิโกะจิ้งจอกซากุระ',
      bannerColor: '#fb7185',
      description: 'ใต้ต้นซากุระโบราณที่กลีบดอกร่วงโรย สาวจิ้งจอกในชุดมิโกะสีขาวแดงกำลังนั่งจิบชา เธอส่งยิ้มหวานพลางส่ายหางฟูฟ่อง "ยินดีต้อนรับสู่อาณาเขตศักดิ์สิทธิ์จ้ะ นักเดินทาง... สนใจเสี่ยงเซียมซีชะตากับข้าไหม?"',
      choices: [
        {
          text: 'เสี่ยงเซียมซีทำนายดวงชะตา',
          subtext: 'หยิบเซียมซีมหาโชค ได้รับเงิน 150G และ +5 LUK',
          icon: '🥠',
          resolve: (player) => {
            const gold = 150;
            player.gold += gold;
            player.luk += 5;
            return {
              outcomeTitle: 'เซียมซีมหาโชคดีเยี่ยม!',
              outcomeText: `ใบเซียมซีสีทองส่องประกาย! "เจ้ากำลังจะได้ลาภก้อนโต!" เทพเจ้าประทานเงินให้ ${gold}G พร้อมโชคชะตาหนุนนำ (+5 LUK ถาวร)!`,
              icon: '✨',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'นั่งจิบชาและกินขนมโมจิร่วมกับเธอ',
          subtext: 'จิตใจสงบสุข ฟื้นฟู HP 50 และได้รับ +3 DEF',
          icon: '🍵',
          resolve: (player) => {
            player.hp = Math.min(player.maxHp, player.hp + 50);
            player.def += 3;
            return {
              outcomeTitle: 'ชาร้อนและโมจิเลิศรส!',
              outcomeText: `รสชาติชาเขียวหอมละมุนและขนมโมจินุ่มหนึบช่วยเสริมสร้างเกราะคุ้มกันจิตวิญญาณ (+50 HP, +3 DEF ถาวร)!`,
              icon: '🍡',
              soundType: 'level',
              hpChange: 50
            };
          }
        },
        {
          text: 'ขอสัมผัสหางจิ้งจอกขนนุ่มนิ่ม',
          subtext: 'ความนุ่มฟูฟื้นฟู MP เต็ม และมอบเครื่องราง',
          icon: '🦊',
          resolve: (player) => {
            player.mp = player.maxMp;
            player.inventory.push({
              id: 'acc_kitsune_charm',
              name: 'เครื่องรางขนจิ้งจอก (Kitsune Tail Charm)',
              type: 'accessory',
              cost: 160,
              desc: 'เครื่องรางนำโชคแห่งศาลเจ้า (+3 SPD, +4 LUK)',
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

    // 10. Clockwork Girl Alice (Steampunk Biome)
    {
      id: 'steampunk_inventor_girl',
      title: 'ช่างกลสาวอัจฉริยะ อลิซ',
      subtitle: 'Clockwork Girl Alice',
      icon: '⚙️',
      badge: 'สาวน้อยจักรกลไอน้ำ',
      bannerColor: '#f59e0b',
      description: 'เสียงเครื่องจักรและฟันเฟืองไอน้ำดังฉึกฉัก ช่างกลสาวผมทวินเทลในชุดเอี๊ยมเปื้อนน้ำมันกำลังขันน็อตหุ่นยนต์ "ฮึ้บ! การทดลองเครื่องจักรเวทมนตร์ครั้งที่ 99... เอ๊ะ! นายท่านช่วยข้าจับเฟืองตัวนี้หน่อยสิ!"',
      choices: [
        {
          text: 'ช่วยเธอประกอบเครื่องยนต์จักรกลไอน้ำ',
          subtext: 'ได้รับอุปกรณ์ [นาฬิกาจักรกลเร่งเวลา] +3 SPD, +2 ATK',
          icon: '🔧',
          resolve: (player) => {
            player.spd += 3;
            player.atk += 2;
            player.inventory.push({
              id: 'acc_steam_watch',
              name: 'นาฬิกาจักรกลเร่งเวลา (Steam Chronometer)',
              type: 'accessory',
              cost: 190,
              desc: 'เครื่องจักรทองเหลืองเร่งจังหวะการเคลื่อนที่ (+5 SPD)',
              icon: '⏱️'
            });
            return {
              outcomeTitle: 'กลไกจักรกลทำงานสมบูรณ์แบบ!',
              outcomeText: `ฟันเฟืองหมุนวนอย่างราบรื่น อลิซยิ้มกว้างและมอบ [นาฬิกาจักรกลเร่งเวลา] ให้คุณเป็นการตอบแทน (+3 SPD, +2 ATK ถาวร)!`,
              icon: '⚙️',
              soundType: 'fanfare'
            };
          }
        },
        {
          text: 'เติมพลังเวทมนตร์ลงในแกนปฏิกรณ์',
          subtext: 'แกนทำงานเต็มสูบ ได้รับทอง 130G และ 70 EXP',
          icon: '🔋',
          resolve: (player) => {
            const gold = 130;
            const xp = 70;
            player.gold += gold;
            player.gainXP(xp);
            return {
              outcomeTitle: 'แกนพลังงานเวทมนตร์ล้นทะลัก!',
              outcomeText: `พลังงานไอน้ำพวยพุ่งระยิบระยับเป็นทองคำ! เครื่องจักรผลิตเหรียญทองให้คุณ ${gold}G (+${xp} EXP)!`,
              icon: '✨',
              soundType: 'coin',
              goldChange: gold
            };
          }
        },
        {
          text: 'ขอชิ้นส่วนฟันเฟืองทองเหลืองกลับไปเป็นที่ระลึก',
          subtext: 'ได้รับทองคำ 100G จากการขายชิ้นส่วนหายาก',
          icon: '⚙️',
          resolve: (player) => {
            const gold = 100;
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
    }
  ];

  // Pick a suitable event depending on node or completely random
  public getRandomEvent(node: BoardNode): FantasyEventData {
    if (node.type === 'church') {
      return this.events.find(e => e.id === 'church_succubus') || this.events[4];
    }
    if (node.type === 'tavern') {
      return this.events.find(e => e.id === 'tavern_brawl') || this.events[3];
    }
    if (node.biome === 'sakura_shrine') {
      return this.events.find(e => e.id === 'kitsune_shrine_maiden') || this.events[8];
    }
    if (node.biome === 'steampunk') {
      return this.events.find(e => e.id === 'steampunk_inventor_girl') || this.events[9];
    }
    if (node.biome === 'volcano' || node.type === 'boss') {
      return this.events.find(e => e.id === 'dragon_princess_lair') || this.events[5];
    }

    // Default: Pick randomly from all events
    const idx = Math.floor(Math.random() * this.events.length);
    return this.events[idx];
  }
}

export const fantasyEventManager = new FantasyEventManager();
