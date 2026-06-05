@echo off
title BLISK preview server
cd /d "%~dp0"
echo ============================================
echo   BLISK preview -> http://localhost:4321
echo   Hold this window open while viewing.
echo   Close it to stop the server.
echo ============================================
start "" http://localhost:4321
node ".claude\serve.js"
echo.
echo Server stopped (or port 4321 is already in use).
pause
