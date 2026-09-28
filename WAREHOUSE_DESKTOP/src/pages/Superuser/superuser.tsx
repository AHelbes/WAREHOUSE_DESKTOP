import "./superuser.css";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";

import logo from "../../assets/logo.png";
import background from "../../assets/bgWarehouse.png";

type SuperuserProps = {
  onBack: () => void;
  onWarehouse1: () => void;
  onWarehouse2: () => void;
};

function Superuser({
  onBack,
  onWarehouse1,
  onWarehouse2,
}: SuperuserProps) {
  /*DELETE COLUMN CARD
  Memory boxes: selectedTable is data table, columns is dynamic data table taken from supabase.
  Fetch dynamic data (data that is currently live from supabase)
  Function delete column.
  */
  const [selectedTable, setSelectedTable] = useState<"warehouse_laptops" | "warehouse_ce">("warehouse_laptops");
  const [columns, setColumns] = useState<string[]>([]);
  const [columnToDelete, setColumnToDelete] = useState("");
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [columnsError, setColumnsError] = useState<string | null>(null);

  async function fetchColumns() {
    setLoadingColumns(true);

    const { data, error } = await supabase
      .rpc("get_table_columns", { target_table: selectedTable });

    if (error) {
      setColumnsError(error.message);
    } else {
      const columnNames = (data ?? []).map((c: any) => c.column_name);
      setColumns(columnNames);
      setColumnsError(null);
      setColumnToDelete("");
    }

    setLoadingColumns(false);
  }

  useEffect(() => {
    fetchColumns();
  }, [selectedTable]);

  async function handleDeleteColumn() {
    if (!columnToDelete) {
      alert("Please choose a column first.");
      return;
    }

    const confirmed = window.confirm(
      `Delete column "${columnToDelete}" from ${selectedTable} and all its data? This can't be undone.`
    );
    if (!confirmed) return;

    const { error } = await supabase.rpc("admin_drop_column", {
      target_table: selectedTable,
      column_to_drop: columnToDelete,
    });

    if (error) {
      alert(error.message);
    } else {
      fetchColumns();
    }
  }

  /*MAIN LOOP*/
  return (
    <main className="superPage">
      <header className="header">
        <img src={logo} alt="Adventus" className="logo" />
        <input
          type="text"
          placeholder="Search & Filter...."
          className="search"
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
          <button
            className="sideItem"
            onClick={onWarehouse1}
          >
            <span>Warehouse 1:</span>
            <span>Laptops & Yubikey</span>
          </button>

          <button
            className="sideItem"
            onClick={onWarehouse2}
          >
            <span>Warehouse 2:</span>
            <span>Computer Equipment</span>
          </button>

          <button className="sideItem active">
            <span>Superuser</span>
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

            <button className="pullButton">
              Pull Out
            </button>
          </div>

          <div className="superGrid">
            <div className="leftArea">
              <div className="usersCard">

                <div className="usersHeader">
                  <h2>Users</h2>

                  <input
                    type="text"
                    placeholder="Search by name or email"
                    className="userSearch"
                  />
                </div>

                <div className="userColumns">
                  <span>Name</span>
                  <span>Last Update</span>
                  <span>Timestamp</span>
                </div>

                <div className="userRow">
                  <div>
                    <strong>User 1</strong>
                    <small>User 1’s Email Address</small>
                  </div>

                  <span>Warehouse 1</span>
                  <span>Last 8:52AM</span>
                </div>


                <div className="userRow">
                  <div>
                    <strong>User 2</strong>
                    <small>User 2’s Email Address</small>
                  </div>

                  <span>Warehouse 2</span>

                  <span>Last 9:30PM</span>
                </div>

                <div className="userRow">
                  <div>
                    <strong>User 3</strong>
                    <small>User 3’s Email Address</small>
                  </div>

                  <span>Warehouse 2</span>

                  <span>Last 8/12/2026</span>
                </div>

              </div>

              <div className="monthlyCard">
                <div className="monthlyHeader">
                  <h2>Monthly Warehouse</h2>
                  <button>
                    Warehouse
                  </button>

                  <button>
                    Month
                  </button>

                  <button>
                    Year
                  </button>
                </div>

              </div>

            </div>
          
          <div className="rightArea">
            <div className="userInfoCard">
              <h2>User Information</h2>
              <div className="infoBlock">
                <h3>Full Name</h3>
                <p>Position</p>
                <p>Email Address</p>
                <p>Last Seen (Timestamp)</p>
              </div>

              <div className="userActions">
                <button>
                  Reset Password
                </button>

                <button>
                  Remove User
                </button>
              </div>
            </div>

            {/*DELETE COLUMN CARD
              Warehouse Type
              List of Columns

            */}
            <div className="delColCard">
              <h2>Delete Column</h2>

              <div className="delColBlock">
                <h3>Warehouse Type</h3>
                <select
                    value={selectedTable}
                    onChange={(e) => setSelectedTable(e.target.value as "warehouse_laptops" | "warehouse_ce")}
                  >
                    <option value="warehouse_laptops">Warehouse 1: Laptops & Yubikey</option>
                    <option value="warehouse_ce">Warehouse 2: Computer Equipment</option>
                </select>
              </div>
        
              <div className="delColBlock">
                <h3>List of Columns</h3>

                  {loadingColumns && <p>Loading columns...</p>}
                  {columnsError && <p>Error: {columnsError}</p>}

                  {!loadingColumns && !columnsError && (
                    <select
                      value={columnToDelete}
                      onChange={(e) => setColumnToDelete(e.target.value)}
                    >
                      <option value="">-- Select a column --</option>
                      {columns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  )}
              </div>

              <div className="userActions">
                <button onClick={handleDeleteColumn}>
                  Delete Column
                </button>
              </div>
            </div>
          </div>
          </div>
        </section>
      </div>
    </main>
  );
}
export default Superuser;