@echo off
REM Wrapper that ensures the build uses JDK 17 and the D:\AndroidStudioSDK SDK.
REM You can run this directly:  android\build-apk.bat   or   npm run apk:debug -> see apk:debug script in package.json
setlocal

REM 1) JAVA 17 —— 优先 Studio 自带 JBR；若不存在则退回到系统 JAVA_HOME。
if exist "D:\AndroidStudio\jbr\bin\java.exe" (
    set "JAVA_HOME=D:\AndroidStudio\jbr"
    set "PATH=D:\AndroidStudio\jbr\bin;%PATH%"
) else if defined JAVA_HOME (
    REM use whatever JAVA_HOME points to
) else (
    echo [build-apk] WARNING: no Studio JBR and no JAVA_HOME set. AGP 8.2 needs JDK 17.
)

REM 2) Android SDK
set "ANDROID_HOME=D:\AndroidStudioSDK"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"

REM 3) PATH so that adb / sdkmanager are reachable
set "PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%"

REM 4) Sanity check
if not exist "%ANDROID_HOME%\platform-tools\adb.exe" (
    echo [build-apk] ERROR: %ANDROID_HOME%\platform-tools\adb.exe not found.
    echo              Check the SDK path; edit this script if you installed it elsewhere.
    exit /b 1
)

pushd "%~dp0"
call gradlew.bat assembleDebug --init-script init-mirrors.gradle %*
set "RC=%ERRORLEVEL%"
popd

if not %RC%==0 (
    echo.
    echo [build-apk] Gradle failed with code %RC%. Common causes:
    echo   - Missing SDK Platform 34 / Build-Tools 34.x in D:\AndroidStudioSDK
    echo   - JDK 17 not active
    echo   - Gradle daemon stuck: re-run with --no-daemon
)

exit /b %RC%
