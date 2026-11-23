# Lumo — candidato de entrega e gates (22/11/2026)

## Estado comprovado
- GitHub PR #1: branch de lançamento, incorporou PR #2 e as correções do scanner/Fotos, preço rápido, voz, WhatsApp, iconografia, notas e PDF alternativo.
- O CI valida contratos Node e navegação Chromium sintética, **não** confirma foco da câmera ou importação do PDF real.
- O site antigo `https://uselumo.web.app` já foi acessado pelo usuário, mas o SHA candidato **não** foi comprovado no Hosting.
- Supabase Lumo: tabelas de listas/participantes/itens/sessões implantadas com RLS, 3 migrações; auditoria em 22/11 encontrou 1 conta e **zero listas na nuvem**, então não é possível declarar sincronização de duas pessoas homologada.
- A NFC-e do usuário abre no portal oficial. O PDF foi selecionado mas o extrator original retornou sem itens. O parser alternativo **não foi ensaiado com esse PDF**, só com casos sintéticos.
- Não publicar notas, chaves fiscais, screenshots com CPF, credenciais, tokens ou detalhes privados de incidentes de segurança no repositório público.

## Configuração segura do destino
`firebase.json` declara `hosting.site = "uselumo"`. Antes de qualquer deploy, o operador deve verificar com a CLI autenticada se o site `uselumo` pertence ao projeto Firebase correto:

```bash
firebase hosting:sites:list --project lumo-515518
```

**ABORTAR** se `uselumo` não existir nesse projeto. Nenhum deploy automático, token ou segredo foi incluído neste repositório.

## Prévia, validação e lançamento
1. Confirmar commit atual na branch `codex/public-release-2026-11-22` e salvar a identificação (SHA).
2. Executar `npm run check` e smoke real em Chromium. Não eliminar testes para obter aprovação.
3. Preparar preview separado, via Firebase CLI autenticada: `firebase hosting:channel:deploy lumo-qa --project lumo-515518 --expires 1d`. **Não altera live**.
4. Testar no celular e tablet reais (Chrome): EAN chocolate e chá; QR pela câmera frontal e traseira; seleção de lente, foco, zoom, flash se suportado, Foto/cancelar/retomar sem recarregar.
5. Testar conta A + conta B, convite de uso único, RLS com terceiro não autorizado, sincronização de 15 itens, edição concorrente, offline e retorno. Fazer backup dos dados locais de teste.
6. Importar um PDF DANFE real/anonimizado e, como caminho alternativo, XML real com autorização. Conferir loja, data, cada item, quantidade, total e diferenças. Caso haja só a chave QR, exibir estado incompleto — sem dados inventados.
7. Marcar T01–T16 e gates G0–G5 na planilha. Reprovação crítica → **NO-GO**, não publicar.
8. Depois do GO explícito do usuário, disponibilizar o mesmo SHA aprovado em `uselumo.web.app` com `firebase deploy --only hosting --project lumo-515518`.
9. Verificar SHA servido, login, listas e scanner no domínio real. Preservar versão anterior para retorno e registrar o release na planilha.

## Segurança e limites
- Verificar configuração e rotação preventiva das credenciais de autenticação, sem gravar valores no código nem na planilha.
- Auditar as políticas de acesso e privilégios das funções RPC e executar testes negativos de autorização com usuários distintos antes do GO.
- QR da NFC-e normalmente é referência/URL fiscal, não os produtos completos.
- `web/fiscal-pdf-fallback.mjs` é leitura conservadora e exige revisão. Arquivo PDF original do usuário ainda é necessário para corrigir com segurança o layout específico.
