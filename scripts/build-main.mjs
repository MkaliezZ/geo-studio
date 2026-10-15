import {build} from 'esbuild';
await build({entryPoints:['src/main/main.ts'],bundle:true,platform:'node',target:'node22',format:'esm',outfile:'dist/main/main.js',external:['electron'],banner:{js:"import {createRequire} from 'node:module'; const require=createRequire(import.meta.url);"}});
await build({entryPoints:['src/main/preload.ts'],bundle:true,platform:'node',format:'cjs',outfile:'dist/main/preload.cjs',external:['electron']});
