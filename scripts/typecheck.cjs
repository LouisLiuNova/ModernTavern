// vue-tsc's CLI patches fs.readFileSync to load TypeScript. Bun's module loader
// bypasses that hook. Use the same official Volar/Vue program APIs directly.
const ts = require('typescript')
const vue = require('@vue/language-core')
const { proxyCreateProgram } = require('@volar/typescript/lib/node/proxyCreateProgram')
const path = require('path')
const parsed = vue.createParsedCommandLine(ts, ts.sys, path.resolve('.nuxt/tsconfig.app.json'))
const createProgram = proxyCreateProgram(ts, ts.createProgram, (ts, options) => ({
  languagePlugins: [vue.createVueLanguagePlugin(ts, options.options, parsed.vueOptions, id => id)],
}))
const options = { ...parsed.options, noEmit: true, allowNonTsExtensions: true }
const program = createProgram({ rootNames: parsed.fileNames, options, host: ts.createCompilerHost(options) })
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
if (diagnostics.length) {
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: f => f, getCurrentDirectory: ts.sys.getCurrentDirectory, getNewLine: () => '\n' }))
  process.exit(1)
}
console.log(`Vue / TypeScript: ${parsed.fileNames.length} files checked with Bun ${Bun.version}.`)
