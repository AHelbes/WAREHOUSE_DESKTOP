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

type WarehouseRow = Record<string, any>;

type DuplicateRow = {
  imported: WarehouseRow;
  existing: WarehouseRow;
  conflictType: "hostname_conflict" | "serial_conflict";
};

const WAREHOUSE_TABLE = "warehouse_yubikeys";
const EQUIPMENT_TYPE = "YUBIKEY";

function Warehouse3({
  onBack,
  onWarehouse1,
  onWarehouse2,
  onSuperuser,
  isSuperuser,
}: Warehouse3Props) {
  /* =========================
     CSV IMPORT
  ========================= */

  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [duplicateRows, setDuplicateRows] = useState<DuplicateRow[]>([]);

  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);

  const [replacingDuplicates, setReplacingDuplicates] = useState(false);

  /* =========================
     SEARCH AND BULK STAGING
  ========================= */

  const [unitSearchTerm, setUnitSearchTerm] = useState("");

  const [unitSearchResults, setUnitSearchResults] = useState<WarehouseRow[]>([]);

  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([]);

  const [bulkStaging, setBulkStaging] = useState(false);

  /* =========================
     STAGED ITEMS
  ========================= */

  const [stagingRows, setStagingRows] = useState<WarehouseRow[]>([]);

  const [stagingSearchTerm, setStagingSearchTerm] = useState("");

  const [selectedStagingId, setSelectedStagingId] = useState<string | null>(
    null
  );

  const [stagingEditValues, setStagingEditValues] = useState<WarehouseRow>({});

  /* =========================
     MAIN INVENTORY TABLE
  ========================= */

  const [columns, setColumns] = useState<string[]>([]);

  const [rows, setRows] = useState<WarehouseRow[]>([]);

  const [selectedInventoryIds, setSelectedInventoryIds] = useState<string[]>(
    []
  );

  const [stagingInventory, setStagingInventory] = useState(false);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  /* =========================
     SEARCH AND FILTER
  ========================= */

  const [searchTerm, setSearchTerm] = useState("");

  /* =========================
     ADD DATA COLUMNS
  ========================= */

  const [newColumnName, setNewColumnName] = useState("");

  const [newColumnType, setNewColumnType] = useState("text");

  /* =========================
     EDIT INVENTORY
  ========================= */

  const [searchUnitTerm, setSearchUnitTerm] = useState("");

  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const [editValues, setEditValues] = useState<WarehouseRow>({});

  /* =========================
     LOG INVENTORY
  ========================= */

  const [showLogPopup, setShowLogPopup] = useState(false);

  const [logFormValues, setLogFormValues] = useState<Record<string, string>>(
    {}
  );

  /* =========================
     SHELF MANAGEMENT
  ========================= */

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

  /* =========================
     ACTIVITY LOGGING
  ========================= */

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
      console.warn("Activity logging skipped: no authenticated user.");
      return;
    }

    const { error: activityError } = await supabase
      .from("user_activity")
      .insert({
        user_id: user.id,
        warehouse: "warehouse_3",
        action,
        item_identifier: itemIdentifier ?? null,
        details: details ?? null,
      });

    if (activityError) {
      console.error("Activity logging failed:", activityError);
    }
  }

  /* =========================
     CSV IMPORT
  ========================= */

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];

    if (!file) return;

    setImporting(true);

    Papa.parse<WarehouseRow>(file, {
      header: true,
      skipEmptyLines: true,

      complete: async (results) => {
        try {
          const parsedRows = results.data.map((row) => ({
            ...row,
            equipment_type: EQUIPMENT_TYPE,
          }));

          if (parsedRows.length === 0) {
            alert("The CSV contains no rows.");
            return;
          }

          const { data: existingUnits, error: existingError } = await supabase
            .from(WAREHOUSE_TABLE)
            .select("*");

          if (existingError) {
            throw existingError;
          }

          const existing = existingUnits ?? [];

          const newRows: WarehouseRow[] = [];

          const duplicates: DuplicateRow[] = [];

          const seenHostnames = new Set<string>();

          const seenSerialNumbers = new Set<string>();

          for (const importedRow of parsedRows) {
            const importedHostname = String(importedRow.hostname ?? "")
              .trim()
              .toLowerCase();

            const importedSerial = String(importedRow.serial_number ?? "")
              .trim()
              .toLowerCase();

            if (!importedHostname && !importedSerial) {
              console.warn(
                "Skipping CSV row without hostname or serial number:",
                importedRow
              );
              continue;
            }

            if (
              (importedHostname && seenHostnames.has(importedHostname)) ||
              (importedSerial && seenSerialNumbers.has(importedSerial))
            ) {
              console.warn("Skipping repeated row within CSV:", importedRow);
              continue;
            }

            if (importedHostname) {
              seenHostnames.add(importedHostname);
            }

            if (importedSerial) {
              seenSerialNumbers.add(importedSerial);
            }

            const hostnameMatch = importedHostname
              ? existing.find(
                  (unit) =>
                    String(unit.hostname ?? "")
                      .trim()
                      .toLowerCase() === importedHostname
                )
              : undefined;

            const serialMatch = importedSerial
              ? existing.find(
                  (unit) =>
                    String(unit.serial_number ?? "")
                      .trim()
                      .toLowerCase() === importedSerial
                )
              : undefined;

            if (hostnameMatch) {
              duplicates.push({
                imported: importedRow,
                existing: hostnameMatch,
                conflictType: "hostname_conflict",
              });
            } else if (serialMatch) {
              duplicates.push({
                imported: importedRow,
                existing: serialMatch,
                conflictType: "serial_conflict",
              });
            } else {
              newRows.push(importedRow);
            }
          }

          if (newRows.length > 0) {
            const { error: insertError } = await supabase
              .from("staging_import")
              .insert(newRows);

            if (insertError) {
              throw insertError;
            }
          }

          await fetchStaging();

          if (duplicates.length > 0) {
            setDuplicateRows(duplicates);
            setShowDuplicatePopup(true);
          } else {
            alert(`${newRows.length} new YubiKey unit(s) staged successfully.`);
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Unknown import error";

          alert(`CSV import failed: ${message}`);
          console.error("CSV import error:", err);
        } finally {
          setImporting(false);
          e.target.value = "";
        }
      },

      error: (err) => {
        console.error("CSV parsing error:", err);
        alert(`Could not read CSV: ${err.message}`);
        setImporting(false);
        e.target.value = "";
      },
    });
  }

  /* =========================
     DUPLICATE HANDLING
  ========================= */

  function handleKeepExisting(index: number) {
    setDuplicateRows((current) => {
      const updated = current.filter((_, i) => i !== index);

      if (updated.length === 0) {
        setShowDuplicatePopup(false);
      }

      return updated;
    });
  }

  function handleKeepAllExisting() {
    setDuplicateRows([]);
    setShowDuplicatePopup(false);
  }

  async function replaceExistingUnit(duplicate: DuplicateRow) {
    if (duplicate.conflictType === "serial_conflict") {
      throw new Error(
        "This imported YubiKey has a serial number belonging to another unit. Correct the CSV data before replacing it."
      );
    }

    const existingUnit = duplicate.existing;
    const importedUnit = duplicate.imported;

    const {
      id,
      created_at,
      created_by,
      updated_at,
      updated_by,
      source_unit_id,
      ...replacementData
    } = importedUnit;

    const { error: updateError } = await supabase
      .from(WAREHOUSE_TABLE)
      .update({
        ...replacementData,
        equipment_type: EQUIPMENT_TYPE,
      })
      .eq("id", existingUnit.id);

    if (updateError) {
      throw updateError;
    }

    await logUserActivity(
      "REPLACED FROM CSV",
      String(
        existingUnit.hostname ||
          existingUnit.serial_number ||
          existingUnit.id
      ),
      "Existing Warehouse 3 YubiKey was replaced using CSV import data."
    );
  }

  async function handleReplaceDuplicate(index: number) {
    const duplicate = duplicateRows[index];

    if (!duplicate || replacingDuplicates) return;

    setReplacingDuplicates(true);

    try {
      await replaceExistingUnit(duplicate);

      await fetchData();

      setDuplicateRows((current) => {
        const updated = current.filter((_, i) => i !== index);

        if (updated.length === 0) {
          setShowDuplicatePopup(false);
        }

        return updated;
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not replace unit";

      alert(message);
    } finally {
      setReplacingDuplicates(false);
    }
  }

  async function handleReplaceAllDuplicates() {
    if (duplicateRows.length === 0 || replacingDuplicates) return;

    const serialConflict = duplicateRows.find(
      (duplicate) => duplicate.conflictType === "serial_conflict"
    );

    if (serialConflict) {
      alert(
        "Replace All cannot continue because at least one imported serial number belongs to another existing YubiKey. Resolve those conflicts first."
      );
      return;
    }

    const confirmed = window.confirm(
      `Replace all ${duplicateRows.length} existing YubiKey unit(s) with the imported CSV data?`
    );

    if (!confirmed) return;

    setReplacingDuplicates(true);

    try {
      for (const duplicate of duplicateRows) {
        await replaceExistingUnit(duplicate);
      }

      await fetchData();

      setDuplicateRows([]);
      setShowDuplicatePopup(false);

      alert("All duplicate YubiKey units were replaced successfully.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not replace all units";

      alert(message);

      await fetchData();
    } finally {
      setReplacingDuplicates(false);
    }
  }

  /* =========================
     STAGING FUNCTIONS
  ========================= */

  async function fetchStaging() {
    const { data, error: stagingError } = await supabase
      .from("staging_import")
      .select("*")
      .eq("equipment_type", EQUIPMENT_TYPE)
      .order("created_at", { ascending: false });

    if (stagingError) {
      console.error("Could not fetch YubiKey staging:", stagingError);
      alert(`Could not load staging: ${stagingError.message}`);
      return;
    }

    setStagingRows(data ?? []);
  }

  useEffect(() => {
    fetchStaging();
  }, []);

  /* =========================
     BULK STAGING SELECTION
  ========================= */

  function toggleStageSelection(id: string) {
    setSelectedStageIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAll() {
    const availableIds = unitSearchResults
      .filter(
        (row) =>
          !stagingRows.some(
            (staged) => String(staged.source_unit_id) === String(row.id)
          )
      )
      .map((row) => String(row.id));

    const allSelected =
      availableIds.length > 0 &&
      availableIds.every((id) => selectedStageIds.includes(id));

    setSelectedStageIds((current) =>
      allSelected
        ? current.filter((id) => !availableIds.includes(id))
        : [...new Set([...current, ...availableIds])]
    );
  }

  async function handleStageSelected() {
    if (bulkStaging || selectedStageIds.length === 0) return;

    setBulkStaging(true);

    try {
      const selectedUnits = unitSearchResults.filter((row) =>
        selectedStageIds.includes(String(row.id))
      );

      if (selectedUnits.length === 0) {
        alert("No YubiKey units selected.");
        return;
      }

      const { data: existingStaged, error: checkError } = await supabase
        .from("staging_import")
        .select("source_unit_id")
        .eq("equipment_type", EQUIPMENT_TYPE)
        .in(
          "source_unit_id",
          selectedUnits.map((row) => row.id)
        );

      if (checkError) {
        throw checkError;
      }

      const existingIds = new Set(
        (existingStaged ?? []).map((row) => String(row.source_unit_id))
      );

      const unitsToStage = selectedUnits.filter(
        (row) => !existingIds.has(String(row.id))
      );

      if (unitsToStage.length === 0) {
        alert("All selected YubiKey units are already staged.");
        return;
      }

      const payload = unitsToStage.map((row) => {
        const {
          id,
          created_at,
          updated_at,
          created_by,
          updated_by,
          _sourceTable,
          ...rest
        } = row;

        return {
          ...rest,
          equipment_type: EQUIPMENT_TYPE,
          source_unit_id: id,
        };
      });

      const { error: insertError } = await supabase
        .from("staging_import")
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      await fetchStaging();

      setSelectedStageIds([]);
      setUnitSearchTerm("");
      setUnitSearchResults([]);

      alert(`${unitsToStage.length} YubiKey unit(s) staged successfully.`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not stage selected units";

      alert(message);
    } finally {
      setBulkStaging(false);
    }
  }

  /* =========================
     SEARCH YUBIKEY UNITS
  ========================= */

  async function handleUnitSearch(term: string) {
    setUnitSearchTerm(term);
    setSelectedStageIds([]);

    if (!term.trim()) {
      setUnitSearchResults([]);
      return;
    }

    const { data, error: searchError } = await supabase
      .from(WAREHOUSE_TABLE)
      .select("*")
      .ilike("hostname", `%${term.trim()}%`)
      .order("hostname", { ascending: true });

    if (searchError) {
      console.error("YubiKey search failed:", searchError);
      setUnitSearchResults([]);
      return;
    }

    setUnitSearchResults(data ?? []);
  }

  /* =========================
     FILTER STAGED ITEMS
  ========================= */

  const filteredStagingRows = stagingRows.filter((row) =>
    Object.values(row).some((value) =>
      String(value ?? "")
        .toLowerCase()
        .includes(stagingSearchTerm.toLowerCase())
    )
  );

  /* =========================
     SELECT STAGED ITEM
  ========================= */

  function handleSelectStagingRow(row: WarehouseRow) {
    setSelectedStagingId(String(row.id));
    setStagingEditValues({ ...row });
  }

  /* =========================
     EDIT STAGED ITEM
  ========================= */

  function handleStagingFieldChange(field: string, value: string) {
    setStagingEditValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSaveStagingEdit() {
    if (!selectedStagingId) return;

    const {
      id,
      created_at,
      source_unit_id,
      equipment_type,
      ...updatableFields
    } = stagingEditValues;

    const { error: updateError } = await supabase
      .from("staging_import")
      .update(updatableFields)
      .eq("id", selectedStagingId)
      .eq("equipment_type", EQUIPMENT_TYPE);

    if (updateError) {
      alert(`Could not save staged item: ${updateError.message}`);
      return;
    }

    setSelectedStagingId(null);
    setStagingEditValues({});

    await fetchStaging();

    alert("Staged YubiKey updated successfully.");
  }

  /* =========================
     REMOVE ITEM FROM STAGING
  ========================= */

  async function handleRemoveFromStaging(id: string) {
    const confirmed = window.confirm(
      "Remove this YubiKey from staging?"
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("staging_import")
      .delete()
      .eq("id", id)
      .eq("equipment_type", EQUIPMENT_TYPE);

    if (deleteError) {
      alert(`Could not remove staged item: ${deleteError.message}`);
      return;
    }

    if (selectedStagingId === id) {
      setSelectedStagingId(null);
      setStagingEditValues({});
    }

    await fetchStaging();
  }

  /* =========================
     CLEAR STAGING
  ========================= */

  async function handleClearStage() {
    if (stagingRows.length === 0) {
      alert("There are no staged YubiKeys to clear.");
      return;
    }

    const confirmed = window.confirm(
      `Clear all ${stagingRows.length} staged YubiKey item(s)?`
    );

    if (!confirmed) return;

    const stagedIds = stagingRows.map((row) => row.id);

    const { error: deleteError } = await supabase
      .from("staging_import")
      .delete()
      .eq("equipment_type", EQUIPMENT_TYPE)
      .in("id", stagedIds);

    if (deleteError) {
      alert(`Could not clear staging: ${deleteError.message}`);
      return;
    }

    setStagingRows([]);
    setSelectedStagingId(null);
    setStagingEditValues({});
    setSelectedStageIds([]);
    setSelectedInventoryIds([]);

    setUnitSearchTerm("");
    setUnitSearchResults([]);
    setStagingSearchTerm("");

    alert("Warehouse 3 staging cleared successfully.");
  }

  /* =========================
     COMMIT STAGED ITEMS
  ========================= */

  async function handleCommitStaging() {
    if (stagingRows.length === 0) {
      alert("There are no staged YubiKeys to commit.");
      return;
    }

    const confirmed = window.confirm(
      `Commit ${stagingRows.length} staged YubiKey item(s)?`
    );

    if (!confirmed) return;

    const { error: commitError } = await supabase.rpc(
      "commit_staged_imports"
    );

    if (commitError) {
      alert(`Commit failed: ${commitError.message}`);
      return;
    }

    setSelectedStagingId(null);
    setStagingEditValues({});
    setSelectedStageIds([]);
    setSelectedInventoryIds([]);

    await fetchStaging();
    await fetchData();

    alert("Staged items committed successfully.");
  }

  /* =========================
     LOAD WAREHOUSE 3 INVENTORY
  ========================= */

  async function fetchData() {
    setLoading(true);

    const { data: columnData, error: columnError } = await supabase.rpc(
      "get_table_columns",
      {
        target_table: WAREHOUSE_TABLE,
      }
    );

    const { data: rowData, error: rowError } = await supabase
      .from(WAREHOUSE_TABLE)
      .select("*")
      .order("hostname", { ascending: true });

    if (columnError) {
      setError(columnError.message);
    } else if (rowError) {
      setError(rowError.message);
    } else {
      setColumns(
        (columnData ?? []).map(
          (column: { column_name: string }) => column.column_name
        )
      );

      setRows(rowData ?? []);
      setError(null);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  /* =========================
     MAIN INVENTORY FILTER
  ========================= */

  const filteredRows = rows.filter((row) =>
    columns.some((column) =>
      String(row[column] ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
  );

  /* =========================
     INVENTORY CHECKBOX SELECTION
  ========================= */

  function toggleInventorySelection(id: string) {
    setSelectedInventoryIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    );
  }

  function toggleSelectAllInventory() {
    const availableIds = filteredRows
      .filter(
        (row) =>
          !stagingRows.some(
            (staged) =>
              String(staged.source_unit_id) === String(row.id)
          )
      )
      .map((row) => String(row.id));

    const allSelected =
      availableIds.length > 0 &&
      availableIds.every((id) =>
        selectedInventoryIds.includes(id)
      );

    setSelectedInventoryIds((current) =>
      allSelected
        ? current.filter(
            (id) => !availableIds.includes(id)
          )
        : [...new Set([...current, ...availableIds])]
    );
  }

  /* =========================
     BULK STAGE SELECTED INVENTORY
  ========================= */

  async function handleStageSelectedInventory() {
    if (
      stagingInventory ||
      selectedInventoryIds.length === 0
    ) {
      return;
    }

    setStagingInventory(true);

    try {
      const selectedUnits = rows.filter((row) =>
        selectedInventoryIds.includes(String(row.id))
      );

      if (selectedUnits.length === 0) {
        alert("No YubiKey units selected.");
        return;
      }

      const { data: existingStaged, error: checkError } =
        await supabase
          .from("staging_import")
          .select("source_unit_id")
          .eq("equipment_type", EQUIPMENT_TYPE)
          .in(
            "source_unit_id",
            selectedUnits.map((row) => row.id)
          );

      if (checkError) {
        throw checkError;
      }

      const existingIds = new Set(
        (existingStaged ?? []).map((row) =>
          String(row.source_unit_id)
        )
      );

      const unitsToStage = selectedUnits.filter(
        (row) => !existingIds.has(String(row.id))
      );

      if (unitsToStage.length === 0) {
        alert("All selected YubiKeys are already staged.");
        return;
      }

      const payload = unitsToStage.map((row) => {
        const {
          id,
          created_at,
          updated_at,
          created_by,
          updated_by,
          ...rest
        } = row;

        return {
          ...rest,
          equipment_type: EQUIPMENT_TYPE,
          source_unit_id: id,
        };
      });

      const { error: insertError } = await supabase
        .from("staging_import")
        .insert(payload);

      if (insertError) {
        throw insertError;
      }

      await fetchStaging();

      setSelectedInventoryIds([]);

      alert(
        `${unitsToStage.length} YubiKey unit(s) added to staging.`
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Could not stage selected YubiKeys.";

      alert(message);
    } finally {
      setStagingInventory(false);
    }
  }

  /* =========================
     ADD DATA COLUMN
  ========================= */

  async function handleAddColumn() {
    if (!newColumnName.trim()) {
      alert("Enter a column name.");
      return;
    }

    const { error: columnError } = await supabase.rpc(
      "admin_add_column",
      {
        target_table: WAREHOUSE_TABLE,
        new_column_name: newColumnName.trim(),
        new_column_type: newColumnType,
      }
    );

    if (columnError) {
      alert(`Could not add column: ${columnError.message}`);
      return;
    }

    setNewColumnName("");

    await fetchData();
  }

  /* =========================
     SELECT INVENTORY UNIT TO EDIT
  ========================= */

  function handleSelectUnit(row: WarehouseRow) {
    setSelectedUnitId(String(row.id));
    setEditValues({ ...row });
    setSearchUnitTerm("");
  }

  /* =========================
     EDIT INVENTORY FIELD
  ========================= */

  function handleEditFieldChange(
    column: string,
    value: string
  ) {
    setEditValues((current) => ({
      ...current,
      [column]: value,
    }));
  }

  /* =========================
     SAVE INVENTORY EDIT
  ========================= */

  async function handleSaveUnit() {
    if (!selectedUnitId) return;

    const {
      id,
      created_at,
      created_by,
      equipment_type,
      ...updatableFields
    } = editValues;

    const { error: updateError } = await supabase
      .from(WAREHOUSE_TABLE)
      .update(updatableFields)
      .eq("id", selectedUnitId);

    if (updateError) {
      alert(`Could not update YubiKey: ${updateError.message}`);
      return;
    }

    await logUserActivity(
      "Edited Inventory",
      String(editValues.hostname || selectedUnitId),
      "Updated an existing Warehouse 3 YubiKey."
    );

    setSelectedUnitId(null);
    setEditValues({});

    await fetchData();

    alert("YubiKey updated successfully.");
  }

  /* =========================
     CANCEL INVENTORY EDIT
  ========================= */

  function handleCancelUnitEdit() {
    setSelectedUnitId(null);
    setEditValues({});
  }

  /* =========================
     SEARCH INVENTORY FOR EDITING
  ========================= */

  const matchedUnits = searchUnitTerm.trim()
    ? rows.filter((row) =>
        columns.some((column) =>
          String(row[column] ?? "")
            .toLowerCase()
            .includes(searchUnitTerm.toLowerCase())
        )
      )
    : [];

  /* =========================
     LOG NEW INVENTORY
  ========================= */

  function handleOpenLogPopup() {
    setLogFormValues({});
    setShowLogPopup(true);
  }

  function handleLogFieldChange(field: string, value: string) {
    setLogFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmitLog() {
    const { error: insertError } = await supabase
      .from(WAREHOUSE_TABLE)
      .insert({
        ...logFormValues,
        equipment_type: EQUIPMENT_TYPE,
      });

    if (insertError) {
      alert(`Could not log YubiKey: ${insertError.message}`);
      return;
    }

    await logUserActivity(
      "Added Inventory",
      logFormValues.hostname || undefined,
      "Added a new YubiKey to Warehouse 3."
    );

    setShowLogPopup(false);
    setLogFormValues({});

    await fetchData();

    alert("YubiKey added successfully.");
  }

  function handleCancelLog() {
    setShowLogPopup(false);
    setLogFormValues({});
  }

  /* =========================
     GENERATE QR CODE
  ========================= */

  async function handleGenerateQRCode(row: WarehouseRow) {
    if (!row.id) {
      alert("This YubiKey does not have a permanent ID yet.");
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
        row.hostname || "yubikey-unit"
      ).replace(/[^a-zA-Z0-9-_]/g, "_");

      link.download = `${safeHostname}_QR.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("QR generation failed:", err);
      alert("Could not generate QR code.");
    }
  }

  /* =========================
     EXPORT STAGED ITEMS TO CSV
  ========================= */

  function handleExportStagedCSV() {
    if (stagingRows.length === 0) {
      alert("There are no staged YubiKeys to export.");
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

  /* =========================
     EXPORT STAGED ITEMS TO PDF
  ========================= */

  async function handleExportStagedPDF() {
    if (stagingRows.length === 0) {
      alert("There are no staged YubiKeys to export.");
      return;
    }

    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      pdf.setFontSize(18);

      pdf.text("Warehouse 3 - Staged YubiKeys", 14, 15);

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

      /* =========================
         QR LABELS
      ========================= */

      const qrColumns = 4;
      const qrRows = 4;
      const qrPerPage = qrColumns * qrRows;

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

        /* =========================
           GENERATE UNIT QR CODE
        ========================= */

        const unitId =
          row.source_unit_id || row.id;

        const qrValue = `warehouse_3:${unitId}`;

        const qrDataUrl = await QRCode.toDataURL(qrValue, {
          width: 300,
          margin: 1,
        });

        const qrX = centerX - qrSize / 2;
        const qrY = cellY + 3;

        pdf.addImage(
          qrDataUrl,
          "PNG",
          qrX,
          qrY,
          qrSize,
          qrSize
        );

        /* =========================
           INFORMATION BELOW QR
        ========================= */

        let textY = qrY + qrSize + 4;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);

        pdf.text(
          String(row.hostname || "No Hostname"),
          centerX,
          textY,
          {
            align: "center",
            maxWidth: cellWidth - 4,
          }
        );

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);

        textY += 4;

        pdf.text(
          `Checked By: ${row.checked_by || "-"}`,
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

        const dateValue = row.created_at
          ? new Date(row.created_at).toLocaleDateString()
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
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Could not export staged YubiKeys to PDF.");
    }
  }

  /* =========================
     PERMANENT INVENTORY PULL-OUT
  ========================= */

  async function handlePullOut() {
    const existingUnits = stagingRows.filter(
      (row) => row.source_unit_id
    );

    if (existingUnits.length === 0) {
      alert(
        "There are no existing YubiKey units staged for pull-out."
      );
      return;
    }

    const confirmed = window.confirm(
      `PERMANENTLY DELETE ${existingUnits.length} YubiKey unit(s) from Warehouse 3?\n\n` +
        "This action cannot be undone."
    );

    if (!confirmed) return;

    let deletedCount = 0;

    for (const row of existingUnits) {
      const unitId = row.source_unit_id;

      const { error: deleteError } = await supabase
        .from(WAREHOUSE_TABLE)
        .delete()
        .eq("id", unitId);

      if (deleteError) {
        alert(
          `Could not delete ${
            row.hostname || unitId
          }: ${deleteError.message}`
        );
        await fetchStaging();
        await fetchData();
        return;
      }

      await logUserActivity(
        "PULL OUT",
        String(
          row.hostname ||
            row.serial_number ||
            unitId
        ),
        `Permanently removed from Warehouse 3. Unit ID: ${unitId}`
      );

      const { error: stagingDeleteError } = await supabase
        .from("staging_import")
        .delete()
        .eq("id", row.id)
        .eq("equipment_type", EQUIPMENT_TYPE);

      if (stagingDeleteError) {
        alert(
          `The YubiKey was deleted from Warehouse 3, but its staging record could not be removed: ${stagingDeleteError.message}`
        );

        await fetchStaging();
        await fetchData();
        return;
      }

      deletedCount++;
    }

    setSelectedStagingId(null);
    setStagingEditValues({});
    setSelectedInventoryIds([]);

    await fetchStaging();
    await fetchData();

    alert(
      `${deletedCount} YubiKey unit(s) permanently pulled out from Warehouse 3.`
    );
  }

  /* =========================
     SHELF MANAGEMENT
  ========================= */

  async function fetchShelves() {
    setShelvesLoading(true);
    setShelvesError(null);

    const { data, error: shelfError } = await supabase
      .from("warehouse_shelves")
      .select("*")
      .order("rack_and_bay", { ascending: true });

    if (shelfError) {
      setShelvesError(shelfError.message);
      setShelves([]);
    } else {
      setShelves(data ?? []);
    }

    setShelvesLoading(false);
  }

  useEffect(() => {
    fetchShelves();
  }, []);

  /* =========================
     FILTER SHELVES
  ========================= */

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

  /* =========================
     SET SHELF STATUS
  ========================= */

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
      alert(
        "Please select an existing shelf from the suggestions first."
      );
      return;
    }

    const { error: updateError } = await supabase
      .from("warehouse_shelves")
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", match.id);

    if (updateError) {
      alert(
        `Could not update shelf: ${updateError.message}`
      );
      return;
    }

    alert(
      `${match.rack_and_bay} updated to ${newStatus}.`
    );

    setShelfSearchTerm("");

    await fetchShelves();
  }

  /* =========================
     ADD NEW SHELF
  ========================= */

  async function handleAddShelf() {
    const rackAndBay = newShelfName.trim();

    if (!rackAndBay) {
      alert("Enter a rack and bay.");
      return;
    }

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

    const { error: insertError } = await supabase
      .from("warehouse_shelves")
      .insert({
        rack_and_bay: rackAndBay.toUpperCase(),
        status: "New and Available",
      });

    if (insertError) {
      alert(
        `Could not add shelf: ${insertError.message}`
      );
      return;
    }

    alert(
      `${rackAndBay.toUpperCase()} added successfully.`
    );

    setNewShelfName("");

    await fetchShelves();
  }

  /* =========================
     REMOVE EXISTING SHELF
  ========================= */

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
      alert(
        "Please select an existing shelf from the suggestions first."
      );
      return;
    }

    const confirmed = window.confirm(
      `Remove shelf "${match.rack_and_bay}"?`
    );

    if (!confirmed) return;

    const { error: deleteError } = await supabase
      .from("warehouse_shelves")
      .delete()
      .eq("id", match.id);

    if (deleteError) {
      alert(
        `Could not remove shelf: ${deleteError.message}`
      );
      return;
    }

    alert(
      `${match.rack_and_bay} removed successfully.`
    );

    setNewShelfName("");

    await fetchShelves();
  }

  return (
    <main className="page">
      {/* =========================
          HEADER
      ========================= */}

      <header className="header">
        <img
          src={logo}
          alt="Adventus"
          className="logo"
        />

        <input
          type="text"
          placeholder="Search & Filter...."
          className="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </header>

      <div className="body">
        {/* =========================
            SIDEBAR
        ========================= */}

        <aside className="sidebar">
          <button
            className="sideItem"
            onClick={onWarehouse1}
          >
            <span>Warehouse 1:</span>
            <span>Laptops</span>
          </button>

          <button
            className="sideItem"
            onClick={onWarehouse2}
          >
            <span>Warehouse 2:</span>
            <span>Computer Equipment</span>
          </button>

          <button className="sideItem active">
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

        {/* =========================
            MAIN CONTENT
        ========================= */}

        <section
          className="content"
          style={{
            backgroundImage: `url(${background})`,
          }}
        >
          {/* =========================
              TOP ACTION BUTTONS
          ========================= */}

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
                disabled={
                  !stagingRows.some(
                    (row) => row.source_unit_id
                  )
                }
              >
                Pull Out
              </button>
            </div>
          </div>

          <div className="mainGrid">
            {/* =========================
                LEFT AREA
            ========================= */}

            <div className="leftArea">
              <div className="cards">
                {/* ADD DATA COLUMNS */}

                <div className="card">
                  <h2>Add Data Columns</h2>

                  <input
                    type="text"
                    placeholder="New Column"
                    value={newColumnName}
                    onChange={(e) =>
                      setNewColumnName(e.target.value)
                    }
                  />

                  <select
                    value={newColumnType}
                    onChange={(e) =>
                      setNewColumnType(e.target.value)
                    }
                  >
                    <option value="text">
                      Text
                    </option>

                    <option value="int">
                      Number
                    </option>

                    <option value="boolean">
                      Boolean
                    </option>

                    <option value="timestamptz">
                      Date
                    </option>
                  </select>

                  <button onClick={handleAddColumn}>
                    Add Column
                  </button>
                </div>

                {/* EDIT INVENTORY */}

                <div className="card edit">
                  <h2>Edit Data</h2>

                  <p>Search Unit</p>

                  {!selectedUnitId && (
                    <>
                      <input
                        type="text"
                        placeholder="Search by hostname"
                        value={searchUnitTerm}
                        onChange={(e) =>
                          setSearchUnitTerm(
                            e.target.value
                          )
                        }
                      />

                      <div className="searchResults">
                        {matchedUnits.map((row) => (
                          <button
                            key={row.id}
                            onClick={() =>
                              handleSelectUnit(row)
                            }
                          >
                            {row.hostname || row.id}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedUnitId && (
                    <div className="editForm">
                      {columns
                        .filter(
                          (column) =>
                            ![
                              "id",
                              "created_at",
                              "created_by",
                              "equipment_type",
                            ].includes(column)
                        )
                        .map((column) => (
                          <div
                            className="editField"
                            key={column}
                          >
                            <label>
                              {column}
                            </label>

                            <input
                              type="text"
                              value={
                                editValues[column] ??
                                ""
                              }
                              onChange={(e) =>
                                handleEditFieldChange(
                                  column,
                                  e.target.value
                                )
                              }
                            />
                          </div>
                        ))}

                      <div className="editFormButtons">
                        <button
                          onClick={handleSaveUnit}
                        >
                          Save
                        </button>

                        <button
                          onClick={handleCancelUnitEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* =========================
                  BULK INVENTORY ACTIONS
              ========================= */}

              <div className="inventoryBulkActions">
                <span>
                  {selectedInventoryIds.length}{" "}
                  YubiKey unit(s) selected
                </span>

                <button
                  type="button"
                  disabled={
                    selectedInventoryIds.length === 0 ||
                    stagingInventory
                  }
                  onClick={
                    handleStageSelectedInventory
                  }
                >
                  {stagingInventory
                    ? "Staging..."
                    : `Stage Selected (${selectedInventoryIds.length})`}
                </button>
              </div>

              {/* =========================
                  MAIN INVENTORY TABLE
              ========================= */}

              <div className="table">
                <div className="tableBody">
                  {loading && (
                    <div className="tableRow">
                      Loading...
                    </div>
                  )}

                  {error && (
                    <div className="tableRow">
                      Error: {error}
                    </div>
                  )}

                  {!loading && !error && (
                    <>
                      {/* TABLE HEADERS */}

                      <div className="tableRow tableHeaderRow">
                        <span className="inventoryCheckboxCell">
                          <input
                            type="checkbox"
                            aria-label="Select all available YubiKeys"
                            checked={
                              filteredRows.some(
                                (row) =>
                                  !stagingRows.some(
                                    (staged) =>
                                      String(
                                        staged.source_unit_id
                                      ) ===
                                      String(row.id)
                                  )
                              ) &&
                              filteredRows
                                .filter(
                                  (row) =>
                                    !stagingRows.some(
                                      (staged) =>
                                        String(
                                          staged.source_unit_id
                                        ) ===
                                        String(row.id)
                                    )
                                )
                                .every((row) =>
                                  selectedInventoryIds.includes(
                                    String(row.id)
                                  )
                                )
                            }
                            onChange={
                              toggleSelectAllInventory
                            }
                          />
                        </span>

                        {columns
                          .filter(
                            (column) =>
                              column !== "id"
                          )
                          .map((column) => (
                            <span key={column}>
                              {column}
                            </span>
                          ))}

                        <span>QR</span>
                      </div>

                      {/* INVENTORY ROWS */}

                      {filteredRows.map((row) => {
                        const alreadyStaged =
                          stagingRows.some(
                            (staged) =>
                              String(
                                staged.source_unit_id
                              ) ===
                              String(row.id)
                          );

                        return (
                          <div
                            className="tableRow"
                            key={row.id}
                          >
                            <span className="inventoryCheckboxCell">
                              <input
                                type="checkbox"
                                aria-label={`Select ${
                                  row.hostname ||
                                  row.id
                                }`}
                                checked={selectedInventoryIds.includes(
                                  String(row.id)
                                )}
                                disabled={
                                  alreadyStaged ||
                                  stagingInventory
                                }
                                onChange={() =>
                                  toggleInventorySelection(
                                    String(row.id)
                                  )
                                }
                              />
                            </span>

                            {columns
                              .filter(
                                (column) =>
                                  column !== "id"
                              )
                              .map((column) => (
                                <span key={column}>
                                  {String(
                                    row[column] ?? ""
                                  )}
                                </span>
                              ))}

                            <span>
                              <button
                                onClick={() =>
                                  handleGenerateQRCode(
                                    row
                                  )
                                }
                              >
                                Generate QR
                              </button>
                            </span>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* =========================
                RIGHT AREA
            ========================= */}

            <div className="rightArea">
              {/* =========================
                  SHELF CONTROLS
              ========================= */}

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
                        setShelfSearchTerm(
                          e.target.value
                        )
                      }
                      autoComplete="off"
                    />

                    {shelfSearchTerm.trim() &&
                      filteredShelves.length >
                        0 && (
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
                                <span>
                                  {
                                    shelf.rack_and_bay
                                  }
                                </span>

                                <span>
                                  {shelf.status}
                                </span>
                              </button>
                            ))}
                        </div>
                      )}

                    {shelfSearchTerm.trim() &&
                      filteredShelves.length ===
                        0 &&
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
                      handleSetShelfStatus(
                        "Full"
                      )
                    }
                  >
                    Full
                  </button>

                  <button
                    className="smallButton"
                    onClick={() =>
                      handleSetShelfStatus(
                        "New and Available"
                      )
                    }
                  >
                    Available
                  </button>
                </div>

                {/* ADD OR REMOVE SHELF */}

                <div className="row">
                  <div className="shelfSearchWrapper">
                    <input
                      type="text"
                      placeholder="Search or enter shelf..."
                      className="smallInput"
                      value={newShelfName}
                      onChange={(e) =>
                        setNewShelfName(
                          e.target.value
                        )
                      }
                      autoComplete="off"
                    />

                    {newShelfName.trim() &&
                      filteredManageShelves.length >
                        0 && (
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
                                <span>
                                  {
                                    shelf.rack_and_bay
                                  }
                                </span>

                                <span>
                                  {shelf.status}
                                </span>
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
                    onClick={
                      handleRemoveShelf
                    }
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* =========================
                  STAGING CARD
              ========================= */}

              <div className="stageCard">
                <h2>Stage Sets</h2>

                {/* SEARCH INVENTORY */}

                <div className="stageItem">
                  <label>
                    Search and Input
                  </label>

                  <input
                    type="text"
                    placeholder="Search YubiKey by hostname..."
                    value={unitSearchTerm}
                    onChange={(e) =>
                      handleUnitSearch(
                        e.target.value
                      )
                    }
                  />
                </div>

                {/* =========================
                    BULK STAGING RESULTS
                ========================= */}

                <div className="searchResults bulkStageResults">
                  {unitSearchResults.length >
                    0 && (
                    <>
                      <label className="bulkStageSelectAll">
                        <input
                          type="checkbox"
                          checked={
                            unitSearchResults.some(
                              (row) =>
                                !stagingRows.some(
                                  (staged) =>
                                    String(
                                      staged.source_unit_id
                                    ) ===
                                    String(row.id)
                                )
                            ) &&
                            unitSearchResults
                              .filter(
                                (row) =>
                                  !stagingRows.some(
                                    (staged) =>
                                      String(
                                        staged.source_unit_id
                                      ) ===
                                      String(row.id)
                                  )
                              )
                              .every((row) =>
                                selectedStageIds.includes(
                                  String(row.id)
                                )
                              )
                          }
                          onChange={
                            toggleSelectAll
                          }
                        />

                        Select All Available
                      </label>

                      <div className="bulkStageList">
                        {unitSearchResults.map(
                          (row) => {
                            const alreadyStaged =
                              stagingRows.some(
                                (staged) =>
                                  String(
                                    staged.source_unit_id
                                  ) ===
                                  String(row.id)
                              );

                            return (
                              <label
                                key={row.id}
                                className={`bulkStageItem ${
                                  alreadyStaged
                                    ? "alreadyStaged"
                                    : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedStageIds.includes(
                                    String(row.id)
                                  )}
                                  disabled={
                                    alreadyStaged ||
                                    bulkStaging
                                  }
                                  onChange={() =>
                                    toggleStageSelection(
                                      String(
                                        row.id
                                      )
                                    )
                                  }
                                />

                                <span>
                                  <strong>
                                    {row.hostname ||
                                      "No hostname"}
                                  </strong>

                                  <small>
                                    {row.serial_number ||
                                      "No serial number"}
                                  </small>
                                </span>

                                {alreadyStaged && (
                                  <small>
                                    Already staged
                                  </small>
                                )}
                              </label>
                            );
                          }
                        )}
                      </div>

                      <button
                        type="button"
                        className="bulkStageButton"
                        disabled={
                          selectedStageIds.length ===
                            0 ||
                          bulkStaging
                        }
                        onClick={
                          handleStageSelected
                        }
                      >
                        {bulkStaging
                          ? "Staging..."
                          : `Stage Selected (${selectedStageIds.length})`}
                      </button>
                    </>
                  )}
                </div>

                {/* =========================
                    STAGED ITEMS
                ========================= */}

                <h3>
                  Staged Items (
                  {stagingRows.length})
                </h3>

                <input
                  type="text"
                  placeholder="Search staged items..."
                  value={stagingSearchTerm}
                  onChange={(e) =>
                    setStagingSearchTerm(
                      e.target.value
                    )
                  }
                />

                <div className="stagedList">
                  {filteredStagingRows.map(
                    (row) => (
                      <button
                        key={row.id}
                        onClick={() =>
                          handleSelectStagingRow(
                            row
                          )
                        }
                      >
                        {row.hostname ||
                          "(no hostname)"}{" "}
                        —{" "}
                        {row.equipment_type}

                        {row.source_unit_id
                          ? " (editing)"
                          : " (new)"}
                      </button>
                    )
                  )}
                </div>

                {/* =========================
                    EDIT STAGED ITEM
                ========================= */}

                {selectedStagingId && (
                  <div className="editForm">
                    {Object.keys(
                      stagingEditValues
                    )
                      .filter(
                        (field) =>
                          ![
                            "id",
                            "created_at",
                            "source_unit_id",
                            "equipment_type",
                          ].includes(field)
                      )
                      .map((field) => (
                        <div
                          className="editField"
                          key={field}
                        >
                          <label>
                            {field}
                          </label>

                          <input
                            type="text"
                            value={
                              stagingEditValues[
                                field
                              ] ?? ""
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
                        onClick={
                          handleSaveStagingEdit
                        }
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

                {/* COMMIT ALL */}

                <button
                  className="commitButton"
                  onClick={
                    handleCommitStaging
                  }
                  disabled={
                    stagingRows.length === 0
                  }
                >
                  Commit All (
                  {stagingRows.length})
                </button>
              </div>

              {/* =========================
                  BOTTOM ACTION BUTTONS
              ========================= */}

              <div className="bottomButtons">
                <button
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
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
                  onChange={
                    handleFileSelected
                  }
                  style={{
                    display: "none",
                  }}
                />

                <button
                  onClick={
                    handleClearStage
                  }
                  disabled={
                    stagingRows.length === 0
                  }
                >
                  Clear Stage
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* =========================
          CSV DUPLICATE POPUP
      ========================= */}

      {showDuplicatePopup && (
        <div className="popupOverlay">
          <div className="popupBox duplicatePopup">
            <h2>
              Duplicate YubiKeys Found
            </h2>

            <p>
              {duplicateRows.length} imported
              YubiKey unit(s) already exist
              in Warehouse 3.
            </p>

            <div className="duplicateList">
              {duplicateRows.map(
                (duplicate, index) => (
                  <div
                    className="duplicateItem"
                    key={index}
                  >
                    <h3>
                      {duplicate.imported
                        .hostname ||
                        duplicate.imported
                          .serial_number ||
                        "Unknown YubiKey"}
                    </h3>

                    {duplicate.conflictType ===
                      "serial_conflict" && (
                      <p>
                        Warning: this serial
                        number belongs to
                        another existing unit.
                      </p>
                    )}

                    <div className="duplicateComparison">
                      <div>
                        <strong>
                          Existing
                        </strong>

                        <p>
                          Hostname:{" "}
                          {duplicate.existing
                            .hostname || "-"}
                        </p>

                        <p>
                          Serial:{" "}
                          {duplicate.existing
                            .serial_number ||
                            "-"}
                        </p>

                        <p>
                          Status:{" "}
                          {duplicate.existing
                            .status || "-"}
                        </p>

                        <p>
                          Shelf:{" "}
                          {duplicate.existing
                            .shelf || "-"}
                        </p>
                      </div>

                      <div>
                        <strong>
                          Imported
                        </strong>

                        <p>
                          Hostname:{" "}
                          {duplicate.imported
                            .hostname || "-"}
                        </p>

                        <p>
                          Serial:{" "}
                          {duplicate.imported
                            .serial_number ||
                            "-"}
                        </p>

                        <p>
                          Status:{" "}
                          {duplicate.imported
                            .status || "-"}
                        </p>

                        <p>
                          Shelf:{" "}
                          {duplicate.imported
                            .shelf || "-"}
                        </p>
                      </div>
                    </div>

                    <div className="popupButtons">
                      <button
                        disabled={
                          replacingDuplicates ||
                          duplicate.conflictType ===
                            "serial_conflict"
                        }
                        onClick={() =>
                          handleReplaceDuplicate(
                            index
                          )
                        }
                      >
                        Replace Existing
                      </button>

                      <button
                        disabled={
                          replacingDuplicates
                        }
                        onClick={() =>
                          handleKeepExisting(
                            index
                          )
                        }
                      >
                        Keep Existing
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>

            <div className="popupButtons">
              <button
                disabled={
                  replacingDuplicates ||
                  duplicateRows.length === 0
                }
                onClick={
                  handleReplaceAllDuplicates
                }
              >
                {replacingDuplicates
                  ? "Replacing..."
                  : "Replace All"}
              </button>

              <button
                disabled={
                  replacingDuplicates
                }
                onClick={
                  handleKeepAllExisting
                }
              >
                Keep All Existing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          LOG INVENTORY POPUP
      ========================= */}

      {showLogPopup && (
        <div className="popupOverlay">
          <div className="popupBox">
            <h2>
              Log New YubiKey
            </h2>

            {columns
              .filter(
                (column) =>
                  ![
                    "id",
                    "created_at",
                    "updated_at",
                    "created_by",
                    "updated_by",
                    "equipment_type",
                  ].includes(column)
              )
              .map((column) => (
                <div
                  className="popupField"
                  key={column}
                >
                  <label>
                    {column}
                  </label>

                  <input
                    type="text"
                    value={
                      logFormValues[
                        column
                      ] ?? ""
                    }
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
              <button
                onClick={
                  handleSubmitLog
                }
              >
                Submit
              </button>

              <button
                onClick={
                  handleCancelLog
                }
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default Warehouse3;
