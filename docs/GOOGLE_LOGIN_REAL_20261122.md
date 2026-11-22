# Beta privada — primeiro login Google real confirmado (22/11/2026)

## Evidências
- Captura de tela enviada pelo usuário às 16h09, em tablet, com o endereço HTTPS do preview do Firebase `https://lumo-515518--beta-privada-h4r7dgnf.web.app`.
- O aplicativo abriu a tela autenticada, com saudação da conta e visualização das listas. O anterior erro de retorno a `localhost:5173` deixou de acontecer no fluxo observado.
- Consulta **real e somente leitura** ao Supabase `kqfsvzsgxoxxahrpyemc`: `auth.users = 1`, `auth.identities WHERE provider='google' = 1`, `shopping_lists = 0`, `list_items = 0`.
- Essa evidência em conjunto confirma o **primeiro registro Google Auth no banco e a abertura do app**. A captura exibe o rótulo "Sincronizado" com zero listas; o rótulo isoladamente **não prova sincronização entre celulares**.

## Próximo gate
1. Na conta autenticada, criar uma lista **fictícia** chamada "Compras de teste Lumo".
2. Confirmar persistência após recarregar e confrontar contador no banco.
3. Gerar convite de editor e aceitar a partir da segunda conta Google autorizada, em outro celular.
4. Validar isolamento do terceiro usuário, edição simultânea, perda de conexão, replay idempotente e revogação. Nenhum desses fluxos foi provado com dois celulares até esta evidência.
5. **Rotacionar o Google OAuth Client Secret previamente exposto na conversa**, atualizar o valor na configuração privada do Supabase e revogar o segredo antigo antes de dados reais.

A Beta permanece em canal **preview público** e não deve receber compras/notas fiscais reais antes das validações de segurança e privacidade.
