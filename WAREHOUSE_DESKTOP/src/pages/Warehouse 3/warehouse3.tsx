import "./warehouse3.css";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabase/supabaseClient";

import logo from "../../assets/logo.png";
import background from "../../assets/bgWarehouse.png";

import Papa from "papaparse";

import QRCode from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Warehouse3Props = {
  onBack: () => void;
  onWarehouse1: () => void;
  onWarehouse2: () => void;
  onSuperuser: () => void;
  isSuperuser: boolean;
};

function Warehouse3({
  onBack,
  onWarehouse1,
  onWarehouse2,
  onSuperuser,
  isSuperuser
}: Warehouse3Props) {
  /*Memory boxes for importing CSV files*/
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  /*Memory boxes for searching and staging a unit*/
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [unitSearchResults, setUnitSearchResults] = useState<Record<string, any>[]>([]);

  /*nakakaiyak na hahahaha tama na po. Memory boxes for the combined (laptop/ce) staged list and editing a staged item*/
  const [stagingRows, setStagingRows] = useState<Record<string, any>[]>([]);
  const [stagingSearchTerm, setStagingSearchTerm] = useState("");
  const [selectedStagingId, setSelectedStagingId] = useState<string | null>(null);
  const [stagingEditValues, setStagingEditValues] = useState<Record<string, any>>({});

  /*Memory boxes for actively loading data. columns for hostnames/status, rows for laptop unit, loading always starts true and lets user know the program is still loading, error starts null*/
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /*Memory boxes for the search and filter function*/
  const [searchTerm, setSearchTerm] = useState("");

  /*Memory boxes for add columns function*/
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");

  /*Memory boxes for edit data function*/
  const [searchUnitTerm, setSearchUnitTerm] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  
  /*Memory boxes for the Log Inventory function*/
  const [showLogPopup, setShowLogPopup] = useState(false);
  const [logFormValues, setLogFormValues] = useState<Record<string, string>>({});

  /*Memory boxes for the shelf control management function*/
  const [shelves, setShelves] = useState<
    { id: string; 
      rack_and_bay: string;
      package_status: string;
      location: string;
      status: string;
    }[]
  >([]);
  const [shelvesLoading, setShelvesLoading] = useState(true);
  const [shelvesError, setShelvesError] = useState<string | null>(null);
  const [shelfSearchTerm, setShelfSearchTerm] = useState("");
  const [newShelfName, setNewShelfName] = useState("");

  /*Function for importing CSV files.*/
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.target.files?.[0];
  if (!file) return;

  setImporting(true);

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,

    complete: async (results) => {
        const parsedRows = (
            results.data as Record<string, string>[]
        ).map((row) => ({
            ...row,
            equipment_type: "YUBIKEY",
        }));
      console.log("CSV PARSED ROWS:", parsedRows);

      if (parsedRows.length === 0) {
        alert("The CSV contains no rows.");
        setImporting(false);
        e.target.value = "";
        return;
      }

      const { data, error } = await supabase
        .from("staging_import")
        .insert(parsedRows)
        .select();

      if (error) {
        console.error("STAGING INSERT ERROR:", error);
        alert(`Import failed: ${error.message}`);
      } else {
        console.log("STAGING INSERTED ROWS:", data);

        if (!data || data.length === 0) {
          alert(
            "Supabase accepted the request, but no staging rows were returned."
          );
        } else {
          alert(
            `Imported ${data.length} row(s) into staging successfully.`
          );

          await fetchStaging();
        }
      }

      setImporting(false);
      e.target.value = "";
    },

    error: (err) => {
      console.error("CSV READ ERROR:", err);
      alert(`Could not read file: ${err.message}`);
      setImporting(false);
      e.target.value = "";
      },
    });
  }

  /*
  Staging Functions
  */
  /*
  Function for staging a new import. For example, user will upload a new CSV (import new data)
  */
  async function fetchStaging() {
  const { data, error } = await supabase
    .from("staging_import")
    .select("*")
    .eq("equipment_type", "YUBIKEY")
    .order("created_at", { ascending: false });

  if (error) {
    alert(`Could not load staging: ${error.message}`);
    return;
  }

  console.log("STAGING ROW COUNT:", data?.length ?? 0);

  setStagingRows(data ?? []);
}

  /* 
  Function to stage a unit (laptop/ce) from the search function
  */
  async function handleStageUnit(row: Record<string, any>) {
    const { id, created_at, updated_at, created_by, updated_by, _sourceTable, ...rest } = row;

    const { error } = await supabase
      .from("staging_import")
      .insert({ ...rest, source_unit_id: id });

    if (error) {
      alert(error.message);
    } else {
      setUnitSearchTerm("");
      setUnitSearchResults([]);
      fetchStaging();
    }
  }

  /*
  Function for staging: this is to search both tables (laptop/ce)
  */
  async function handleUnitSearch(term: string) {
    setUnitSearchTerm(term);

    if (!term.trim()) {
      setUnitSearchResults([]);
      return;
    }

    const [laptopResults, ceResults, yubikeyResults] = await Promise.all([
      supabase.from("warehouse_laptops").select("*").ilike("hostname", `%${term}%`),
      supabase.from("warehouse_ce").select("*").ilike("hostname", `%${term}%`),
      supabase.from("warehouse_yubikeys").select("*").ilike("hostname", `%${term}%`),
    ]);

    const combined = [
      ...(laptopResults.data ?? []).map((row) => ({ ...row, _sourceTable: "warehouse_laptops" })),
      ...(ceResults.data ?? []).map((row) => ({ ...row, _sourceTable: "warehouse_ce" })),
      ...(yubikeyResults.data ?? []).map((row) => ({ ...row, _sourceTable: "warehouse_yubikeys" })),
    ];

    setUnitSearchResults(combined);
  }

    /*Filters the staged list down to whatever matches the second search box.*/
  const filteredStagingRows = stagingRows.filter((row) =>
    Object.values(row).some((val) =>
      String(val ?? "").toLowerCase().includes(stagingSearchTerm.toLowerCase())
    )
  );

  /*Clicking a staged item loads its values into the edit form.*/
  function handleSelectStagingRow(row: Record<string, any>) {
    setSelectedStagingId(row.id);
    setStagingEditValues({ ...row });
  }

  /*Called as the user types into any field in the staged item's edit form.*/
  function handleStagingFieldChange(field: string, value: string) {
    setStagingEditValues((prev) => ({ ...prev, [field]: value }));
  }

  /*Saves edits to a staged item (still inside staging_import, not committed yet).*/
  async function handleSaveStagingEdit() {
    const { id, created_at, ...updatableFields } = stagingEditValues;

    const { error } = await supabase
      .from("staging_import")
      .update(updatableFields)
      .eq("id", selectedStagingId);

    if (error) {
      alert(error.message);
    } else {
      setSelectedStagingId(null);
      setStagingEditValues({});
      fetchStaging();
    }
  }

  /*Removes one item from staging entirely (changed your mind about staging it).*/
  async function handleRemoveFromStaging(id: string) {
    const { error } = await supabase
      .from("staging_import")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      if (selectedStagingId === id) setSelectedStagingId(null);
      fetchStaging();
    }
  }

  /*Clear stage*/
  async function handleClearStage() {
  if (stagingRows.length === 0) {
    alert("There are no staged items to clear.");
    return;
  }

  const confirmed = window.confirm(
    `Clear all ${stagingRows.length} staged items?`
  );

  if (!confirmed) return;

  const stagedIds = stagingRows.map((row) => row.id);

  const { error } = await supabase
    .from("staging_import")
    .delete()
    .in("id", stagedIds);

  if (error) {
    alert(`Could not clear stage: ${error.message}`);
    return;
  }

  setStagingRows([]);
  setSelectedStagingId(null);
  setStagingEditValues({});
  setUnitSearchTerm("");
  setUnitSearchResults([]);
  setStagingSearchTerm("");

  alert("Stage cleared.");
}

  /*Commits everything currently in staging into the real tables (via the
  commit_staged_imports SQL function), then empties staging.*/
  async function handleCommitStaging() {
    const confirmed = window.confirm(
      `Commit all ${stagingRows.length} staged items to the real tables?`
    );
    if (!confirmed) return;

    const { error } = await supabase.rpc("commit_staged_imports");

    if (error) {
      alert(error.message);
    } else {
      alert("Staged items committed.");
      setStagingRows([]);
      setSelectedStagingId(null);
      fetchData(); // refresh the main laptops table
    }
  }

  /*Function to let superuser track user activity Im gonna cry*/
  async function logUserActivity(
  action: string,
  itemIdentifier?: string,
  details?: string
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    alert(`Could not get user: ${userError.message}`);
    return;
  }

  if (!user) {
    alert("Activity logging failed: No logged-in user found.");
    return;
  }

  alert(`Trying to log activity for: ${user.email}`);

  const { error } = await supabase
    .from("user_activity")
    .insert({
      user_id: user.id,
      warehouse: "warehouse_3",
      action,
      item_identifier: itemIdentifier ?? null,
      details: details ?? null,
    });

  if (error) {
    alert(`Activity logging failed: ${error.message}`);
    console.error("Activity logging error:", error);
    return;
  }

  alert("Activity logged successfully!");
}

  /*Function for loading supabase data.*/
  async function fetchData() {
    setLoading(true);

    const { data: columnData, error: columnError } = await supabase
      .rpc("get_table_columns", { target_table: "warehouse_yubikeys" });

    const { data: rowData, error: rowError } = await supabase
      .from("warehouse_yubikeys")
      .select("*")
      .order("hostname", { ascending: true });
  if (columnError) setError(columnError.message);
    else if (rowError) setError(rowError.message);
    else {
      setColumns((columnData ?? []).map((c: any) => c.column_name));
      setRows(rowData ?? []);
      setError(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  /*Function for the search and filter function*/
  const filteredRows = rows.filter((row) =>
    columns.some((col) =>
    String(row[col] ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  ) 
  );

  /*Function to call admin_add_column function in SQL. Refetch new data column from supabase.*/
   async function handleAddColumn() {
    if (!newColumnName.trim()) return;

    const { error } = await supabase.rpc("admin_add_column", {
      target_table: "warehouse_yubikeys",
      new_column_name: newColumnName.trim(),
      new_column_type: newColumnType,
    });

    if (error) {
      alert(error.message);
    } else {
      setNewColumnName("");
      fetchData();
    }
  }

  /*Function to edit data.*/
  function handleSelectUnit(row: Record<string, any>) {
    setSelectedUnitId(row.id);
      setEditValues({ ...row });
    setSearchUnitTerm("");
  }

  function handleEditFieldChange(column: string, value: string) {
    setEditValues((prev) => ({ ...prev, [column]: value }));
  }

  async function handleSaveUnit() {
    const { id, created_at, created_by, ...updatableFields } = editValues;

    const { error } = await supabase
      .from("warehouse_yubikeys")
      .update(updatableFields)
      .eq("id", selectedUnitId);

    if (error) {
      alert(error.message);
    } else {
      setSelectedUnitId(null);
      setEditValues({});
      fetchData();
    }
  }

  function handleCancelUnitEdit() {
    setSelectedUnitId(null);
    setEditValues({});
  }

  /*Search for the edit data function*/
  const matchedUnits = searchUnitTerm.trim()
  ? rows.filter((row) =>
      columns.some((col) =>
        String(row[col] ?? "").toLowerCase().includes(searchUnitTerm.toLowerCase())
      )
    )
  : [];

  /*Function to open the popup page for the log inventory.*/
  function handleOpenLogPopup() {
    setLogFormValues({});
    setShowLogPopup(true);
  }

  /*Updates one field as the user types.*/
  function handleLogFieldChange(field: string, value: string) {
    setLogFormValues((prev) => ({ ...prev, [field]: value }));
  }

  /*Inserts the new unit straight into warehouse_yubikeys, then closes the
  popup and refreshes the main table.*/
  async function handleSubmitLog() {
  const { error } = await supabase
    .from("warehouse_yubikeys")
    .insert({
        ...logFormValues,
        equipment_type: "YUBIKEY",
    });

  if (error) {
    alert(error.message);
    return;
  }

  await logUserActivity(
    "Added Inventory",
    logFormValues.hostname || undefined,
    "Added a new item to Warehouse 3"
  );

  setShowLogPopup(false);
  setLogFormValues({});
  fetchData();
}

  function handleCancelLog() {
    setShowLogPopup(false);
    setLogFormValues({});
  }

  /*Function for the QR Code Generator function*/
  async function handleGenerateQRCode(row: Record<string, any>) {
  if (!row.id) {
    alert("This unit does not have a permanent ID yet.");
    return;
  }

  try {
    const qrValue = `warehouse_3:${row.id}`;

    const qrDataUrl = await QRCode.toDataURL(qrValue, {
      width: 400,
      margin: 2,
    });

    const link = document.createElement("a");

    link.href = qrDataUrl;

    const safeHostname = String(
      row.hostname || "warehouse-unit"
    ).replace(/[^a-zA-Z0-9-_]/g, "_");

    link.download = `${safeHostname}_QR.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("QR generation failed:", error);
    alert("Could not generate QR code.");
  }
}

  /*Generate QR Codes for Units in Staging*/
  function handleExportStagedCSV() {
    if (stagingRows.length === 0) {
      alert("There are no staged units to export.");
      return;
    }

    const cleanedRows = stagingRows.map((row) => {
      const {
        id,
        created_at,
        ...exportableFields
      } = row;
    
      return exportableFields;
    });

    const csv = Papa.unparse(cleanedRows);

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
  
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement("a");

    link.href = url;
    link.download = `warehouse3_yubikey_staged_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /*Function for the export PDF/CSV function*/
  async function handleExportStagedPDF() {
    if (stagingRows.length === 0) {
      alert("There are no staged units to export.");
      return;
    }

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  pdf.setFontSize(18);
  pdf.text("Warehouse 3 - Staged Units", 14, 15);

  pdf.setFontSize(10);
  pdf.text(
    `Generated: ${new Date().toLocaleString()}`,
    14,
    22
  );

  const ignoredColumns = [
    "id",
    "created_at",
  ];

  const exportColumns = Object.keys(stagingRows[0]).filter(
    (column) => !ignoredColumns.includes(column)
  );

  autoTable(pdf, {
    startY: 28,

    head: [exportColumns],

    body: stagingRows.map((row) =>
      exportColumns.map((column) =>
        String(row[column] ?? "")
      )
    ),

    styles: {
      fontSize: 6,
    },

    headStyles: {
      fontSize: 6,
    },
  });

  const qrColumns = 4;
const qrRows = 4;
const qrPerPage = qrColumns * qrRows; // 16

// Start QR labels on a new portrait page
pdf.addPage("a4", "portrait");

const pageWidth = pdf.internal.pageSize.getWidth();
const pageHeight = pdf.internal.pageSize.getHeight();

const marginX = 10;
const marginY = 10;

const cellWidth =
  (pageWidth - marginX * 2) / qrColumns;

const cellHeight =
  (pageHeight - marginY * 2) / qrRows;

const qrSize = 32;

for (let i = 0; i < stagingRows.length; i++) {
  const row = stagingRows[i];

  // After every 16 units, create another page
  if (i > 0 && i % qrPerPage === 0) {
    pdf.addPage("a4", "portrait");
  }

  const positionOnPage = i % qrPerPage;

  const column = positionOnPage % qrColumns;
  const gridRow = Math.floor(
    positionOnPage / qrColumns
  );

  const cellX =
    marginX + column * cellWidth;

  const cellY =
    marginY + gridRow * cellHeight;

  const centerX =
    cellX + cellWidth / 2;

  /*
    Generate QR
  */
  const unitId =
    row.source_unit_id || row.id;

  const qrValue =
    `warehouse_3:${unitId}`;

  const qrDataUrl =
    await QRCode.toDataURL(qrValue, {
      width: 300,
      margin: 1,
    });

  /*
    QR position
  */
  const qrX =
    centerX - qrSize / 2;

  const qrY =
    cellY + 3;

  pdf.addImage(
    qrDataUrl,
    "PNG",
    qrX,
    qrY,
    qrSize,
    qrSize
  );

  /*
    Information underneath QR
  */
  let textY =
    qrY + qrSize + 4;

  pdf.setFont(
    "helvetica",
    "bold"
  );

  pdf.setFontSize(8);

  pdf.text(
    String(
      row.hostname || "No Hostname"
    ),
    centerX,
    textY,
    {
      align: "center",
      maxWidth: cellWidth - 4,
    }
  );

  pdf.setFont(
    "helvetica",
    "normal"
  );

  pdf.setFontSize(6.5);

  textY += 4;

  pdf.text(
    `Checked By: ${
      row.checked_by || "-"
    }`,
    centerX,
    textY,
    {
      align: "center",
      maxWidth: cellWidth - 4,
    }
  );

  textY += 3.5;

  pdf.text(
    `Rack & Bay: ${
      row.rack_and_bay ||
      row.shelf ||
      "-"
    }`,
    centerX,
    textY,
    {
      align: "center",
      maxWidth: cellWidth - 4,
    }
  );

  textY += 3.5;

  const dateValue =
    row.created_at
      ? new Date(
          row.created_at
        ).toLocaleDateString()
      : new Date().toLocaleDateString();

  pdf.text(
    `Date: ${dateValue}`,
    centerX,
    textY,
    {
      align: "center",
    }
  );
  }
  
  pdf.save(
    `warehouse3_yubikey_staged_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`
  );
  }

  /*Function for the pull out function*/
  async function handlePullOut() {
  const existingUnits = stagingRows.filter(
    (row) => row.source_unit_id
  );

  if (existingUnits.length === 0) {
    alert(
      "There are no existing warehouse units staged for pull out."
    );
    return;
  }

  const confirmed = window.confirm(
    `PERMANENTLY DELETE ${existingUnits.length} unit(s) from Warehouse 3?\n\n` +
      "This action cannot be undone."
  );

  if (!confirmed) return;

  for (const row of existingUnits) {
    const unitId = row.source_unit_id;

    // Record the action BEFORE deleting the equipment.
    await logUserActivity(
      "PULL OUT",
      row.hostname || row.serial_number || unitId,
      `Permanently removed from Warehouse 1. Unit ID: ${unitId}`
    );

    const { error: deleteError } = await supabase
      .from("warehouse_yubikeys")
      .delete()
      .eq("id", unitId);

    if (deleteError) {
      alert(
        `Could not permanently delete ${
          row.hostname || unitId
        }: ${deleteError.message}`
      );
      return;
    }

    const { error: stagingDeleteError } = await supabase
      .from("staging_import")
      .delete()
      .eq("id", row.id);

    if (stagingDeleteError) {
      alert(
        `The unit was deleted from Warehouse 1, but its staging copy could not be removed: ${stagingDeleteError.message}`
      );
      return;
    }
  }

  alert(
    `${existingUnits.length} unit(s) permanently pulled out from Warehouse 3.`
  );

  setSelectedStagingId(null);
  setStagingEditValues({});

  await fetchStaging();
  await fetchData();
}

  //* SHELF CONTROL MANAGEMENT */

async function fetchShelves() {
  setShelvesLoading(true);
  setShelvesError(null);

  const { data, error } = await supabase
    .from("warehouse_shelves")
    .select("*")
    .order("rack_and_bay", { ascending: true });

  console.log("SHELVES DATA:", data);
  console.log("SHELVES ERROR:", error);

  if (error) {
    setShelvesError(error.message);
    setShelves([]);
  } else {
    setShelves(data ?? []);
  }

  setShelvesLoading(false);
}

useEffect(() => {
  fetchShelves();
}, []);


/* Search shelves - NOT case sensitive */
const filteredShelves = shelfSearchTerm.trim()
  ? shelves.filter((shelf) =>
      String(shelf.rack_and_bay ?? "")
        .toLowerCase()
        .includes(shelfSearchTerm.trim().toLowerCase())
    )
  : [];

const filteredManageShelves = newShelfName.trim()
  ? shelves.filter((shelf) =>
      String(shelf.rack_and_bay ?? "")
        .toLowerCase()
        .includes(newShelfName.trim().toLowerCase())
    )
  : [];


/* Set shelf Full / Available */
async function handleSetShelfStatus(
  newStatus: "Full" | "New and Available"
) {
  const search = shelfSearchTerm.trim().toLowerCase();

  const match = shelves.find(
    (shelf) =>
      String(shelf.rack_and_bay ?? "")
        .trim()
        .toLowerCase() === search
  );

  if (!match) {
    alert("Please select a shelf from the suggestions first.");
    return;
  }

  const { error } = await supabase
    .from("warehouse_shelves")
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", match.id);

  if (error) {
    alert(`Could not update shelf: ${error.message}`);
    return;
  }

  alert(`${match.rack_and_bay} updated to ${newStatus}.`);

  setShelfSearchTerm("");
  fetchShelves();
}


/* Add a new shelf */
async function handleAddShelf() {
  const rackAndBay = newShelfName.trim();

  if (!rackAndBay) {
    alert("Enter a rack and bay.");
    return;
  }

  // Prevent duplicate rack/bay names
  const alreadyExists = shelves.some(
    (shelf) =>
      String(shelf.rack_and_bay ?? "")
        .trim()
        .toLowerCase() === rackAndBay.toLowerCase()
  );

  if (alreadyExists) {
    alert("That shelf already exists.");
    return;
  }

  const { error } = await supabase
    .from("warehouse_shelves")
    .insert({
      rack_and_bay: rackAndBay.toUpperCase(),
      status: "New and Available",
    });

  if (error) {
    alert(`Could not add shelf: ${error.message}`);
    return;
  }

  alert(`${rackAndBay.toUpperCase()} added successfully.`);

  setNewShelfName("");
  fetchShelves();
}


/* Remove an existing shelf */
async function handleRemoveShelf() {
  const search = newShelfName.trim().toLowerCase();

  if (!search) {
    alert("Search for a shelf first.");
    return;
  }

  const match = shelves.find(
    (shelf) =>
      String(shelf.rack_and_bay ?? "")
        .trim()
        .toLowerCase() === search
  );

  if (!match) {
    alert("Please select an existing shelf from the suggestions first.");
    return;
  }

  const confirmed = window.confirm(
    `Remove shelf "${match.rack_and_bay}"?`
  );

  if (!confirmed) return;

  const { error } = await supabase
    .from("warehouse_shelves")
    .delete()
    .eq("id", match.id);

  if (error) {
    alert(`Could not remove shelf: ${error.message}`);
    return;
  }

  alert(`${match.rack_and_bay} removed successfully.`);

  setNewShelfName("");
  fetchShelves();
}

  return (
    <main className="page">
      <header className="header">
        <img src={logo} alt="Adventus" className="logo" />

        {/*SEARCH AND FILTER FUNCTION*/}
        <input
          type="text"
          placeholder="Search & Filter...."
          className="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

      </header>

      <div className="body">
        <aside className="sidebar">
          <button 
            className="sideItem"
            onClick={onWarehouse1}
          >
            Warehouse 1:
            <span>Laptops</span>
          </button>

          <button
            className="sideItem"
            onClick={onWarehouse2}
          >
            <span>Warehouse 2:</span>
            <span>Computer Equipment</span>
          </button>

          <button
            className="sideItem active"
          >
            <span>Warehouse 3:</span>
            <span>Yubikeys</span>
          </button>

          {isSuperuser && (
            <button 
            className="sideItem"
            onClick={onSuperuser}
            >
              Superuser
              <span>Controls</span>
            </button>
          )}

          <button
            className="backButton"
            onClick={onBack}
          >
            Logout
          </button>

        </aside>

        <section
          className="content"
          style={{
            backgroundImage: `url(${background})`,
          }}
        >
          <div className="top">
            <button 
              className="exportButton"
              onClick={handleExportStagedPDF}
              disabled={stagingRows.length === 0}
            >
              Export PDF File
            </button>

            <button
              className="exportButton"
              onClick={handleExportStagedCSV}
              disabled={stagingRows.length === 0}
            >
              Export CSV
            </button>

            <div className="inventory">
              <button 
                className="inventoryButton"
                onClick={handleOpenLogPopup}
              >
                Log Inventory
              </button>

              <button 
                className="inventoryButton pullOut"
                onClick={handlePullOut}
                disabled={stagingRows.length === 0}
              >
                Pull Out
              </button>
            </div>
          </div>

          <div className="mainGrid">
            <div className="leftArea">
              <div className="cards">
                {/*ADD DATA COLUMNS FUNCTION*/}
                <div className="card">
                  <h2>Add Data Columns</h2>
                  <input
                    type="text"
                    placeholder="New Column"
                    value={newColumnName}
                    onChange={(e) => setNewColumnName(e.target.value)}
                  />

                  <select
                    value={newColumnType}
                    onChange={(e) => setNewColumnType(e.target.value)}
                  >
                    <option value="text">Text</option>
                    <option value="int">Number</option>
                    <option value="boolean">Boolean</option>
                    <option value="timestamptz">Date</option>
                  </select>

                  <button onClick={handleAddColumn}>
                    Add Column
                  </button>
                </div>

                {/*EDIT DATA FUNCTION*/}
                <div className="card edit">
                  <h2>Edit Data</h2>
                  <p>Search Unit</p>
                  
                  {!selectedUnitId && (
                    <>
                    <input
                    type="text"
                    placeholder="Search by hostname"
                    value={searchUnitTerm}
                    onChange={(e) => setSearchUnitTerm(e.target.value)}
                    />
                    
                    <div className="searchResults">
                      {matchedUnits.map((row) => (
                        <button key={row.id} onClick={() => handleSelectUnit(row)}>
                          {row.hostname || row.id}
                          </button>
                        ))}
                    </div>
                    </>
                    )}
                      
                    {selectedUnitId && (
                      <div className="editForm">
                        {columns.map((col) => (
                          col !== "id" && (
                            <div className="editField" key={col}>
                              <label>{col}</label>
                              <input
                              type="text"
                              value={editValues[col] ?? ""}
                              onChange={(e) => handleEditFieldChange(col, e.target.value)}
                              />
                            </div>
                          )
                        ))}
                        
                      <div className="editFormButtons">
                        <button onClick={handleSaveUnit}>Save</button>
                        <button onClick={handleCancelUnitEdit}>Cancel</button>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <div className="table">
                <div className="tableTitle">
                  Warehouse
                </div>

                {/*MAIN TABLE AREA
                  LOADING SUPABASE AND DISPLAYING ACTIVE DATA
                */}
                <div className="tableBody">
                  {loading && <div className="tableRow">Loading...</div>}
                  {error && <div className="tableRow">Error: {error}</div>}

                  {!loading && !error && (
                    <>
                      <div className="tableRow tableHeaderRow">
                        {columns.map((col) => (
                          <span key={col}>{col}</span>
                        ))}

                        <span>QR</span>
                      </div>

                      {filteredRows.map((row) => (
                        <div className="tableRow" key={row.id}>
                          {columns.map((col) => (
                            <span key={col}>{String(row[col] ?? "")}</span>
                          ))}

                          <span>
                            <button
                              onClick={() => handleGenerateQRCode(row)}
                            >
                              Generate QR
                            </button>
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="rightArea">
              {/*SHELF CONTROL MANAGEMENT CARD*/}
              <div className="rightControls">
                <div className="row">
                  {/*(1) SET THE SHELF'S STATUS AS FULL OR AVAILABLE*/}
                  <div className="shelfSearchWrapper">
                    <input
                      type="text"
                      placeholder="Search shelf..."
                      className="smallInput"
                      value={shelfSearchTerm}
                      onChange={(e) => setShelfSearchTerm(e.target.value)}
                      autoComplete="off"
                    />
                    
                    {shelfSearchTerm.trim() && filteredShelves.length > 0 && (
                      <div className="shelfSuggestions">
                        {filteredShelves.slice(0, 8).map((shelf) => (
                          <button
                            type="button"
                            key={shelf.id}
                            className="shelfSuggestion"
                            onClick={() =>
                              setShelfSearchTerm(shelf.rack_and_bay)
                            }
                            >
                              <span>{shelf.rack_and_bay}</span>
                              <span>{shelf.status}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      
                    {shelfSearchTerm.trim() &&
                    filteredShelves.length === 0 &&
                    !shelvesLoading && (
                      <div className="shelfSuggestions">
                        <div className="shelfNoResult">
                          No shelf found
                        </div>
                      </div>
                    )}
                  </div>

                  <button 
                    className="smallButton"
                    onClick={() => handleSetShelfStatus("Full")}
                  >
                    Full
                  </button>

                  <button 
                    className="smallButton"
                    onClick={() => handleSetShelfStatus("New and Available")}
                  >
                    Available
                  </button>
                </div>
                
                {/*(2) ADD A NEW SHELF OR REMOVE AN EXISTING SHELF*/}
                <div className="row">
                  <div className="shelfSearchWrapper">
                    <input
                      type="text"
                      placeholder="Search or enter shelf..."
                      className="smallInput"
                      value={newShelfName}
                      onChange={(e) => setNewShelfName(e.target.value)}
                      autoComplete="off"
                    />
                  
                    {newShelfName.trim() && filteredManageShelves.length > 0 && (
                      <div className="shelfSuggestions">
                        {filteredManageShelves.slice(0, 8).map((shelf) => (
                          <button
                            type="button"
                            key={shelf.id}
                            className="shelfSuggestion"
                            onClick={() =>
                              setNewShelfName(shelf.rack_and_bay)
                            }
                          >
                            <span>{shelf.rack_and_bay}</span>
                            <span>{shelf.status}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    className="actionButton"
                    onClick={handleAddShelf}
                  >
                    Add
                  </button>

                  <button 
                    className="actionButton"
                    onClick={handleRemoveShelf}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/*STAGING CARD FUNCTION*/}
              <div className="stageCard">
                <h2>Stage Sets</h2>
                <div className="stageItem">
                  <label>Search and Input</label>
                  <input
                    type="text"
                    placeholder="Search laptop or CE unit by hostname..."
                    value={unitSearchTerm}
                    onChange={(e) => handleUnitSearch(e.target.value)}
                  />
                </div>

                <div className="searchResults">
                  {unitSearchResults.map((row) => (
                    <button key={row.id} onClick={() => handleStageUnit(row)}>
                      {row.hostname} — {row.equipment_type}
                    </button>
                  ))}
                </div>

                <h3>Staged Items ({stagingRows.length})</h3>
                <input
                type="text"
                placeholder="Search staged items..."
                value={stagingSearchTerm}
                onChange={(e) => setStagingSearchTerm(e.target.value)}
                />

                <div className="stagedList">
                  {filteredStagingRows.map((row) => (
                    <button key={row.id} onClick={() => handleSelectStagingRow(row)}>
                      {row.hostname || "(no hostname)"} — {row.equipment_type}
                      {row.source_unit_id ? " (editing)" : " (new)"}
                    </button>
                  ))}
                </div>

                {selectedStagingId && (
                  <div className="editForm">
                    {Object.keys(stagingEditValues)
                      .filter((field) => field !== "id" && field !== "created_at" && field !== "source_unit_id")
                      .map((field) => (
                        <div className="editField" key={field}>
                          <label>{field}</label>
                          <input
                            type="text"
                            value={stagingEditValues[field] ?? ""}
                            onChange={(e) => handleStagingFieldChange(field, e.target.value)}
                          />
                        </div>
                      ))}
                      
                      <div className="editFormButtons">
                        <button onClick={handleSaveStagingEdit}>Save</button>
                        <button onClick={() => handleRemoveFromStaging(selectedStagingId)}>Remove from Stage</button>
                      </div>
                    </div>            
                  )}
                  
                  <button
                    className="commitButton"
                    onClick={handleCommitStaging}
                    disabled={stagingRows.length === 0}
                  >
                    Commit All ({stagingRows.length})
                  </button>
                
              </div>
              <div className="bottomButtons">
                {/*IMPORT CSV FILE BUTTON*/}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing ? "Importing file..." : "Import CSV File"}
                </button>
                
                <input
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileSelected}
                style={{ display: "none" }}
                />

                <button
                  onClick={handleClearStage}
                  disabled={stagingRows.length === 0}
                >
                  Clear Stage
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/*This is the pop up page for log inventory function*/}
      {showLogPopup && (
        <div className="popupOverlay">
          <div className="popupBox">
            <h2>Log New Unit</h2>
            
            {columns
            .filter((col) => 
                ![
                    "id", 
                    "created_at", 
                    "updated_at", 
                    "created_by", 
                    "updated_by",
                    "equipment_type",
                ].includes(col)
            )
            .map((col) => (
              <div className="popupField" key={col}>
                <label>{col}</label>
                <input
                  type="text"
                  value={logFormValues[col] ?? ""}
                  onChange={(e) => handleLogFieldChange(col, e.target.value)}
                />
              </div>
            ))}

          <div className="popupButtons">
            <button onClick={handleSubmitLog}>Submit</button>
            <button onClick={handleCancelLog}>Cancel</button>
          </div>
        </div>
      </div>
    )}
    </main>
  );
}
export default Warehouse3;