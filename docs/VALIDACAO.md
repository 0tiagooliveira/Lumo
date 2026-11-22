# Evidências da Beta privada — 22/11/2026

## Verificado

- Supabase: projeto ativo, 5 tabelas públicas (`shopping_lists`, `list_members`, `list_items`, `shopping_sessions`, `session_items`) com **RLS habilitado** e zero registros iniciais.
- Migração canônica de tabelas, RLS e operações privadas **aplicada com sucesso** e publicada na branch do GitHub.
- Security Advisor identificou `public.rls_auto_enable()` com privilégio indevido para anônimos; permissão revogada. Após a correção, o alerta anônimo desapareceu. Restaram avisos de cinco RPC autenticadas SECURITY DEFINER; sua invocação autenticada é intencional, mas exige bateria de ataques simulados de usuário estranho antes da publicação.
- `npm run check`: checagem sintática JavaScript e **13 testes unitários Node aprovados**.
- Firebase Hosting: configuração gerada, **nenhum deploy confirmado**.

## Não verificado — bloqueia o uso real

- Login e confirmação de e-mail com conta real, links de invite e acesso entre dois usuários.
- Testes DB01–DB20 com usuário não autorizado, permissões de viewer/editor, revogação e RLS via API REST.
- Teste de operação repetida, offline, conflitos e proteção de dados em dois telefones físicos.
- Scanner EAN real, NFC-e/SEFAZ, OCR, XML, foto, PDF, histórico e funcionalidades completas do MVP v1.7 na nova interface.
- Backup criptografado e restauração de verdade, limitação de cadastro público, Firebase com domínio HTTPS e redirects corretos.

O modelo no banco é **base funcional de dados**, não prova de Beta homologada. Não carregar dados fiscais pessoais.

## Validação transacional RLS adicional

Foram executados dois conjuntos de verificações dentro de transações `BEGIN ... ROLLBACK` com três `auth.users` sintéticos. Com role `authenticated`, os testes verificaram:

- Dono cria lista; pode consultar a lista; adição de item retorna `ACK` e operação repetida não duplica revisão.
- Terceiro usuário não autorizado não consegue consultar lista/itens; tentativa de escrita gera erro de autorização.
- Dono gera convite de editor; membro resgata e passa a ler itens.
- Dono revoga editor; editor não consegue consultar itens após a revogação.
- A consulta após os `ROLLBACK` retornou 0 usuários, listas, membros ou itens; nenhuma identidade artificial foi persistida.

**Limite:** foram testes diretamente no PostgreSQL, não fluxos HTTP autenticados com email/senha em celulares. A validação E2E continua pendente.

## Atualização A01 — Google como login principal

- Fluxo OAuth Google com PKCE S256 implementado em `web/oauth.mjs`; `web/app.js` valida sessão com `auth/v1/user`, gerencia refresh e logout.
- Botão principal Google e fallback de e-mail recolhido; cadastro livre removido da interface.
- `web/sw.js` não guarda URLs de retorno contendo `code`; `firebase.json` define `Referrer-Policy: no-referrer` e `Cache-Control: no-store` para entradas principais.
- Node: **27/27 testes unitários aprovados**, 14 novos de OAuth/invite além dos 13 anteriores.
- Chromium + Playwright: teste **estático dos controles HTML em tela mobile aprovado**, sem executar fluxo real de OAuth. Navegação de rede e localhost segue bloqueada neste ambiente (`net::ERR_BLOCKED_BY_ADMINISTRATOR`).
- **Pendente:** Google Cloud OAuth Client, Supabase Auth Provider Google (Client ID/secret em painel privado), URLs permitidas de callback e Firebase Hosting; login com conta Google real não executado.