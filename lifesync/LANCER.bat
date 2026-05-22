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

echo  Lancement du serveur...
echo  Le navigateur va s'ouvrir dans 4 secondes.
echo  Ne ferme pas cette fenetre !
echo.

:: Ouvrir le navigateur dans 4 secondes (en arriere-plan)
start cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:4174"

:: Lancer le serveur (au premier plan)
node server.js

pause
