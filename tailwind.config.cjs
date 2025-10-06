const { defineConfig } = require('vite');
const tailwindcss = require('@tailwindcss/vite');

module.exports = defineConfig({
  plugins: [
    tailwindcss(),
  ],
});