/** Build the host half as ESM with every dependency external. */
import { build } from 'esbuild'

const watch = process.argv.includes('--watch')

const options = {
  entryPoints: ['src/index.ts'],
  outfile: 'lib/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
}

if (watch) {
  const { context } = await import('esbuild')
  const ctx = await context(options)
  await ctx.watch()
  console.log('[build:host] watching')
}
else {
  await build(options)
}
