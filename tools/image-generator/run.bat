@echo off
REM Turnkey launcher for the self-hosted image generator (Windows / cmd.exe).
REM Double-click this file, or run from a terminal:  run.bat
REM It just delegates to run.ps1 with the execution policy bypassed, so you do
REM not need to change any system settings.

cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
