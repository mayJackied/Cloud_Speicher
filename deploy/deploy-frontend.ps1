# One-click frontend deploy from repo root:
#   .\deploy\deploy-frontend.ps1              # build + upload after UI/logic changes
#   .\deploy\deploy-frontend.ps1 -Action setup
#   .\deploy\deploy-frontend.ps1 -Action install-key
#   .\deploy\deploy-frontend.ps1 -Action rollback
[CmdletBinding()]
param(
    [ValidateSet('probe', 'setup', 'deploy', 'rollback', 'install-key')]
    [string]$Action = 'deploy',
    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$DeployDir = $PSScriptRoot
$RepoRoot = Split-Path -Parent $DeployDir
$FrontendDir = Join-Path $RepoRoot 'frontend'
$EnvFile = Join-Path $DeployDir 'deploy.env'
$ExampleFile = Join-Path $DeployDir 'deploy.env.example'
$script:UseMux = $true
$script:SshMux = Join-Path $env:TEMP ('cs-mux-' + [guid]::NewGuid().ToString('N').Substring(0, 12))

function Read-DeployEnv {
    param([string]$Path)
    $map = @{}
    if (-not (Test-Path $Path)) {
        return $map
    }
    Get-Content -LiteralPath $Path -Encoding UTF8 | ForEach-Object {
        $line = $_.Trim()
        if (-not $line -or $line.StartsWith('#')) {
            return
        }
        $eq = $line.IndexOf('=')
        if ($eq -lt 1) {
            return
        }
        $key = $line.Substring(0, $eq).Trim()
        $value = $line.Substring($eq + 1).Trim()
        $map[$key] = $value
    }
    return $map
}

function Get-Setting {
    param(
        [hashtable]$FileMap,
        [string]$Name,
        [string]$Default = ''
    )
    $fromEnv = [Environment]::GetEnvironmentVariable($Name)
    if ($fromEnv) {
        return $fromEnv
    }
    if ($FileMap.ContainsKey($Name) -and $FileMap[$Name]) {
        return $FileMap[$Name]
    }
    return $Default
}

function Assert-Command {
    param([string]$Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing command: $Name"
    }
}

function Write-UnixFile {
    param(
        [string]$Source,
        [string]$Destination
    )
    $text = [System.IO.File]::ReadAllText($Source)
    if ($text.Length -gt 0 -and [int][char]$text[0] -eq 0xFEFF) {
        $text = $text.Substring(1)
    }
    $crlf = ([char]13).ToString() + [char]10
    $cr = ([char]13).ToString()
    $lf = ([char]10).ToString()
    $text = $text.Replace($crlf, $lf).Replace($cr, $lf)
    $utf8 = New-Object System.Text.UTF8Encoding $false
    [System.IO.File]::WriteAllText($Destination, $text, $utf8)
}

function Get-SshTarget {
    param([hashtable]$FileMap)
    $hostName = Get-Setting $FileMap 'DEPLOY_HOST' '8.130.215.175'
    $userName = Get-Setting $FileMap 'DEPLOY_USER' 'root'
    $port = Get-Setting $FileMap 'DEPLOY_SSH_PORT' '22'
    $key = Get-Setting $FileMap 'DEPLOY_SSH_KEY' ''
    $webRoot = Get-Setting $FileMap 'DEPLOY_WEB_ROOT' '/var/www/cloud-speicher'
    $upstream = Get-Setting $FileMap 'BACKEND_UPSTREAM' '127.0.0.1:8080'
    $httpPort = Get-Setting $FileMap 'DEPLOY_HTTP_PORT' '8888'
    return [pscustomobject]@{
        Host     = $hostName
        User     = $userName
        Port     = $port
        Key      = $key
        WebRoot  = $webRoot
        Upstream = $upstream
        HttpPort = $httpPort
        Remote   = "$userName@$hostName"
    }
}

function Get-MuxArgs {
    if (-not $script:UseMux) {
        return @()
    }
    return @(
        '-o', 'ControlMaster=auto',
        '-o', "ControlPath=$($script:SshMux)",
        '-o', 'ControlPersist=120'
    )
}

function Get-SshArgs {
    param($Target)
    $sshOpts = @('-p', $Target.Port, '-o', 'ServerAliveInterval=30') + (Get-MuxArgs)
    if ($Target.Key -and (Test-Path -LiteralPath $Target.Key)) {
        $sshOpts += @('-i', $Target.Key)
    } elseif ($Target.Key) {
        Write-Host "DEPLOY_SSH_KEY is not a file, ignored: $($Target.Key)"
    }
    return $sshOpts
}

function Get-ScpArgs {
    param($Target)
    $scpOpts = @('-P', $Target.Port, '-o', 'ServerAliveInterval=30') + (Get-MuxArgs)
    if ($Target.Key -and (Test-Path -LiteralPath $Target.Key)) {
        $scpOpts += @('-i', $Target.Key)
    }
    return $scpOpts
}

function Start-SshMaster {
    param($Target)
    Write-Host 'Opening SSH (password once if asked; later copies reuse this connection).'
    $opts = (Get-SshArgs $Target) + @('-N', '-f', '-o', 'ControlMaster=yes')
    & ssh @opts $Target.Remote
    if ($LASTEXITCODE -ne 0) {
        Write-Host 'SSH multiplexing unavailable; packing files to reduce password prompts.'
        $script:UseMux = $false
    }
}

function Stop-SshMaster {
    param($Target)
    if (-not $script:UseMux) {
        return
    }
    $opts = @('-O', 'exit', '-o', "ControlPath=$($script:SshMux)", '-p', $Target.Port)
    & ssh @opts $Target.Remote 2>$null | Out-Null
}

function Invoke-Remote {
    param(
        $Target,
        [string]$RemoteCommand
    )
    $sshOpts = Get-SshArgs $Target
    & ssh @sshOpts $Target.Remote $RemoteCommand
    if ($LASTEXITCODE -ne 0) {
        throw "Remote command failed (exit $LASTEXITCODE): $RemoteCommand"
    }
}

function Copy-ToRemote {
    param(
        $Target,
        [string]$LocalPath,
        [string]$RemotePath
    )
    $scpOpts = (Get-ScpArgs $Target) + @($LocalPath, "$($Target.Remote):$RemotePath")
    & scp @scpOpts
    if ($LASTEXITCODE -ne 0) {
        throw "scp failed: $LocalPath -> $RemotePath"
    }
}

function New-UnixStageFile {
    param(
        [string]$Source,
        [string]$StageDir,
        [string]$Name
    )
    $dest = Join-Path $StageDir $Name
    Write-UnixFile -Source $Source -Destination $dest
    return $dest
}

function Copy-StageTar {
    param(
        $Target,
        [string]$StageDir,
        [string]$RemoteTar
    )
    Assert-Command tar
    $localTar = Join-Path $env:TEMP ([IO.Path]::GetFileName($RemoteTar))
    if (Test-Path $localTar) {
        Remove-Item -LiteralPath $localTar -Force
    }
    & tar -czf $localTar -C $StageDir .
    if ($LASTEXITCODE -ne 0) {
        throw "tar bundle failed: $StageDir"
    }
    Copy-ToRemote -Target $Target -LocalPath $localTar -RemotePath $RemoteTar
}

function Install-SshKey {
    param($Target)
    $sshDir = Join-Path $HOME '.ssh'
    if (-not (Test-Path $sshDir)) {
        New-Item -ItemType Directory -Path $sshDir | Out-Null
    }
    $key = Join-Path $sshDir 'id_ed25519'
    $pub = "$key.pub"
    if (-not (Test-Path $pub)) {
        Write-Host "Generating $key ..."
        & ssh-keygen -t ed25519 -N ([string]::Empty) -f $key
        if ($LASTEXITCODE -ne 0) { throw 'ssh-keygen failed' }
    }
    $pubText = (Get-Content -LiteralPath $pub -Raw).Trim()
    if ($pubText -notmatch '^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp256)\s+\S+') {
        throw "Unexpected public key: $pub"
    }
    Write-Host 'Copying public key to server (password once)...'
    $remote = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && touch ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && (grep -qxF '$pubText' ~/.ssh/authorized_keys || echo '$pubText' >> ~/.ssh/authorized_keys)"
    Invoke-Remote $Target $remote
    Write-Host 'Key installed. Later deploys should not ask for a password.'
}

if (-not (Test-Path $EnvFile)) {
    Copy-Item -LiteralPath $ExampleFile -Destination $EnvFile
    Write-Host "Created $EnvFile - edit DEPLOY_USER / DEPLOY_SSH_KEY then rerun."
}

$fileMap = Read-DeployEnv $EnvFile
$target = Get-SshTarget $fileMap

Assert-Command ssh
Assert-Command scp

Write-Host "Target: $($target.Remote)  ssh=$($target.Port)  http=$($target.HttpPort)  web=$($target.WebRoot)  api=$($target.Upstream)"
Write-Host "Action: $Action"

try {
    if ($Action -eq 'install-key') {
        Write-Host 'If SSH asks for a password, type it in this window.'
        Install-SshKey $target
        return
    }

    Start-SshMaster $target

    switch ($Action) {
        'probe' {
            $stage = Join-Path $env:TEMP 'cs-probe-stage'
            if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
            New-Item -ItemType Directory -Path $stage | Out-Null
            New-UnixStageFile (Join-Path $DeployDir 'probe.sh') $stage 'cloud-speicher-probe.sh' | Out-Null
            Copy-StageTar $target $stage '/tmp/cloud-speicher-probe.tar.gz'
            Invoke-Remote $target 'tar -xzf /tmp/cloud-speicher-probe.tar.gz -C /tmp && bash /tmp/cloud-speicher-probe.sh'
            break
        }
        'setup' {
            $stage = Join-Path $env:TEMP 'cs-setup-stage'
            if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
            New-Item -ItemType Directory -Path $stage | Out-Null
            New-UnixStageFile (Join-Path $DeployDir 'nginx.conf') $stage 'cloud-speicher-nginx.conf' | Out-Null
            New-UnixStageFile (Join-Path $DeployDir 'setup-nginx.sh') $stage 'cloud-speicher-setup-nginx.sh' | Out-Null
            New-UnixStageFile (Join-Path $DeployDir 'update-frontend.sh') $stage 'cloud-speicher-update-frontend.sh' | Out-Null
            Copy-StageTar $target $stage '/tmp/cloud-speicher-setup.tar.gz'
            $cmd = "tar -xzf /tmp/cloud-speicher-setup.tar.gz -C /tmp && BACKEND_UPSTREAM='$($target.Upstream)' DEPLOY_WEB_ROOT='$($target.WebRoot)' HTTP_PORT='$($target.HttpPort)' NGINX_CONF_SRC=/tmp/cloud-speicher-nginx.conf bash /tmp/cloud-speicher-setup-nginx.sh"
            if ($target.User -ne 'root') {
                $cmd = "sudo bash -lc `"$cmd`""
            }
            Invoke-Remote $target $cmd
            Write-Host "nginx setup done. Later UI updates: .\deploy\deploy-frontend.ps1"
            Write-Host "Open http://$($target.Host):$($target.HttpPort)/"
            break
        }
        'rollback' {
            $cmd = "if [ -x /opt/cloud-speicher/bin/update-frontend.sh ]; then DEPLOY_WEB_ROOT='$($target.WebRoot)' bash /opt/cloud-speicher/bin/update-frontend.sh --rollback; else echo missing update script; exit 1; fi"
            if ($target.User -ne 'root') {
                $cmd = "sudo bash -lc `"$cmd`""
            }
            Invoke-Remote $target $cmd
            break
        }
        default {
            if (-not $SkipBuild) {
                Assert-Command npm
                Assert-Command tar
                if (-not (Test-Path (Join-Path $FrontendDir 'package.json'))) {
                    throw "Frontend folder missing: $FrontendDir"
                }
                Push-Location $FrontendDir
                try {
                    if (-not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
                        Write-Host 'npm ci...'
                        npm ci
                        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
                    }
                    Write-Host 'npm run build...'
                    npm run build
                    if ($LASTEXITCODE -ne 0) { throw 'frontend build failed' }
                } finally {
                    Pop-Location
                }
            }
            $dist = Join-Path $FrontendDir 'dist'
            if (-not (Test-Path (Join-Path $dist 'index.html'))) {
                throw "Missing $dist\index.html"
            }
            $stage = Join-Path $env:TEMP 'cs-deploy-stage'
            if (Test-Path $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
            New-Item -ItemType Directory -Path $stage | Out-Null
            $distTar = Join-Path $stage 'cloud-speicher-frontend.tar.gz'
            Write-Host 'packing dist...'
            & tar -czf $distTar -C $dist .
            if ($LASTEXITCODE -ne 0) { throw 'tar dist failed' }
            New-UnixStageFile (Join-Path $DeployDir 'update-frontend.sh') $stage 'cloud-speicher-update-frontend.sh' | Out-Null
            Copy-StageTar $target $stage '/tmp/cloud-speicher-deploy.tar.gz'
            $update = "tar -xzf /tmp/cloud-speicher-deploy.tar.gz -C /tmp && DEPLOY_WEB_ROOT='$($target.WebRoot)' bash /tmp/cloud-speicher-update-frontend.sh /tmp/cloud-speicher-frontend.tar.gz"
            if ($target.User -ne 'root') {
                $update = "sudo bash -lc `"$update`""
            }
            Invoke-Remote $target $update
            Write-Host "Deployed. Open http://$($target.Host):$($target.HttpPort)/"
        }
    }
}
finally {
    Stop-SshMaster $target
}
