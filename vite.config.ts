import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Two pages: the character showcase (index) and the test battle (play).
export default defineConfig({
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        play: resolve(__dirname, 'play.html'),
      },
    },
  },
});
