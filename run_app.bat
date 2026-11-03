@echo off
echo ========================================================
echo   Starting CareerCraft Resume Builder & Job Portal
echo ========================================================
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Launching Flask Server on http://127.0.0.1:5000...
python app.py
pause
