/* Pure mapping between the original Lumo v1.7 item model and secured Supabase list_items.
   Fiscal documents, purchase history and product photos are intentionally excluded. */
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const GTIN = /^(?:\d{8}|\d{12}|\d{13}|\d{14})$/;
const UNITS = new Set(['un','kg','g','l','ml']);
export function toCloudUnit(unit){const u=String(unit||'un').toLowerCase();if(!UNITS.has(u))throw Error(`Unidade ${unit||''} não pode ser sincronizada ainda; mantenha este produto local até revisão.`);return u;}
export const toLocalUnit=unit=>unit==='l'?'L':unit;
export function itemPayload(item){
 if(!item || !String(item.name||'').trim())throw Error('Produto sem nome não pode ser enviado.');
 const unit=toCloudUnit(item.unit);
 const qty=Number(item.qty);
 if(!Number.isFinite(qty)||qty<=0||qty>=10000||Math.round(qty*1000)!==qty*1000||(unit==='un'&&!Number.isInteger(qty)))throw Error('Quantidade fora do limite para sincronizar.');
 const price=Number(item.unitPriceCents||0);
 if(!Number.isSafeInteger(price)||price<0||price>1000000000)throw Error('Preço inválido para sincronizar.');
 const gtin=String(item.barcode||'').replace(/\s/g,'');
 if(gtin&&!GTIN.test(gtin))throw Error('EAN/GTIN inválido; confira o código antes de sincronizar.');
 const name=String(item.name).trim();if(name.length>160)throw Error('Nome muito longo para sincronizar.');
 return {name,quantity:qty,unit,unit_price_minor:price||null,state:item.status==='bought'?'in_cart':item.status==='later'?'unavailable':'pending',gtin:gtin||null};
}
export function cloudSignature(item){return JSON.stringify({name:item.name,quantity:Number(item.quantity),unit:item.unit,unit_price_minor:item.unit_price_minor??null,state:item.state||'pending',gtin:item.gtin||null});}
export const itemSignature=item=>cloudSignature(itemPayload(item));
export function fromCloud(remote,listId){return {
 id:remote.id,listId,name:remote.name,details:'',barcode:remote.gtin||'',category:'Mercearia',qty:Number(remote.quantity),unit:toLocalUnit(remote.unit),unitPriceCents:remote.unit_price_minor??0,
 status:remote.state==='in_cart'?'bought':remote.state==='unavailable'?'later':'pending',createdAt:remote.created_at||new Date().toISOString(),updatedAt:remote.updated_at||new Date().toISOString()
};}
export function isRemoteChanged(remote,shadow){return Boolean(shadow)&&Number(remote.revision)!==Number(shadow.revision);}
export function needsLocalPush(item,shadow){if(!item)return Boolean(shadow&&!shadow.deleted);const sig=itemSignature(item);return !shadow||Boolean(shadow.deleted)||sig!==shadow.signature;}
export function isConflict(local,shadow,remote){if(!local||!shadow)return false;return needsLocalPush(local,shadow)&&isRemoteChanged(remote,shadow);}
export function normalizeInvite(input){const val=String(input||'').trim();if(/^[0-9a-f]{48}$/i.test(val))return val.toLowerCase();try{const hash=new URL(val).hash;const match=/^#invite=([a-f0-9]{48})$/i.exec(hash);return match?match[1].toLowerCase():null;}catch{return null;}}
export function newEmptySyncState(){return {version:1,lists:{},items:{},titles:{},shadow:{},pending:[],conflicts:[]};}
export function safeReadState(raw){try{const v=JSON.parse(raw);if(v&&v.version===1&&v.lists&&v.items&&v.shadow&&Array.isArray(v.pending)&&Array.isArray(v.conflicts))return {...v,titles:v.titles||{}};}catch{}return newEmptySyncState();}
