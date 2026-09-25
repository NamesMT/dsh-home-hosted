/**
 * Build the browser half.
 *
 * A client package is loaded by `window.__ModuleLoader__.load({ id, factory })`,
 * so the bundle is a CommonJS module evaluated inside that factory. Everything
 * the client tree already provides (react, other client packages) stays a
 * `require` call: the factory's own resolver answers it.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, unlinkSync } from 'node:fs'
import { build } from 'esbuild'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
mkdirSync('lib', { recursive: true })

await build({
  entryPoints: ['src/client/index.tsx'],
  outfile: 'lib/client.bundle.js',
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  target: 'es2022',
  jsx: 'automatic',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  define: { 'process.env.NODE_ENV': '"production"' },
  minify: true,
  logLevel: 'info',
})

const bundle = readFileSync('lib/client.bundle.js', 'utf8')
writeFileSync(
  'lib/client.js',
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(pkg.name)}, factory: (require) => {\n`
  + 'var module = { exports: {} }; var exports = module.exports;\n'
  + `${bundle}\n`
  + 'return module.exports; } });\n',
)
// The wrapped bundle is the artifact; the intermediate must not ship.
if (existsSync('lib/client.bundle.js')) unlinkSync('lib/client.bundle.js')
console.log('[build:client] lib/client.js')
