@echo off
echo 🔧 Tailwind CSS V4 Configuration Test...
echo.

echo 📋 Testing different Tailwind configurations...
echo.

echo 🧪 Option 1: Standard @tailwind directives
echo @tailwind base; > temp-index-1.css
echo @tailwind components; >> temp-index-1.css  
echo @tailwind utilities; >> temp-index-1.css
echo body { font-family: 'Inter', system-ui, sans-serif; } >> temp-index-1.css

echo 🧪 Option 2: @import "tailwindcss"
echo @import "tailwindcss"; > temp-index-2.css
echo body { font-family: 'Inter', system-ui, sans-serif; } >> temp-index-2.css

echo 🧪 Option 3: Traditional imports
echo @import "tailwindcss/base"; > temp-index-3.css
echo @import "tailwindcss/components"; >> temp-index-3.css
echo @import "tailwindcss/utilities"; >> temp-index-3.css
echo body { font-family: 'Inter', system-ui, sans-serif; } >> temp-index-3.css

echo.
echo 📋 Current configuration:
echo PostCSS config:
type postcss.config.js
echo.
echo CSS file:
type src\index.css
echo.

echo 🔧 To test each option:
echo 1. Copy temp-index-1.css to src\index.css and test
echo 2. If that fails, try temp-index-2.css
echo 3. If that fails, try temp-index-3.css
echo.

echo 💡 Alternative: Install classic Tailwind
echo npm install tailwindcss@3 @tailwindcss/postcss@3 autoprefixer
echo.

echo 🧹 Cleaning up temp files...
del temp-index-*.css 2>nul

pause
