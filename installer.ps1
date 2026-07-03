#requires -version 5.1

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ── Config ────────────────────────────────────────────────────────────

$ScriptPath = if ($MyInvocation.MyCommand.Path) { Split-Path -Parent $MyInvocation.MyCommand.Path } else { [System.IO.Path]::GetDirectoryName([System.Reflection.Assembly]::GetEntryAssembly().Location) }
$DistPath   = Join-Path $ScriptPath "dist"
$ApiBase    = "https://github.com/elee-py/vencord/releases/latest/download"

# ── Theme ─────────────────────────────────────────────────────────────

$Colors = @{
    bg       = "#1e1e2e"
    surface  = "#282840"
    surface2 = "#32325a"
    text     = "#cdd6f4"
    muted    = "#6c7086"
    accent   = "#cba6f7"
    green    = "#a6e3a1"
    red      = "#f38ba8"
    yellow   = "#f9e2af"
}

function New-DarkFont($size = 10, $bold = $false) {
    return New-Object Drawing.Font -ArgumentList @("Segoe UI", [Single]$size, $(if ($bold) { [System.Drawing.FontStyle]::Bold } else { [System.Drawing.FontStyle]::Regular }))
}

# ── Detect Discord ────────────────────────────────────────────────────

function Find-DiscordPaths {
    $candidates = @(
        "$env:LOCALAPPDATA\Discord",
        "$env:LOCALAPPDATA\DiscordCanary",
        "$env:LOCALAPPDATA\DiscordPTB",
        "$env:LOCALAPPDATA\DiscordDevelopment"
    )
    $results = @()
    foreach ($base in $candidates) {
        if (-not (Test-Path $base)) { continue }
        $branch = $base -replace ".*Discord" -replace "^\\" -replace "^$","Stable"
        Get-ChildItem "$base\app-*" -Directory -ErrorAction SilentlyContinue | ForEach-Object {
            $verPath = $_.FullName
            $appAsar  = "$verPath\resources\app.asar"
            $_appAsar = "$verPath\resources\_app.asar"
            $shimIdx  = "$appAsar\index.js"

            $state = "unknown"
            if (Test-Path $appAsar -PathType Leaf)    { $state = "clean" }
            elseif ((Test-Path $appAsar -PathType Container) -and (Test-Path $shimIdx)) {
                if (Test-Path $_appAsar -PathType Leaf) { $state = "injected" }
                else                                    { $state = "broken" }
            }
            if ($state -ne "unknown") {
                $results += [PSCustomObject]@{
                    Path    = $verPath
                    Version = $_.Name -replace "app-"
                    Branch  = $branch
                    State   = $state
                }
            }
        }
    }
    return $results
}

# ── Build check ───────────────────────────────────────────────────────

function Test-BuildReady {
    $needed = @("patcher.js", "preload.js", "renderer.js", "renderer.css")
    $missing = $needed | Where-Object { -not (Test-Path (Join-Path $DistPath $_)) }
    return @{
        Ready   = $missing.Count -eq 0
        Missing = $missing
    }
}

# ── Kill Discord ──────────────────────────────────────────────────────

function Kill-Discord {
    $names = @("Discord.exe","DiscordCanary.exe","DiscordPTB.exe","DiscordDevelopment.exe")
    $names | ForEach-Object { taskkill /f /im $_ 2>$null }
    Start-Sleep -Milliseconds 500
}

# ── Install ───────────────────────────────────────────────────────────

function Write-Shim($appDir) {
    Set-Content -Path "$appDir\package.json" -Value '{"name":"discord","main":"index.js"}'
    $patcherPath = (Join-Path $DistPath "patcher.js") -replace "\\","/"
    Set-Content -Path "$appDir\index.js" -Value "require('$patcherPath');`n"
}

function Install-DigiCord($targetPath) {
    $resources = "$targetPath\resources"
    $app = "$resources\app.asar"
    $_app = "$resources\_app.asar"

    Kill-Discord

    # Case 1: app.asar is a FILE (original Discord, no shim yet)
    if (Test-Path $app -PathType Leaf) {
        Rename-Item -Path $app -NewName "_app.asar" -Force
        New-Item -Path $app -ItemType Directory -Force | Out-Null
        Write-Shim $app
        return
    }

    # Case 2: app.asar is a DIRECTORY (shim exists, just update)
    if (Test-Path $app -PathType Container) {
        Write-Shim $app
        return
    }

    throw "app.asar not found"
}

# ── Uninstall ─────────────────────────────────────────────────────────

function Uninstall-DigiCord($targetPath) {
    $resources = "$targetPath\resources"
    $app = "$resources\app.asar"
    $_app = "$resources\_app.asar"

    Kill-Discord

    # Only remove shim if we can restore the original asar
    if (Test-Path $_app -PathType Leaf) {
        if (Test-Path $app -PathType Container) {
            Remove-Item -Path $app -Recurse -Force
        }
        Rename-Item -Path $_app -NewName "app.asar" -Force
        return
    }

    if (Test-Path $app -PathType Container) {
        throw "Original app.asar is missing. Cannot uninstall safely. Reinstall Discord first."
    }
}

# ── Download dist ─────────────────────────────────────────────────────

function Install-BuildFiles {
    $needed = @("patcher.js", "patched.js.map", "preload.js", "preload.js.map",
                "renderer.js", "renderer.js.map", "renderer.css", "renderer.css.map")
    if (-not (Test-Path $DistPath)) { New-Item -Path $DistPath -ItemType Directory -Force | Out-Null }
    foreach ($file in $needed) {
        $url = "$ApiBase/$file"
        $out = Join-Path $DistPath $file
        try {
            Write-Host "Downloading $file..."
            Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing
        } catch {
            Write-Host "  Failed: $($_.Exception.Message)" -ForegroundColor DarkYellow
        }
    }
}

# ── Build UI ──────────────────────────────────────────────────────────

$form = New-Object Windows.Forms.Form
$form.Text = "DigiCord Installer"
$form.Size = New-Object Drawing.Size(540, 520)
$form.StartPosition = "CenterScreen"
$form.BackColor = [Drawing.Color]::FromArgb(255, 30, 30, 46)
$form.ForeColor = [Drawing.Color]::FromArgb(255, 205, 214, 246)
$form.Font = New-DarkFont
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.Icon = $null

# Title
$title = New-Object Windows.Forms.Label
$title.Text = "DigiCord"
$title.Font = New-DarkFont 22 $true
$title.ForeColor = [Drawing.Color]::FromArgb(255, 203, 166, 247)
$title.Size = New-Object Drawing.Size(500, 36)
$title.Location = New-Object Drawing.Point(20, 16)
$title.TextAlign = "MiddleCenter"
$form.Controls.Add($title)

# Subtitle
$sub = New-Object Windows.Forms.Label
$sub.Text = "Inject DigiCord into Discord"
$sub.Font = New-DarkFont 10
$sub.ForeColor = [Drawing.Color]::FromArgb(255, 108, 112, 134)
$sub.Size = New-Object Drawing.Size(500, 18)
$sub.Location = New-Object Drawing.Point(20, 52)
$sub.TextAlign = "MiddleCenter"
$form.Controls.Add($sub)

# List box (for Discord installations)
$listBox = New-Object Windows.Forms.ListBox
$listBox.Location = New-Object Drawing.Point(20, 86)
$listBox.Size = New-Object Drawing.Size(490, 140)
$listBox.BackColor = [Drawing.Color]::FromArgb(255, 40, 40, 64)
$listBox.ForeColor = [Drawing.Color]::FromArgb(255, 205, 214, 246)
$listBox.Font = New-DarkFont 10
$listBox.BorderStyle = "FixedSingle"
$listBox.DrawMode = "OwnerDrawFixed"
$listBox.ItemHeight = 48
$listBox.Add_DrawItem({ param($s, $e)
    if ($e.Index -lt 0) { return }
    $item = $listBox.Items[$e.Index]
    $e.DrawBackground()
    $bg = if ($e.State -band "Selected") { "#45457a" } else { "#282840" }
    $e.Graphics.FillRectangle([Drawing.SolidBrush][Drawing.Color]::FromArgb(255, 40, 40, 64), $e.Bounds)
    if ($e.State -band "Selected") {
        $e.Graphics.FillRectangle([Drawing.SolidBrush][Drawing.Color]::FromArgb(255, 69, 69, 122), $e.Bounds)
    }
    $y = $e.Bounds.Y + 4
    $e.Graphics.DrawString($item.Branch, (New-DarkFont 10 $true), [Drawing.Brushes]::White, 12, $y)
    $e.Graphics.DrawString("v$($item.Version)  $($item.Path)", (New-DarkFont 8), [Drawing.SolidBrush][Drawing.Color]::FromArgb(255, 108, 112, 134), 12, $y + 18)
    $statusMap = @{ clean = @("Clean", 166,227,161, 40,166,227,161); injected = @("Injected", 166,227,161, 40,166,227,161); broken = @("Broken", 249,226,175, 40,249,226,175) }
    $sm = $statusMap[$item.State]
    if (-not $sm) { $sm = @("?", 108,112,134, 40,108,112,134) }
    $statusText = $sm[0]
    $statusColor = [Drawing.Color]::FromArgb(255, $sm[1], $sm[2], $sm[3])
    $statusBg = [Drawing.Color]::FromArgb($sm[4], $sm[5], $sm[6], $sm[7])
    $e.Graphics.FillRectangle([Drawing.SolidBrush]$statusBg, $e.Bounds.Right - 72, $y, 60, 20)
    $e.Graphics.DrawString($statusText, (New-DarkFont 8 $true), [Drawing.SolidBrush]$statusColor, $e.Bounds.Right - 68, $y + 3)
})

$form.Controls.Add($listBox)

# Status label (build check, etc.)
$statusLabel = New-Object Windows.Forms.Label
$statusLabel.Size = New-Object Drawing.Size(490, 32)
$statusLabel.Location = New-Object Drawing.Point(20, 232)
$statusLabel.Font = New-DarkFont 9
$statusLabel.ForeColor = [Drawing.Color]::FromArgb(255, 108, 112, 134)
$form.Controls.Add($statusLabel)

# Button panel
$btnPanel = New-Object Windows.Forms.FlowLayoutPanel
$btnPanel.Location = New-Object Drawing.Point(20, 268)
$btnPanel.Size = New-Object Drawing.Size(490, 36)
$btnPanel.FlowDirection = "LeftToRight"

function New-DarkBtn($text, $bgColor, $fgColor, $action) {
    $btn = New-Object Windows.Forms.Button
    $btn.Text = $text
    $btn.Font = New-DarkFont 10 $true
    $btn.FlatStyle = "Flat"
    $btn.FlatAppearance.BorderSize = 0
    $btn.BackColor = [Drawing.Color]::FromArgb(255, $bgColor.R, $bgColor.G, $bgColor.B)
    $btn.ForeColor = [Drawing.Color]::FromArgb(255, $fgColor.R, $fgColor.G, $fgColor.B)
    $btn.Size = New-Object Drawing.Size(110, 32)
    $btn.Margin = New-Object System.Windows.Forms.Padding(0, 0, 6, 0)
    $btn.Cursor = "Hand"
    $btn.Add_Click($action)
    return $btn
}

$btnRefresh = New-DarkBtn "Refresh" ([Drawing.Color]::FromArgb(50, 50, 90)) ([Drawing.Color]::FromArgb(205, 214, 246)) {
    Refresh-List
}
$btnPanel.Controls.Add($btnRefresh)

function Get-BtnState($item) {
    if ($item.State -eq "injected") { return @("Uninject", 243,139,168, 30,30,46) }
    if ($item.State -eq "clean")   { return @("Inject", 203,166,247, 30,30,46) }
    return @("Broken", 249,226,175, 30,30,46)
}

$btnInstall = New-DarkBtn "Inject" ([Drawing.Color]::FromArgb(203, 166, 247)) ([Drawing.Color]::FromArgb(30, 30, 46)) {
    if ($listBox.SelectedIndex -lt 0) { return }
    $item = $listBox.SelectedItem
    if ($item.State -eq "injected") { return }
    $btnInstall.Enabled = $false
    $statusLabel.Text = "Closing Discord..."
    [System.Windows.Forms.Application]::DoEvents()
    try {
        Install-DigiCord $item.Path
        $statusLabel.Text = "Injected DigiCord into $($item.Branch)!"
        Refresh-List
        Select-Item($item.Path)
    } catch {
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, "Error", "OK", "Error")
        $statusLabel.Text = "Failed!"
    }
    $btnInstall.Enabled = $true
}
$btnPanel.Controls.Add($btnInstall)

$btnUninstall = New-DarkBtn "Uninject" ([Drawing.Color]::FromArgb(243, 139, 168)) ([Drawing.Color]::FromArgb(30, 30, 46)) {
    if ($listBox.SelectedIndex -lt 0) { return }
    $item = $listBox.SelectedItem
    if ($item.State -ne "injected") { return }
    $btnUninstall.Enabled = $false
    $statusLabel.Text = "Closing Discord..."
    [System.Windows.Forms.Application]::DoEvents()
    try {
        Uninstall-DigiCord $item.Path
        $statusLabel.Text = "Removed from $($item.Branch)!"
        Refresh-List
        Select-Item($item.Path)
    } catch {
        [Windows.Forms.MessageBox]::Show($_.Exception.Message, "Error", "OK", "Error")
        $statusLabel.Text = "Failed!"
    }
    $btnUninstall.Enabled = $true
}
$btnPanel.Controls.Add($btnUninstall)

$btnInjectAll = New-DarkBtn "Inject All" ([Drawing.Color]::FromArgb(50, 50, 90)) ([Drawing.Color]::FromArgb(205, 214, 246)) {
    $btnInjectAll.Enabled = $false
    $btnUninjectAll.Enabled = $false
    $btnInstall.Enabled = $false
    $btnUninstall.Enabled = $false
    foreach ($item in $listBox.Items) {
        if ($item.State -ne "clean") { continue }
        $statusLabel.Text = "Injecting $($item.Branch)..."
        [System.Windows.Forms.Application]::DoEvents()
        try { Install-DigiCord $item.Path } catch { [Windows.Forms.MessageBox]::Show("Failed $($item.Branch): $($_.Exception.Message)", "Error") }
    }
    Refresh-List
    $statusLabel.Text = "All done!"
    $btnInjectAll.Enabled = $true
    $btnUninjectAll.Enabled = $true
    $btnInstall.Enabled = $true
    $btnUninstall.Enabled = $true
}
$btnPanel.Controls.Add($btnInjectAll)

$btnUninjectAll = New-DarkBtn "Uninject All" ([Drawing.Color]::FromArgb(50, 50, 90)) ([Drawing.Color]::FromArgb(205, 214, 246)) {
    $btnInjectAll.Enabled = $false
    $btnUninjectAll.Enabled = $false
    $btnInstall.Enabled = $false
    $btnUninstall.Enabled = $false
    foreach ($item in $listBox.Items) {
        if ($item.State -ne "injected") { continue }
        $statusLabel.Text = "Uninjecting $($item.Branch)..."
        [System.Windows.Forms.Application]::DoEvents()
        try { Uninstall-DigiCord $item.Path } catch { [Windows.Forms.MessageBox]::Show("Failed $($item.Branch): $($_.Exception.Message)", "Error") }
    }
    Refresh-List
    $statusLabel.Text = "All done!"
    $btnInjectAll.Enabled = $true
    $btnUninjectAll.Enabled = $true
    $btnInstall.Enabled = $true
    $btnUninstall.Enabled = $true
}
$btnPanel.Controls.Add($btnUninjectAll)

$form.Controls.Add($btnPanel)

# Hint
$hint = New-Object Windows.Forms.Label
$hint.Text = "Discord will be closed automatically during injection"
$hint.Font = New-DarkFont 8
$hint.ForeColor = [Drawing.Color]::FromArgb(255, 108, 112, 134)
$hint.Size = New-Object Drawing.Size(490, 18)
$hint.Location = New-Object Drawing.Point(22, 308)
$form.Controls.Add($hint)

# Build warning
$buildWarn = New-Object Windows.Forms.Label
$buildWarn.Size = New-Object Drawing.Size(490, 40)
$buildWarn.Location = New-Object Drawing.Point(20, 330)
$buildWarn.Font = New-DarkFont 9
$buildWarn.ForeColor = [Drawing.Color]::FromArgb(255, 249, 226, 175)
$buildWarn.TextAlign = "MiddleLeft"
$form.Controls.Add($buildWarn)

# Footer
$footer = New-Object Windows.Forms.Label
$footer.Text = "DigiCord  -  Vencord + DigiCord"
$footer.Font = New-DarkFont 8
$footer.ForeColor = [Drawing.Color]::FromArgb(255, 80, 80, 110)
$footer.Size = New-Object Drawing.Size(490, 18)
$footer.Location = New-Object Drawing.Point(20, 460)
$footer.TextAlign = "MiddleCenter"
$form.Controls.Add($footer)

# ── Functions ─────────────────────────────────────────────────────────

function Refresh-List {
    $selected = $null
    if ($listBox.SelectedItem) { $selected = $listBox.SelectedItem.Path }
    $discords = Find-DiscordPaths
    $build = Test-BuildReady
    $listBox.Items.Clear()
    foreach ($d in $discords) { [void]$listBox.Items.Add($d) }
    if ($discords.Count -eq 0) {
        $statusLabel.Text = "No Discord installations found"
    } else {
        $statusLabel.Text = "Found $($discords.Count) Discord installation(s)"
    }
    if (-not $build.Ready) {
        $buildWarn.Text = "Build files missing: $($build.Missing -join ', ') -- Run 'pnpm build' or click Download"
    } else {
        $buildWarn.Text = "[OK] Build files ready"
    }
    if ($selected) { Select-Item $selected }
}

function Select-Item($targetPath) {
    for ($i = 0; $i -lt $listBox.Items.Count; $i++) {
        if ($listBox.Items[$i].Path -eq $targetPath) { $listBox.SelectedIndex = $i; break }
    }
}

# Download button
$btnDownload = New-DarkBtn "Download Build" ([Drawing.Color]::FromArgb(249, 226, 175)) ([Drawing.Color]::FromArgb(30, 30, 46)) {
    $btnDownload.Enabled = $false
    $statusLabel.Text = "Downloading build files..."
    [System.Windows.Forms.Application]::DoEvents()
    try {
        Install-BuildFiles
        $statusLabel.Text = "Download complete!"
        Refresh-List
    } catch {
        $statusLabel.Text = "Download failed!"
    }
    $btnDownload.Enabled = $true
}
$form.Controls.Add($btnDownload)
$btnDownload.Location = New-Object Drawing.Point(380, 330)
$btnDownload.Size = New-Object Drawing.Size(130, 36)

# ── Init ──────────────────────────────────────────────────────────────

Refresh-List
$form.ShowDialog()
