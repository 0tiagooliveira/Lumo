# Arquitetura planejada: Firebase Hosting + Supabase

**Estado:** planejamento técnico, não implantação confirmada.

- **Firebase Hosting**: entrega frontend estático PWA via HTTPS; regras de cache, CSP e atualização controlada. Só publicar ao existir build frontend autenticada e sem endpoints locais inseguros.
- **Supabase Auth**: login individual, a definir método (Google OAuth é candidato).
- **Supabase PostgreSQL**: dados de listas/itens/compras/histórico, RLS por dono e membro; idempotência e revisão concorrente.
- **Realtime**: sinaliza alterações, mas a confirmação vem de transação SQL persistida e ACK; ao reconectar buscar alterações por cursor/revisão.
- **IndexedDB**: outbox offline com operação única, preservar até ACK, erro/retentativa e conflito explícito.
- **Servidor fiscal privado (futuro)**: importações PDF/QR/SEFAZ autorizadas, sem expor secrets no cliente.
- **GitHub**: código versionado em branch, CI de pytest, Node e Playwright, histórico de decisões e pull requests.

## Bloqueios de deploy

A Sprint 3 atual é um laboratório FastAPI em localhost, **não** um frontend estático pronto para Firebase nem um backend seguro com usuários individuais. Não hospedar essa API sem autenticação forte, políticas, segregação de dados e revisão. Não incluir service_role, credenciais ou dados fiscais reais em repositório público. O modelo de dados S4-18 é referência de concepção, ainda não migração aprovada.

[Modelo conceitual S4-18](https://docs.google.com/document/d/1Hzk6xzo0L_lG1t6XoiuSQBzgcGGySuLEFyvjfYxJm3A/edit)