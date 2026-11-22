# Firebase Hosting — Projeto Lumo (22/11/2026)

## Identificação comprovada em print
- Google Cloud / Firebase Project ID: `lumo-515518`
- Firebase Hosting: habilitado; aguardando primeira implantação (nenhuma release live ainda).
- Domínios alocados: `https://lumo-515518.web.app` e `https://lumo-515518.firebaseapp.com`.
- Repositório GitHub: `https://github.com/0tiagooliveira/Lumo`.
- Branch de desenvolvimento: `work/bootstrap-2026-11-22`.
- Arquivos do frontend prontos para distribuição estática: `web/`, com `firebase.json` apontando para `web`.
- Supabase Auth: `https://kqfsvzsgxoxxahrpyemc.supabase.co`.

## Publicar primeira versão em canal de pré-visualização (Cloud Shell)
No Firebase Console do Lumo, abra o terminal Cloud Shell na barra direita; as CLIs do Google/Firebase já estão disponíveis e a conta normalmente está autenticada.

```sh
git clone --single-branch --branch work/bootstrap-2026-11-22 https://github.com/0tiagooliveira/Lumo.git
cd Lumo
npm run check
firebase hosting:channel:deploy beta-privada --project lumo-515518
```

**Não** rodar `firebase init` (o projeto tem `firebase.json` versionado). O deploy de preview retorna uma URL temporária exata para cadastrar no Supabase Auth > URL Configuration > Redirect URLs. Pré-visualização não substitui a URL live, que continua sem primeira release. Uma URL preview é publicamente acessível por qualquer pessoa que a conheça; o bloqueio de dados depende das autenticações, convites, RLS e configuração do backend.

## Depois do canal de preview
1. Copiar a URL de preview retornada pelo Cloud Shell, sem presumir o hash.
2. No Supabase: adicionar essa URL exata como Redirect URL; manter localhost durante testes. Configure Site URL HTTPS quando a implantação live estiver confirmada.
3. No Google Cloud: permitir somente as duas contas de teste; Client ID/Secret permanecem apenas no Supabase Auth, não no frontend.
4. **Rotacionar o Client Secret exposto anteriormente na conversa antes de testar com usuários reais.** Atualizar segredo no Supabase, validar e revogar o anterior.
5. Testar OAuth do Google em dois dispositivos, refresh, logout, convite, RLS, revogação e fila de operações offline.
6. Somente após gates: `firebase deploy --only hosting --project lumo-515518` para o domínio live.

Referências oficiais: https://firebase.google.com/docs/cloud-shell?hl=pt-br ; https://firebase.google.com/docs/hosting/test-preview-deploy ; https://supabase.com/docs/guides/auth/social-sign-in/auth-google .

Status: **Hosting criado, sem release**; este arquivo documenta procedimento, não prova deploy ou homologação.
