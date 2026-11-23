# Lumo: publicar SOMENTE uma prévia temporária do Hosting (não altera o domínio live).
# Uso no ambiente autorizado: powershell -ExecutionPolicy Bypass -File scripts/preview-firebase.ps1
param(
 [string]$ProjectId = "lumo-515518",
 [string]$SiteId = "uselumo",
 [string]$ChannelId = "lumo-qa",
 [string]$Expires = "1d"
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repo
try {
 if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw "Git nao encontrado." }
 if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw "Node/npm nao encontrado." }
 if (-not (Get-Command firebase -ErrorAction SilentlyContinue)) { throw "Firebase CLI nao encontrada. Execute npm install -g firebase-tools no ambiente autorizado." }

 $branch = (& git branch --show-current).Trim()
 if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel identificar a branch." }
 if ($branch -ne "codex/public-release-2026-11-22") { throw "Branch incorreta ($branch). Use a candidata codex/public-release-2026-11-22." }
 $dirty = & git status --porcelain
 if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel verificar alteracoes locais." }
 if ($dirty) { throw "Ha alteracoes nao versionadas: registre ou descarte conscientemente antes da previa." }
 $sha = (& git rev-parse HEAD).Trim()
 if ($LASTEXITCODE -ne 0) { throw "Nao foi possivel ler o SHA." }

 $config = Get-Content -Raw -LiteralPath (Join-Path $repo "firebase.json") | ConvertFrom-Json
 if ($config.hosting.public -ne "web" -or $config.hosting.site -ne $SiteId) {
  throw "firebase.json nao aponta ao site esperado ($SiteId) nem ao diretorio web."
 }
 Write-Host "Lumo: validando fonte SHA=$sha..."
 & npm run check
 if ($LASTEXITCODE -ne 0) { throw "Testes falharam. Deploy abortado." }

 Write-Host "Lumo: conferindo site autorizado $SiteId no projeto $ProjectId..."
 $sites = (& firebase hosting:sites:list --project $ProjectId 2>&1 | Out-String)
 if ($LASTEXITCODE -ne 0) { throw "Falha ao consultar sites Firebase. Confirme login e permissoes." }
 if ($sites -notmatch [regex]::Escape($SiteId)) { throw "Site $SiteId nao encontrado no projeto $ProjectId. Deploy abortado." }

 Write-Host "Lumo: publicando PREVIA temporaria (NAO LIVE) no canal $ChannelId"
 & firebase hosting:channel:deploy $ChannelId --project $ProjectId --expires $Expires
 if ($LASTEXITCODE -ne 0) { throw "Deploy de previa falhou. Dominio live nao foi alterado." }
 Write-Host "Previa gerada a partir do SHA $sha. Registre a URL no Drive e execute QA real antes do GO."
} finally { Pop-Location }
