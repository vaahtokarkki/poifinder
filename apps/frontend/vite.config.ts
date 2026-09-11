import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** The commit being built: CI says so, a local build asks git, and a checkout without git has none */
const buildSha = (() => {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '';
  }
})();

/** When, as the info sheet shows it: 11.9.2026 14:55, in Finnish time whoever builds */
const buildTime = (() => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Helsinki',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return `${Number(parts.day)}.${Number(parts.month)}.${parts.year} ${parts.hour}:${parts.minute}`;
})();

export default defineConfig({
  plugins: [react()],
  base: "/",
  define: {
    __BUILD_TIME__: JSON.stringify(buildTime),
    __BUILD_SHA__: JSON.stringify(buildSha),
  },
});
