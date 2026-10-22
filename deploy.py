"""Prepare a reproducible deployment; never change protection or expose credentials."""
import argparse
import json
import shutil
import subprocess
import time
from pathlib import Path

ROOT=Path(__file__).resolve().parent

def prepare():
    if not (ROOT/'public/index.html').exists():
        raise SystemExit('Build the site first: python build.py')
    stage=ROOT/'.deploy-stage'/str(time.time_ns())
    stage.mkdir(parents=True)
    shutil.copytree(ROOT/'public',stage,dirs_exist_ok=True)
    for folder in ('api','lib'):
        shutil.copytree(ROOT/'api_src'/folder,stage/folder)
    for file in ('package.json','package-lock.json'):
        shutil.copyfile(ROOT/'api_src'/file,stage/file)
    (stage/'vercel.json').write_text(json.dumps({'version':2,'framework':None,'buildCommand':None,'installCommand':'npm ci --omit=dev','headers':[{'source':'/(.*)','headers':[{'key':'X-Content-Type-Options','value':'nosniff'},{'key':'Referrer-Policy','value':'no-referrer'}]}]}),encoding='utf-8')
    return stage

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--prepare',action='store_true',help='Prepare files without uploading')
    parser.add_argument('--production',action='store_true',help='Deploy to production instead of preview')
    args=parser.parse_args()
    stage=prepare()
    if args.prepare:
        print(stage)
    else:
        cli=shutil.which('vercel')
        if not cli:raise SystemExit('Vercel CLI is not installed. Prepared files are available at '+str(stage))
        command=[cli,'deploy',str(stage),'--yes']
        if args.production:command.append('--prod')
        subprocess.run(command,check=True)
