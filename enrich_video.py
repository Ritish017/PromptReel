import json,re,urllib.request,concurrent.futures as cf
P='data/entries.json';d=json.load(open(P))
def get(x):
    m=re.search(r'status/(\d+)',x.get('post_url',''))
    if not m or x.get('video_full'):return
    try:
        t=json.load(urllib.request.urlopen(urllib.request.Request(f"https://api.fxtwitter.com/status/{m.group(1)}",headers={"User-Agent":"Mozilla/5.0"}),timeout=20))['tweet']
        vs=(t.get('media') or {}).get('videos') or []
        if not vs:return
        v=vs[0];mp=sorted([y for y in v.get('variants',[]) if 'mp4' in y.get('content_type','')],key=lambda y:y.get('bitrate',0))
        if not mp: mp=[{'url':v['url']}]
        pv=[y for y in mp if 500000<=y.get('bitrate',0)<=1500000] or mp[:1]
        hd=[y for y in mp if 1500000<y.get('bitrate',0)<=4000000] or mp[-1:]
        x['video_preview']=pv[0]['url'];x['video_full']=hd[0]['url'];x['duration']=v.get('duration');x['w']=v.get('width');x['h']=v.get('height')
        if v.get('thumbnail_url'):x['image_url']=v['thumbnail_url']
        x['likes']=t.get('likes',x.get('likes',0))
    except Exception as e:print('err',x['id'],e)
with cf.ThreadPoolExecutor(12) as ex:list(ex.map(get,d))
json.dump(d,open(P,'w'),indent=1)
print(len(d),sum(1 for x in d if x.get('video_full')))
