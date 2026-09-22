@echo off
cd /d "%~dp0"
echo ============================================================
echo   Starting the MooCow Productions website...
echo ============================================================
echo.
echo   When you see:  MooCow site running at http://localhost:3000
echo   then open that address in your browser (Chrome/Edge).
echo.
echo   Keep THIS window open while you view the site.
echo   Close it (or press Ctrl+C) to stop the site.
echo ============================================================
echo.
call npm install
call npm start
echo.
echo The site stopped. Read any message above, then press a key to close.
pause >nul
