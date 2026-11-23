# Lumo — Publicação Firebase com fotos reais

**Estado:** publicação **não concluída**; bloqueada por falta de credencial Firebase no GitHub Actions.

## Candidato

- Repositório: `0tiagooliveira/Lumo`
- Código validado com proteção contra foto de EAN anterior: `b0163650f7d88f24db3c4f3f96afb4745a760212`
- Branch de release: `release/uselumo-photos-20261123`
- Projeto Firebase: `lumo-515518`
- Site Firebase Hosting: `uselumo`
- URL pretendida: https://uselumo.web.app/
- Publicação: workflow `.github/workflows/firebase-live-release.yml`

## Funcionalidades

A experiência v1.7 preserva mascotes, listas, scanner, notas, compras e histórico locais, com login Google e sincronização progressiva da lista. Fotos reais de produtos são exibidas na lista e no modo mercado mediante correspondência segura por EAN/GTIN (ou nome exatamente igual a catálogo confirmado). Ao carregar uma foto de um host não confiável ou falhar a imagem, um ícone específico do produto continua visível. Fotos são solicitadas somente por HTTPS e não são gravadas no banco de lista compartilhada.

## Evidências

- GitHub Actions (PR): https://github.com/0tiagooliveira/Lumo/actions/runs/45093360789 — Node, Chromium e PostgreSQL aprovados, incluindo correção da foto ao editar o EAN.
- Supabase: migração `20261123010741_lumo_preserve_item_initial_state` **aplicada e verificada**, sem criação de listas/itens fictícios permanentes.
- GitHub Actions (release): https://github.com/0tiagooliveira/Lumo/actions/runs/45093566387 — testes `npm run check` passaram, mas o deploy foi interrompido pela ausência do segredo `FIREBASE_SERVICE_ACCOUNT_LUMO_515518` ou `FIREBASE_SERVICE_ACCOUNT`. A publicação depende da credencial privada configurada pelo proprietário.
- **Nenhuma nova versão foi publicada no Firebase nessa tentativa.**

## Como finalizar com segurança

1. Configurar uma credencial de serviço **com permissões mínimas de Firebase Hosting** para o projeto `lumo-515518`. O fluxo oficial `firebase init hosting:github` pode ajudar a criar e armazenar credenciais do GitHub Actions. Conferir as permissões do serviço com o administrador.
2. Em https://github.com/0tiagooliveira/Lumo/settings/secrets/actions, criar o segredo de repositório `FIREBASE_SERVICE_ACCOUNT_LUMO_515518` (JSON da conta de serviço). **Nunca adicionar a credencial ao repositório, ao chat ou a um documento compartilhado.**
3. Abrir https://github.com/0tiagooliveira/Lumo/actions/runs/45093566387 e usar **Re-run failed jobs** (depois do segredo configurado). O workflow só publica após os testes aprovarem; o target é verificado.
4. O workflow grava `web/release.json` com o SHA da revisão e compara o arquivo servido por `https://uselumo.web.app/release.json` após o deploy; verificação falha se o site responder com outra revisão. Depois, conferir a interface completa e foto de produto conhecido em celular e tablet.
5. Testar a autenticação Google real e a sincronização com duas contas, scanner e notas. A aprovação prévia em CI e API HTTP sintética não substitui esta homologação.

**Atenção:** o login pode falhar se os domínios/redirects não estiverem permitidos no projeto de autenticação Supabase e na configuração OAuth Google. Não declarar produção pronta sem validar esses caminhos.

## Atualização de confiabilidade

A foto de um produto agora é invalidada quando o usuário altera o EAN ou muda a identificação de um item sem EAN; assim, uma embalagem anterior não fica associada ao produto novo. O teste Chromium cobre a troca do EAN de açúcar União 1 kg para 5 kg e verifica a fotografia correspondente. A revisão também aumenta a confiabilidade do deploy: grava um manifesto público com o SHA exato, impede cache da verificação e valida a versão servida pelo Firebase.

**Situação neste registro:** a nova versão com fotos está pronta no repositório e validada em CI, mas **não está publicada** porque o GitHub Actions não recebeu uma credencial Firebase. Nenhuma chave deve ser enviada por mensagem ou salva em Markdown.
