# Lumo — validação automatizada em 22/11/2026

Fonte: pacote local recuperado **Lumo_Sprint3_Windows_Inicializador_v5.zip**, com banco SQLite isolado e fixtures sintéticas. Não é o código definitivo Windows, não autentica usuários individuais e não está publicado.

## Resultados efetivamente executados

| Etapa | Status |
| --- | --- |
| `python -m pytest -q tests` | **PASSOU: 50 testes** |
| `node --test tests-js/*.test.cjs` | **PASSOU: 18 testes** |
| Importação de 13.113 GTINs candidatos no SQLite isolado | **PASSOU**; candidatos não homologados |
| API HTTP real localhost, subtotal pesável, XML fictício, histórico idempotente e GTIN repetido | **PASSOU** |
| Persistência após reiniciar servidor local | **PASSOU** |
| Playwright Chromium + API real | **BLOQUEADO**: política do ambiente bloqueou navegação localhost (net::ERR_BLOCKED_BY_ADMINISTRATOR) |
| Scanner físico, iPhone/Android, OCR fiscal, QR/SEFAZ, OAuth/RLS, Firebase Hosting | **NÃO TESTADO** |

Nunca marcar os 17 testes oficiais em celulares físicos como aprovados sem evidências reproduzíveis. A versão de laboratório tem mecanismo de compartilhamento simplificado, não deve ser publicada na internet.

Documentação detalhada de referência: [baseline](https://docs.google.com/document/d/1k9le4dEao5h-wjE3YbeMLRZbw_cnkTg6NupJn3guKWc/edit).