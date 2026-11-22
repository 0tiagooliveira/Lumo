export const parseMoney = raw => {
 const text=String(raw??'').trim();if(!text)return null;
 if(!/^\d{1,9}(?:[,.]\d{1,2})?$/.test(text))throw Error('Preço inválido. Use 20,99.');
 const [major,cents='']=text.replace(',','.').split('.');
 return Number(major)*100+Number(cents.padEnd(2,'0'));
};
export const formatMoney = cents => cents==null?'Preço não informado':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100);
export const subtotalMinor=item=>item.unit_price_minor==null?null:Math.round(Number(item.quantity)*Number(item.unit_price_minor));
export const cartMinor=items=>items.filter(x=>x.state==='in_cart'&&!x.deleted_at).reduce((sum,x)=>sum+(subtotalMinor(x)??0),0);
export const validQuantity=(qty,unit)=>Number.isFinite(+qty)&& +qty>0&&+qty<10000&& Math.round(+qty*1000)===+qty*1000&&(unit!=='un'||Number.isInteger(+qty));
export const canReplay=op=>op&&op.operation_id&&op.list_id&&op.item_id&&['add','edit','delete','restore','increment'].includes(op.action);
export const summarizeQueue=ops=>({pending:ops.filter(x=>x.status==='pending').length,conflict:ops.filter(x=>x.status==='conflict').length});
export const isRecoverableFailure=e=>e instanceof TypeError||e?.status===429||e?.status>=500;