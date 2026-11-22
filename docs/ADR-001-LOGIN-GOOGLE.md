# ADR-001 — Conta Google é o login principal da Beta privada Lumo

**Data:** 22/11/2026  
**Status:** DECISÃO DE PRODUTO APROVADA pelo usuário; implementação frontend versionada, ativação em provedor e teste real pendentes.  
**Scope:** Beta privada com colaboração entre dois celulares.  

## Decisão

- Usar **Conta Google** como experiência principal de autenticação, com Supabase Auth como emissor de sessão/JWT; Firebase fornece apenas HTTPS/PWA, **não** um segundo banco/Auth redundante.
- **Não** iniciar login diretamente no Google usando secrets no cliente. O frontend direciona a `/auth/v1/authorize?provider=google` do Supabase e usa **PKCE S256**.
- O campo e-mail/senha permanece como alternativa recolhível para contas legadas, sem oferecer o botão de cadastro público nesta tela. A política real de cadastramento privado deve ser configurada **no servidor**; esconder botão não equivale a restringir inscrições.
- Acesso a listas continua baseado em `auth.users.id`, convites e RLS, nunca no domínio de e-mail ou apenas na existência de uma Conta Google.

## Fluxo implementado

1. Verificar `/auth/v1/settings` para confirmar que o provedor Google está habilitado. Se não estiver, mostrar orientação e não iniciar redirecionamento inválido.
2. Gerar verificador aleatório de 32 bytes no navegador, derivar SHA-256 base64url e guardar verificador em **sessionStorage**, com prazo de até cinco minutos. Não transmiti-lo no redirecionamento.
3. Redirecionar para o Auth do Supabase com `provider=google`, `code_challenge_method=s256` e `redirect_to` calculado do endereço do próprio app (sem aceitar uma URL arbitrária do usuário).
4. Ao retornar com `?code=`, remover o código imediatamente do endereço visível, consumir o verificador uma vez e trocar em `/auth/v1/token?grant_type=pkce`. Recusar retorno sem verificador, expirado ou destinado a outro caminho.
5. Consultar `/auth/v1/user` com o access token emitido, conferir `user.id`, guardar sessão do Supabase e carregar listas permitidas por RLS.
6. Atualizar sessão com refresh token; ao sair, limpar sessão e cache deste usuário localmente e tentar revogação no servidor. Operações offline pendentes permanecem no aparelho, vinculadas à conta original, mediante confirmação.
7. Convites de lista recebidos em `#invite=` ficam no **sessionStorage** através do redirecionamento, e não são usados automaticamente antes de confirmação do usuário.

## Ativação externa necessária (NÃO concluída)

1. No **Google Auth Platform**, criar OAuth Client tipo **Web application**. Na tela de consentimento, cadastrar as contas de teste da Beta e os escopos mínimos (`openid`, e-mail, perfil).
2. Adicionar aos **Authorized redirect URIs** do Google: `https://kqfsvzsgxoxxahrpyemc.supabase.co/auth/v1/callback`.
3. Adicionar aos **Authorized JavaScript origins** apenas as origens efetivamente utilizadas: a URL HTTPS Firebase confirmada, e `http://localhost:5173` somente para desenvolvimento. **Não inventar URL Firebase.**
4. Em **Supabase Dashboard > Authentication > Providers > Google**, habilitar Google e inserir **Client ID e Client Secret** diretamente no painel privado. **NUNCA registrar secret no GitHub, Drive ou frontend.**
5. Em **Supabase > Authentication > URL Configuration**, configurar Site URL e Redirect URLs com os endereços exatos do ambiente de teste (`http://localhost:5173/`, se usado) e do Firebase após criação.
6. Confirmar `/auth/v1/settings` com `external.google: true`, testar login, retorno, refresh e logout em Android e iPhone. Validar uma conta não convidada, um dono e um editor revogado; aplicar gate de acesso privado por configuração/hook/allowlist servidor quando definido.
7. O Firebase Hosting não foi implantado nesta alteração; exigirá confirmação do projeto/site e validação do gate de segurança G1/G2.

## Provas e limitações

- `npm run check`: 27 testes Node, incluindo PKCE, validade e reutilização de código, callback, redirecionamento, convite preservado, settings e exchange usando fetch simulado.
- `tests/browser_smoke.py`: verificação de layout e interação nativa de `<details>` em Chromium headless, **sem** login Google real; caminho de navegação HTTP foi bloqueado pelo ambiente.
- **Não afirmar funcionamento do Google OAuth real** até configurar credenciais do Google Cloud e Supabase e receber callback autêntico em HTTPS.
- **Não afirmar Beta completa**: scanner, fiscal, histórico e 7 mascotes integrais seguem ausentes da nova interface e devem ser portados com fidelidade a partir do MVP original.

Documentação oficial consultada: [Supabase: Sign in with Google](https://supabase.com/docs/guides/auth/social-sign-in/auth-google), [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [OAuth Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).