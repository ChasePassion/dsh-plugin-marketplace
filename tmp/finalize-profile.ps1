$ErrorActionPreference = "Continue"
$log = "E:\code\dsh-plugin-marketplace\tmp\finalize.log"
function Log($msg) { Add-Content $log $msg }
try {
  $p = Join-Path $env:USERPROFILE '.dsh\profiles\web\cordis.patch.yml'
  $c = [System.IO.File]::ReadAllText($p)
  if (-not $c.Contains("@dsh-marketplace/marketplace")) {
    $nl = [Environment]::NewLine
    $block = $nl + "# marketplace: marketplace" + $nl + "- insert:" + $nl + "    - id: marketplace" + $nl + "      name: '@dsh-marketplace/marketplace'" + $nl
    [System.IO.File]::WriteAllText($p, $c.TrimEnd() + $block)
    Log "patch written"
  } else { Log "patch already present" }
} catch { Log ("patch FAILED: " + $_.Exception.Message) }
try {
  $pj = Join-Path $env:USERPROFILE '.dsh\profiles\web\package.json'
  $j = Get-Content $pj -Raw | ConvertFrom-Json
  if (-not ($j.dependencies.PSObject.Properties.Name -contains "@dsh-marketplace/marketplace")) {
    $j.dependencies | Add-Member -NotePropertyName "@dsh-marketplace/marketplace" -NotePropertyValue "file:./dsh-mkt/packages/marketplace"
    $j | ConvertTo-Json -Depth 10 | Set-Content $pj -Encoding UTF8
    Log "package.json updated"
  } else { Log "package.json already has dependency" }
} catch { Log ("pkg FAILED: " + $_.Exception.Message) }
