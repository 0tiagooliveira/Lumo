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

## Aprendizado automático do catálogo (fase local)

Ao abrir listas com EAN/GTIN válido e foto ausente ou referência expirada, o Lumo consulta uma base pública autorizada com limites de **12 códigos por sessão** e **duas consultas simultâneas**, mantendo a compra utilizável mesmo com falhas de rede. A consulta pode adicionar ao catálogo **local** nome, marca, apresentação, foto e fonte, sem sobrescrever o nome ou o preço personalizado do item. O cache de referências é reavaliado após 14 dias quando o código é consultado novamente.

Este não é um catálogo global: a base de produtos compartilhada no Supabase e os trabalhos automáticos de atualização ainda dependem da camada servidor com RLS, validação e respeito às licenças. O desenho está em `docs/CATALOGO_VIVO_ARQUITETURA_20261123.md` e o DDL de rascunho em `docs/sql/CATALOGO_VIVO_DDL_RASCUNHO.sql` na branch de desenvolvimento. A validação do DDL foi transacional com ROLLBACK e não alterou o banco definitivo.

## Atualização de confiabilidade

A foto de um produto agora é invalidada quando o usuário altera o EAN ou muda a identificação de um item sem EAN; assim, uma embalagem anterior não fica associada ao produto novo. O teste Chromium cobre a troca do EAN de açúcar União 1 kg para 5 kg e verifica a fotografia correspondente. A revisão também aumenta a confiabilidade do deploy: grava um manifesto público com o SHA exato, impede cache da verificação e valida a versão servida pelo Firebase.

**Situação final deste registro:** a versão com fotos foi **publicada** e a verificação de origem/commit no Firebase passou. Nenhuma chave deve ser enviada por mensagem ou salva em Markdown.

## Atualização automática de cadastros — publicação confirmada

- **Revisão publicada:** `6f936c45fb8440f7b50cd8664fa53c80cca76db6`.
- **Validação GitHub Actions:** https://github.com/0tiagooliveira/Lumo/actions/runs/45095701750 (testes pré-deploy, Firebase Hosting live, SHA público e gate de login em Chromium mobile/tablet aprovados).
- **Aprendizado local:** EAN reconhecido acrescenta catálogo com nome, marca, embalagem, foto e procedência, respeitando edições pessoais; referências podem ser revalidadas após 14 dias, com limites de consultas.
- **Catálogo central ainda pendente:** proposta RLS e filas privadas foram validadas apenas em transação revertida; não há escrita compartilhada nem agendamento ativo no Supabase.
- **Licenciamento:** fornecedores abertos têm condições de reutilização e atribuição; o registro de origem deve acompanhar futuras republicações de fotos/metadados.

