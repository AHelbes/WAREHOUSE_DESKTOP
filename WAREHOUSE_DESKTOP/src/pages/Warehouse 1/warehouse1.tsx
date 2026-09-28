import "./warehouse1.css";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabase/supabaseClient";

import logo from "../../assets/logo.png";
import background from "../../assets/bgWarehouse.png";

import Papa from "papaparse";

type Warehouse1Props = {
  onBack: () => void;
  onWarehouse2: () => void;
  onSuperuser: () => void;
};

function Warehouse1({
  onBack,
  onWarehouse2,
  onSuperuser
}: Warehouse1Props) {
  /*Memory boxes for importing CSV files*/
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
        .from("warehouse_laptops")
        .insert(parsedRows);

      if (error) {
        alert(`Import failed: ${error.message}`);
      } else {
        alert(`Imported ${parsedRows.length} rows successfully.`);
        fetchData();
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

        <button className="topButton">
          Update
        </button>

        <button className="topButton">
          Stage
        </button>

        <button className="userButton">
          User
        </button>
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

          <button 
            className="sideItem"
            onClick={onSuperuser}
          >
            Superuser
            <span>Controls</span>
          </button>

          <button
            className="backButton"
            onClick={onBack}
          >
            Back to Login
          </button>

        </aside>

        <section
          className="content"
          style={{
            backgroundImage: `url(${background})`,
          }}
        >
          <div className="top">
            <button className="exportButton">
              Generate & Export
            </button>

            <div className="inventory">
              <button className="inventoryButton">
                Login Inventory
              </button>

              <button className="inventoryButton pullOut">
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
                      </div>

                      {filteredRows.map((row) => (
                        <div className="tableRow" key={row.id}>
                          {columns.map((col) => (
                            <span key={col}>{String(row[col] ?? "")}</span>
                          ))}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              <div className="bottomButtons">
                <button>
                  Edit Data
                </button>

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

                <button>
                  Clear Stage
                </button>
              </div>
            </div>

            <div className="rightArea">
              <div className="rightControls">
                <div className="row">
                  <input
                    type="text"
                    placeholder="..."
                    className="smallInput"
                  />
                  <button className="smallButton">
                    FULL
                  </button>

                  <button className="smallButton">
                    AVAILABLE
                  </button>
                </div>

                <div className="row">
                  <input
                    type="text"
                    placeholder="..."
                    className="smallInput"
                  />

                  <button className="actionButton">
                    Add
                  </button>

                  <button className="actionButton">
                    Remove
                  </button>
                </div>
              </div>

              <div className="stageCard">
                <h2>Stage Sets</h2>
                <div className="stageItem">
                  <label>Laptop</label>
                  <input
                    type="text"
                    placeholder="Search by name"
                  />
                </div>

                <div className="stageItem">
                  <label>Yubikey</label>
                  <input
                    type="text"
                    placeholder="Search by name"
                  />
                </div>

                <div className="stageItem">
                  <label>Monitor</label>
                  <input
                    type="text"
                    placeholder="Search by name"
                  />
                </div>

                <div className="stageItem">
                  <label>KMB</label>
                  <input
                    type="text"
                    placeholder="Search by name"
                  />
                </div>

                <div className="stageItem">
                  <label>Headset</label>
                  <input
                    type="text"
                    placeholder="Search by name"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
export default Warehouse1;