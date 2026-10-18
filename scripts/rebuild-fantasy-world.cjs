// Authored regional topology. Run explicitly when redesigning the baseline world.
const fs = require('node:fs');
const regions = [
  ['grass',40,40,0,'solaria','Solaria Meadows','ทุ่งราชธานีและหมู่บ้านกังหัน'],
  ['castle',8,40,1,'solaria','Crownwall','นครกำแพงขาวและสวนหลวง'],
  ['forest',40,8,0,'emerald','Elderwood','มหาพฤกษาและซากนครเอลฟ์'],
  ['waterfall_forest',72,8,1,'emerald','Mistfall','หุบเขาน้ำตกและสะพานเถาวัลย์'],
  ['fairy_grove',104,8,1,'emerald','Faelight','ป่าเห็ดเรืองแสงและหมู่บ้านแฟรี่'],
  ['sakura_shrine',104,40,2,'emerald','Hanamori','เขาศักดิ์สิทธิ์และศาลเจ้าซากุระ'],
  ['snow',8,8,3,'frostpeak','Frostpeak','ป่าสนหิมะและป้อมเหมันต์'],
  ['steampunk',8,72,1,'solaria','Brasshaven','นครทองเหลืองและอู่เรือเหาะ'],
  ['desert',40,72,0,'sunfire','Suncourt','โอเอซิสและนครหินทราย'],
  ['volcano',72,72,2,'sunfire','Emberforge','ป้อมหินบะซอลต์และธารลาวา'],
  ['coral',104,72,-1,'emerald','Tidereach','อาณาจักรปะการังและวิหารสมุทร'],
  ['celestial',136,40,5,'celestial','Aurelia Skies','หมู่เกาะวิหารลอยฟ้า'],
  ['cavern',40,104,-2,'abyss','Deepwater Grotto','ถ้ำหินปูนและทะเลสาบใต้พิภพ'],
  ['crystal_cavern',72,104,-2,'abyss','Prismdeep','นครผลึกและน้ำตกใต้ดิน'],
  ['abyss',104,104,-3,'abyss','Duskreach','มหาวิหารทมิฬและหุบเหวม่วง']
];
const realmNames={solaria:'มหาอาณาจักรโซลาเรีย',emerald:'แดนมรกตพันปี',frostpeak:'อาณาจักรยอดเขาเหมันต์',sunfire:'ดินแดนตะวันอัคคี',celestial:'อาณาจักรนภาสวรรค์',abyss:'อาณาจักรใต้พิภพ'};
const types = new Map([[0,'town'],[5,'shop_item'],[10,'church'],[15,'town'],[19,'blue'],[22,'shop_weapon'],[23,'home'],[26,'fishing'],[28,'isekai_event'],[30,'guild'],[34,'shop_magic'],[38,'town'],[41,'tavern'],[44,'dark_gate'],[46,'boss'],[47,'vault']]);
const nodes=[]; const groups=[];
const connect=(a,b)=>{if(!a.neighbors.includes(b.id))a.neighbors.push(b.id);if(!b.neighbors.includes(a.id))b.neighbors.push(a.id);};
for(const [biome,cx,cy,z,realm,label,thai]of regions){
  const group=[];
  for(let row=0;row<6;row++)for(let col=0;col<8;col++){
    const index=row*8+col,type=types.get(index)|| (index%11===0?'mystery_chest':index%9===0?'red':'empty');
    const bend=['forest','waterfall_forest','fairy_grove','sakura_shrine'].includes(biome)?Math.round(Math.sin(row*.9)*2):biome==='desert'?Math.abs(row-2):0;
    const rise=['volcano','cavern','crystal_cavern','coral'].includes(biome)?Math.round(Math.sin(col*.8)*2):0;
    const node={id:nodes.length,gx:cx+col*3+bend,gy:cy+row*3+rise,gz:z,type,name:`${label} · ${type==='empty'?'Trail':type.replaceAll('_',' ')} ${index+1}`,biome,neighbors:[],realmId:realm,realmName:realmNames[realm],subRegionName:thai,weather:biome==='snow'?'snow':['desert','volcano'].includes(biome)?'heatwave':['abyss','cavern','crystal_cavern'].includes(biome)?'miasma':biome==='waterfall_forest'?'rain':'sunny',regionKey:biome};
    if(type==='home')node.homeData={ownerId:0,ownerName:'',level:1,purchasePrice:600,visitorsCount:0,tollFee:0};
    if(type==='town'){
      const tier=realm==='solaria'?1:realm==='emerald'?2:realm==='frostpeak'?3:realm==='sunfire'?4:realm==='celestial'?5:4;
      const hp=80+tier*35;node.townData={name:node.name,level:1,baseValue:400+tier*120,taxYield:40+tier*10,ownerId:null,isOccupiedByMonster:true,monsterName:biome==='snow'?'Yeti Maiden Borealia':biome==='volcano'?'Dragon Princess Ignis':'Slime Princess Aurelia',monsterHp:hp,monsterMaxHp:hp,monsterAtk:10+tier*5,monsterDef:5+tier*3};
    }
    group.push(node);nodes.push(node);
  }
  // Winding horizontal trails with alternating end turns; three cross streets form loops.
  for(let row=0;row<6;row++){
    for(let col=0;col<7;col++)connect(group[row*8+col],group[row*8+col+1]);
    if(row<5){const end=row%2?0:7;connect(group[row*8+end],group[(row+1)*8+end]);
      for(const col of [2,5])if((row+col)%2===0)connect(group[row*8+col],group[(row+1)*8+col]);}
  }
  groups.push(group);
}
// Regional links are real playable steps: short bridges, mountain passes and tunnel approaches.
const links=[[0,1],[0,2],[2,3],[3,4],[4,5],[1,6],[1,7],[0,8],[8,9],[9,10],[5,10],[5,11],[8,12],[12,13],[13,14],[9,13],[10,14],[3,5],[7,8]];
for(const [ia,ib]of links){
  let pair;let best=Infinity;
  for(const a of groups[ia])for(const b of groups[ib]){const d=Math.hypot(a.gx-b.gx,a.gy-b.gy);if(d<best){best=d;pair=[a,b];}}
  const [a,b]=pair,steps=Math.ceil(Math.max(Math.abs(b.gx-a.gx),Math.abs(b.gy-a.gy))/5);let previous=a;
  const routeKind=[ia,ib].includes(11)?'skyway':[ia,ib].some(i=>i>=12)?'tunnel':[ia,ib].includes(10)?'causeway':'bridge';
  for(let i=1;i<steps;i++){
    const t=i/steps,source=t<.5?a:b;
    const node={...source,id:nodes.length,gx:Math.round(a.gx+(b.gx-a.gx)*t),gy:Math.round(a.gy+(b.gy-a.gy)*t),gz:Math.round(a.gz+(b.gz-a.gz)*t),type:'empty',name:`${regions[ia][5]} — ${regions[ib][5]} · ${routeKind}`,neighbors:[],isGrandBridge:true,routeKind};
    delete node.townData;delete node.homeData; nodes.push(node);connect(previous,node);previous=node;
  }
  connect(previous,b);
}
const path='src/game/BoardMap.ts';const old=fs.readFileSync(path,'utf8');
const marker=old.indexOf('// Rebuilt fantasy world');
const prefix=old.slice(0,marker>=0?marker:old.indexOf('// ========================================================================================='));
fs.writeFileSync(path,prefix+'// Rebuilt fantasy world: 15 authored regions, winding routes and explicit regional crossings.\n// Generated by scripts/rebuild-fantasy-world.cjs; runtime mutations use a deep clone.\nexport const DOKAPON_NODES: BoardNode[] = '+JSON.stringify(nodes,null,2)+';\n');

const dungeonConfigs=[['DUNGEON_CATACOMBS_NODES',1000,140,140,'abyss','abyss','Catacombs','สุสานมหาวิหารใต้พิภพ'],['DUNGEON_VOLCANO_NODES',1100,200,200,'volcano','sunfire','Ember Sanctum','มหาโรงหลอมอัคคี'],['DUNGEON_FROZEN_NODES',1200,260,260,'snow','frostpeak','Frozen Labyrinth','พระราชวังเขาวงกตเหมันต์']];
const dungeons=[];
for(const [symbol,start,cx,cy,biome,realm,label,thai]of dungeonConfigs){
  const group=[];
  for(let i=0;i<36;i++){
    const room=Math.floor(i/6),roomRow=Math.floor(room/2),roomCol=roomRow%2?1-room%2:room%2;
    const row=roomRow*10+Math.floor(i%6/3)*3,col=roomCol*12+i%3*3,id=start+(i<6?i:i===35?6:i+1);
    const type=i===0?'church':i===35?'isekai_event':i===30?'boss':i%9===0?'vault':i%7===0?'mystery_chest':i%5===0?'red':i%4===0?'blue':'empty';
    group.push({id,gx:cx+col,gy:cy+row,gz:-3,type,name:`${label} · ${i===35?'Surface Exit':i===0?'Entrance':i===30?'Guardian Hall':`Chamber ${room+1} · ${i%6+1}`}`,biome,neighbors:[],realmId:realm,realmName:thai,subRegionName:`${thai} · ห้องที่ ${room+1}`,weather:biome==='snow'?'snow':biome==='volcano'?'heatwave':'miasma',regionKey:start===1000?'dungeon_catacombs':start===1100?'dungeon_volcano':'dungeon_ice'});
  }
  for(let room=0;room<6;room++){
    const ring=[0,1,2,5,4,3,0].map(i=>room*6+i);
    for(let i=0;i<6;i++)connect(group[ring[i]],group[ring[i+1]]);
  }
  for(const [a,b]of [[2,6],[11,14],[15,23],[21,24],[26,30],[3,18],[9,12]])connect(group[a],group[b]);
  dungeons.push({symbol,nodes:group});
}
const dungeonPath='src/game/DungeonSystem.ts',dungeonOld=fs.readFileSync(dungeonPath,'utf8');
const imports=dungeonOld.slice(0,dungeonOld.indexOf('export const DUNGEON_CATACOMBS_NODES'));
fs.writeFileSync(dungeonPath,imports+dungeons.map(d=>`export const ${d.symbol}: BoardNode[] = ${JSON.stringify(d.nodes,null,2)};`).join('\n\n')+'\n\n'+dungeonOld.slice(dungeonOld.indexOf('export class DungeonSystem')));
fs.mkdirSync('docs/art-review/world-rebuild-v1',{recursive:true});
fs.writeFileSync('docs/art-review/world-rebuild-v1/layout.json',JSON.stringify({surfaceNodes:nodes.length,dungeonNodes:dungeons.map(d=>({name:d.symbol,count:d.nodes.length})),regions:regions.map(([biome,gx,gy,gz,realm,name,description])=>({biome,gx,gy,gz,realm,name,description})),connections:links.map(([a,b])=>[regions[a][0],regions[b][0]])},null,2));
console.log(`${nodes.length} surface nodes, ${dungeons.length*36} dungeon nodes, ${links.length} regional connections`);
