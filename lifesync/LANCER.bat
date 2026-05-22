@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title LifeSync

echo.
echo  ================================
echo     LifeSync - Planificateur IA
echo  ================================
echo.

:: Verifier Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo  ERREUR : Node.js n'est pas installe.
    echo.
    echo  Installe-le sur : https://nodejs.org
    echo  Puis relance ce fichier.
    echo.
    pause
    exit /b
)

echo  Node.js OK
echo.

:: Creer le fichier .env si absent
if not exist ".env" (
    echo  La cle Claude API est manquante.
    echo.
    set /p CLE="  Colle ta cle Claude ici et appuie sur Entree : "
    echo CLAUDE_API_KEY=!CLE!> .env
    echo.
    echo  Cle enregistree !
    echo.
)

echo  Lancement en cours...
echo  L'application va s'ouvrir dans ton navigateur.
echo  (Pour arreter : ferme cette fenetre)
echo.

:: Ouvrir le navigateur apres 2 secondes
timeout /t 2 /nobreak >nul
start "" "http://localhost:4174"

:: Lancer le serveur
node server.js

pause
