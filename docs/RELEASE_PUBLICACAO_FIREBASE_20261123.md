# Lumo — Publicação Firebase com fotos reais

**Estado:** publicação **concluída** no Firebase Hosting `uselumo`; verificação de domínio e SHA aprovado no GitHub Actions (tentativa 2, 23/11/2026 UTC).

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
- GitHub Actions (release): https://github.com/0tiagooliveira/Lumo/actions/runs/45093566387 — tentativa 2 **aprovada**. O segredo ficou disponível, o Firebase Hosting publicou a versão e a verificação HTTP confirmou o SHA.
- **O Lumo com fotos foi publicado em `https://uselumo.web.app/`**, SHA de deploy `bc8317de92cfbba560e62358ab6b11114d3e7959`.

## Configuração de publicação realizada

A credencial privada foi adicionada pelo proprietário como segredo do GitHub Actions; seu conteúdo não foi exibido neste registro. Após a configuração, o job `firebase-live` foi executado novamente e passou nas etapas de testes, publicação e verificação da versão servida em HTTPS. A release usa o SHA `bc8317de92cfbba560e62358ab6b11114d3e7959`.

**Próximos testes de homologação:** entrar com Google no celular e no tablet, conferir imagens reais por EAN, simular uma compra, ler um EAN pela câmera e testar compartilhamento da lista entre duas contas. A aprovação do deploy não certifica esses fluxos físicos. Caso o login apresente erro de redirecionamento, verificar os domínios e redirects autorizados no Supabase e no provedor Google.

**Atenção:** o login pode falhar se os domínios/redirects não estiverem permitidos no projeto de autenticação Supabase e na configuração OAuth Google. Não declarar produção pronta sem validar esses caminhos.

## Atualização de confiabilidade

A foto de um produto agora é invalidada quando o usuário altera o EAN ou muda a identificação de um item sem EAN; assim, uma embalagem anterior não fica associada ao produto novo. O teste Chromium cobre a troca do EAN de açúcar União 1 kg para 5 kg e verifica a fotografia correspondente. A revisão também aumenta a confiabilidade do deploy: grava um manifesto público com o SHA exato, impede cache da verificação e valida a versão servida pelo Firebase.

**Situação final deste registro:** a versão com fotos foi **publicada** e a verificação de origem/commit no Firebase passou. Nenhuma chave deve ser enviada por mensagem ou salva em Markdown.
