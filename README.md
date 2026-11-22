# Lumo — Beta privada | 22/11/2026

Primeiro corte funcional do serviço online, **não homologado em dois celulares reais**. Criado a partir das decisões de produto no Drive, mantendo o [MVP v1.7 original preservado](https://github.com/0tiagooliveira/Lumo/tree/work/bootstrap-2026-11-22/legacy) como baseline, sem alegar que suas funções completas já foram migradas.

## Componentes

- `web/`: frontend leve em HTML/CSS/JavaScript (sem dependências externas de build), Conta Google como login principal via OAuth PKCE do Supabase (e-mail/senha apenas para contas legadas), listas e itens compartilhados por RPC, convite com token e expiração, marcação de itens, edição de quantidade e preço, PWA instalável, cache e fila offline IndexedDB com operation ID e ACK.
- `supabase/`: migração canônica **aplicada em Supabase e versionada no GitHub**: [20261122_lumo_beta_privada_foundation.sql](https://github.com/0tiagooliveira/Lumo/blob/work/bootstrap-2026-11-22/supabase/migrations/20261122_lumo_beta_privada_foundation.sql). O arquivo `*.DRAFT.sql` do ZIP é apenas estudo preliminar e não deve ser aplicado; use a migração canônica do GitHub.
- `firebase.json`: configuração de Hosting **não publicada**.
- `tests/`: verificações Node dos contratos de preço, quantidades e operações. Também foram testados 50 Python + 18 Node do laboratório da Sprint 3 no trabalho anterior, não equivalentes ao novo frontend.

## Executar sem publicar

```bash
npm run check
python -m http.server 5173 --directory web
```

Abra `http://localhost:5173` no seu computador. O código de configuração contém só a chave pública do projeto Supabase (nunca service role). O Google OAuth foi implementado em código com PKCE/S256, mas o provedor Google no Supabase e seu Client ID/Secret ainda precisam ser configurados. Não foi verificado login Google real com duas contas. Veja `docs/ADR-001-LOGIN-GOOGLE.md` para o procedimento seguro.

Para produção, **não publique este protótipo** até concluir a matriz DB01–DB20, configurar cadastro por convite e validar autenticação, revogação, offline, backup/restore, PWA e scanner em Android/iPhone reais.

## Firebase Hosting

1. Ter projeto e site Firebase vinculados ao usuário; ainda não identificado e **nenhum deploy foi realizado**.
2. Configurar URLs de redirecionamento de autenticação no Supabase antes de publicar.
3. Instalar Firebase CLI em ambiente com rede, fazer login e selecionar um projeto explicitamente.
4. Executar `firebase deploy --only hosting --project <id-real>` somente quando segurança e testes estiverem aprovados.
5. Confirmar URL fornecida pelo Firebase e validar API, permissões e login de dois usuários.

## Limitações conhecidas

- O frontend mostra e edita listas, mas não integra ainda scanner EAN, notas fiscais, histórico e os sete mascotes originais. Essas funcionalidades continuam preservadas no arquivo de referência, **não devem ser confundidas com funcionalidades da Beta nova**.
- O conflito é detectado e preservado, com opção de revisar e reaplicar ou aceitar servidor; falta teste E2E real entre duas contas.
- A sincronização usa polling de 18 segundos e reconsulta após ACK. Realtime privado ainda é uma melhoria futura, não promessa de tempo real instantâneo.
- Sem backup externo automatizado e sem política completa de privacidade, sem aprovação da Beta para uso com dados sensíveis.
- A migração aplicada nesta sessão cria tabelas de negócio, políticas RLS e funções RPC; a disponibilidade em dois celulares permanece não comprovada.

Consulte `docs/VALIDACAO.md` para evidências e bloqueios.

## Decisão explícita de produto — A01, 22/11/2026

**Aprovado pelo usuário:** Conta Google como **login principal** da Beta privada.
O botão Google é a ação primária; contas legadas com e-mail/senha permanecem em área recolhível, sem cadastro público novo na interface.
O login real ainda **não está homologado**: é necessário habilitar o provedor no painel do Supabase e liberar usuários de teste no Google Auth Platform.
Fluxo implementado: PKCE S256, redirecionamento controlado, código de uso único removido da URL, troca com Supabase Auth, validação de identidade com `/auth/v1/user`, sessão local e logout remoto quando possível.

[Registro técnico e operacional](docs/ADR-001-LOGIN-GOOGLE.md).