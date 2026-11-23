# Lumo — Publicação Firebase com fotos reais

**Estado:** publicação **não concluída**; bloqueada por falta de credencial Firebase no GitHub Actions.

## Candidato

- Repositório: `0tiagooliveira/Lumo`
- Código testado: `eeb0033a8d8639d15f8497abd7010a3459d34976`
- Branch de release: `release/uselumo-photos-20261123`
- Projeto Firebase: `lumo-515518`
- Site Firebase Hosting: `uselumo`
- URL pretendida: https://uselumo.web.app/
- Publicação: workflow `.github/workflows/firebase-live-release.yml`

## Funcionalidades

A experiência v1.7 preserva mascotes, listas, scanner, notas, compras e histórico locais, com login Google e sincronização progressiva da lista. Fotos reais de produtos são exibidas na lista e no modo mercado mediante correspondência segura por EAN/GTIN (ou nome exatamente igual a catálogo confirmado). Ao carregar uma foto de um host não confiável ou falhar a imagem, um ícone específico do produto continua visível. Fotos são solicitadas somente por HTTPS e não são gravadas no banco de lista compartilhada.

## Evidências

- GitHub Actions (PR): https://github.com/0tiagooliveira/Lumo/actions/runs/45092856390 — Node, Chromium e PostgreSQL aprovados.
- Supabase: migração `20261123010741_lumo_preserve_item_initial_state` **aplicada e verificada**, sem criação de listas/itens fictícios permanentes.
- GitHub Actions (release): https://github.com/0tiagooliveira/Lumo/actions/runs/45092902562 — testes `npm run check` passaram, mas deploy interrompido pela ausência da credencial `FIREBASE_SERVICE_ACCOUNT_LUMO_515518` ou `FIREBASE_SERVICE_ACCOUNT`.
- **Nenhuma nova versão foi publicada no Firebase nessa tentativa.**

## Como finalizar com segurança

1. Configurar uma credencial de serviço **com permissões mínimas de Firebase Hosting** para o projeto `lumo-515518`. O fluxo oficial `firebase init hosting:github` pode ajudar a criar e armazenar credenciais do GitHub Actions. Conferir as permissões do serviço com o administrador.
2. Em https://github.com/0tiagooliveira/Lumo/settings/secrets/actions, criar o segredo de repositório `FIREBASE_SERVICE_ACCOUNT_LUMO_515518` (JSON da conta de serviço). **Nunca adicionar a credencial ao repositório, ao chat ou a um documento compartilhado.**
3. Abrir https://github.com/0tiagooliveira/Lumo/actions/runs/45092902562 e usar **Re-run failed jobs** (depois do segredo configurado). O workflow só publica após os testes aprovarem; o target é verificado.
4. Confirmar que `https://uselumo.web.app/` mostra a nova interface completa e um item com foto conhecida; validar em navegador anônimo e nos dois dispositivos.
5. Testar a autenticação Google real e a sincronização com duas contas, scanner e notas. A aprovação prévia em CI e API HTTP sintética não substitui esta homologação.

**Atenção:** o login pode falhar se os domínios/redirects não estiverem permitidos no projeto de autenticação Supabase e na configuração OAuth Google. Não declarar produção pronta sem validar esses caminhos.
