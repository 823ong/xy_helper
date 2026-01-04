@echo off
:: Use PowerShell to get current time in YYYYMMDDHHmmss format
for /f %%i in ('powershell -command "Get-Date -Format 'yyyyMMddHHmmss'"') do set datetime=%%i

set tagname=v%datetime%
echo Creating tag: %tagname%

git tag -a %tagname% -m "Auto-generated release tag: %tagname%"
if errorlevel 1 (
    echo Error: Failed to create tag.
    exit /b 1
)

echo Pushing tag to origin...
git push origin %tagname%
if errorlevel 1 (
    echo Error: Failed to push tag.
    exit /b 1
)

echo Success: Tag %tagname% created and pushed.
pause
