# WAREHOUSE DESKTOP APPLICATION FOR ADVENTUS IT SERVICES

## USER GUIDE/TUTORIAL

**How do you download the app from file explorer?** You need to run the installer. Follow these steps:
(1) Open the file in file explorer
(2) Navigate to
  >>> WAREHOUSE_DESKTOP
  >>> src-tauri
  >>> target
  >>> release
  >>> bundle
(3) Download one of the versions
  From **msi**, download warehouse-desktop_0.1.0_x64_en-US
  From **nsis**, download warehouse-desktop_0.1.0_x64-setup
(4) Send it directly to the home page

**What is the difference between the installers?** 
(1) **msi** - recommended for deploying the app across multiple computers
(2) **nsis** - recommended for deploying on one computer

## DEVELOPER'S NOTES

**The following tools and languages were used to build the app:**
(1) React and TypeScript 
(2) Tauri (Rust)
(3) CSS
(4) Supabase

**What do you need to run this program?** Ensure each dependencies are installed to the latest version by running these commands:
**(1) Node.js** 
```
  winget install OpenJS.NodeJS.LTS
  node --version 
  npm --version 
```
**(2) Rust (for Tauri)**
```
  winget install Rustlang.Rustup
  rustc --version 
  cargo --version
```
**(3) Supabase**
```
  npm list @supabase/supabase-js
```
**(4) Install project packages**
```
  npm install
```

**What dependencies do you need for the QR Code Generator?**
```
npm install qrcode jspdf jspdf-autotable
npm install -D @types/qrcode
```

**What do you need to know about Tauri?** A Tauri template was used to build the app and typescript was used to build the pages. Future developers should directly edit the `src` file (Typescript) to make changes to the pages while keeping changes to the Tauri template at a minimum. For reference, this command was used to create the template **thus not required to run this command.**
```
  npm create tauri-app@latest
```

**Listed below are the app details for future reference:**
✔ Project name · WAREHOUSE_DESKTOP
✔ Package name · warehouse_desktop
✔ Identifier · com.com3khd.warehouse_desktop
✔ Choose which language to use for your frontend · TypeScript / JavaScript - (pnpm, yarn, npm, deno, bun)
✔ Choose your package manager · npm
✔ Choose your UI template · React - (https://react.dev/)
✔ Choose your UI flavor · TypeScript

**How do you run the app from VS Code's Terminal?**
(1) Move to the file's terminal
```
  cd WAREHOUSE_DESKTOP
```
(2) Run desktop application command
```
  npm run tauri dev 
```

**How do you rebuild the app?** To run the latest code changes, future developers will need to rebuild and reinstall the app.
(1) Ensure the app is closed and not running in the background.
(2) Open Tauri's config file
```
  cd src-tauri
  cd tauri.conf.json
```
(3) Rebuild the project from VS Code's Terminal
```
  npm run tauri build
```
(4) Run the installer (see **USER GUIDE/TUTORIAL** above)