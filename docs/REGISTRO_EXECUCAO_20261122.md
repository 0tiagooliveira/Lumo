# Registro de execução — resgate da experiência original

**Data:** 2026-11-22  
**Ramo previsto:** `work/ux-restore-2026-11-22`  
**Motivação:** usuário rejeitou regressão do produto na Beta de autenticação reduzida.

## Trabalho concluído nesta rodada

1. Auditoria direta do HTML integral v1.7, do frontend Beta e da documentação do Drive. A interface v1.7 contém 147 funções declaradas e código para onboarding, 5 destinos principais, compra, scanner, notas, catálogo, histórico, backup e 7 mascotes. **Presença ≠ homologação.**
2. Criado `web/index.html` a partir do v1.7; alterações confinadas a gate Google, namespace local por usuário, eventos de sincronização e painel compartilhado; `legacy/Lumo_MVP_v1.7.html` não foi substituído.
3. Código de Auth Google existente reutilizado e validado; OAuth PKCE permanece sem secrets no frontend.
4. Camada cloud opt-in para listas e itens, com `operation_id`, campos em centavos, polling, comparação de revisões, painel de conflitos, convite e autorização de membros.
5. Migração SQL aplicada no projeto Supabase: `lumo_cloud_list_compat_and_tombstones`. Testes transacionais reverteram tudo. A consulta final manteve 1 usuário Google já existente, 0 listas e 0 itens de teste.
6. Testes Node e Chromium sintético. **44/44 Node aprovados**; renderização 360/390/430; caminho onboarding/lista/compra/histórico/nota sem exceções JavaScript no teste sintético; mock de dois celulares cobre convite, sincronização, offline e conflito. **Não substituir por prova real.**

## O que não foi feito

- Nenhum deploy Firebase desta branch nesta rodada: `beta-privada` permanece hospedando a versão reduzida. O novo canal `ux-restored` precisa de execução Cloud Shell.
- Scanner físico, OCR/PDF/XML e notas fiscais reais não foram verificados.
- A UX original voltou, mas o backend ainda sincroniza **somente partes de listas e itens**, não histórico/notas/catálogo/temas.
- Não foi acessado o diretório Windows mais recente, que pode conter melhorias após o ZIP Sprint 3 v5.
- Não foi homologado login Google na nova `index.html` com servidor real; o fluxo OAuth antigo foi comprovado no laboratório do usuário, não nesta branch.

## Regras para próxima iteração

- Não remover funcionalidades do MVP só porque um novo backend ainda não tem endpoints.
- Em cada tela, distinguir **dados locais, pendentes e confirmados**. Jamais apresentar rótulo global de "Sincronizado" enquanto notas e histórico são locais.
- Integrar módulos restantes via contratos específicos no Supabase; comparar o original e a versão recuperada em tela real antes de alterar design.
- Antes de usar dados pessoais, revogar Google OAuth Client Secret compartilhado e testar RLS com duas contas reais em HTTPS.
