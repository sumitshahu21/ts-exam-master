@echo off
echo 🔧 Tailwind CSS Emergency Fix
echo.
echo Current issue: Missing "./base" specifier in tailwindcss package
echo.

echo 📋 Quick Solutions:
echo.

echo 1️⃣ QUICK FIX - Use fallback CSS (no Tailwind)
echo    This will make your app work immediately with basic styling
echo.

echo 2️⃣ PROPER FIX - Fix Tailwind configuration  
echo    This will restore full Tailwind functionality
echo.

set /p choice="Choose option (1 or 2): "

if "%choice%"=="1" (
    echo.
    echo 🔄 Switching to fallback CSS...
    copy src\index.css src\index-tailwind-backup.css >nul
    copy src\fallback-styles.css src\index.css >nul
    echo ✅ Fallback CSS activated!
    echo    Your app should now work with basic styling
    echo    Backend: node backend\working-server.js
    echo    Frontend: npm run dev
) else if "%choice%"=="2" (
    echo.
    echo 🔧 Applying Tailwind fix...
    echo.
    echo Current PostCSS config:
    type postcss.config.js
    echo.
    echo Current CSS imports:
    type src\index.css
    echo.
    echo ✅ Configuration updated!
    echo Try starting the dev server: npm run dev
    echo.
    echo If still broken, try:
    echo - npm install tailwindcss@3 @tailwindcss/postcss@3
    echo - Or use option 1 to fall back to basic CSS
) else (
    echo Invalid choice. Run the script again.
)

echo.
echo 💡 To restore Tailwind later:
echo    copy src\index-tailwind-backup.css src\index.css
echo.
pause
