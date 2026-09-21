const fs = require('fs');
const path = require('path');

// Read PNG header to get width and height
function getPngDimensions(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);
    if (buffer.toString('ascii', 1, 4) === 'PNG') {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
  } catch (e) {}
  return null;
}

const interesting = [
  'GandalfHardcore FREE Warrior/GandalfHardcore Warrior.png',
  'GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime blue.png',
  'GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime green.png',
  'GandalfHardcore Slime Enemy/GandalfHardcore Slime Enemy/Slime red.png',
  'GandalfHardcore FREE NPC/GandalfHardcFREE NPC/GandalfHardcore Goddess NPC.png',
  'GandalfHardcore FREE NPC/GandalfHardcFREE NPC/GandalfHardcore Goddess Portrait 640x640.png',
  'GandalfHardcore Pet companion/GandalfHardcore Pet companion/GandalfHardcore doggy sheet.png',
  'GandalfHardcore Pet companion/GandalfHardcore Pet companion/GandalfHardcore fox sheet.png',
  'GandalfHardcore Pet companion/GandalfHardcore Pet companion/Wisp with outline sheet.png',
  'GandalfHardcore Hp bar/GandalfHardcore Hp bar/Hp bar.png',
  'GandalfHardcore Hp bar/GandalfHardcore Hp bar/red bar.png',
  'GandalfHardcore Hp bar/GandalfHardcore Hp bar/Blue bar.png',
  'GandalfHardcore Hp bar/GandalfHardcore Hp bar/yellow bar.png',
  'GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/Coin.png',
  'GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/Quest marker.png',
  'GandalfHardcore Emojis and Icons/GandalfHardcore Emojis and Icons/GandalfHardcore Emoji.png',
  'GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Animated Sprites/Campfire sheet.png',
  'GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Animated Sprites/GandalfHardcore Portal sheet.png',
  'GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Chests.png',
  'GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Potions.png',
  'GandalfHardcore FREE Platformer Assets/GandalfHardcore FREE Platformer Assets/Angel Statue.png'
];

const root = path.join(__dirname, '..', 'public', 'assets');
interesting.forEach(rel => {
  const p = path.join(root, rel);
  const dims = getPngDimensions(p);
  console.log(`${rel}: ${dims ? `${dims.width}x${dims.height}` : 'NOT FOUND'}`);
});
