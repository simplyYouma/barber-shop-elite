# ========================================================
# YUMI SECURITY TEMPLATE — Quick Initializer (Elite v2)
# Description: Remplace automatiquement les placeholders {{TAG}}
# ========================================================

Write-Host "`n🚀 Initialisation de votre nouveau projet Yumi Hub (React 19 Elite)...`n" -ForegroundColor Cyan

# 1. Collecte des informations
$projectName = Read-Host "Nom du projet (ex: Pharma Pro)"
$projectSlug = $projectName.ToLower().Replace(" ", "-")
$projectDesc = Read-Host "Description courte"
$dbName = Read-Host "Nom de la base de données (ex: pharma_v1.db)"
$appId = Read-Host "Identifiant Application (ex: com.pharma.pro)"
$yumiProjId = Read-Host "ID Projet Yumi Hub (ex: 4044...)"
$accentColor = Read-Host "Couleur Accent Hex (ex: #2563EB)"
$accentColorLight = Read-Host "Couleur Accent Claire Hex (ex: #DBEAFE)"

# 2. Liste des fichiers à traiter
$files = Get-ChildItem -Recurse -File -Exclude "setup.ps1", ".license", "*.db", "node_modules", "target", ".git"

Write-Host "`n🛠️  Application de la configuration Elite..." -ForegroundColor Yellow

foreach ($file in $files) {
    try {
        $content = Get-Content $file.FullName -Raw
        if ($content -match "\{\{") {
            $content = $content.Replace("{{PROJECT_NAME}}", $projectName)
            $content = $content.Replace("{{project_name}}", $projectSlug)
            $content = $content.Replace("{{PROJECT_DESCRIPTION}}", $projectDesc)
            $content = $content.Replace("{{DB_NAME}}", $dbName)
            $content = $content.Replace("{{APP_IDENTIFIER}}", $appId)
            $content = $content.Replace("{{YUMI_PROJECT_ID}}", $yumiProjId)
            $content = $content.Replace("{{ACCENT_COLOR}}", $accentColor)
            $content = $content.Replace("{{ACCENT_COLOR_LIGHT}}", $accentColorLight)
            
            Set-Content $file.FullName $content -Encoding UTF8
            Write-Host "✅ Mis à jour : $($file.FullName.Replace($PWD.Path, ""))" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Erreur sur $($file.Name)" -ForegroundColor Red
    }
}

Write-Host "`n✨ Parité Elite établie ! React 19 configuré.`n" -ForegroundColor Cyan
Write-Host "💡 Prochaines étapes :" -ForegroundColor White
Write-Host "1. npm install (pour installer date-fns et react 19)" -ForegroundColor White
Write-Host "2. npm run tauri dev" -ForegroundColor White
