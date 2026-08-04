@echo off
cd /d "%~dp0"
node server.js --host 0.0.0.0 --port 4173
pause
