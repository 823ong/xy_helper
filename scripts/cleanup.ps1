# xy_helper 完全清理脚本
# 使用方法：在 PowerShell 中以管理员身份运行此脚本

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  xy_helper 完全清理工具" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 检查管理员权限
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "错误: 需要管理员权限运行此脚本" -ForegroundColor Red
    Write-Host "请右键点击 PowerShell 并选择'以管理员身份运行'" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "步骤 1: 关闭 xy_helper 进程..." -ForegroundColor Yellow
$process = Get-Process -Name "xy_helper" -ErrorAction SilentlyContinue
if ($process) {
    Write-Host "发现运行中的 xy_helper 进程，正在关闭..." -ForegroundColor Red
    Stop-Process -Name "xy_helper" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "进程已关闭" -ForegroundColor Green
} else {
    Write-Host "未发现运行中的进程" -ForegroundColor Green
}
Write-Host ""

Write-Host "步骤 2: 清理用户数据目录..." -ForegroundColor Yellow
$paths = @(
    "$env:LOCALAPPDATA\xy_helper",
    "$env:APPDATA\xy_helper",
    "$env:LOCALAPPDATA\programs\xy_helper"
)

foreach ($path in $paths) {
    if (Test-Path $path) {
        Write-Host "删除: $path" -ForegroundColor Red
        Remove-Item -Path $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "已删除" -ForegroundColor Green
    } else {
        Write-Host "跳过 (不存在): $path" -ForegroundColor Gray
    }
}
Write-Host ""

Write-Host "步骤 3: 清理桌面快捷方式..." -ForegroundColor Yellow
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = "$desktopPath\xy_helper.lnk"
if (Test-Path $shortcutPath) {
    Write-Host "删除桌面快捷方式..." -ForegroundColor Red
    Remove-Item -Path $shortcutPath -Force -ErrorAction SilentlyContinue
    Write-Host "已删除" -ForegroundColor Green
} else {
    Write-Host "未发现桌面快捷方式" -ForegroundColor Gray
}
Write-Host ""

Write-Host "步骤 4: 清理开始菜单..." -ForegroundColor Yellow
$startMenuPath = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\xy_helper.lnk"
if (Test-Path $startMenuPath) {
    Write-Host "删除开始菜单快捷方式..." -ForegroundColor Red
    Remove-Item -Path $startMenuPath -Force -ErrorAction SilentlyContinue
    Write-Host "已删除" -ForegroundColor Green
} else {
    Write-Host "未发现开始菜单快捷方式" -ForegroundColor Gray
}
Write-Host ""

Write-Host "步骤 5: 清理注册表项..." -ForegroundColor Yellow
$registryPaths = @(
    "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*xy_helper*",
    "HKCU:\Software\xy_helper",
    "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*xy_helper*"
)

foreach ($regPath in $registryPaths) {
    $items = Get-Item -Path $regPath -ErrorAction SilentlyContinue
    if ($items) {
        foreach ($item in $items) {
            Write-Host "删除注册表项: $($item.PSPath)" -ForegroundColor Red
            Remove-Item -Path $item.PSPath -Force -Recurse -ErrorAction SilentlyContinue
        }
    }
}
Write-Host ""

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  清理完成！" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "现在可以重新安装 xy_helper 了" -ForegroundColor Yellow
Write-Host ""
pause
