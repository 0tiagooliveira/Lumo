#!/usr/bin/env python3
"""EAN photos batch: preserves existing URLs, enriches from Open Food Facts public dump.
Runs only in a CI job, never writes directly to production. No invented image URLs.
"""
import csv,gzip,io,json,os,re,time,urllib.request,urllib.error
from collections import Counter
from pathlib import Path
from urllib.parse import urlparse

SOURCE_IDS=["1wQP-EtGR09sjriARSp64G-BecGEhrJHc","1Ozw78_Fn1t6LxBoie1OAZUL2fO87Rnga"]
OFF_DUMP="https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
UA="LumoCatalogPhotoEnrichment/1.0 (https://github.com/0tiagooliveira/Lumo; EAN-only)"
OUT=Path("output")
OUT.mkdir(exist_ok=True)
def fetch(url, timeout=90):
    req=urllib.request.Request(url,headers={"User-Agent":UA,"Accept":"*/*"})
    return urllib.request.urlopen(req,timeout=timeout)
def master():
    for fid in SOURCE_IDS:
        for url in [
           "https://drive.usercontent.google.com/download?id="+fid+"&export=download&confirm=t",
           "https://drive.google.com/uc?export=download&id="+fid
        ]:
            try:
                with fetch(url,45) as r:
                    raw=r.read(9_000_000)
                text=raw.decode("utf-8-sig",errors="replace")
                if not text.startswith("ean_gtin,nome,") or text.count("\n") < 13000:continue
                rows=list(csv.DictReader(io.StringIO(text)))
                if len(rows)!=13113:continue
                print("MASTER CARREGADO",len(rows),"de",url.split('?')[0],flush=True)
                return rows
            except Exception as e:print("Fonte Drive indisponivel:",type(e).__name__,str(e)[:120],flush=True)
    raise RuntimeError("Master 13.113 do Drive nao acessivel. Nao usamos base alternativa incompleta.")
def norm(s):return set(re.findall(r"[a-z0-9]+",__import__('unicodedata').normalize("NFKD",str(s or "")).encode("ascii","ignore").decode().lower()))-{"e","de","da","do","g","kg","l","ml","tipo","com","sem","pacote","unidade","caixa"}
def photo_url(u):
    u=str(u or "").strip()
    p=urlparse(u)
    return u if p.scheme=="https" and p.hostname and (p.path.lower().endswith((".jpg",".jpeg",".png",".webp",".avif")) or p.hostname.endswith("openfoodfacts.org")) else ""
def get_code(s):return re.sub(r"\D","",str(s or ""))
def off(row,index,fields,stats):
    parts=row.rstrip("\r\n").split("\t")
    if len(parts)<2:return
    code=get_code(parts[index["code"]])
    obj=fields.get(code)
    if obj is None or obj.get("imagem_url"):return
    def field(n):
        i=index.get(n)
        return parts[i].strip('"') if i is not None and len(parts)>i else ""
    url=photo_url(field("image_front_url") or field("image_url"))
    if not url:return
    product=field("product_name") or field("product_name_pt") or field("product_name_en")
    brand=field("brands")
    # Code is exact; avoid blatant name mismatch but allow incomplete descriptions.
    a=norm(obj.get("nome"))|norm(obj.get("marca"))
    b=norm(product)|norm(brand)
    common=a&b
    if len(a)>=3 and len(b)>=3 and not common:
        stats["nome_divergente"]+=1;return
    obj["imagem_url"]=url
    obj["fonte_foto"]="Open Food Facts (EAN exato)"
    obj["nome_na_fonte"]=product
    obj["status_foto"]="CANDIDATO_GTIN_EXATO_REVISAO"
    stats["off_com_foto"]+=1
def process_off(fields,stats):
    print("Baixando e filtrando exportacao publica OFF...",flush=True)
    try:
        with fetch(OFF_DUMP,240) as resp:
            with gzip.GzipFile(fileobj=resp, mode="rb") as gz:
                header=gz.readline().decode("utf-8",errors="replace").rstrip("\n").split("\t")
                idx={x:i for i,x in enumerate(header)}
                if "code" not in idx:raise ValueError("Exportacao OFF sem coluna code")
                n=0
                for line in gz:
                    code=line.split(b"\t",1)[0].decode("ascii",errors="ignore").strip('"')
                    if code in fields:
                        off(line.decode("utf-8",errors="replace"),idx,fields,stats)
                    n+=1
                    if n%750000==0:print("OFF LIDAS",n,"NOVAS FOTOS",stats["off_com_foto"],flush=True)
        stats["off_registros_processados"]=n
    except Exception as e:
        stats["off_erro"]=repr(e)
        print("Erro exportacao OFF:",repr(e),flush=True)
def process_precomelhor(fields,stats,max_calls=60):
    # Free tier reported 100 requests/IP lifetime. Use <=60; stop at first 429/403.
    missing=[r for r in fields.values() if not r.get("imagem_url") and len(get_code(r["ean_gtin"])) in (8,12,13,14)]
    for row in missing[:max_calls]:
        code=row["ean_gtin"]
        url="https://www.precomelhor.com.br/api/v1?ean="+code+"&include=product,brand,details"
        try:
            with fetch(url,30) as resp: doc=json.load(resp)
            stats["precomelhor_consultas"]+=1
            # inspect only semantic image keys; do not mistake arbitrary links for photos
            hits=[]
            def crawl(obj,depth=0):
                if depth>6:return
                if isinstance(obj,dict):
                    for k,v in obj.items():
                        if k.lower() in ("image","image_url","imageurl","photo","photo_url","foto","foto_url","imagem","imagem_url","thumbnail"):
                            if isinstance(v,str) and photo_url(v):hits.append(v)
                        if isinstance(v,(dict,list)):crawl(v,depth+1)
                elif isinstance(obj,list):
                    for v in obj[:20]:crawl(v,depth+1)
            crawl(doc)
            if hits:
                # User must review matching EAN + size before app publication
                row["imagem_url"]=hits[0]
                row["fonte_foto"]="PrecoMelhor API v1 (consulta por EAN)"
                row["status_foto"]="CANDIDATO_PRECOMELHOR_REVISAO"
                stats["precomelhor_com_foto"]+=1
        except urllib.error.HTTPError as e:
            stats["precomelhor_erro_http"]=e.code
            if e.code in (401,403,429):break
        except Exception as e:
            stats["precomelhor_erro"]=repr(e)[:200]
            if stats["precomelhor_consultas"]==0:break
        time.sleep(0.5)
def run():
    rows=master()
    fields={get_code(x["ean_gtin"]):x for x in rows if get_code(x["ean_gtin"])}
    before=sum(bool(r.get("imagem_url")) for r in rows)
    stats=Counter()
    stats["produtos"]=len(rows);stats["antes"]=before
    process_off(fields,stats)
    process_precomelhor(fields,stats)
    cols=list(dict.fromkeys([*rows[0].keys(),"fonte_foto","nome_na_fonte","status_foto"]))
    with (OUT/"lumo_13113_fotos_enriquecidas.csv").open("w",encoding="utf-8-sig",newline="") as f:
        w=csv.DictWriter(f,fieldnames=cols,extrasaction="ignore");w.writeheader();w.writerows(rows)
    stats["com_foto"]=sum(bool(r.get("imagem_url")) for r in rows)
    stats["sem_foto"]=len(rows)-stats["com_foto"]
    stats["adicionadas"]=stats["com_foto"]-before
    (OUT/"relatorio.json").write_text(json.dumps(stats,ensure_ascii=False,indent=2),encoding="utf-8")
    print("RESULTADO",json.dumps(stats,ensure_ascii=False),flush=True)
if __name__=="__main__":run()
