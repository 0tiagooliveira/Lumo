# Lumo — recuperação da UX completa com autenticação Google e listas no Supabase

**22/11/2026 · candidato PR #1, ainda não implantado · baseado no MVP v1.7 original**

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
- `supabase/migrations/20261122192056_lumo_cloud_list_compat_and_tombstones.sql` — migração aplicada: ligação idempotente de lista, renomeação segura e tombstones RLS para reconciliação.
- `tests/` — contratos Node, simulação de dois usuários, navegador Chromium estático.

## Contratos da primeira integração

- Google OAuth pelo projeto Supabase `kqfsvzsgxoxxahrpyemc`; somente a chave `sb_publishable_` fica em `web/config.js`.
- Ao entrar, é lido um **banco local isolado por `auth.users.id`**; outro login no mesmo navegador não herda automaticamente dados privados.
- Listas não são enviadas automaticamente; o usuário escolhe **Nuvem e convites → Conectar esta lista**.
- Após consentimento, o Lumo cria a lista de forma idempotente via `lumo_ensure_list` e envia somente **nome, quantidade, unidade, preço em centavos, estado e GTIN** dos itens.
- A outra conta entra por convite de uso único (24 h) e recebe os itens via RLS; alterações são verificadas em polling de ~12s.
- Modificações offline mantêm os dados no aparelho e guardam operações com UUID até ACK do servidor. Conflitos são preservados e precisam ser revisados; nunca tratar fila como sincronização concluída.
- **Somente os itens da lista são sincronizados nesta versão.** Descrições/categorias detalhadas, fotos, catálogo, notas, OCR, histórico de compras, preferências e backups continuam locais até contratos seguros dedicados. A UX desses recursos permanece visível e utilizável nos limites herdados do MVP, sem alegar homologação dos conectores externos.
- A migração de compatibilidade de estado dos itens foi aplicada em 20261123010741, sem modificar registros existentes. Os testes SQL anteriores foram feitos em transações revertidas.

## Validação e testes

- `npm run check` → CI Node aprovado na branch candidata, incluindo regras de listas, login, conversão de produtos, importação de listas por texto, falhas de IndexedDB, exclusão confirmada e recuperação após reinício.
- `python tests/experience_visual_static.py` → comparação estática do MVP, sem OAuth real.
- `python tests/experience_navigation_static.py` → navegação automatizada em Chromium com identidade simulada.
- `python tests/browser_smoke.py` → smoke sintético, não substitui aparelho físico.
- Alguns contratos Supabase foram exercitados com transações revertidas, sem deixar dados de teste. A integração **entre duas contas reais** continua sem aceite.
- O usuário conseguiu ler EAN no tablet e no celular, além de QR fiscal; a câmera traseira teve problemas de foco e o PDF fiscal real ainda não foi importado integralmente.
- **Não confundir código implementado, CI verde e homologação real.** Os testes T01–T17 e os portões da compra ainda precisam de evidências físicas.

## Preparar somente uma prévia no Firebase

**Branch válida:** `codex/public-release-2026-11-22` (PR #1). Não use branches antigas de restauração para publicar.

No computador Windows autorizado, com Firebase CLI autenticada no projeto correto:

```powershell
git fetch origin codex/public-release-2026-11-22
git checkout -B codex/public-release-2026-11-22 origin/codex/public-release-2026-11-22
powershell -ExecutionPolicy Bypass -File scripts/preview-firebase.ps1
```

O script verifica árvore de trabalho limpa, SHA, `npm run check`, `firebase.json`, projeto e site antes de publicar **somente** um canal temporário. Não faz deploy no domínio `uselumo.web.app`.

A URL da prévia deverá ser autorizada como redirecionamento Google/Supabase antes do login e testada no celular e tablet reais. Prévia Firebase pode ser acessível publicamente; a segurança dos dados depende do Auth e das regras RLS.

**Publicação live:** somente após aceite de segurança, testes físicos, versão identificada pelo SHA e aprovação explícita de GO. Veja [runbook de release](docs/RELEASE_CANDIDATO_2026-11-22.md).

## Bloqueios antes do uso real

1. Verificar configuração, validade e rotação preventiva das credenciais OAuth e as URLs de redirecionamento em ambiente privado, sem registrar credenciais no GitHub.
2. Verificar G1/G2 com duas contas e dois celulares, offline real, invitação, renomeação e revogação, inclusive teste direto da API REST.
3. Migrar campos restantes dos itens (categoria/detalhes) e construir contratos transacionais para compra, notas e histórico compartilhado. Não dar a entender que estes dados já estão na nuvem.
4. Confirmar scanner EAN na câmera física e importação de documento fiscal real com consentimento adequado.
5. Auditar a **última árvore de código Windows** `D:\Documentos\LUMO`; o ZIP Sprint 3 v5 é um arquivo anterior e não prova o estado atual.
6. Revisar alertas de segurança do Supabase (RPC SECURITY DEFINER intencionais, mas com revisão de permissões; proteção de senhas vazadas se login por senha continuar habilitado).

Fontes: [MVP original](https://github.com/0tiagooliveira/Lumo/blob/work/bootstrap-2026-11-22/legacy/Lumo_MVP_v1.7.html) · [Baseline aprovada](https://docs.google.com/document/d/1k9le4dEao5h-wjE3YbeMLRZbw_cnkTg6NupJn3guKWc/edit) · [Plano de recuperação](https://docs.google.com/document/d/1V-ilNNttyplpv3rTAguK4qIuxd069IumwDwQ5YtzfnI/edit).
