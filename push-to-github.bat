@echo off
cd /d "%~dp0"
echo ============================================================
echo   Uploading MooCow Productions to GitHub
echo   Repo: https://github.com/tgt221/MooCow2026
echo ============================================================
echo.
echo Clearing leftover git lock files (safe)...
del /f /q ".git\HEAD.lock" ".git\index.lock" ".git\objects\maintenance.lock" 2>nul
echo.
echo A GitHub sign-in window may pop up the first time.
echo Sign in as your account: tgt221
echo.
echo Uploading now (about 100 MB of video, so give it a minute)...
echo.
git push -u origin main
echo.
echo ============================================================
echo   Done. If there are no red "error" lines above, your files
echo   are now at:  https://github.com/tgt221/MooCow2026
echo   (Refresh that page in your browser to see them.)
echo ============================================================
echo.
pause >nul
