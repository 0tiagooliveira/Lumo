#!/usr/bin/env python3
"""Read only advertised public image-sitemap exports (no crawling product pages).
Preserve external source URL and EAN; do not assume reuse permission.
"""
import csv,gzip,io,json,re,urllib.request,urllib.error,xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urlparse
UA="LumoResearch/1.0 (public sitemap image metadata only)"
SOURCES=["https://www.precomelhor.com.br","https://global.si5.com.br","https://cadastroproduto.com.br"]
DEST=Path("sitemap_results");DEST.mkdir(exist_ok=True)
MAX_BYTES=15000000
def fetch(url):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"application/xml,text/plain,*/*"})
    with urllib.request.urlopen(req,timeout=25) as r:
        data=r.read(MAX_BYTES+1)
    if len(data)>MAX_BYTES:raise ValueError("large sitemap")
    if url.endswith(".gz"):data=gzip.decompress(data)
    return data
def loctext(node,tag):
    for c in node:
        if c.tag.rsplit("}",1)[-1]==tag:
            return (c.text or "").strip()
    return ""
def child_images(url):
    data=fetch(url)
    try:root=ET.fromstring(data)
    except Exception: return [],[],len(data)
    links=[];rows=[]
    for el in root:
        if el.tag.rsplit("}",1)[-1]=="sitemap":
            x=loctext(el,"loc")
            if x:links.append(x)
        elif el.tag.rsplit("}",1)[-1]=="url":
            loc=loctext(el,"loc")
            ean=(re.findall(r"(?<!\\d)\\d{8,14}(?!\\d)",loc) or [""])[-1]
            for img in el:
                if img.tag.rsplit("}",1)[-1]=="image":
                    u=loctext(img,"loc")
                    if ean and u.startswith("https://"):rows.append([ean,u,loc,url])
    return links,rows,len(data)
def run():
    missing=set()
    with open("input/master.csv",encoding="utf-8-sig",newline="") as f:
        for x in csv.DictReader(f):
            if not x.get("imagem_url"):missing.add(x["ean_gtin"])
    stats={};found={}
    for site in SOURCES:
        info={"site":site,"sitemap_sources":[]}
        try:
            robot=fetch(site+"/robots.txt").decode("utf-8","replace")
            advertised=re.findall(r"(?im)^Sitemap:\\s*(https?://\\S+)",robot)
            info["robots_advertised"]=advertised[:10]
            paths=advertised[:3] or [site+"/sitemap.xml"]
            for path in paths:
                try:
                    idx,im,nbytes=child_images(path)
                    info["sitemap_sources"].append({"url":path,"bytes":nbytes,"children":len(idx),"images":len(im)})
                    for row in im:
                        if row[0] in missing and row[0] not in found:found[row[0]]=row
                    for child in idx[:3]:
                        try:
                            _,rows,b=child_images(child)
                            info["sitemap_sources"].append({"url":child,"bytes":b,"images":len(rows)})
                            for row in rows:
                                if row[0] in missing and row[0] not in found:found[row[0]]=row
                        except Exception as e:info["child_error"]=repr(e)[:180]
                except Exception as e:info.setdefault("errors",[]).append(repr(e)[:200])
        except Exception as e:info["error"]=repr(e)[:200]
        stats[site]=info
        print("FONTE SITEMAP",json.dumps(info,ensure_ascii=False)[:3000],flush=True)
    with (DEST/"novas_urls_sitemaps.csv").open("w",newline="",encoding="utf-8-sig") as f:
        w=csv.writer(f);w.writerow(["ean_gtin","imagem_url","ficha_url","fonte_sitemap"]);w.writerows(found.values())
    stats["novas_urls"]=len(found)
    (DEST/"resultado.json").write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding="utf-8")
    print("SITEMAP NOVAS FOTOS",len(found),flush=True)
if __name__=="__main__":run()
