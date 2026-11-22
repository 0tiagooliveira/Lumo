# Lumo — correção de rota: Beta técnica NÃO substitui MVP v1.7
**Data:** 22/11/2026  
**Estado:** BLOQUEIO DE QUALIDADE DE PRODUTO — o login Google real funciona, mas a interface publicada é uma regressão.  
**Gatilho:** usuário observou que os MVPs anteriores eram muito mais evoluídos.

## 1. Fontes efetivamente examinadas
1. `legacy/Lumo_MVP_v1.7.html` preservado no GitHub (original ~346 KB, interface e ações geradas dinamicamente por JavaScript).
2. `web/index.html`, `web/app.js`, `web/style.css` na branch `work/bootstrap-2026-11-22` (Beta simplificada que foi publicada no Firebase).
3. Fonte local arquivada **Sprint 3 v5**: `Lumo_Sprint3_Windows_Inicializador_v5.zip`, com `app/static/index.html`, `app/static/scanner.js`, `app/static/app.js`, `app/receipt.py` e catalogo candidato. O backend laboratorial não tem segurança para exposição pública e não deve ser copiado para a internet.
4. Documento oficial `BASELINE APROVADA — Preservar UX, fluxos e funcionalidades do MVP v1.7`, Drive ID `1k9le4dEao5h-wjE3YbeMLRZbw_cnkTg6NupJn3guKWc`.
5. Planejamento UX/UI V2.2, Drive ID `1vZaEOXnFU5_b05emtQ4TANZ1u5binFfw29T-iKFnA0Q`.

**Limitação:** o estado mais recente da pasta Windows `D:\Documentos\LUMO` não foi auditado, e pode conter correções posteriores ao ZIP Sprint 3. Não declarar o arquivo v1.7 a última versão de código.

## 2. Comparação de paridade funcional (presença no código, não homologação)
| Fluxo / identidade | MVP v1.7 | Sprint 3 lab | Beta Firebase de 22/11 |
|---|---|---|---|
| Onboarding (tema, objetivo, preferências, primeira lista, mascote) | Presente | Não é foco | **Ausente** |
| Início com atalhos e navegação contextual | Presente | Layout lab | **Ausente** |
| Menu: Início, Listas, No mercado, Nota, Histórico, Configurações | Presente | Parcial | **Reduzido a listas** |
| Escolha de cores/tema e mascotes com reações | Presente | Não é foco | **Quase ausente** |
| Criar/editar lista e itens | Presente | Presente | Presente (simplificado) |
| Modo compra, carrinho, indisponível, conclusão | Presente | Parcial, com fechamento fiscal | **Ausente** |
| Scanner EAN, câmera, fallback manual | Presente no código | Scanner modular laboratorial | **Ausente** |
| Busca de catálogo e GTIN | Presente | Catálogo candidato ~13 mil GTIN, NÃO homologado | **Ausente** |
| QR de nota, importação XML/PDF/fotos e conferência | Fluxos explorados, sem homologação real | Parser XML com revisão e limite | **Ausente** |
| Histórico e detalhes de compras fechadas | Presente | Snapshot em API do lab | **Ausente** |
| Backup/recuperação e preferências | Presente | Lab técnico | **Ausente** |
| Login Google + Supabase RLS + convites | Não integrado | Token demonstrativo inseguro na internet | Implementação inicial; **primeiro login real confirmado** |
| Fila offline, idempotência e revisão | Esboço local | Implementação técnica testada | Implementação inicial, **dois celulares ainda não testados** |

**Erro cometido:** a infraestrutura nova foi desenvolvida em tela reduzida como se fosse o produto, contrariando R01–R07 da baseline. Não promover a aparência atual como aprovação de UX. Preview do Firebase fica com status **laboratório de autenticação e backend**, não Beta de produto.

## 3. Requisitos de recuperação SEM regressão
**RN01 — Código/identidade:** usar v1.7 como referência histórica real de navegação, componentes, mascotes, arte, estados e microinterações; usar a versão Windows atualizada como referência de implementação depois de obtê-la. Não converter o MVP inteiro em protótipo empobrecido.
**RN02 — Arquitetura:** preservar Supabase Auth Google (PKCE) e RLS; migrar componentes e fluxos da interface anterior ao frontend integrado, sem reaproveitar endpoints inseguros da Sprint 3.
**RN03 — Navegação:** reinstalar `home`, `lists`, `list`, `purchase`, `history`, `note`, `settings`, além de onboarding e seus estados. Navegação e retorno preservam contexto e posição; nunca resetar ao 3º scan.
**RN04 — Dados:** mapear `shopping_lists` e `list_items` já criados; implementar `shopping_sessions` e `session_items` operacionais com transações/RPC antes de exibir compra como concluída; notas exigem esquema privado/RLS antes de uso. Histórico não usa dados falsos.
**RN05 — Offline:** IndexedDB/outbox idempotente por `operation_id`, ACK antes do rótulo sincronizado, conflitos explícitos, testes em dois celulares; não apagar dados da lista ao finalizar.
**RN06 — Scanner:** portar câmera EAN com alvo horizontal, fallback e confirmação explícita; frame repetido não incrementa item; GTIN conferido antes de associar fotos ou catálogo; testes em Android real.
**RN07 — Fiscal:** preservar pesquisa/fluxos de QR/XML/foto/PDF, mas rotulá-los não homologados até haver fonte autorizada e validação; nunca usar endpoints de laboratório público.
**RN08 — UX/UI:** superfícies neutras, laranja intenso, mascotes e temas, tipografia leve, botões compactos e acessíveis, pictogramas próprios; animações sem repetição global, respeitar `prefers-reduced-motion`.
**RN09 — Testes:** inventário de ações e controles do MVP + capturas lado a lado a 360/390/430px; cada tela migra com checklist de paridade antes de entrar em release.
**RN10 — Segurança:** trocar Google Client Secret exposto, manter RLS, manter hospedagem preview apenas para dados fictícios até gates aprovados.

## 4. Execução técnica recomendada
**Etapa A: congelar baseline.** Não redesenhar mais a Beta reduzida como se fosse produto. Manter `legacy/Lumo_MVP_v1.7.html` intocado, reservar `web/` como laboratório, e solicitar/recuperar a última árvore Windows da Sprint 3 se existir mais nova.
**Etapa B: construir adaptador de dados.** Criar camada de serviços (Auth, listas, itens, sessões, fiscal, preferências) desacoplada dos componentes de tela. Conservar as RPCs seguras; projetar as que faltam. Definir migração de estado local e backup sem perda.
**Etapa C: recuperar fluxos de maior valor.** (1) home e navegação + identidade + onboarding; (2) listas e itens completos; (3) modo compra; (4) scanner/catálogo; (5) histórico; (6) nota fiscal; (7) temas/mascotes e polimento final. Cada etapa exige comparação e teste; não registrar como implementado antecipadamente.
**Etapa D: homologar.** Duas contas Google reais, dois celulares físicos, offline/reconexão, múltiplos EAN, preço por peso, documento fiscal fictício, história imutável, perfis não autorizados, logout, backups; só então aprovar UI Beta do produto.

## 5. Regra de entrega
Nenhuma tela nova substitui a correspondente da v1.7 se tiver menos controles, opções ou fluxos sem uma justificativa, alternativa concreta e aprovação. A versão publicada hoje é prova de infraestrutura, **não** substituição da v1.7. O progresso Google/Supabase/Firebase é conservado. A paridade e qualidade do app continuam PENDENTES.

Referências: [Baseline aprovada](https://docs.google.com/document/d/1k9le4dEao5h-wjE3YbeMLRZbw_cnkTg6NupJn3guKWc/edit) · [UX V2.2](https://docs.google.com/document/d/1vZaEOXnFU5_b05emtQ4TANZ1u5binFfw29T-iKFnA0Q/edit) · [MVP preservado](https://github.com/0tiagooliveira/Lumo/blob/work/bootstrap-2026-11-22/legacy/Lumo_MVP_v1.7.html).
