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