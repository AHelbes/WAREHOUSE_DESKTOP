# Warehouse Desktop Application — Adventus IT Services

## 1. Project Overview

The Warehouse Desktop Application is a desktop-based inventory management system developed for Adventus IT Services.

The application provides an interface for managing warehouse inventory, organizing equipment records, importing inventory data, and tracking warehouse activities.

The application supports three warehouse categories:

- **Warehouse 1 — Laptops**
- **Warehouse 2 — Computer Equipment**
- **Warehouse 3 — YubiKeys**

## 2. Application Installation

The Warehouse Desktop Application is distributed through Windows installers generated using Tauri.

**Application Type:** Windows Desktop Application

**Desktop Framework:** Tauri

**Installer Formats:** MSI and NSIS (.exe)

The application can be installed on supported Windows computers without installing the development tools or source code.

### Locating the Installers

After building the application, open File Explorer and navigate to:

```text
WAREHOUSE_DESKTOP/
└── src-tauri/
    └── target/
        └── release/
            └── bundle/
                ├── msi/
                └── nsis/
```

The installer folders contain the installation files generated during the build process.

### Available Installer Types

**MSI Installer**

- Example filename: `warehouse-desktop_0.1.0_x64_en-US.msi`
- Recommended for managed installation and deployment across multiple company computers.

**NSIS Installer**

- Example filename: `warehouse-desktop_0.1.0_x64-setup.exe`
- Recommended for straightforward installation on individual Windows computers.

Both installers provide the same application functionality.

### Installing the Application

1. Open the folder containing the installer.
2. Select either the MSI or NSIS installer.
3. Copy the installer to the computer where the application will be installed.
4. Double-click the installer file.
5. Follow the installation instructions.
6. Wait for installation to complete.
7. Launch the Warehouse Desktop Application from the Windows Start menu or an available desktop shortcut.

**Important Notes**

- Users do not need to install Node.js, Rust, or Visual Studio Code.
- The application requires access to its configured Supabase services for connected functionality.
- Future application updates require distributing and installing a newly built version unless an automatic update system is configured.

## 3. Main Features

The Warehouse Desktop Application includes the following inventory management features:

- **Warehouse Inventory Management** — Displays and organizes equipment records across three warehouse categories.
- **Inventory Search and Filtering** — Allows users to locate inventory records.
- **Inventory Editing** — Allows authorized users to update existing equipment information.
- **CSV Importing** — Imports equipment information from CSV files.
- **Duplicate Detection** — Identifies imported records that match existing inventory.
- **Duplicate Replacement** — Provides options for retaining existing records or replacing them with imported information.
- **Staging Management** — Allows users to prepare, review, edit, and commit inventory records.
- **Bulk Staging** — Supports selecting and staging multiple inventory records.
- **QR Code Generation** — Generates QR codes for equipment identification.
- **CSV and PDF Exporting** — Exports staged inventory information.
- **Shelf Management** — Supports adding, removing, searching, and updating shelf availability.
- **Inventory Pull-Out** — Supports permanently removing selected existing inventory records through the staging workflow.
- **Activity Logging** — Records supported warehouse activities for tracking purposes.
- **Superuser Controls** — Provides additional administrative functionality for authorized users.

## 4. Technology Stack

- **React** — Frontend interface development.
- **TypeScript** — Application logic and functionality.
- **CSS** — Interface design and styling.
- **Tauri** — Desktop application framework and Windows installer generation.
- **Rust** — Native desktop application backend.
- **Supabase** — Authentication and database services.
- **PapaParse** — CSV file processing.
- **QRCode** — QR code generation.
- **jsPDF** — PDF document generation.
- **jsPDF-AutoTable** — PDF table generation.
- **GitHub** — Source code storage and version control, when configured.

## 5. Project Structure

The Warehouse Desktop Application uses a React and TypeScript frontend with a Tauri desktop application structure.

```text
WAREHOUSE_DESKTOP/
├── src/
│   ├── assets/
│   ├── pages/
│   │   ├── Warehouse 1/
│   │   ├── Warehouse 2/
│   │   └── Warehouse 3/
│   └── supabase/
├── src-tauri/
│   ├── src/
│   ├── icons/
│   ├── tauri.conf.json
│   └── target/
│       └── release/
│           └── bundle/
│               ├── msi/
│               └── nsis/
├── package.json
└── README.md
```

**Important Notes**

- The `src/` directory contains the frontend application.
- The `src-tauri/` directory contains Tauri configuration and Rust-related files.
- The `tauri.conf.json` file contains desktop application configuration.
- The `target/release/bundle/` directory contains generated installers after a successful production build.
- Generated build directories may not be included in the GitHub repository.

## 6. Running the Application Locally

Future developers can run the application locally using Visual Studio Code and the required development tools.

### Development Requirements

**Node.js**

Install Node.js LTS:

```powershell
winget install OpenJS.NodeJS.LTS
```

Verify installation:

```powershell
node --version
npm --version
```

**Rust**

Install Rust:

```powershell
winget install Rustlang.Rustup
```

Verify installation:

```powershell
rustc --version
cargo --version
```

**Windows Development Dependencies**

Tauri requires additional Windows development components, including Microsoft C++ Build Tools and WebView2.

Official documentation: https://v2.tauri.app/start/prerequisites/

### Running the Application

1. Download or obtain the project source code.
2. Extract the project folder if provided as a ZIP file.
3. Open the project in Visual Studio Code.
4. Open the integrated terminal.
5. Navigate to the project root containing `package.json`.
6. Install the required dependencies:

```powershell
npm install
```

7. Run the application:

```powershell
npm run tauri dev
```

8. Wait for the desktop application to launch.

**Important Notes**

- The application must have valid Supabase configuration to access connected services.
- Developers should test their changes in development mode before creating a new installer.
- The development command does not generate a production installer.

## 7. Building and Updating the Windows Installers

The Warehouse Desktop Application uses Tauri to generate Windows installation packages.

Future developers must rebuild the application to include the latest source code changes.

### Steps to Build the Application

1. Open the Warehouse Desktop project in Visual Studio Code.
2. Save all updated TypeScript, CSS, and configuration files.
3. Close any running instances of the application when necessary.
4. Open the integrated terminal.
5. Navigate to the project root containing `package.json`.
6. Install dependencies if needed:

```powershell
npm install
```

7. Check that the frontend builds successfully:

```powershell
npm run build
```

8. Build the desktop application:

```powershell
npm run tauri build
```

9. Wait for the build process to complete.
10. Open the generated installer directory.

### Installer Output Locations

**MSI Installer**

```text
WAREHOUSE_DESKTOP/src-tauri/target/release/bundle/msi/
```

**NSIS Installer**

```text
WAREHOUSE_DESKTOP/src-tauri/target/release/bundle/nsis/
```

The exact filenames depend on the configured application version, name, and target architecture.

### Testing the Updated Application

1. Locate the newly generated installer.
2. Install the application on a Windows computer.
3. Launch the application.
4. Verify that authentication works.
5. Check that inventory records load correctly.
6. Test CSV importing and duplicate handling.
7. Verify staging and inventory editing.
8. Test QR code generation and file exporting.
9. Confirm that the updated functionality works as expected.

### Important Notes

- Building the application does not automatically update existing installations.
- Distribute the newly generated installer to users when releasing an update.
- Keep the source code updated in the repository.
- Test the installer before company-wide deployment.
- Review the Tauri configuration when changing the application version or installer settings.

## 8. Supabase Database and Authentication

The Warehouse Desktop Application uses Supabase to support authentication and inventory data management.

Supabase stores and manages information used by the application.

### Accessing Supabase

1. Open https://supabase.com/dashboard.
2. Sign in using an authorized Supabase account.
3. Select the project associated with the Warehouse Desktop Application.
4. Navigate to **Table Editor** to inspect database records.
5. Navigate to **Authentication** to manage supported user authentication functions.

### Warehouse Database Tables

The application uses the following inventory tables:

| Table | Purpose |
|---|---|
| `warehouse_laptops` | Warehouse 1 laptop inventory |
| `warehouse_ce` | Warehouse 2 computer equipment inventory |
| `warehouse_yubikeys` | Warehouse 3 YubiKey inventory |
| `staging_import` | Temporary staging of inventory records |
| `warehouse_shelves` | Warehouse shelf information |
| `user_activity` | Warehouse activity logs |

### Managing Inventory Records

Authorized administrators can inspect and manage records using the Supabase Table Editor.

1. Open the appropriate warehouse table.
2. Locate the record that requires updating.
3. Review its current information.
4. Modify the necessary fields.
5. Save the changes.
6. Verify the updated record in the Warehouse Desktop Application.

### Managing User Accounts

Authorized administrators can access Supabase Authentication to manage application user accounts.

1. Open the Supabase project.
2. Select **Authentication**.
3. Navigate to the user management section.
4. Review existing user accounts.
5. Perform the necessary supported administrative action.
6. Verify that the user can access the application with the intended permissions.

### Important Notes

- Database changes can affect the application immediately.
- Routine record management does not normally require rebuilding the desktop installer.
- Changes to the frontend or desktop application code require a new build.
- Avoid modifying database table structures without reviewing the application code that depends on them.
- Only authorized personnel should manage database records and user accounts.
- Never expose Supabase service-role credentials in frontend source code.

## 9. Modifying the Source Code

Future developers can modify the Warehouse Desktop Application using Visual Studio Code or another compatible development environment.

### Frontend Modifications

- Edit files inside `src/pages/` to modify warehouse functionality and interfaces.
- Edit CSS files to update the application layout, responsiveness, and appearance.
- Edit files inside `src/assets/` when updating images and other visual resources.
- Update the Supabase client configuration when necessary, without exposing privileged credentials.

### Tauri Modifications

The application was initially created using a Tauri project template.

The following command was used to create the project:

```powershell
npm create tauri-app@latest
```

**This command is not required when maintaining the existing application.**

The original project configuration includes:

| Setting | Value |
|---|---|
| Project Name | WAREHOUSE_DESKTOP |
| Package Name | warehouse_desktop |
| Application Identifier | com.com3khd.warehouse_desktop |
| Frontend Framework | React |
| Frontend Language | TypeScript |
| Package Manager | npm |
| Desktop Framework | Tauri |

Developers should primarily modify the `src/` directory when updating application features.

The `src-tauri/` directory should be modified when changes to native desktop functionality or application configuration are necessary.

### After Making Changes

1. Save the modified source files.
2. Run the application locally using `npm run tauri dev`.
3. Test the updated functionality.
4. Save and commit the changes to the source code repository.
5. Build the application using `npm run tauri build`.
6. Install and test the newly generated installer.
7. Distribute the updated installer when ready.

**Note:** Database record updates through Supabase generally do not require rebuilding the application.

## 10. Maintenance and Troubleshooting

Future developers should regularly verify that the application functions correctly.

### Application Maintenance

- Test the login and authentication process.
- Verify inventory loading across all three warehouses.
- Check inventory search and editing functionality.
- Test CSV importing and duplicate detection.
- Verify staging, committing, and pull-out operations.
- Test QR code generation.
- Confirm that PDF and CSV exports work correctly.
- Verify shelf management and activity logging.
- Maintain updated copies of the source code.

### Development Troubleshooting

If the application fails to start:

1. Verify that Node.js and Rust are installed.
2. Confirm that the terminal is in the project root.
3. Run `npm install`.
4. Review terminal error messages.
5. Retry `npm run tauri dev`.

If the application fails to build:

1. Run `npm run build` to check frontend errors.
2. Review TypeScript and dependency errors.
3. Confirm that Rust and the required Windows build tools are installed.
4. Review `src-tauri/tauri.conf.json`.
5. Retry `npm run tauri build`.

If inventory records do not load:

1. Verify the internet connection.
2. Check the Supabase project status.
3. Confirm that the application uses the correct Supabase configuration.
4. Review database permissions and Row Level Security policies.
5. Check for errors in the application and Supabase logs.

If an installer fails:

1. Confirm that the build completed successfully.
2. Verify that the correct Windows architecture was selected.
3. Check that the installer file is complete.
4. Review Windows error messages and installation logs.
5. Rebuild and retest if necessary.

## 11. Project Handover

The Warehouse Desktop Application uses three main technologies and services for development, deployment, and data management.

| Platform | Purpose |
|---|---|
| GitHub | Source code storage, version control, and documentation |
| Tauri | Desktop application packaging and Windows installer generation |
| Supabase | Authentication, inventory records, staging, and activity data |

### Project Links

**Tauri Documentation:** https://v2.tauri.app/

**React Documentation:** https://react.dev/

**Supabase Dashboard:** https://supabase.com/dashboard

**GitHub:** https://github.com/

### Handover Instructions

Future developers and administrators can:

1. Access the project source code through the provided repository or project files.
2. Modify warehouse functionality by editing the React and TypeScript files.
3. Update application styling through the CSS files.
4. Test changes locally using Tauri development mode.
5. Build updated Windows installers using the Tauri build command.
6. Distribute the MSI or NSIS installer to users.
7. Manage authorized user accounts through Supabase Authentication.
8. Inspect and maintain warehouse inventory records through Supabase.
9. Monitor application functionality, database connectivity, and build compatibility.

The receiving team should have appropriate access to the source code, development environment, and Supabase project before assuming responsibility for maintenance.

Account credentials, privileged API keys, and sensitive configuration information should be transferred securely and should not be stored in the repository.

---

**Warehouse Desktop Application — Adventus IT Services**

Developed to support warehouse inventory management, equipment tracking, and administrative operations across laptop, computer equipment, and YubiKey inventories.
