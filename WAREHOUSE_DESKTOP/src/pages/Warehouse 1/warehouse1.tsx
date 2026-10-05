import "./warehouse1.css";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabase/supabaseClient";

import logo from "../../assets/logo.png";
import background from "../../assets/bgWarehouse.png";

import Papa from "papaparse";

import QRCode from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Warehouse1Props = {
  onBack: () => void;
  onWarehouse2: () => void;
  onSuperuser: () => void;
  isSuperuser: boolean;
};

function Warehouse1({
  onBack,
  onWarehouse2,
  onSuperuser,
  isSuperuser
}: Warehouse1Props) {
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
  const [shelves, setShelves] = useState<{ id: string; shelf_name: string; status: string }[]>([]);
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
        const parsedRows = results.data as Record<string, string>[];
      
        const { error } = await supabase
          .from("staging_import")
          .insert(parsedRows);
      
          if (error) {
            alert(`Import failed: ${error.message}`);
          } else {
            alert(`Imported ${parsedRows.length} rows added to staging.`);
            fetchStaging();
          }
      
          setImporting(false);
          e.target.value = "";
        },
    
        error: (err) => {
          alert(`Could not read file: ${err.message}`);
          setImporting(false);
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
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  setStagingRows(data ?? []);
  }
  
  useEffect(() => {
    fetchStaging();
  }, []);

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

    const [laptopResults, ceResults] = await Promise.all([
      supabase.from("warehouse_laptops").select("*").ilike("hostname", `%${term}%`),
      supabase.from("warehouse_ce").select("*").ilike("hostname", `%${term}%`),
    ]);

    const combined = [
      ...(laptopResults.data ?? []).map((row) => ({ ...row, _sourceTable: "warehouse_laptops" })),
      ...(ceResults.data ?? []).map((row) => ({ ...row, _sourceTable: "warehouse_ce" })),
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

  /*Function for loading supabase data.*/
  async function fetchData() {
    setLoading(true);

    const { data: columnData, error: columnError } = await supabase
      .rpc("get_table_columns", { target_table: "warehouse_laptops" });

    const { data: rowData, error: rowError } = await supabase
      .from("warehouse_laptops")
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
      target_table: "warehouse_laptops",
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
      .from("warehouse_laptops")
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

  /*Inserts the new unit straight into warehouse_laptops, then closes the
  popup and refreshes the main table.*/
  async function handleSubmitLog() {
    const { error } = await supabase
      .from("warehouse_laptops")
      .insert(logFormValues);

    if (error) {
      alert(error.message);
    } else {
      setShowLogPopup(false);
      setLogFormValues({});
      fetchData();
    }
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
    const qrValue = `warehouse_1:${row.id}`;

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
    link.download = `warehouse1_staged_${new Date()
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
  pdf.text("Warehouse 1 - Staged Units", 14, 15);

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

  pdf.save(
    `warehouse1_staged_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`
  );
  }

  /*Function for the pull out function*/
  async function handlePullOut() {
  if (stagingRows.length === 0) {
    alert("There are no staged units to pull out.");
    return;
  }

  // Only existing warehouse units can be pulled out.
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
    `Pull out ${existingUnits.length} staged unit(s)?`
  );

  if (!confirmed) return;

  const stagedIds = existingUnits.map(
    (row) => row.id
  );

  const { error } = await supabase
    .from("staging_import")
    .update({
      status: "deployed",
    })
    .in("id", stagedIds);

  if (error) {
    alert(
      `Pull out failed: ${error.message}`
    );
    return;
  }

  alert(
    `${existingUnits.length} unit(s) marked as deployed. Click Commit All to finalize the pull out.`
  );

  fetchStaging();
}

  /*Function for the shelf control management*/
    /*Function to set a shelf's status directly from the search input + FULL/AVAILABLE buttons.*/
      /*Function for loading shelf data.*/
  async function fetchShelves() {
    setShelvesLoading(true);

    const { data, error } = await supabase
      .from("warehouse_shelves")
      .select("*")
      .order("shelf_name", { ascending: true });

    if (error) setShelvesError(error.message);
    else {
      setShelves(data ?? []);
      setShelvesError(null);
    }

    setShelvesLoading(false);
  }

  useEffect(() => {
    fetchShelves();
  }, []);

  /*Function for the shelf search and filter*/
  const filteredShelves = shelves.filter((shelf) =>
    shelf.shelf_name.toLowerCase().includes(shelfSearchTerm.toLowerCase())
  );

   /*Function to set a shelf's status directly from the search input + FULL/AVAILABLE buttons.*/
  async function handleSetShelfStatus(newStatus: "full" | "available") {
    const match = shelves.find(
      (shelf) => shelf.shelf_name.toLowerCase() === shelfSearchTerm.trim().toLowerCase()
    );

    if (!match) {
      alert("No shelf found matching that name.");
      return;
    }

    const { error } = await supabase
      .from("warehouse_shelves")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", match.id);

    if (error) alert(error.message);
    else fetchShelves();
  }

  /*Function to add a new shelf.*/
  async function handleAddShelf() {
    if (!newShelfName.trim()) return;

    const { error } = await supabase
      .from("warehouse_shelves")
      .insert({ shelf_name: newShelfName.trim().toUpperCase(), status: "available" });

    if (error) {
      alert(error.message);
    } else {
      setNewShelfName("");
      fetchShelves();
    }
  }
  
  /*Function to remove a shelf by name, typed into the second row's input.*/
  async function handleRemoveShelf() {
    const match = shelves.find(
      (shelf) => shelf.shelf_name.toLowerCase() === newShelfName.trim().toLowerCase()
    );

    if (!match) {
      alert("No shelf found matching that name.");
      return;
    }

    const confirmed = window.confirm(`Remove shelf "${match.shelf_name}"?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("warehouse_shelves")
      .delete()
      .eq("id", match.id);

    if (error) alert(error.message);
    else {
      setNewShelfName("");
      fetchShelves();
    }
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
          <button className="sideItem active">
            Warehouse 1:
            <span>Laptops & Yubikey</span>
          </button>

          <button
            className="sideItem"
            onClick={onWarehouse2}
          >
            <span>Warehouse 2:</span>
            <span>Computer Equipment</span>
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

            <div className="rightArea">
              {/*SHELF CONTROL MANAGEMENT CARD*/}
              <div className="rightControls">
                <div className="row">
                  {/*(1) SET THE SHELF'S STATUS AS FULL OR AVAILABLE*/}
                  <input
                    type="text"
                    placeholder="Search shelf..."
                    className="smallInput"
                    value={shelfSearchTerm}
                    onChange={(e) => setShelfSearchTerm(e.target.value)}
                  />
                  <button 
                    className="smallButton"
                    onClick={() => handleSetShelfStatus("full")}
                  >
                    Full
                  </button>

                  <button 
                    className="smallButton"
                    onClick={() => handleSetShelfStatus("available")}
                  >
                    Available
                  </button>
                </div>
                
                {/*(2) ADD A NEW SHELF OR REMOVE AN EXISTING SHELF*/}
                <div className="row">
                  <input
                    type="text"
                    placeholder="Search shelf..."
                    className="smallInput"
                    value={newShelfName}
                    onChange={(e) => setNewShelfName(e.target.value)}
                  />

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
                  <label>Input</label>
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
            .filter((col) => !["id", "created_at", "updated_at", "created_by", "updated_by"].includes(col))
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
export default Warehouse1;