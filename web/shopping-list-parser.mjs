// Leitor puro de listas de compras recebidas por WhatsApp, texto ou e-mail.
// Não interpreta linha vazia, cabeçalho ou R$ vazio como produto/preço.
// R$ seguido de número é tratado inicialmente como total da linha; revisar antes de salvar.
const SECTION_NAMES = [
  ['comidas e alimentos basicos','Comidas e Alimentos Básicos','Mercearia'],
  ['doces e snacks','Doces e Snacks','Mercearia'],
  ['bebidas','Bebidas','Bebidas'],
  ['congelados e geladeira','Congelados e Geladeira','Mercearia'],
  ['limpeza, higiene e afins','Limpeza, Higiene e Afins','Higiene e limpeza'],
  ['beleza e cuidados pessoais','Beleza e Cuidados Pessoais','Higiene e limpeza'],
  ['pets','Pets','Outros'],
  ['outros','Outros','Outros']
];
const normalize = value => String(value||'').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR')
  .replace(/\s+/g,' ').trim();
function sectionFrom(line) {
  const key=normalize(line.replace(/^[\s\-–—]+/g,'')
    .replace(/^[^\p{L}\p{N}]+/u,'').trim());
  return SECTION_NAMES.find(([label])=>key===label)||null;
}
function categoryFor(name,defaultCategory) {
  const n=normalize(name);
  if(/\b(frango|bacon|calabresa|hamburguer|presunto|coxa|sobrecoxa|vina)\b/.test(n))return 'Carnes';
  if(/\b(queijo|leite|iogurte|manteiga|margarina|requeijao|catupiry|cheddar)\b/.test(n))return 'Laticínios';
  if(/\b(fralda|lenco umedecido|shampoo|sabonete|desodorante|absorvente|pasta de dente|escova de dente|cotonete|higiene)\b/.test(n))return 'Higiene e limpeza';
  if(/\b(pao|panificacao)\b/.test(n))return 'Padaria';
  if(/\b(batata|tomate|cebola|verdura|fruta|pepino)\b/.test(n))return 'Hortifruti';
  return defaultCategory||'Mercearia';
}
function priceFrom(raw) {
  if(raw===null)return {totalCents:null,priceIssue:''};
  const value=String(raw).replace(/\s+/g,'').trim();
  if(!value)return {totalCents:null,priceIssue:''};
  const m=value.match(/^(\d{1,7})(?:[,.](\d{1,3}))?$/);
  if(!m)return {totalCents:null,priceIssue:'Preço não reconhecido: '+String(raw).trim()};
  if(m[2]?.length===3)return {totalCents:null,priceIssue:'Preço com 3 casas decimais: revisar '+value};
  const totalCents=Number(m[1])*100+Number((m[2]||'').padEnd(2,'0'));
  return Number.isSafeInteger(totalCents)?
    {totalCents,priceIssue:''}:{totalCents:null,priceIssue:'Preço fora do intervalo permitido'};
}
function quantityFrom(text) {
  const original=text.trim();
  // Números no próprio nome (como tamanhos de fralda) não são quantidades.
  if(/\b\d+\s+e\s+\d+$/i.test(original))
    return {name:original,qty:1,unit:'un',quantityIssue:'Dois números podem ser tamanhos/variantes: revisar'};
  const m=original.match(/^(.*?)\s+(\d+(?:[,.]\d+)?)\s*(kg|quilos?|g|gramas?|l|litros?|ml|un|unid|unidades?|pacotes?|caixas?|duzias?|dúzias?)?\s*$/i);
  if(!m||!m[1]?.trim())return {name:original,qty:1,unit:'un',quantityIssue:''};
  const qty=Number(m[2].replace(',','.'));
  if(!Number.isFinite(qty)||qty<=0||qty>10000)return {name:original,qty:1,unit:'un',quantityIssue:'Quantidade inválida: revisar'};
  const units={quilo:'kg',quilos:'kg',kg:'kg',grama:'g',gramas:'g',g:'g',litro:'L',litros:'L',l:'L',ml:'mL',un:'un',unid:'un',
    unidade:'un',unidades:'un',pacote:'pacote',pacotes:'pacote',caixa:'caixa',caixas:'caixa',duzia:'dúzia',duzias:'dúzia',dúzia:'dúzia',dúzias:'dúzia'};
  const unit=units[normalize(m[3]||'')]||'un';
  return {name:m[1].trim(),qty,unit,quantityIssue:''};
}
export function parseShoppingList(source,{maxItems=250}={}) {
  const lines=String(source??'').split(/\r?\n/);
  const hasCheckboxes=lines.some(l=>/^\s*\[\s*[xX✓✔]?\s*\]/u.test(l));
  const items=[],ignored=[];
  let group='Sem categoria',category='Mercearia',headingCount=0;
  for(let lineNumber=0;lineNumber<lines.length;lineNumber++){
    const original=lines[lineNumber].trim();
    if(!original)continue;
    const marked=original.match(/^\[\s*([xX✓✔]?)\s*\]\s*/u);
    if(hasCheckboxes&&!marked){ignored.push({line:lineNumber+1,reason:'Sem marcação de lista'});continue;}
    let line=(marked?original.slice(marked[0].length):original).trim();
    if(!line)continue;
    const section=sectionFrom(line);
    if(section){group=section[1];category=section[2];headingCount++;continue;}
    if(/^-{2,}\s*$/.test(line)){ignored.push({line:lineNumber+1,reason:'Separador'});continue;}
    line=line.replace(/^[-*•]\s+/,'').trim();
    const priceMatch=line.match(/R\$\s*([0-9][\d.,\s]*)?\s*$/i);
    const rawPrice=priceMatch?(priceMatch[1]??''):null;
    if(priceMatch)line=line.slice(0,priceMatch.index).trim();
    const q=quantityFrom(line);
    if(!q.name){ignored.push({line:lineNumber+1,reason:'Nome vazio'});continue;}
    const p=priceFrom(rawPrice);
    const unitPriceCents=p.totalCents===null?0:Math.round(p.totalCents/q.qty);
    const priceRounding=p.totalCents!==null&&unitPriceCents*q.qty!==p.totalCents;
    const issues=[q.quantityIssue,p.priceIssue,priceRounding?'Preço total não é divisível igualmente pela quantidade: conferir unitário':''].filter(Boolean);
    items.push({
      name:q.name.slice(0,120),qty:q.qty,unit:q.unit,
      category:categoryFor(q.name,category),group,
      status:marked&&marked[1]?'bought':'pending',
      checked:Boolean(marked&&marked[1]),include:true,
      hasPrice:priceMatch!==null,rawPrice:rawPrice??'',totalCents:p.totalCents,
      unitPriceCents,issues,line:lineNumber+1,original
    });
    if(items.length>=maxItems){ignored.push({line:lineNumber+1,reason:'Limite de itens excedido'});break;}
  }
  const seen=new Set();let duplicateCount=0;
  for(const item of items){
    const key=normalize(item.name);
    if(seen.has(key)){item.issues.push('Nome repetido nesta lista: verificar se é uma variação');duplicateCount++;}
    seen.add(key);
  }
  return {
    items,ignored,headingCount,duplicateCount,
    counts:{
      total:items.length,checked:items.filter(x=>x.checked).length,
      pending:items.filter(x=>!x.checked).length,
      priced:items.filter(x=>x.totalCents!==null).length,
      review:items.filter(x=>x.issues.length).length
    }
  };
}
