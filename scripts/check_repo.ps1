[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $RepoRoot
try {
    $forbidden = git ls-files | Where-Object {
        $_ -match '(^|/)\.env($|\.)' -and $_ -notmatch '(^|/)\.env\.example$' -or
        $_ -match '(?i)(^|/)(credentials[^/]*|service-account[^/]*)\.json$' -or
        $_ -match '(?i)\.(pem|key|p12|pfx|ppk|ovpn|secret)$' -or
        $_ -match '(^|/)(node_modules|dist|build|__pycache__|\.venv)/'
    }
    if ($forbidden) { throw "Forbidden tracked paths:`n$($forbidden -join "`n")" }

    $patterns = [ordered]@{
        "private key" = '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----'
        "GitHub token" = '(github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})'
        "OpenAI-style API key" = 'sk-(proj-|live-)?[A-Za-z0-9_-]{20,}'
        "Bearer credential" = '(?i)bearer\s+[A-Za-z0-9._-]{24,}'
    }
    foreach ($entry in $patterns.GetEnumerator()) {
        $hits = git grep -n -I -E -- $entry.Value 2>$null
        if ($LASTEXITCODE -eq 0 -and $hits) {
            throw "Potential $($entry.Key) detected:`n$($hits -join "`n")"
        }
    }

    python -m compileall -q backend
    if ($LASTEXITCODE -ne 0) { throw "Python compile check failed." }
    Write-Host "PUBLIC_REPOSITORY_SECURITY_AND_SYNTAX_CHECK_OK"
}
finally { Pop-Location }
