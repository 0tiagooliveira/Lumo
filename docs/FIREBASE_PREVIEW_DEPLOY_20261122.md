# Lumo — primeira implantação Firebase Hosting Preview (22/11/2026)

## Evidência fornecida pelo usuário

Captura de tela do **Google Cloud Shell**, às 16h07 (horário indicado pelo dispositivo), mostra:

- `npm run check` executado, incluindo `node --check` e **27 testes Node**, todos aprovados, 0 falhas.
- Canal `beta-privada` criado no site Firebase `lumo-515518`.
- Envio de arquivos concluído; `version finalized`, `release complete`, `Deploy complete!`.
- URL temporária do canal: **https://lumo-515518--beta-privada-h4r7dgnf.web.app**
- Prazo informado no terminal: **2026-11-29 19:06:53** (fuso não informado).
- Release/version registrado pelo terminal: `2357341a0228f33c`.
- Hosting live `https://lumo-515518.web.app` aparece no terminal, mas **não foi confirmado deploy nesse canal live**.
- Avisos: `Unable to add channel domain to Firebase Auth` e `Unable to sync Firebase Auth state`. O Lumo usa Supabase Auth; estes avisos não bloquearam a release Hosting do canal.

## Próximo gate (NÃO homologado)

1. Supabase Auth > URL Configuration > **Redirect URLs**: adicionar **exatamente** `https://lumo-515518--beta-privada-h4r7dgnf.web.app`, salvar. Manter Site URL localhost apenas durante desenvolvimento até publicar o canal live.
2. Verificar Google OAuth no Supabase, sem expor Client Secret; contas de teste Google Cloud em modo Testing.
3. **Rotacionar Client Secret do Google Cloud previamente exposto na conversa**; atualizar no Supabase e revogar segredo antigo antes de teste com dados reais.
4. Abrir URL Preview nos dois celulares; testar login Google real, PKCE, refresh/logout, convite, RLS, revogação, sincronização online e offline com duas contas distintas.
5. Não declarar Beta privada homologada antes dos gates G1/G2/G5.

**Nota de segurança:** o canal Preview é publicamente acessível. A privacidade dos dados depende do Supabase Auth, das RPCs e do RLS, não de esconder o endereço.

**Fonte:** captura enviada pelo usuário do Cloud Shell (terminal do Firebase) no dia 22/11/2026. O registro da release não comprova teste ponta a ponta real nem disponibilidade independente por navegador externo.
