// Reconhecimento de intenção em pt-BR: não salvar comandos de voz como nome de produto.
// Puro e testável. O usuário sempre confirma o campo antes de adicionar.
export function extractVoiceItem(transcript) {
  const original = String(transcript ?? '').trim().replace(/\s+/g, ' ');
  if (!original) return { itemText: '', recognizedCommand: false };
  let cleaned = original.replace(/[.!?]+\s*$/g, '').trim();
  let recognizedCommand = false;
  const patterns = [
    /^(?:por favor[, ]*)?(?:coloque|coloca|ponha|põe|poe|bota|adicione|adiciona|inclua|inclui|anote|anota)\s+(?:(?:na|à)\s+(?:minha\s+|nossa\s+)?lista(?:\s+de\s+compras)?\s*)?(?:(?:para|pra)\s+mim\s*)?/i,
    /^(?:eu\s+)?(?:quero|gostaria\s+de|preciso\s+de)\s+(?:comprar|colocar|adicionar|incluir|anotar)\s+/i,
    /^(?:adicionar|incluir|colocar|anotar)\s+(?:na|à)\s+lista(?:\s+de\s+compras)?\s*/i,
    /^(?:me\s+)?(?:lembre|lembra)\s+(?:de\s+)?comprar\s+/i
  ];
  for (const pattern of patterns) {
    if (pattern.test(cleaned)) {
      cleaned = cleaned.replace(pattern, '').trim().replace(/^[:,]\s*/, '');
      recognizedCommand = true;
      break;
    }
  }
  cleaned = cleaned.replace(/^(?:por favor[, ]*)/i, '').trim();
  if (!cleaned) return { itemText: '', recognizedCommand };
  const quantities = { um: '1', uma: '1', dois: '2', duas: '2', tres: '3', três: '3',
    quatro: '4', cinco: '5', seis: '6', sete: '7', oito: '8', nove: '9', dez: '10' };
  const quantity = cleaned.match(/^(um|uma|dois|duas|três|tres|quatro|cinco|seis|sete|oito|nove|dez)\s+/i);
  if (quantity) cleaned = quantities[quantity[1].toLocaleLowerCase('pt-BR')] + ' ' + cleaned.slice(quantity[0].length);
  cleaned = cleaned.replace(/^(\d+)\s+(?:quilos?|quilogramas?)\s+(?:de\s+)?/i, '$1 kg ');
  cleaned = cleaned.replace(/^(\d+)\s+(?:litros?)\s+(?:de\s+)?/i, '$1 l ');
  cleaned = cleaned.replace(/^(\d+)\s+(pacotes?|caixas?|unidades?)\s+de\s+/i, '$1 $2 ');
  // "1 arroz" e "arroz" têm o mesmo efeito no adicionar rápido.
  cleaned = cleaned.replace(/^1\s+(?!kg\b|g\b|l\b|ml\b|un\b|pacote\b|caixa\b)/i, '');
  return { itemText: cleaned.trim().slice(0, 120), recognizedCommand };
}
