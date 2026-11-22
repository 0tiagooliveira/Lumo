# Lumo — recuperação da UX completa com autenticação Google e listas no Supabase

**22/11/2026 · ramo candidato, não publicado · baseada no MVP v1.7 original**

## Por que esta branch existe

A Beta de autenticação funcionou, mas a interface publicada no Firebase tinha perdido onboarding, sete mascotes, navegação, lista rica, compra, scanner, nota fiscal, histórico, catálogo e backup. A decisão é **não substituir o MVP por uma tela simplificada**.

Esta versão reaproveita a experiência integral do arquivo histórico `legacy/Lumo_MVP_v1.7.html` (que continua **intocado**) e adiciona uma camada de autenticação Google/Supabase e uma primeira integração segura de listas, em vez de redesenhar o produto.

## Estrutura

- `web/index.html` — UX v1.7 completa, agora protegida por entrada Google e armazenamento local segregado por conta. Preserva as sete frutas e navegação do app.
- `web/experience-auth.mjs` — validação Supabase Auth com Google PKCE, sessão, refresh e logout.
- `web/experience-sync.mjs` — opt-in para conectar uma lista à nuvem; convite com expiração; pull/replay de itens, atualização periódica, conflitos em painel e fila persistente.
- `web/experience-sync-core.mjs` — conversores de unidades/preços/estado EAN, sem efeitos colaterais.
- `web/experience.css` — superfícies de conta/compartilhamento sem reescrever o design original.
- `web/beta.html` — interface antiga da Beta reduzida, mantida como laboratório técnico (nunca referência de UX).
- `web/sw.js` — cache com versão nova; nunca armazena callback OAuth com código na URL.
- `supabase/migrations/20261122_lumo_cloud_list_compat.sql` — migração aplicada: ligação idempotente de lista, renomeação segura e tombstones RLS para reconciliação.
- `tests/` — contratos Node, simulação de dois usuários, navegador Chromium estático.

## Contratos da primeira integração

- Google OAuth pelo projeto Supabase `kqfsvzsgxoxxahrpyemc`; somente a chave `sb_publishable_` fica em `web/config.js`.
- Ao entrar, é lido um **banco local isolado por `auth.users.id`**; outro login no mesmo navegador não herda automaticamente dados privados.
- Listas não são enviadas automaticamente; o usuário escolhe **Nuvem e convites → Conectar esta lista**.
- Após consentimento, o Lumo cria a lista de forma idempotente via `lumo_ensure_list` e envia somente **nome, quantidade, unidade, preço em centavos, estado e GTIN** dos itens.
- A outra conta entra por convite de uso único (24 h) e recebe os itens via RLS; alterações são verificadas em polling de ~12s.
- Modificações offline mantêm os dados no aparelho e guardam operações com UUID até ACK do servidor. Conflitos são preservados e precisam ser revisados; nunca tratar fila como sincronização concluída.
- **Somente os itens da lista são sincronizados nesta versão.** Descrições/categorias detalhadas, fotos, catálogo, notas, OCR, histórico de compras, preferências e backups continuam locais até contratos seguros dedicados. A UX desses recursos permanece visível e utilizável nos limites herdados do MVP, sem alegar homologação dos conectores externos.
- A migração mais recente **não mexe nos usuários nem nas listas reais existentes**; testes SQL foram feitos em transações revertidas.

## Testes executados

- `npm run check` → **44 testes Node aprovados**, incluindo 1 cenário **simulado** de duas contas, convite, alteração, offline e conflito.
- `python tests/experience_visual_static.py` → renderização Chromium do MVP original em 360 / 390 / 430 px, sem JS de Auth.
- `python tests/experience_navigation_static.py` → onboarding → 5 abas → quick add → Compra → Histórico → Nota com **Chromium e identidade simulada**.
- `python tests/browser_smoke.py` → controles da versão reduzida `beta.html`, sem OAuth real.
- SQL real Supabase em transação `ROLLBACK` → link idempotente, atualização de título, conflito, item excluído (tombstone), bloqueio para não membro e tentativa de tomar lista alheia. **Aprovado sem deixar dados sintéticos**.
- Navegação HTTP local Playwright ficou **bloqueada por política** (`ERR_BLOCKED_BY_ADMINISTRATOR`). Não declaramos E2E Google/REST nesta versão.
- Scanner físico, NFC-e real e dois celulares **AINDA NÃO FORAM HOMOLOGADOS**.

## Próxima publicação (canal de comparação separado)

Abra o Google Cloud Shell em `https://console.cloud.google.com/?project=lumo-515518` e execute:

```sh
cd ~/Lumo
# Se o projeto ainda não existir, use git clone em vez dos três comandos abaixo:
git fetch origin work/ux-restore-2026-11-22
git checkout -B work/ux-restore-2026-11-22 origin/work/ux-restore-2026-11-22
npm run check
firebase hosting:channel:deploy ux-restored --project lumo-515518
```

Se `~/Lumo` não existir:

```sh
git clone --branch work/ux-restore-2026-11-22 --single-branch https://github.com/0tiagooliveira/Lumo.git
cd Lumo
npm run check
firebase hosting:channel:deploy ux-restored --project lumo-515518
```

**A URL exata será apresentada pelo terminal.** Adicione-a em `Supabase → Authentication → URL Configuration → Redirect URLs` antes de fazer login Google. O canal `beta-privada` atual fica intocado. Preview do Firebase é publicamente acessível; dados ficam protegidos pela autenticação e pelo RLS, não pela obscuridade da URL.

## Bloqueios antes do uso real

1. **Rotacionar o Google OAuth Client Secret previamente exposto na conversa**, atualizar no Supabase e revogar o antigo.
2. Verificar G1/G2 com duas contas e dois celulares, offline real, invitação, renomeação e revogação, inclusive teste direto da API REST.
3. Migrar campos restantes dos itens (categoria/detalhes) e construir contratos transacionais para compra, notas e histórico compartilhado. Não dar a entender que estes dados já estão na nuvem.
4. Confirmar scanner EAN na câmera física e importação de documento fiscal real com consentimento adequado.
5. Auditar a **última árvore de código Windows** `D:\Documentos\LUMO`; o ZIP Sprint 3 v5 é um arquivo anterior e não prova o estado atual.
6. Revisar alertas de segurança do Supabase (RPC SECURITY DEFINER intencionais, mas com revisão de permissões; proteção de senhas vazadas se login por senha continuar habilitado).

Fontes: [MVP original](https://github.com/0tiagooliveira/Lumo/blob/work/bootstrap-2026-11-22/legacy/Lumo_MVP_v1.7.html) · [Baseline aprovada](https://docs.google.com/document/d/1k9le4dEao5h-wjE3YbeMLRZbw_cnkTg6NupJn3guKWc/edit) · [Plano de recuperação](https://docs.google.com/document/d/1V-ilNNttyplpv3rTAguK4qIuxd069IumwDwQ5YtzfnI/edit).
