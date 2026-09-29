import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true,
    open: false
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('FantasyEventManager')) {
            return 'events-data';
          }
          if (id.includes('BoardMap') || id.includes('MonsterDatabase')) {
            return 'game-world';
          }
          if (id.includes('Painter') || id.includes('CustomIsometric') || id.includes('PixelSpriteGenerator')) {
            return 'engine-art';
          }
        }
      }
    }
  }
});

