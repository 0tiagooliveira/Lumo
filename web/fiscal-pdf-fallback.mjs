/**
 * Fallback conservador para texto extraído de DANFE NFC-e.
 * Não consulta SEFAZ, não inventa produtos e exige revisão manual.
 */
const compact=/^(?:(?:\d{1,3})\s+)?(?:(?:\d{5,14})\s+)?(.{3,110}?)\s+(\d{1,4}(?:[.,]\d{1,3})?)\s*(UN|UND|UNID|KG|G|L|ML|PC|PCT)\s*(?:[xX*@]\s*)?(?:R\$\s*)?(\d{1,8}(?:\.\d{3})*,\d{2}|\d{1,8}[.,]\d{2})\s+(?:R\$\s*)?(\d{1,8}(?:\.\d{3})*,\d{2}|\d{1,8}[.,]\d{2})\s*$/i;
const skip=/\b(?:DOCUMENTO AUXILIAR|DANFE|CHAVE DE ACESSO|CPF|CNPJ|CONSUMIDOR|TRIBUTOS|VALOR TOTAL|TOTAL DA NOTA|EMISS[AÃ]O|PAGAMENTO|DESCONTO|FORMA DE PAGAMENTO|PROTOCOLO|CONSULTE|IMPRIMIR|P[ÁA]GINA|S[ÉE]RIE)\b/i;
const qtyRe=/\b(?:Qtde?\.?|Qtd\.?|Quantidade)\s*[:.]?\s*(\d{1,5}(?:[.,]\d{1,3})?)/i;
const unitRe=/\b(?:UN|Unid|Unidade)\s*[:.]?\s*(UN|UND|UNID|KG|G|L|ML|PC|PCT)\b/i;
const priceRe=/\b(?:Vl\.?\s*Unit\.?|Valor\s+Unit[aá]rio|Vlr\s+Unit\.?|Pre[cç]o\s+Unit[aá]rio)\s*[:.]?\s*(?:R\$\s*)?(\d{1,8}(?:\.\d{3})*,\d{2}|\d{1,8}[.,]\d{2})/i;
const totalRe=/\b(?:Vl\.?\s*Total|Valor\s+Total|Vlr\s*Total)\s*[:.]?\s*(?:R\$\s*)?(\d{1,8}(?:\.\d{3})*,\d{2}|\d{1,8}[.,]\d{2})/i;
function moneyCents(value){
 const s=String(value||'').replace(/\s/g,'');
 if(!/^\d{1,8}(?:\.\d{3})*,\d{2}$|^\d{1,8}[.,]\d{2}$/.test(s))return null;
 const comma=s.lastIndexOf(',')>s.lastIndexOf('.');
 const normalized=comma?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 const result=Math.round(Number(normalized)*100);
 return Number.isSafeInteger(result)&&result>=0?result:null;
}
const units={UN:'un',UND:'un',UNID:'un',KG:'kg',G:'g',L:'l',ML:'ml',PC:'un',PCT:'un'};
function item(name,qty,unit,price,total,line){
 const n=String(name).trim().replace(/\s+/g,' '),q=Number(String(qty).replace(',','.'));
 const p=moneyCents(price),t=moneyCents(total);
 if(n.length<3||n.length>160||skip.test(n)||!Number.isFinite(q)||q<=0||q>=10000||p===null||t===null)return null;
 if(Math.abs(Math.round(p*q)-t)>Math.max(3,Math.round(t*.04)))return null;
 return{name:n,qty:q,unit:units[String(unit).toUpperCase()]||'un',unitPriceCents:p,totalCents:t,line};
}
export function parseFiscalPdfFallback(input){
 const raw=String(input||'');
 const issues=[];
 if(raw.length<30||raw.length>2_000_000)return{items:[],issues:['Documento sem texto utilizável ou maior que o limite.']};
 const lines=raw.split(/\r?\n/).map(x=>x.replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim()).filter(Boolean);
 if(!/(?:NOTA FISCAL|NFC[- ]?E|DOCUMENTO AUXILIAR|DANFE|CNPJ|CHAVE DE ACESSO|SEFAZ)/i.test(raw))
  return{items:[],issues:['O texto não foi identificado como documento fiscal.']};
 const items=[],used=new Set();
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(compact);if(!m)continue;
  const found=item(m[1],m[2],m[3],m[4],m[5],i+1);
  if(found){items.push(found);used.add(i);}
 }
 for(let i=0;i<lines.length;i++){
  if(used.has(i))continue;
  const line=lines[i],header=line.match(/^(.{3,130}?)\s*\(\s*C[oó]d(?:igo)?\.?\s*:\s*([^)]+)\)/i)
    ||line.match(/^(.{3,130}?)\s+[-–]\s*C[oó]d(?:igo)?\.?\s*:?\s*([\dA-Za-z.-]{1,30})$/i);
  if(!header||skip.test(header[1]))continue;
  const following=[line.slice(header[0].length)];
  for(let j=i+1;j<Math.min(lines.length,i+9);j++){
   if(j>i+1&&/\(\s*C[oó]d/i.test(lines[j]))break;
   if(/^(?:Valor a pagar|TOTAL DA NOTA|Chave de acesso)/i.test(lines[j]))break;
   following.push(lines[j]);
   if(totalRe.test(following.join(' ')))break;
  }
  const text=following.join(' '),q=text.match(qtyRe),u=text.match(unitRe),p=text.match(priceRe),t=text.match(totalRe);
  if(!q||!p||!t)continue;
  const found=item(header[1],q[1],u?.[1]||'UN',p[1],t[1],i+1);
  if(found){items.push(found);used.add(i);}
 }
 items.sort((a,b)=>a.line-b.line);
 if(!items.length)issues.push('PDF com texto, mas nenhum produto reconhecido. Não foram criados itens fictícios.');
 const full=lines.join(' ');
 const totalMatch=full.match(/(?:Valor\s+a\s+pagar|Valor\s+total\s+da\s+nota|Total\s+da\s+NFC[- ]?e)\s*:?\s*(?:R\$\s*)?(\d{1,8}(?:\.\d{3})*,\d{2}|\d{1,8}[.,]\d{2})/i);
 const totalCents=totalMatch?moneyCents(totalMatch[1]):null;
 if(totalCents===null)issues.push('Total fiscal não localizado. Não foi criado valor total automático.');
 const dateMatch=full.match(/\b(?:Emiss[aã]o|Data\s+da\s+emiss[aã]o)\s*(?::|em)?\s*([0-3]?\d)[/.-]([01]?\d)[/.-](20\d{2})/i);
 const date=dateMatch?dateMatch[3]+'-'+dateMatch[2].padStart(2,'0')+'-'+dateMatch[1].padStart(2,'0'):'';
 const storeMatch=full.match(/(?:RAZ[AÃ]O SOCIAL|EMITENTE|ESTABELECIMENTO)\s*:\s*([A-ZÀ-Ÿa-zà-ÿ0-9 .&-]{4,90})/i);
 const store=storeMatch?storeMatch[1].trim():'';
 if(!date)issues.push('Data não reconhecida; revisar.');
 if(!store)issues.push('Estabelecimento não reconhecido; revisar.');
 if(totalCents!==null&&Math.abs(items.reduce((s,x)=>s+x.totalCents,0)-totalCents)>Math.max(2,Math.round(totalCents*.03)))
  issues.push('A soma dos itens difere do total da nota; revisar descontos e possíveis itens ausentes.');
 issues.push('Importação assistida: revise todos os produtos antes de salvar.');
 return{items,store,date,totalCents,issues};
}
