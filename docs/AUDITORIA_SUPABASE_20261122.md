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

**Correção proposta:** `supabase/migrations/20261122_lumo_preserve_item_initial_state.sql`, que preserva o estado enviado ao criar o item e rejeita estados fora de `pending`, `in_cart`, `unavailable`. A função mantém os mesmos argumentos, autorização, `SECURITY DEFINER` e busca qualificada, sem alteração retroativa de linhas.

**Estado da implantação:** somente proposta no GitHub. Não aplicar automaticamente no banco remoto até a revisão da migração e teste E2E. O código frontend publicado ainda não foi homologado com esta migração.

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
