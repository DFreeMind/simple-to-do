import { readFile } from 'node:fs/promises'

const expectedVersion = process.argv[2] || process.env.RELEASE_VERSION || ''
const root = new URL('../', import.meta.url)
const readText = (path) => readFile(new URL(path, root), 'utf8')
const packageJson = JSON.parse(await readText('package.json'))
const tauriConfig = JSON.parse(await readText('src-tauri/tauri.conf.json'))
const workflow = await readText('.github/workflows/release.yml')
const errors = []

if (packageJson.version !== tauriConfig.version) {
  errors.push(`版本不一致：package.json=${packageJson.version}，tauri.conf.json=${tauriConfig.version}`)
}
if (expectedVersion && expectedVersion !== packageJson.version) {
  errors.push(`请求发布 ${expectedVersion}，但当前应用版本是 ${packageJson.version}`)
}
for (const required of [
  'tagName: v__VERSION__',
  'releaseName: __VERSION__',
  'releaseDraft: true',
  'args: --bundles nsis',
  'updaterJsonPreferNsis: true',
  'releaseAssetNamePattern: simple-to-do_[version]_[arch][setup].[ext]'
]) {
  if (!workflow.includes(required)) errors.push(`发布工作流缺少约束：${required}`)
}

if (errors.length) {
  console.error('发布前检查未通过：')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log(`发布前检查通过：v${packageJson.version}`)
