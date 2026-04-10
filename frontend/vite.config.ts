import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { reactClickToComponent } from 'vite-plugin-react-click-to-component'
import tailwindcss from '@tailwindcss/vite'

function locatorBabelPlugin() {
  return {
    name: 'locator-babel-jsx',
    enforce: 'pre' as const,
    async transform(code: string, id: string) {
      const filepath = id.split('?')[0]
      if (/[\\/]node_modules[\\/]/.test(filepath)) return null
      if (!/\.[jt]sx$/i.test(filepath)) return null

      const normalizedFilename = filepath.replace(/\\/g, '/')
      const normalizedCwd = process.cwd().replace(/\\/g, '/')

      const { transformAsync } = await import('@babel/core')

      const result = await transformAsync(code, {
        filename: normalizedFilename,
        cwd: normalizedCwd,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        parserOpts: {
          sourceType: 'module',
          plugins: ['jsx', 'typescript'],
        },
        plugins: [['@locator/babel-jsx/dist', { env: 'development' }]],
      })

      if (!result?.code) return null

      const locatorStoreShim = `
;(() => {
  if (typeof window === 'undefined' || !window.__LOCATOR_DATA__) return;

  const entries = Object.entries(window.__LOCATOR_DATA__);
  for (const [, value] of entries) {
    if (!value || typeof value !== 'object') continue;

    const projectPath = typeof value.projectPath === 'string' ? value.projectPath : '';
    const filePath = typeof value.filePath === 'string' ? value.filePath : '';
    if (!projectPath || !filePath) continue;

    const fullWindows = projectPath + filePath;
    const fullPosix = fullWindows.replace(/\\\\/g, '/');

    if (!window.__LOCATOR_DATA__[fullWindows]) {
      window.__LOCATOR_DATA__[fullWindows] = value;
    }
    if (!window.__LOCATOR_DATA__[fullPosix]) {
      window.__LOCATOR_DATA__[fullPosix] = value;
    }
  }
})();`

      return { code: `${result.code}\n${locatorStoreShim}\n`, map: result.map ?? null }
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [
    ...(command === 'serve' ? [locatorBabelPlugin()] : []),
    react(),
    ...(command === 'serve' ? [reactClickToComponent()] : []),
    tailwindcss(),
  ],
}))
