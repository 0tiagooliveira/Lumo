# Lumo — evidências reais da Beta privada (22/11/2026)

## Estado realizado

- Supabase `kqfsvzsgxoxxahrpyemc`: migração **lumo_beta_privada_foundation** aplicada com sucesso. Tabelas `shopping_lists`, `list_members`, `list_items`, `shopping_sessions`, `session_items` com RLS ativo, RPC de criar lista/convite/resgate/revogação e escrita idempotente por `operation_id`.
- A correção `lumo_secure_existing_rls_helper` revogou execução anônima de `public.rls_auto_enable()`. O alerta de execução anônima deixou de aparecer no Security Advisor após a correção. Os alertas das 5 RPC autenticadas `SECURITY DEFINER` são esperados pelo desenho e ainda exigem auditoria cuidadosa da implementação.
- Testes SQL **reais** com identidades fictícias em transações `BEGIN ... ROLLBACK`: dono criou lista e item, retry manteve a mesma revisão; usuário C não leu nem editou; usuário B aceitou convite e leu; revogação bloqueou novas leituras. Todas as transações revertidas; contagem posterior de `auth.users`, listas, itens, membros = **0**.
- Frontend `web/`: tela de autenticação, listagem, criar/editar item, preços opcionais em centavos, convite temporário, cache local e fila IndexedDB até ACK. Polimento visual inicial. A UI antiga e as sete mascotes completas ainda estão preservadas em `legacy/Lumo_MVP_v1.7.html`; **não foram migradas integralmente**.
- `npm run check`: sintaxe de JavaScript e 13 testes unitários novos aprovados. Testes anteriores na Sprint 3 recuperada: 50 Pytest e 18 Node aprovados (pacote diferente).
- GitHub: código, CI, migrações, configuração Firebase e documentação na branch de trabalho.
- Drive: pacote ZIP versionado em `LUMO/08_VERSOES_E_CODIGO/LUMO_BETA_PRIVADA_22NOV2026.zip`.

## Bloqueios ainda abertos

- **Não há deploy no Firebase**, nem projeto/site Firebase configurado e comprovado nesta execução. O `firebase.json` está pronto para integração, não é prova de deploy.
- Não existem usuários reais cadastrados, e-mail confirmado, sessão validada pelo app ou prova entre dois aparelhos.
- O ambiente de testes impediu HTTP localhost e Playwright com Chromium instalado incompleto. O teste de navegação browser real **não passou** e não foi computado entre aprovados.
- Ainda não existem no frontend novo scanner EAN, módulo de NFC-e, histórico e animação completa dos sete mascotes originais. Os elementos desses sistemas continuam nos artefatos de referência, não na nova Beta.
- Falta validar ataques contra RLS via API HTTP com JWTs reais, revogação de convite, persistência offline em celulares e backup/restauração.

## Próximo gate

**G1/G2:** ativar login e duas contas reais de teste, validar Auth/RLS REST, convite, revogação, operar em dois celulares, cortar rede e confirmar replay idempotente; só depois publicar site privado no Firebase. Não importar dados fiscais pessoais antes de homologação.

Referência: [Modelo S4-18](https://docs.google.com/document/d/1Hzk6xzo0L_lG1t6XoiuSQBzgcGGySuLEFyvjfYxJm3A/edit).
