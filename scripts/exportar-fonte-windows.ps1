# Cria um ZIP de código-fonte do Lumo para auditoria do MVP mais recente.
# Nao altera nenhum arquivo do projeto; nao inclui banco, notas, fotos ou credenciais.
param(
  [string]$Source = 'D:\Documentos\LUMO',
  [string]$Destination = "$env:USERPROFILE\Downloads\LUMO_FONTE_ATUAL.zip"
)
$ErrorActionPreference = 'Stop'
$sourcePath = (Resolve-Path -LiteralPath $Source).Path.TrimEnd('\')
$destinationFull = [System.IO.Path]::GetFullPath($Destination)
$excludedFolders = @('.git','.venv','venv','node_modules','dist','build','.next','.nuxt','.svelte-kit','coverage','__pycache__','.pytest_cache','.mypy_cache','.cache','tmp','temp','logs','backups','exports','.firebase','.playwright','screenshots')
$allowedExtensions = @('.js','.jsx','.ts','.tsx','.mjs','.cjs','.html','.css','.scss','.py','.ps1','.bat','.cmd','.sh','.md','.yml','.yaml','.toml','.ini','.svg','.webmanifest','.lock')
$allowedNames = @('package.json','package-lock.json','tsconfig.json','jsconfig.json','firebase.json','pyproject.toml','requirements.txt','requirements-dev.txt','vite.config.js','vite.config.ts','playwright.config.js','playwright.config.ts','Dockerfile','.gitignore')
$blockedNames = '(?i)(secret|credential|private.key|access.token|refresh.token|password|senha|client_secret|id_rsa|\.env|backup|dump|database|production-data|nota-fiscal)'
$staging = Join-Path $env:TEMP ("lumo-source-export-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $staging | Out-Null
try {
  $count = 0
  Get-ChildItem -LiteralPath $sourcePath -Recurse -File -Force | ForEach-Object {
    $full = $_.FullName
    $relative = $full.Substring($sourcePath.Length).TrimStart('\')
    $parts = $relative -split '\\'
    $skip = $false
    foreach ($p in $parts) {
      if ($excludedFolders -contains $p) { $skip = $true; break }
    }
    if ($skip -or $relative -match $blockedNames) { return }
    if (($allowedExtensions -notcontains $_.Extension.ToLowerInvariant()) -and ($allowedNames -notcontains $_.Name)) { return }
    if ($_.Length -gt 8MB) { return }
    $target = Join-Path $staging $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    Copy-Item -LiteralPath $full -Destination $target -Force
    $count++
  }
  if ($count -eq 0) { throw "Nenhum arquivo de codigo encontrado em $sourcePath" }
  New-Item -ItemType Directory -Path (Split-Path -Parent $destinationFull) -Force | Out-Null
  Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $destinationFull -Force
  Write-Host "Arquivos exportados: $count"
  Write-Host "ZIP criado: $destinationFull"
  Write-Host "Antes de compartilhar, revise o ZIP para checar senhas, chaves, dados privados ou arquivos indevidos."
} finally {
  Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
}
