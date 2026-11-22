# Lumo — roteiro de validação no celular

Data: 22/11/2026  
Ambiente: `https://uselumo.web.app` (HTTPS)

Este roteiro separa o que foi exercitado automaticamente do que precisa de aparelhos reais. Não use notas fiscais ou dados pessoais em testes de homologação.

## Antes de começar

1. Abra o Lumo no Chrome do celular, em uma rede confiável.
2. Confirme que o endereço começa com `https://uselumo.web.app`.
3. Use duas contas Google de teste diferentes se for validar compartilhamento.
4. Para a câmera, permita o acesso somente quando o navegador perguntar dentro do Lumo.
5. Prepare uma embalagem com EAN/GTIN válido e, se desejar, uma NFC-e de teste autorizada ou um XML fornecido legitimamente.

## Roteiro

| # | Ação | Resultado esperado | Situação |
| --- | --- | --- | --- |
| 1 | Toque em **Continuar com Google** e conclua o login. | Retorno seguro ao Lumo; nenhuma senha é pedida pelo app. | Requer conta/configuração OAuth real. |
| 2 | Crie uma lista e inclua um item manual. | Item aparece na lista e sobrevive a recarregar a página. | Automação de lógica aprovada; validar no aparelho. |
| 3 | Em Configurações, altere tema e mascote. | A aparência e o mascote mudam sem perder a lista. | Paridade estática aprovada. |
| 4 | Abra uma lista, entre em **No mercado** e marque um item. | O estado de compra e o total são atualizados. | Automação de lógica aprovada; validar no aparelho. |
| 5 | Abra o scanner de produto, aceite a câmera e aponte para um EAN/GTIN. | Leitura contínua, confirmação discreta e uma única inclusão do produto. | Requer câmera física; não concluir por emulação. |
| 6 | Leia dois códigos diferentes e repita o primeiro. | Não há salto para a tela inicial nem duplicação acidental. | Requer câmera física. |
| 7 | No scanner de nota, leia QR de NFC-e. | O Lumo extrai a referência/chave quando presente e abre a revisão. | Requer documento autorizado. |
| 8 | Na revisão fiscal, confira loja, data, total e itens antes de salvar. | Somente dados informados no XML ou revisados manualmente são gravados. | Consulta oficial automática ainda não homologada. |
| 9 | Se tiver XML legítimo, importe-o pela opção de XML e revise antes de confirmar. | Itens aparecem para conferência; uma nota repetida é bloqueada. | Requer XML de teste. |
| 10 | Conclua uma compra e abra Histórico. | Compra aparece com seus itens; lista original não some. | Paridade estática aprovada; validar no aparelho. |
| 11 | Com a segunda conta, conecte uma lista e crie/aceite um convite. | Apenas participantes veem a lista; alterações entram em fila quando offline. | Requer OAuth e duas contas reais. |
| 12 | Desligue a internet, altere um item e religue. | Alteração local é mantida e sincroniza após ACK; conflito é mostrado, não sobrescrito. | Teste lógico aprovado; exige dois aparelhos. |

## Registro da validação

Para cada etapa, anote **Passou**, **Falhou** ou **Não testado**, o modelo do celular, navegador e horário. Em uma falha, capture a tela sem expor QR fiscal, chave de acesso, e-mail ou endereço.

## Limites conhecidos

- A leitura de QR fiscal não representa, por si, autorização para extrair todos os itens de uma NFC-e. Quando uma fonte oficial exigir CAPTCHA, sessão, credencial ou não expuser itens estruturados, o Lumo deve abrir a consulta oficial ou aceitar XML fornecido pelo usuário; não deve contornar o controle.
- O teste automatizado não substitui permissão de câmera real, leitura de embalagem real, duas contas Google reais ou teste de dois celulares.
