import "./warehouse2.css";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";

import logo from "../../assets/logo.png";
import background from "../../assets/bgWarehouse.png";

import Papa from "papaparse";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Warehouse2Props = {
  onBack: () => void;
  onWarehouse1: () => void;
  onWarehouse3: () => void;
  onSuperuser: () => void;
  isSuperuser: boolean;
};

function Warehouse2({
  onBack,
  onWarehouse1,
  onWarehouse3,
  onSuperuser,
  isSuperuser,
}: Warehouse2Props) {
  // =========================
  // CSV IMPORT
  // =========================
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // =========================
  // UNIT SEARCH / STAGING
  // =========================
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  const [unitSearchResults, setUnitSearchResults] = useState<
    Record<string, any>[]
  >([]);

  const [stagingRows, setStagingRows] = useState<Record<string, any>[]>([]);
  const [stagingSearchTerm, setStagingSearchTerm] = useState("");
  const [selectedStagingId, setSelectedStagingId] = useState<string | null>(
    null
  );
  const [stagingEditValues, setStagingEditValues] = useState<
    Record<string, any>
  >({});

  // =========================
  // MAIN WAREHOUSE DATA
  // =========================
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =========================
  // SEARCH
  // =========================
  const [searchTerm, setSearchTerm] = useState("");

  // =========================
  // ADD COLUMN
  // =========================
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnType, setNewColumnType] = useState("text");

  // =========================
  // EDIT DATA
  // =========================
  const [searchUnitTerm, setSearchUnitTerm] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, any>>({});

  // =========================
  // LOG INVENTORY
  // =========================
  const [showLogPopup, setShowLogPopup] = useState(false);
  const [logFormValues, setLogFormValues] = useState<Record<string, string>>(
    {}
  );

  // =========================
  // SHELF MANAGEMENT
  // =========================
  const [shelves, setShelves] = useState<
    {
      id: string;
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

  // ==========================================================
  // CSV IMPORT
  // ==========================================================

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setImporting(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,

      complete: async (results) => {
        const parsedRows = results.data as Record<string, string>[];

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
            alert(`Imported ${data.length} row(s) into staging successfully.`);
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

  // ==========================================================
  // STAGING
  // ==========================================================

  async function fetchStaging() {
    const { data, error } = await supabase
      .from("staging_import")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("FETCH STAGING DATA:", data);
    console.log("FETCH STAGING ERROR:", error);

    if (error) {
      alert(`Could not load staging: ${error.message}`);
      return;
    }

    setStagingRows(data ?? []);
  }

  async function handleStageUnit(row: Record<string, any>) {
    const {
      id,
      created_at,
      updated_at,
      created_by,
      updated_by,
      _sourceTable,
      ...rest
    } = row;

    const { error } = await supabase
      .from("staging_import")
      .insert({
        ...rest,
        source_unit_id: id,
      });

    if (error) {
      alert(error.message);
    } else {
      setUnitSearchTerm("");
      setUnitSearchResults([]);
      fetchStaging();
    }
  }

  // Search both Warehouse 1 and Warehouse 2.
  async function handleUnitSearch(term: string) {
    setUnitSearchTerm(term);

    if (!term.trim()) {
      setUnitSearchResults([]);
      return;
    }

    const [laptopResults, ceResults] = await Promise.all([
      supabase
        .from("warehouse_laptops")
        .select("*")
        .ilike("hostname", `%${term}%`),

      supabase
        .from("warehouse_ce")
        .select("*")
        .ilike("hostname", `%${term}%`),
    ]);

    const combined = [
      ...(laptopResults.data ?? []).map((row) => ({
        ...row,
        _sourceTable: "warehouse_laptops",
      })),

      ...(ceResults.data ?? []).map((row) => ({
        ...row,
        _sourceTable: "warehouse_ce",
      })),
    ];

    setUnitSearchResults(combined);
  }

  const filteredStagingRows = stagingRows.filter((row) =>
    Object.values(row).some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(stagingSearchTerm.toLowerCase())
    )
  );

  function handleSelectStagingRow(row: Record<string, any>) {
    setSelectedStagingId(row.id);
    setStagingEditValues({ ...row });
  }

  function handleStagingFieldChange(field: string, value: string) {
    setStagingEditValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

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

  async function handleRemoveFromStaging(id: string) {
    const { error } = await supabase
      .from("staging_import")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
    } else {
      if (selectedStagingId === id) {
        setSelectedStagingId(null);
        setStagingEditValues({});
      }

      fetchStaging();
    }
  }

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

  async function handleCommitStaging() {
    if (stagingRows.length === 0) {
      alert("There are no staged items to commit.");
      return;
    }

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
      setStagingEditValues({});

      fetchData();
      fetchStaging();
    }
  }

  // ==========================================================
  // USER ACTIVITY
  // ==========================================================

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
      console.error("Could not get user:", userError);
      return;
    }

    if (!user) {
      console.error("No logged-in user found.");
      return;
    }

    const { error } = await supabase.from("user_activity").insert({
      user_id: user.id,
      warehouse: "warehouse_2",
      action,
      item_identifier: itemIdentifier ?? null,
      details: details ?? null,
    });

    if (error) {
      console.error("Activity logging error:", error);
    }
  }

  // ==========================================================
  // LOAD WAREHOUSE 2 DATA
  // ==========================================================

  async function fetchData() {
    setLoading(true);

    const { data: columnData, error: columnError } = await supabase.rpc(
      "get_table_columns",
      {
        target_table: "warehouse_ce",
      }
    );

    const { data: rowData, error: rowError } = await supabase
      .from("warehouse_ce")
      .select("*")
      .order("hostname", { ascending: true });

    if (columnError) {
      setError(columnError.message);
    } else if (rowError) {
      setError(rowError.message);
    } else {
      setColumns((columnData ?? []).map((column: any) => column.column_name));
      setRows(rowData ?? []);
      setError(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    fetchStaging();
  }, []);

  // ==========================================================
  // MAIN SEARCH
  // ==========================================================

  const filteredRows = rows.filter((row) =>
    columns.some((column) =>
      String(row[column] ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
  );

  // ==========================================================
  // ADD COLUMN
  // ==========================================================

  async function handleAddColumn() {
    if (!newColumnName.trim()) {
      alert("Enter a column name.");
      return;
    }

    const { error } = await supabase.rpc("admin_add_column", {
      target_table: "warehouse_ce",
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

  // ==========================================================
  // EDIT DATA
  // ==========================================================

  function handleSelectUnit(row: Record<string, any>) {
    setSelectedUnitId(row.id);
    setEditValues({ ...row });
    setSearchUnitTerm("");
  }

  function handleEditFieldChange(column: string, value: string) {
    setEditValues((previous) => ({
      ...previous,
      [column]: value,
    }));
  }

  async function handleSaveUnit() {
    if (!selectedUnitId) return;

    const {
      id,
      created_at,
      created_by,
      updated_at,
      updated_by,
      ...updatableFields
    } = editValues;

    const { error } = await supabase
      .from("warehouse_ce")
      .update(updatableFields)
      .eq("id", selectedUnitId);

    if (error) {
      alert(error.message);
      return;
    }

    await logUserActivity(
      "Updated Inventory",
      editValues.hostname || selectedUnitId,
      "Updated an item in Warehouse 2"
    );

    setSelectedUnitId(null);
    setEditValues({});

    fetchData();
  }

  function handleCancelUnitEdit() {
    setSelectedUnitId(null);
    setEditValues({});
  }

  const matchedUnits = searchUnitTerm.trim()
    ? rows.filter((row) =>
        columns.some((column) =>
          String(row[column] ?? "")
            .toLowerCase()
            .includes(searchUnitTerm.toLowerCase())
        )
      )
    : [];

  // ==========================================================
  // LOG INVENTORY
  // ==========================================================

  function handleOpenLogPopup() {
    setLogFormValues({});
    setShowLogPopup(true);
  }

  function handleLogFieldChange(field: string, value: string) {
    setLogFormValues((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleSubmitLog() {
    const { error } = await supabase
      .from("warehouse_ce")
      .insert(logFormValues);

    if (error) {
      alert(error.message);
      return;
    }

    await logUserActivity(
      "Added Inventory",
      logFormValues.hostname || undefined,
      "Added a new item to Warehouse 2"
    );

    setShowLogPopup(false);
    setLogFormValues({});

    fetchData();
  }

  function handleCancelLog() {
    setShowLogPopup(false);
    setLogFormValues({});
  }

  // ==========================================================
  // QR CODE
  // ==========================================================

  async function handleGenerateQRCode(row: Record<string, any>) {
    if (!row.id) {
      alert("This unit does not have a permanent ID yet.");
      return;
    }

    try {
      const qrValue = `warehouse_2:${row.id}`;

      const qrDataUrl = await QRCode.toDataURL(qrValue, {
        width: 400,
        margin: 2,
      });

      const link = document.createElement("a");

      link.href = qrDataUrl;

      const safeHostname = String(
        row.hostname || "warehouse2-unit"
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

  // ==========================================================
  // EXPORT CSV
  // ==========================================================

  function handleExportStagedCSV() {
    if (stagingRows.length === 0) {
      alert("There are no staged units to export.");
      return;
    }

    const cleanedRows = stagingRows.map((row) => {
      const { id, created_at, ...exportableFields } = row;

      return exportableFields;
    });

    const csv = Papa.unparse(cleanedRows);

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `warehouse2_staged_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  // ==========================================================
  // EXPORT PDF
  // ==========================================================

  async function handleExportStagedPDF() {
    if (stagingRows.length === 0) {
      alert("There are no staged units to export.");
      return;
    }

    // ========================================================
    // INVENTORY TABLE
    // ========================================================

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    pdf.setFontSize(18);
    pdf.text("Warehouse 2 - Staged Units", 14, 15);

    pdf.setFontSize(10);
    pdf.text(
      `Generated: ${new Date().toLocaleString()}`,
      14,
      22
    );

    const ignoredColumns = ["id", "created_at"];

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

    // ========================================================
    // QR CODE LABEL PAGES
    //
    // 4 columns x 4 rows
    // = 16 QR labels per page
    // ========================================================

    const qrColumns = 4;
    const qrRows = 4;
    const qrPerPage = qrColumns * qrRows;

    // Start the QR labels on a separate portrait page.
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

      // Add another QR page after every 16 units.
      if (i > 0 && i % qrPerPage === 0) {
        pdf.addPage("a4", "portrait");
      }

      const positionOnPage = i % qrPerPage;

      const column =
        positionOnPage % qrColumns;

      const gridRow = Math.floor(
        positionOnPage / qrColumns
      );

      const cellX =
        marginX + column * cellWidth;

      const cellY =
        marginY + gridRow * cellHeight;

      const centerX =
        cellX + cellWidth / 2;

      // ======================================================
      // GENERATE QR CODE
      // ======================================================

      /*
        If this was staged from an existing warehouse item,
        source_unit_id is its permanent warehouse ID.

        Otherwise fall back to its staging ID.
      */
      const unitId =
        row.source_unit_id || row.id;

      /*
        IMPORTANT:
        This is Warehouse 2, so the QR code must identify
        the unit as belonging to warehouse_2.
      */
      const qrValue = `warehouse_2:${unitId}`;

      try {
        const qrDataUrl = await QRCode.toDataURL(
          qrValue,
          {
            width: 300,
            margin: 1,
          }
        );

        // ====================================================
        // QR POSITION
        // ====================================================

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

        // ====================================================
        // INFORMATION UNDER QR CODE
        // ====================================================

        let textY =
          qrY + qrSize + 4;

        // -------------------------
        // HOSTNAME
        // -------------------------

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

        // -------------------------
        // OTHER INFORMATION
        // -------------------------

        pdf.setFont(
          "helvetica",
          "normal"
        );

        pdf.setFontSize(6.5);

        // Checked By
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

        // Rack & Bay / Shelf
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

        // Date
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
      } catch (error) {
        console.error(
          `Could not generate QR for ${
            row.hostname || row.id
          }:`,
          error
        );

        /*
          If one QR fails, don't cancel the entire PDF.
          Put an error message in that QR slot instead.
        */

        pdf.setFontSize(7);

        pdf.text(
          "QR generation failed",
          centerX,
          cellY + 20,
          {
            align: "center",
          }
        );

        pdf.text(
          String(
            row.hostname || "Unknown Unit"
          ),
          centerX,
          cellY + 25,
          {
            align: "center",
            maxWidth: cellWidth - 4,
          }
        );
      }
    }

    // ========================================================
    // SAVE PDF
    // ========================================================

    pdf.save(
      `warehouse2_staged_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  }

  // ==========================================================
  // PULL OUT
  // ==========================================================

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
    `PERMANENTLY DELETE ${existingUnits.length} unit(s) from Warehouse 1?\n\n` +
      "This action cannot be undone."
  );

  if (!confirmed) return;

  for (const row of existingUnits) {
    const unitId = row.source_unit_id;

    // Record the action BEFORE deleting the equipment.
    await logUserActivity(
      "PULL OUT",
      row.hostname || row.serial_number || unitId,
      `Permanently removed from Warehouse 2. Unit ID: ${unitId}`
    );

    const { error: deleteError } = await supabase
      .from("warehouse_ce")
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
        `The unit was deleted from Warehouse 2, but its staging copy could not be removed: ${stagingDeleteError.message}`
      );
      return;
    }
  }

  alert(
    `${existingUnits.length} unit(s) pulled out from Warehouse 2.`
  );

  setSelectedStagingId(null);
  setStagingEditValues({});

  await fetchStaging();
  await fetchData();
}

// ==========================================================
  // SHELVES
  // ==========================================================

  async function fetchShelves() {
    setShelvesLoading(true);
    setShelvesError(null);

    const { data, error } = await supabase
      .from("warehouse_shelves")
      .select("*")
      .order("rack_and_bay", { ascending: true });

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

  async function handleSetShelfStatus(
    newStatus: "Full" | "Available" | "New and Available"
  ) {
    const search = shelfSearchTerm.trim().toLowerCase();

    const match = shelves.find(
      (shelf) =>
        String(shelf.rack_and_bay ?? "").trim().toLowerCase() === search
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

  async function handleAddShelf() {
    const rackAndBay = newShelfName.trim();

    if (!rackAndBay) {
      alert("Enter a rack and bay.");
      return;
    }

    const alreadyExists = shelves.some(
      (shelf) =>
        String(shelf.rack_and_bay ?? "").trim().toLowerCase() ===
        rackAndBay.toLowerCase()
    );

    if (alreadyExists) {
      alert("That shelf already exists.");
      return;
    }

    const { error } = await supabase.from("warehouse_shelves").insert({
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

  async function handleRemoveShelf() {
    const search = newShelfName.trim().toLowerCase();

    if (!search) {
      alert("Search for a shelf first.");
      return;
    }

    const match = shelves.find(
      (shelf) =>
        String(shelf.rack_and_bay ?? "").trim().toLowerCase() === search
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

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <main className="page">
      <header className="header">
        <img src={logo} alt="Adventus" className="logo" />

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
          <button className="sideItem" onClick={onWarehouse1}>
            <span>Warehouse 1:</span>
            <span>Laptops</span>
          </button>

          <button className="sideItem active">
            <span>Warehouse 2:</span>
            <span>Computer Equipment</span>
          </button>

          <button className="sideItem"  
            onClick={onWarehouse3}>
            <span>Warehouse 3:</span>
            <span>Yubikeys</span>
          </button>

          {isSuperuser && (
            <button className="sideItem" onClick={onSuperuser}>
              <span>Superuser</span>
              <span>Controls</span>
            </button>
          )}

          <button className="backButton" onClick={onBack}>
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
                {/* ADD COLUMN */}
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

                  <button onClick={handleAddColumn}>Add Column</button>
                </div>

                {/* EDIT DATA */}
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
                          <button
                            key={row.id}
                            onClick={() => handleSelectUnit(row)}
                          >
                            {row.hostname || row.id}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedUnitId && (
                    <div className="editForm">
                      {columns.map(
                        (column) =>
                          ![
                            "id",
                            "created_at",
                            "created_by",
                            "updated_at",
                            "updated_by",
                          ].includes(column) && (
                            <div className="editField" key={column}>
                              <label>{column}</label>

                              <input
                                type="text"
                                value={editValues[column] ?? ""}
                                onChange={(e) =>
                                  handleEditFieldChange(
                                    column,
                                    e.target.value
                                  )
                                }
                              />
                            </div>
                          )
                      )}

                      <div className="editFormButtons">
                        <button onClick={handleSaveUnit}>Save</button>

                        <button onClick={handleCancelUnitEdit}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MAIN TABLE */}
              <div className="table">
                <div className="tableTitle">Warehouse</div>

                <div className="tableBody">
                  {loading && (
                    <div className="tableRow">Loading...</div>
                  )}

                  {error && (
                    <div className="tableRow">
                      Error: {error}
                    </div>
                  )}

                  {!loading && !error && (
                    <>
                      <div className="tableRow tableHeaderRow">
                        {columns.map((column) => (
                          <span key={column}>{column}</span>
                        ))}

                        <span>QR</span>
                      </div>

                      {filteredRows.map((row) => (
                        <div className="tableRow" key={row.id}>
                          {columns.map((column) => (
                            <span key={column}>
                              {String(row[column] ?? "")}
                            </span>
                          ))}

                          <span>
                            <button
                              onClick={() =>
                                handleGenerateQRCode(row)
                              }
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

              <div className="bottomButtons">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                >
                  {importing
                    ? "Importing file..."
                    : "Import CSV File"}
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

            {/* RIGHT AREA */}
            <div className="rightArea">
              <div className="rightControls">
                {/* SET SHELF STATUS */}
                <div className="row">
                  <div className="shelfSearchWrapper">
                    <input
                      type="text"
                      placeholder="Search shelf..."
                      className="smallInput"
                      value={shelfSearchTerm}
                      onChange={(e) =>
                        setShelfSearchTerm(e.target.value)
                      }
                      autoComplete="off"
                    />

                    {shelfSearchTerm.trim() &&
                      filteredShelves.length > 0 && (
                        <div className="shelfSuggestions">
                          {filteredShelves
                            .slice(0, 8)
                            .map((shelf) => (
                              <button
                                type="button"
                                key={shelf.id}
                                className="shelfSuggestion"
                                onClick={() =>
                                  setShelfSearchTerm(
                                    shelf.rack_and_bay
                                  )
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
                    onClick={() =>
                      handleSetShelfStatus("Full")
                    }
                  >
                    Full
                  </button>

                  <button
                    className="smallButton"
                    onClick={() =>
                      handleSetShelfStatus("Available")
                    }
                  >
                    Available
                  </button>
                </div>

                {/* ADD / REMOVE SHELF */}
                <div className="row">
                  <div className="shelfSearchWrapper">
                    <input
                      type="text"
                      placeholder="Search or enter shelf..."
                      className="smallInput"
                      value={newShelfName}
                      onChange={(e) =>
                        setNewShelfName(e.target.value)
                      }
                      autoComplete="off"
                    />

                    {newShelfName.trim() &&
                      filteredManageShelves.length > 0 && (
                        <div className="shelfSuggestions">
                          {filteredManageShelves
                            .slice(0, 8)
                            .map((shelf) => (
                              <button
                                type="button"
                                key={shelf.id}
                                className="shelfSuggestion"
                                onClick={() =>
                                  setNewShelfName(
                                    shelf.rack_and_bay
                                  )
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

                {shelvesError && (
                  <div className="shelfError">
                    {shelvesError}
                  </div>
                )}
              </div>

              {/* STAGE SETS */}
              <div className="stageCard">
                <h2>Stage Sets</h2>

                <div className="stageItem">
                  <label>Input</label>

                  <input
                    type="text"
                    placeholder="Search laptop or CE unit by hostname..."
                    value={unitSearchTerm}
                    onChange={(e) =>
                      handleUnitSearch(e.target.value)
                    }
                  />
                </div>

                <div className="searchResults">
                  {unitSearchResults.map((row) => (
                    <button
                      key={`${row._sourceTable}-${row.id}`}
                      onClick={() => handleStageUnit(row)}
                    >
                      {row.hostname || "(no hostname)"} —{" "}
                      {row.equipment_type || "Unknown Equipment"}
                    </button>
                  ))}
                </div>

                <h3>
                  Staged Items ({stagingRows.length})
                </h3>

                <input
                  type="text"
                  placeholder="Search staged items..."
                  value={stagingSearchTerm}
                  onChange={(e) =>
                    setStagingSearchTerm(e.target.value)
                  }
                />

                <div className="stagedList">
                  {filteredStagingRows.map((row) => (
                    <button
                      key={row.id}
                      onClick={() =>
                        handleSelectStagingRow(row)
                      }
                    >
                      {row.hostname || "(no hostname)"} —{" "}
                      {row.equipment_type || "Unknown Equipment"}
                      {row.source_unit_id
                        ? " (editing)"
                        : " (new)"}
                    </button>
                  ))}
                </div>

                {selectedStagingId && (
                  <div className="editForm">
                    {Object.keys(stagingEditValues)
                      .filter(
                        (field) =>
                          field !== "id" &&
                          field !== "created_at" &&
                          field !== "source_unit_id"
                      )
                      .map((field) => (
                        <div
                          className="editField"
                          key={field}
                        >
                          <label>{field}</label>

                          <input
                            type="text"
                            value={
                              stagingEditValues[field] ?? ""
                            }
                            onChange={(e) =>
                              handleStagingFieldChange(
                                field,
                                e.target.value
                              )
                            }
                          />
                        </div>
                      ))}

                    <div className="editFormButtons">
                      <button
                        onClick={handleSaveStagingEdit}
                      >
                        Save
                      </button>

                      <button
                        onClick={() =>
                          handleRemoveFromStaging(
                            selectedStagingId
                          )
                        }
                      >
                        Remove from Stage
                      </button>
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
            </div>
          </div>
        </section>
      </div>

      {/* LOG INVENTORY POPUP */}
      {showLogPopup && (
        <div className="popupOverlay">
          <div className="popupBox">
            <h2>Log New Computer Equipment</h2>

            {columns
              .filter(
                (column) =>
                  ![
                    "id",
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                  ].includes(column)
              )
              .map((column) => (
                <div
                  className="popupField"
                  key={column}
                >
                  <label>{column}</label>

                  <input
                    type="text"
                    value={logFormValues[column] ?? ""}
                    onChange={(e) =>
                      handleLogFieldChange(
                        column,
                        e.target.value
                      )
                    }
                  />
                </div>
              ))}

            <div className="popupButtons">
              <button onClick={handleSubmitLog}>
                Submit
              </button>

              <button onClick={handleCancelLog}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Warehouse2;