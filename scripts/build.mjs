import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../api_src/package.json',import.meta.url));
const {build}=require('esbuild');
const root=fileURLToPath(new URL('../',import.meta.url));
await build({entryPoints:[root+'api_src/browser-client.js'],bundle:true,minify:true,format:'esm',outfile:root+'static/supabase-client.js'});
execFileSync(process.platform==='win32'?'python':'python3',['build.py'],{cwd:root,stdio:'inherit'});
