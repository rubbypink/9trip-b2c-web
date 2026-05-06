@echo off
chcp 65001 > nul
cd /d "D:\Software\9trip-b2c-web"

set SCRIPT=.agents\skills\activity-scraper\scripts\saveActivityDataScript.js
set TEMP=.temp

echo ===== BATCH SAVE TO FIREBASE =====
echo Starting: %date% %time%
echo.

call :save "xe-ua-on-rieng-tu-san-bay-phu-quoc" "Xe đưa đón riêng sân bay"
call :save "xe-ua-on-san-bay-phu-quoc" "Xe Đưa Đón Sân Bay"
call :save "tour-3-ao-phu-quoc" "Tour 3 Đảo"
call :save "tour-4-ao-cap-treo" "Tour 4 Đảo & Cáp Treo"
call :save "trai-nghiem-cau-muc-em" "Câu Mực Đêm"
call :save "tour-4-ao-cap-treo-hon-thom" "Tour 4 đảo + Cáp Treo"
call :save "tour-3-ao-bao-gom-cap-treo" "Tour 3 Đảo + Cáp Treo"
call :save "tour-3-ao-junk-cruise" "Tour Junk Cruise"
call :save "lam-phi-hanh-gia-duoi-ai-duong" "Phi Hành Gia"
call :save "workshop-lam-socola-thu-cong" "Workshop Socola"
call :save "tour-nam-ao-phu-quoc" "Tour Nam Đảo"
call :save "tour-nam-ao-cap-treo" "Tour Nam Đảo + Cáp Treo"
call :save "tour-bac-phu-quoc" "Tour Bắc Phú Quốc"
call :save "tour-cau-ca-lon" "Tour Câu Cá Lớn"
call :save "tour-cau-muc-hoang-hon" "Tour Câu Mực & Hoàng Hôn"
call :save "xe-ua-on-san-bay-pqc" "Xe Đưa Đón PQC"
call :save "du-thuyen-nemo-phu-quoc" "Du thuyền Nemo"
call :save "tour-3-ao-cao-toc" "Tour 3 đảo cao tốc"
call :save "ve-thuyen-thung-phu-quoc" "Vé thuyền thúng"

echo.
echo ===== DONE =====
echo Finished: %date% %time%
pause
exit /b 0

:save
echo -----------------------------------------------
echo [%1] %2
echo -----------------------------------------------
node "%SCRIPT%" --input="%TEMP%\scraped-activity-%1.json"
if %ERRORLEVEL% equ 0 (
    echo [OK] %2
) else (
    echo [FAIL] %2 (exit code: %ERRORLEVEL%)
)
echo.
exit /b 0
