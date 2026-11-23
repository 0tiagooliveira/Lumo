# Lumo — guia de teste no celular

Abra `https://uselumo.web.app` no Chrome do celular e confirme o cadeado HTTPS.

1. Toque em **Continuar com Google** e confirme que retorna ao Lumo sem o aplicativo pedir senha.
2. Crie uma lista, adicione um item manual e recarregue a página para conferir a persistência.
3. Em **Configurações**, troque tema e mascote. A lista deve permanecer intacta.
4. Abra uma lista, entre em **No mercado**, marque um item e confira o total.
5. Abra o scanner, permita a câmera e leia um EAN/GTIN. Espere uma confirmação e uma única inclusão.
6. Leia dois códigos diferentes e repita o primeiro. A interface não deve voltar ao início nem duplicar acidentalmente.
7. No scanner de nota, leia um QR de NFC-e autorizado. Confira a referência fiscal antes de salvar.
8. Se possuir XML legítimo, importe-o e revise os itens antes de confirmar.
9. Conclua uma compra e confira o **Histórico**; a lista não deve ser apagada.
10. Em dois celulares com contas de teste, compartilhe uma lista, faça uma alteração offline e reconecte. O app deve preservar a alteração e mostrar conflitos, sem sobrescrever dados silenciosamente.

Marque cada etapa como **Passou**, **Falhou** ou **Não testado**, incluindo modelo do aparelho, navegador e horário. Não envie capturas contendo QR fiscal, chave de acesso, e-mail ou endereço.

## Limites

Ler um QR fiscal não autoriza extração automática de todos os itens. Se uma fonte oficial exigir CAPTCHA, sessão, credencial ou não expuser itens estruturados, use a consulta oficial ou XML fornecido pelo usuário. A validação física de câmera e dois aparelhos continua obrigatória.
