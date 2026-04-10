import fs from 'node:fs'
import path from 'node:path'

const runtimeTsconfigPath = path.resolve('node_modules', '@locator', 'runtime', 'tsconfig.json')
const babelTsconfigPath = path.resolve('node_modules', '@locator', 'babel-jsx', 'tsconfig.json')
const devConfigBasePath = path.resolve('node_modules', '@locator', 'dev-config', 'tsconfig.base.json')

function patchJson(filePath, patcher) {
  if (!fs.existsSync(filePath)) return false
  const raw = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)
  const changed = patcher(data)
  if (changed) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  }
  return changed
}

let changed = false

changed = patchJson(runtimeTsconfigPath, (config) => {
  config.compilerOptions = config.compilerOptions || {}
  let localChanged = false

  if (config.compilerOptions.moduleResolution !== 'node16') {
    config.compilerOptions.moduleResolution = 'node16'
    localChanged = true
  }

  if (config.compilerOptions.ignoreDeprecations !== '6.0') {
    config.compilerOptions.ignoreDeprecations = '6.0'
    localChanged = true
  }

  return localChanged
}) || changed

changed = patchJson(babelTsconfigPath, (config) => {
  config.compilerOptions = config.compilerOptions || {}
  let localChanged = false

  if (config.extends === '@locator/dev-config/tsconfig.base.json') {
    config.extends = '../dev-config/tsconfig.base.json'
    localChanged = true
  }

  if (config.compilerOptions.rootDir !== 'src') {
    config.compilerOptions.rootDir = 'src'
    localChanged = true
  }

  if (config.compilerOptions.ignoreDeprecations !== '6.0') {
    config.compilerOptions.ignoreDeprecations = '6.0'
    localChanged = true
  }

  return localChanged
}) || changed

changed = patchJson(devConfigBasePath, (config) => {
  config.compilerOptions = config.compilerOptions || {}
  if (config.compilerOptions.ignoreDeprecations === '6.0') return false
  config.compilerOptions.ignoreDeprecations = '6.0'
  return true
}) || changed

if (!changed) {
  console.log('locator tsconfig files already patched')
  process.exit(0)
}

console.log('patched locator tsconfig files')
