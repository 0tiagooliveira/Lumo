# Lumo — endereço curto gratuito no Firebase Hosting

**Decisão em avaliação:** site adicional no projeto Firebase `lumo-515518`, preservando o site padrão `lumo-515518.web.app` e os canais de prévia anteriores.

## Opções de nome (disponibilidade ainda não verificada no Firebase)
1. `uselumo.web.app` — preferido; sete caracteres, fácil de dizer e digitar.
2. `meulumo.web.app` — alternativa pessoal.
3. `lumocompras.web.app` — alternativa descritiva.

IDs de sites devem ser mundialmente únicos. **A busca web não comprova disponibilidade.** A única confirmação neste fluxo será o resultado de `firebase hosting:sites:create SITE_ID`, autenticado no projeto; se falhar por ID reservado, não tente “forçar” outro projeto.

## Como reservar no Cloud Shell

```sh
cd ~
git clone --single-branch --branch work/ux-restore-2026-11-22 https://github.com/0tiagooliveira/Lumo.git Lumo-Curto
cd Lumo-Curto
bash scripts/firebase-endereco-curto.sh reservar uselumo
```

Se o clone `Lumo-Curto` já existir, use `cd ~/Lumo-Curto && git pull --ff-only`, e execute somente a última linha.

Se `uselumo` não estiver disponível, escolha `meulumo` ou `lumocompras` e repita **somente** o comando `reservar` com esse ID.

**Reservar não publica nada.** Não forneça credenciais Google Client Secret no terminal ou no repositório.

## Como publicar, depois de rotacionar o Client Secret e confirmar os gates

```sh
cd ~/Lumo-Curto
git pull --ff-only
bash scripts/firebase-endereco-curto.sh publicar uselumo
```

O script confirma o site, configura um deploy target próprio, copia a configuração original para um arquivo temporário restrito ao site adicional, executa `npm run check`, e publica somente `hosting:lumo-curto`. Não altera o conteúdo dos sites anteriores. Não é necessário executar `firebase init`.

Em seguida:
1. Adicione `https://uselumo.web.app` exatamente em Supabase Authentication → URL Configuration → Redirect URLs, mantendo os URLs de teste úteis.
2. Se esse passar a ser o endereço principal, atualize Site URL para `https://uselumo.web.app`.
3. A URL Google Cloud **Authorized redirect URI** continua sendo a callback **do Supabase** `https://kqfsvzsgxoxxahrpyemc.supabase.co/auth/v1/callback`; não substitua pela URL `.web.app`.
4. Habilite apenas as contas Google de teste; revise convite/RLS/filas e testar autenticação HTTPS nos dois celulares.
5. **Rotacione o Google OAuth Client Secret exposto anteriormente**, atualize-o no painel Supabase e revogue o antigo, antes de usar dados reais.

## Limites e custo
Hosting oferece uma franquia gratuita ao nível do **projeto**, atualmente 10 GB de armazenamento e 10 GB/mês transferidos. O projeto está no plano Blaze: consumo excedente pode gerar cobranças. Alertas de orçamento **não são limites rígidos**. Criar um site secundário não é comprar um domínio; é usar o subdomínio `.web.app`.

## Evidência e referências
- Firebase multisite: https://firebase.google.com/docs/hosting/multisites
- Firebase CLI: https://firebase.google.com/docs/cli/
- Preços: https://firebase.google.com/docs/hosting/usage-quotas-pricing
- Código recuperado: https://github.com/0tiagooliveira/Lumo/tree/work/ux-restore-2026-11-22

**Estado desta documentação:** scripts preparados, nenhum ID alternativo reservado e nenhum deploy realizado nesta etapa. Confirmar criação pelo resultado do Cloud Shell.
