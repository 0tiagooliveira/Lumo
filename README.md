# Lumo

Aplicativo de compras compartilhadas, com listas, modo mercado, leitura de códigos, preços, histórico e conciliação fiscal.

## Estado da base (22/11/2026)

Repositório inicializado para preservar e auditar as fontes. **Não há Beta online aprovada**. O código funcional mais recente recuperado é o pacote local da Sprint 3 (FastAPI/JavaScript); o MVP v1.7 é a referência histórica visual e funcional. A última árvore corrigida no computador Windows ainda precisa ser comparada antes de declarar qualquer versão definitiva.

## Prioridades

1. Preservar integralmente as funcionalidades e os sete mascotes, com melhorias pontuais.
2. Criar autenticação e autorização por lista (Supabase Auth, PostgreSQL e RLS).
3. Implementar sincronização offline com ACK real, idempotência e resolução de conflitos.
4. Manter preço em centavos, produtos sem preço como NULL e histórico imutável.
5. Preparar PWA HTTPS no Firebase Hosting; jamais publicar o laboratório FastAPI atual sem autenticação e revisão de segurança.
6. Automatizar testes Python, JavaScript e Playwright, além de testes com dois celulares reais.

## Documentos de referência

- [Decisões registradas no Drive](https://docs.google.com/document/d/1SaeMRVCzcSHl6u7VFvTSV47sx3ehxt_Ortn5M7E2ESs/edit)
- [Modelo de dados e segurança S4-18](https://docs.google.com/document/d/1Hzk6xzo0L_lG1t6XoiuSQBzgcGGySuLEFyvjfYxJm3A/edit)
- [Baseline preservada](https://docs.google.com/document/d/1k9le4dEao5h-wjE3YbeMLRZbw_cnkTg6NupJn3guKWc/edit)
- [Cronograma do piloto de 30/11](https://docs.google.com/spreadsheets/d/18Vd3ZlvMPhUkB-Ns7eHmlkw-gyjz7cr4/edit)

## Segurança e contribuição

Não enviar dados fiscais reais, chaves de acesso fiscais, tokens, senhas, credenciais, service-role ou dumps pessoais para este repositório público. Mudanças de backend e interface devem ser feitas em branch, com teste, evidência e revisão antes de mesclar em main.

O plano de trabalho atual está em [docs/PLANO_2026-11-22.md](docs/PLANO_2026-11-22.md).
