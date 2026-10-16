/** Small, project-owned pixel pictograms. Text labels remain real accessible DOM text. */
const shapes: Record<string, string[]> = {
  sword: ['......12','.....122','....122.','1..122..','21122...','.212....','..21....','.21.....'],
  coin: ['..1111..','.122221.','12333221','12323221','12323221','12233321','.122221.','..1111..'],
  gem: ['..1111..','.122331.','12233331','12233331','.122331.','..1231..','...11...','........'],
  shield: ['.111111.','.122331.','.122331.','.122331.','..1231..','..1231..','...11...','........'],
  dice: ['.111111.','12222221','12322321','12222221','12233221','12322321','12222221','.111111.'],
  bag: ['..1111..','..1331..','.111111.','12222221','12333321','12211221','12233221','.111111.'],
  map: ['11..11..','12311211','12322331','12322331','12322331','12311231','111..111','........'],
  book: ['1111111.','12333321','12222221','12333321','12222221','11111111','13333331','1111111.'],
  scroll: ['.111111.','12222221','.133331.','.122221.','.133331.','.122221.','12222221','.111111.'],
  crown: ['1..11..1','21.22.12','22122122','12222221','12333321','11111111','........','........'],
  gear: ['...11...','.112211.','12222221','.121121.','.121121.','12222221','.112211.','...11...'],
  star: ['...11...','...22...','11122111','12233221','.123321.','..1221..','.122221.','.11..11.'],
  wand: ['.....31.','....1331','.....31.','....12..','...12...','..12....','.12.....','12......'],
  home: ['...11...','..1221..','.122221.','12233221','.122221.','.121121.','.121121.','.111111.'],
  save: ['11111111','12233321','12233321','12222221','12111121','12333321','12333321','11111111'],
  search: ['.1111...','122331..','123231..','123231..','.11112..','.....12.','......12','.......1'],
  orb: ['..1111..','.122331.','12233331','12233331','12223321','.122221.','..1111..','........'],
  heart: ['.11..11.','12211221','12322321','12222221','.122221.','..1221..','...11...','........'],
  bolt: ['....111.','...122..','..122...','.122111.','..11221.','...121..','..121...','..11....'],
  note: ['...11111','...12221','...11121','...1..21','.111..21','1221.111','12211221','.11..11.'],
  flag: ['.111111.','.122331.','.122221.','.111111.','.1......','.1......','.1......','111.....'],
  close: ['11....11','121..121','.122221.','..1221..','..1221..','.122221.','121..121','11....11'],
  fire: ['....1...','...121..','..1221..','.122221.','12233221','12333321','.123321.','..1111..'],
  snow: ['1..11..1','.121121.','..1221..','11122111','11122111','..1221..','.121121.','1..11..1'],
  sun: ['...11...','.1.22.1.','..1111..','12133221','12133221','..1111..','.1.22.1.','...11...'],
  moon: ['..1111..','.1221...','1221....','1231....','1231....','12221.11','.1222221','..11111.'],
  potion: ['..1111..','..1331..','..1221..','.122221.','12333321','12233221','12222221','.111111.'],
  skull: ['..1111..','.122221.','12222221','12122121','12222221','.121121.','..1221..','..1111..'],
  hammer: ['....111.','...12221','..122221','...1221.','...121..','..121...','.121....','..1.....'],
  leaf: ['.....111','...11221','..122231','.1223321','1223321.','123321..','.121....','11......'],
  fish: ['..111...','.12221.1','12323212','12222212','.12221.1','..111...','........','........'],
  clock: ['..1111..','.122221.','12213221','12213221','12211321','12222221','.122221.','..1111..'],
  chat: ['.111111.','12222221','12333321','12222221','12333321','.111121.','....11..','........'],
  person: ['..1111..','..1221..','..1221..','...11...','.112211.','12233221','12222221','.111111.'],
  boot: ['..1111..','..1221..','..1221..','..1221..','..122111','..122221','..111111','........'],
  armor: ['11.11.11','12211221','.122221.','.123321.','.122221.','.122221.','.123321.','.111111.'],
  ring: ['...11...','..1331..','...11...','.111111.','121..121','121..121','.122221.','..1111..'],
};
const symbols: Record<string, [string, string, string]> = {
  '⚔️': ['sword', '#b8cfce', '#f5e3b3'], '🗡️': ['sword', '#b8cfce', '#f5e3b3'],
  '🪙': ['coin', '#c39b54', '#f2d78e'], '💎': ['gem', '#59a7ab', '#b5eadb'],
  '🛡️': ['shield', '#7a9d9c', '#e2d9ab'], '🎲': ['dice', '#c9bfa5', '#f9edcb'],
  '🦺': ['armor', '#829da3', '#dae0c7'], '💍': ['ring', '#b99b60', '#d2ddd0'],
  '👁️': ['search', '#839f9e', '#e3d4ad'], '🎨': ['gem', '#a48d9c', '#ded1b8'],
  '🎒': ['bag', '#93704c', '#d3ac76'], '🗺️': ['map', '#acb488', '#eee0ac'],
  '📜': ['scroll', '#bfac7b', '#f5e5b4'], '👑': ['crown', '#c49b4f', '#f2d78e'],
  '⚙️': ['gear', '#81999c', '#c4d6cf'], '✨': ['star', '#bdab65', '#fff1bd'],
  '⭐': ['star', '#bdab65', '#fff1bd'], '🔮': ['orb', '#8c77a9', '#d8bfec'],
  '🌀': ['orb', '#639fa5', '#b2e2df'], '🪄': ['wand', '#8c77a9', '#ebdcba'],
  '🏰': ['home', '#a7a28c', '#ded4b2'], '🏡': ['home', '#a7a28c', '#ded4b2'],
  '💾': ['save', '#779497', '#d0d5b8'], '🔍': ['search', '#839f9e', '#e3d4ad'],
  '🎯': ['search', '#ba8e68', '#f1dca7'], '⚡': ['bolt', '#cfad65', '#fff0bf'],
  '🎵': ['note', '#7aa6a6', '#d1ddbd'], '🚩': ['flag', '#ad716c', '#ecd0a0'],
  '❤️': ['heart', '#b56c72', '#edaba3'], '❌': ['close', '#b47777', '#e5c6af'],
  '📂': ['book', '#9ba789', '#e8d8ab'], '🌐': ['orb', '#639fa5', '#b2e2df'],
  '🏛️': ['home', '#a7a28c', '#ded4b2'], '📊': ['book', '#9ba789', '#e8d8ab'],
  '🔥': ['fire', '#bc7953', '#f3d494'], '💥': ['star', '#bc7953', '#f3d494'],
  '🌟': ['star', '#bdab65', '#fff1bd'], '❄️': ['snow', '#84b6bd', '#def0df'],
  '☀️': ['sun', '#c5a15c', '#f5ddb0'], '🌤️': ['sun', '#c5a15c', '#f5ddb0'],
  '🌅': ['sun', '#b98369', '#f3d3a5'], '🌇': ['sun', '#b98369', '#f3d3a5'],
  '🌙': ['moon', '#9aa9bd', '#dedec6'], '🌑': ['moon', '#778597', '#bac3ba'],
  '🧪': ['potion', '#6aa899', '#c5e2bc'], '💧': ['potion', '#6aa3b2', '#c1ded6'],
  '💀': ['skull', '#b3b8a7', '#eee2c1'], '☠️': ['skull', '#b3b8a7', '#eee2c1'],
  '😈': ['skull', '#9b7da5', '#d4b8c6'], '👹': ['skull', '#ab7776', '#e9bea3'],
  '🔨': ['hammer', '#8b9d9d', '#d2d9c0'], '⛏️': ['hammer', '#8b9d9d', '#d2d9c0'],
  '🔧': ['hammer', '#8b9d9d', '#d2d9c0'], '🌿': ['leaf', '#7f9f76', '#ccdc9c'],
  '🌱': ['leaf', '#7f9f76', '#ccdc9c'], '🍀': ['leaf', '#7f9f76', '#ccdc9c'],
  '🍃': ['leaf', '#7f9f76', '#ccdc9c'], '🐟': ['fish', '#6e9fa4', '#d0dfc8'],
  '🎣': ['fish', '#6e9fa4', '#d0dfc8'], '⏳': ['clock', '#a9986b', '#e9d7a4'],
  '⌛': ['clock', '#a9986b', '#e9d7a4'], '⏱️': ['clock', '#a9986b', '#e9d7a4'],
  '💬': ['chat', '#8eaaa4', '#d3dfc6'], '👤': ['person', '#8eaaa4', '#d3dfc6'],
  '👥': ['person', '#8eaaa4', '#d3dfc6'], '👟': ['boot', '#957a5e', '#d8bb8b'],
  '👢': ['boot', '#957a5e', '#d8bb8b'], '💰': ['coin', '#c39b54', '#f2d78e'],
  '💖': ['heart', '#b8758e', '#ecc0bc'], '💜': ['heart', '#9d81ae', '#d7c0d2'],
  '🖤': ['heart', '#737e8b', '#b2c0b9'], '📦': ['bag', '#93704c', '#d3ac76'],
  '🎁': ['bag', '#b2935b', '#e6c68b'], '🏆': ['crown', '#c49b4f', '#f2d78e'],
  '🥇': ['coin', '#c49b4f', '#f2d78e'], '🥈': ['coin', '#9baeb1', '#dce0cb'],
  '🥉': ['coin', '#a47c58', '#d7b68e'], '📖': ['book', '#9ba789', '#e8d8ab'],
  '📋': ['scroll', '#bfac7b', '#f5e5b4'], '📰': ['scroll', '#bfac7b', '#f5e5b4'],
  '🛍️': ['bag', '#93704c', '#d3ac76'], '🛒': ['bag', '#93704c', '#d3ac76'],
  '⛪': ['home', '#a7a28c', '#ded4b2'], '🏢': ['home', '#a7a28c', '#ded4b2'],
  '🏘️': ['home', '#a7a28c', '#ded4b2'], '🏪': ['home', '#a7a28c', '#ded4b2'],
};

function iconUrl(shape: string, mid: string, light: string): string {
  const colors: Record<string, string> = { '1': '#172a32', '2': mid, '3': light };
  const rects = shapes[shape].flatMap((row, y) => Array.from(row, (p, x) =>
    colors[p] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[p]}"/>` : ''
  )).join('');
  return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">${rects}</svg>`)}")`;
}

/** Replaces only known pictograms, never names, input values, labels or event handlers. */
export function installPixelIcons(): () => void {
  for (const [key, value] of Object.entries(symbols)) if (key.endsWith('\uFE0F')) symbols[key.slice(0, -1)] = value;
  const urls = new Map(Object.entries(symbols).map(([key, spec]) => [key, iconUrl(...spec)]));
  const pattern = new RegExp(Object.keys(symbols).sort((a, b) => b.length - a.length).join('|'), 'gu');
  const decorate = (root: Node) => {
    if (root instanceof Element && root.closest('script,style,textarea,select,[data-pixel-icon]')) return;
    const nodes: Text[] = [];
    if (root.nodeType === Node.TEXT_NODE) nodes.push(root as Text);
    else {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) nodes.push(node as Text);
    }
    for (const node of nodes) {
      if (!node.parentElement || node.parentElement.closest('script,style,textarea,select,[data-pixel-icon]')) continue;
      const value = node.data;
      pattern.lastIndex = 0;
      if (!pattern.test(value)) continue;
      pattern.lastIndex = 0;
      const fragment = document.createDocumentFragment();
      let offset = 0;
      for (const match of value.matchAll(pattern)) {
        fragment.append(value.slice(offset, match.index));
        const icon = document.createElement('span');
        icon.className = 'pixel-icon';
        icon.dataset.pixelIcon = match[0];
        // Preserve the existing accessible name, including selectors used by automation.
        icon.setAttribute('role', 'img');
        icon.setAttribute('aria-label', match[0]);
        icon.style.backgroundImage = urls.get(match[0])!;
        fragment.append(icon);
        offset = match.index! + match[0].length;
      }
      fragment.append(value.slice(offset));
      node.replaceWith(fragment);
    }
  };
  decorate(document.body);
  const observer = new MutationObserver(records => {
    const roots = new Set<Node>();
    for (const record of records) {
      if (record.type === 'characterData') roots.add(record.target);
      else for (const node of record.addedNodes) roots.add(node);
    }
    for (const root of roots) if (root.isConnected) decorate(root);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  return () => observer.disconnect();
}
