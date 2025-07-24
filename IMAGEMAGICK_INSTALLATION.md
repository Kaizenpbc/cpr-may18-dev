# ImageMagick Installation Guide for Windows

## Overview
This guide will help you install ImageMagick on Windows for PDF processing in the OCR system.

## Prerequisites
- Windows 10/11
- Administrator privileges (for installation)

## Step 1: Download ImageMagick

1. **Visit the official ImageMagick download page:**
   - Go to: https://imagemagick.org/script/download.php#windows
   - Click on "Windows Binary Release"

2. **Download the appropriate version:**
   - Choose "Win64 dynamic at 16 bits-per-pixel component" for 64-bit Windows
   - Download the `.exe` installer

3. **Alternative direct download:**
   ```powershell
   # Download ImageMagick installer
   Invoke-WebRequest -Uri "https://download.imagemagick.org/ImageMagick/download/binaries/ImageMagick-7.1.2-0-Q16-HDRI-x64-dll.exe" -OutFile "ImageMagick-Installer.exe"
   ```

## Step 2: Install ImageMagick

1. **Run the installer:**
   - Double-click the downloaded `.exe` file
   - Follow the installation wizard

2. **Important installation options:**
   - ✅ **Check "Add application directory to your system path"**
   - ✅ **Check "Install legacy utilities (e.g. convert)"**
   - ✅ **Check "Install development headers and libraries for C and C++"**

3. **Complete the installation:**
   - Click "Install" and wait for completion
   - Click "Finish"

## Step 3: Install Ghostscript (Required for PDF Processing)

ImageMagick needs Ghostscript to process PDF files. Follow these steps:

1. **Download Ghostscript:**
   - Go to: https://ghostscript.com/releases/gsdnld.html
   - Download "AGPL Ghostscript for Windows (64 bit)"
   - Or use direct download:
   ```powershell
   Invoke-WebRequest -Uri "https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs1000/gs1000w64.exe" -OutFile "gs1000w64.exe"
   ```

2. **Install Ghostscript:**
   - Run the downloaded `gs1000w64.exe`
   - Follow the installation wizard
   - **Important:** Make sure to check "Add Ghostscript to the system PATH"

3. **Verify Ghostscript installation:**
   ```powershell
   gswin64c --version
   ```

## Step 4: Verify Installation

1. **Open a new PowerShell window** (to refresh PATH)

2. **Test ImageMagick:**
   ```powershell
   magick --version
   ```

3. **Test PDF to image conversion:**
   ```powershell
   # Create a test PDF (if you don't have one)
   echo "Test PDF content" > test.txt
   
   # Convert PDF to image (this will test Ghostscript integration)
   magick "test.pdf[0]" -density 300 test-output.png
   ```

## Step 5: Add to PATH (if not done during installation)

If ImageMagick is not found in PATH:

1. **Find ImageMagick installation directory:**
   ```powershell
   Get-ChildItem "C:\Program Files\ImageMagick*" -ErrorAction SilentlyContinue
   ```

2. **Add to user PATH:**
   ```powershell
   $currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
   $imagemagickPath = "C:\Program Files\ImageMagick-7.1.2-Q16-HDRI"
   [Environment]::SetEnvironmentVariable("PATH", "$currentPath;$imagemagickPath", "User")
   ```

3. **Refresh environment:**
   ```powershell
   $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
   ```

## Troubleshooting

### Issue: "magick is not recognized"
- **Solution:** Restart PowerShell or add ImageMagick to PATH manually

### Issue: "FailedToExecuteCommand 'gswin64c.exe'"
- **Solution:** Install Ghostscript and ensure it's in PATH

### Issue: "PDFDelegateFailed"
- **Solution:** Ghostscript is not installed or not in PATH

### Issue: Permission denied
- **Solution:** Run PowerShell as Administrator

## Verification Commands

After installation, run these commands to verify everything is working:

```powershell
# Check ImageMagick
magick --version

# Check Ghostscript
gswin64c --version

# Test PDF processing (if you have a PDF file)
magick "your-file.pdf[0]" -density 300 test-output.png
```

## Next Steps

Once ImageMagick and Ghostscript are installed:

1. **Restart the backend server:**
   ```bash
   npm run dev:backend
   ```

2. **Test OCR functionality:**
   - Upload a PDF invoice through the web interface
   - The OCR should now work with real PDF processing

## Support

If you encounter issues:
1. Check that both ImageMagick and Ghostscript are installed
2. Verify both are in your system PATH
3. Restart your terminal/PowerShell after installation
4. Restart the backend server after installation 