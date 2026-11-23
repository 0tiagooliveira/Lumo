# Lumo — auditoria do Supabase e gates de integração

**Data:** 22/11/2026 (Brasil)  
**Projeto:** `kqfsvzsgxoxxahrpyemc`  
**Escopo:** catálogo PostgreSQL e advisors consultados pela conexão Supabase; sem alteração de dados reais nesta auditoria.

## Estado observado

- Tabelas expostas: `shopping_lists`, `list_members`, `list_items`, `shopping_sessions`, `session_items`. **Todas com RLS habilitado.**
- `authenticated` tem `SELECT` nessas cinco tabelas, condicionado a políticas de pertencimento à lista; não tem `INSERT`, `UPDATE` ou `DELETE` direto nelas.
- `anon` não tem `SELECT` nessas cinco tabelas nem `EXECUTE` nas sete RPCs públicas do Lumo.
- Tabelas `private.list_invitations`, `private.operation_events` e `private.sync_conflicts` não têm acesso direto para `anon`/`authenticated`.
- RPCs públicas `lumo_apply_item`, `lumo_create_invite`, `lumo_create_list`, `lumo_ensure_list`, `lumo_redeem_invite`, `lumo_rename_list`, `lumo_revoke_member`: executáveis por `authenticated`, implementadas com `SECURITY DEFINER`, `search_path=''` e validações de `auth.uid()` / proprietário / membro editor (conforme a operação).
- As sete RPCs continuam gerando um aviso de segurança do Supabase. **Aviso não é prova de acesso indevido nem de homologação.** Não remover `SECURITY DEFINER` ou os grants indiscriminadamente: a escrita intencional acontece via RPC, pois as tabelas negam escrita direta.
- `auth_leaked_password_protection` também gera um aviso: a proteção contra senhas vazadas está desativada. Confirmar se o projeto permite login por senha; se permitir, habilitar a proteção.
- Havia zero linhas nas cinco tabelas públicas no momento da consulta. Não existe evidência de sincronização completa entre duas contas reais.

## Falha funcional confirmada no contrato do banco

A implementação da RPC `lumo_apply_item`, no ramo `p_action='add'`, lia nome, quantidade, unidade, preço e GTIN, mas não inseria o campo `state` enviado pelo frontend. A tabela aplicava `pending` por padrão, inclusive quando o aparelho já marcava o item como comprado ou indisponível.

**Correção proposta:** `supabase/migrations/20261123010741_lumo_preserve_item_initial_state.sql`, que preserva o estado enviado ao criar o item e rejeita estados fora de `pending`, `in_cart`, `unavailable`. A função mantém os mesmos argumentos, autorização, `SECURITY DEFINER` e busca qualificada, sem alteração retroativa de linhas.

**Estado da implantação:** aplicada no Supabase remoto na versão 20261123010741. O frontend ainda depende de publicação e homologação em dispositivos.

## Histórico de migrações reconciliado no PR

As três migrações remotas possuem versões `20261122182007`, `20261122182029` e `20261122192056`. O SQL armazenado no histórico remoto foi comparado com os arquivos do GitHub: a primeira migração coincide literalmente; as outras duas coincidem após remover apenas comentários e normalizar espaços. Os arquivos históricos foram **renomeados neste PR** para reproduzir os números e nomes registrados no Supabase, sem executar DDL no banco. A migração nova `20261123010741_lumo_preserve_item_initial_state.sql` foi aplicada ao Supabase remoto na versão 20261123010741.

Antes de qualquer `supabase db push`, verificar `supabase migration list` no ambiente autenticado correto e conferir que somente a migração nova está pendente. O ajuste do histórico no GitHub não é prova de que a CLI local está configurada ou autorizada a escrever no projeto remoto.

## Validação real em transação revertida (continuação da Sprint 3)

Foi executada uma transação `BEGIN ... ROLLBACK` no projeto Supabase `kqfsvzsgxoxxahrpyemc`, contendo a definição **proposta** da função `lumo_apply_item`, três usuários sintéticos e nenhuma informação pessoal. Os testes exercitaram a função PostgreSQL real com `SET LOCAL ROLE authenticated` e identidades simuladas em `request.jwt.claim.sub`:

- Criar lista e item inicialmente `in_cart`, sem retornar incorretamente a `pending`.
- Excluir um produto e restaurá-lo preservando nome, quantidade, preço e estado local.
- Gerar e aceitar convite com uma segunda identidade.
- Permitir edição por membro convidado e, após revogação, **rejeitar também o replay do mesmo `operation_id`**.
- Negar leitura por RLS a um membro revogado e a um terceiro não membro; negar escrita RPC ao terceiro.

**Resultado: PASS.** Uma verificação após a transação confirmou **zero** usuários, listas e itens sintéticos persistidos; a versão nova não consta no histórico de migrações e a definição atual da função remota permaneceu intocada. Este teste não utiliza uma sessão OAuth real nem chamadas HTTP REST.

Foi criado `tests/supabase_rpc_rollback.sql`, que executa o mesmo contrato no `psql` com `-v lumo_test_approved=1` e reversão obrigatória. Use-o somente em banco local ou de homologação autorizado e jamais coloque a URL de conexão ou a senha no repositório. O job `database-contract` executa este teste em PostgreSQL efêmero no GitHub Actions, com a estrutura mínima de autenticação em `tests/postgres_bootstrap.sql`; **o bootstrap é somente para CI e não reproduz todo o Supabase Auth**.

### Integração HTTP real em ambiente temporário

O job `database-contract` do GitHub Actions também inicia **PostgREST 12.2** sobre um banco PostgreSQL 16 efêmero e aplica a migração candidata somente nesse banco descartável. Em `tests/rest_http_contract.test.mjs`, o Node envia solicitações HTTP verdadeiras para `/rpc/lumo_*`, `/shopping_lists` e `/list_items` com três JWTs sintéticos distintos. A chave HMAC é gerada aleatoriamente a cada execução, mascarada nos logs e não usa nenhuma credencial de produção. O teste é omitido na suíte Node local quando não existe o servidor de teste isolado.

A execução comprovou o fluxo de criação, convites para editor e leitor, RLS de não-membro, escrita autorizada, recusa de escrita do leitor, idempotência, bloqueio de reutilização indevida de `operation_id`, exclusão e restauração de produtos, revogação de membro e impossibilidade de leitura ou replay após revogação. Verificar também a recusa de JWT adulterado e expirado.

**Limitação:** o teste usa PostgREST com autenticação por JWT gerado **somente para CI**, não o Google OAuth/Supabase Auth real, nem redes celulares ou o HTTPS hospedado. Ele valida a API e as regras de acesso, mas não conclui a homologação dos dois dispositivos físicos.

### Separação dos níveis de evidência

- **Supabase PostgreSQL real, SQL transacional e RLS:** testado com identidades sintéticas, sem gravação definitiva.
- **PostgreSQL efêmero em CI:** baseline + migração candidata + testes SQL, sem segredos de produção.
- **PostgREST HTTP real em CI:** contratos de RPC, RLS, perfis de acesso e JWTs sintéticos, executados sobre banco descartável.
- **Google OAuth e HTTPS hospedado em dois dispositivos:** ainda não homologados.
- **Câmera e PDF fiscal reais:** ainda não homologados.
- **Aplicação da migração no Supabase remoto:** concluída em 20261123010741; versão e contrato verificados no banco.

## Consultas de auditoria não destrutivas

```sql
-- Confirmar RLS e grants da API
select n.nspname, c.relname, c.relrowsecurity,
       has_table_privilege('anon', c.oid, 'SELECT') as anon_select,
       has_table_privilege('authenticated', c.oid, 'SELECT') as auth_select,
       has_table_privilege('authenticated', c.oid, 'INSERT') as auth_insert,
       has_table_privilege('authenticated', c.oid, 'UPDATE') as auth_update
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','private') and c.relkind='r'
order by n.nspname,c.relname;

-- Resumir alcance das RPCs públicas
select p.proname, p.prosecdef,
       has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') as auth_execute,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname like 'lumo_%'
order by p.proname;
```

## Gates antes de liberar o recurso de sincronização

1. **G0 — Node + Chromium:** CI verde no SHA exato, incluindo salvar versão remota após falha de IndexedDB e estados iniciais `pending/bought/later`.
2. **G1 — Duas identidades reais:** conta A cria lista e três itens com estados distintos; conta B entra por convite, vê os mesmos estados e preços, sem atraso de correção adicional. Fazer isso somente na prévia autorizada.
3. **G2 — Negativos de RLS e RPC:** conta C não convidada não pode ler lista/itens/membros, criar convite, editar, renomear ou revogar alguém. Conta viewer pode ler, mas não escrever. Um usuário revogado deve perder leitura e escrita.
4. **G3 — Offline e conflitos:** duas edições concorrentes do mesmo item resultam em conflito visível; falha do IndexedDB não confirma falsamente a versão remota; reinício, repetição de `operation_id` e desconexão não causam duplicidade.
5. **G4 — Segurança:** revisar todas as sete RPCs e sua função de autorização, checar configuração do OAuth e efetuar rotação de qualquer segredo compartilhado, fora do GitHub e dos documentos públicos.
6. **G5 — Publicação:** executar a migração revisada no ambiente apropriado; comparar contratos reais via REST e somente então publicar a mesma revisão frontend em canal temporário. Live requer autorização explícita.

**Limitações da evidência:** testes Node simulados e inspeção de catálogo não equivalem a sessão Google real, autorização REST real nem câmera física. Não armazenar tokens, e-mails privados, CPF ou notas fiscais de teste em repositório público.
