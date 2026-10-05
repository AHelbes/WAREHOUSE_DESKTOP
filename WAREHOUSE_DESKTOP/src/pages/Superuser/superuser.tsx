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

/* =========================================================
   REGULAR USER TYPE
   ========================================================= */

type RegularUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  last_warehouse: string | null;
  last_updated: string | null;
};

function Superuser({
  onBack,
  onWarehouse1,
  onWarehouse2,
}: SuperuserProps) {

  /* =========================================================
     REGULAR USER MANAGEMENT
     ========================================================= */

  const [regularUsers, setRegularUsers] = useState<RegularUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<RegularUser | null>(null);

  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  /* =========================================================
     DELETE COLUMN
     ========================================================= */

  const [selectedTable, setSelectedTable] = useState<
    "warehouse_laptops" | "warehouse_ce"
  >("warehouse_laptops");

  const [columns, setColumns] = useState<string[]>([]);
  const [columnToDelete, setColumnToDelete] = useState("");
  const [loadingColumns, setLoadingColumns] = useState(true);
  const [columnsError, setColumnsError] = useState<string | null>(null);

  /* =========================================================
     FETCH REGULAR USERS
     ========================================================= */

  async function fetchRegularUsers() {
    setUsersLoading(true);

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("role", "regular")
      .order("full_name", { ascending: true });

    if (profileError) {
      setUsersError(profileError.message);
      setUsersLoading(false);
      return;
    }

    /*
      For every regular user, get their most recent activity.

      We ONLY care about:
      - warehouse
      - timestamp

      We don't show exactly what they changed.
    */

    const usersWithActivity = await Promise.all(
      (profiles ?? []).map(async (profile) => {

        const { data: activity } = await supabase
          .from("user_activity")
          .select("warehouse, created_at")
          .eq("user_id", profile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          ...profile,
          last_warehouse: activity?.warehouse ?? null,
          last_updated: activity?.created_at ?? null,
        };
      })
    );

    setRegularUsers(usersWithActivity);
    setUsersError(null);
    setUsersLoading(false);
  }

  /* Load regular users when page opens */

  useEffect(() => {
    fetchRegularUsers();
  }, []);

  /* =========================================================
     USER SEARCH
     ========================================================= */

  const filteredUsers = regularUsers.filter((user) => {
    const search = userSearchTerm.toLowerCase();

    return (
      user.full_name.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    );
  });

  /* =========================================================
     FORMAT WAREHOUSE NAME
     ========================================================= */

  function formatWarehouse(warehouse: string | null) {
    if (warehouse === "warehouse_1") {
      return "Warehouse 1";
    }

    if (warehouse === "warehouse_2") {
      return "Warehouse 2";
    }

    return "No activity";
  }

  /* =========================================================
     FORMAT TIMESTAMP
     ========================================================= */

  function formatTimestamp(timestamp: string | null) {
    if (!timestamp) {
      return "No activity";
    }

    return new Date(timestamp).toLocaleString();
  }

  /* =========================================================
     RESET USER PASSWORD
     ========================================================= */

  async function handleResetPassword(user: RegularUser) {

    const confirmed = window.confirm(
      `Send a password reset email to ${user.email}?`
    );

    if (!confirmed) return;

    const { error } = await supabase.auth.resetPasswordForEmail(
      user.email
    );

    if (error) {
      alert(`Could not send reset email: ${error.message}`);
      return;
    }

    alert(`Password reset email sent to ${user.email}.`);
  }

  /* =========================================================
     REMOVE USER

     IMPORTANT:
     This currently removes their PROFILE.

     It does NOT delete their Supabase Auth account.
     We'll handle complete account deletion separately because
     that needs secure server-side/admin functionality.
     ========================================================= */

  async function handleRemoveUser(user: RegularUser) {

    const confirmed = window.confirm(
      `Remove ${user.full_name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    if (error) {
      alert(`Could not remove user: ${error.message}`);
      return;
    }

    alert(`${user.full_name} has been removed.`);

    setSelectedUser(null);

    fetchRegularUsers();
  }

  /* =========================================================
     DELETE COLUMN FUNCTIONS
     ========================================================= */

  async function fetchColumns() {
    setLoadingColumns(true);

    const { data, error } = await supabase.rpc(
      "get_table_columns",
      {
        target_table: selectedTable,
      }
    );

    if (error) {
      setColumnsError(error.message);
    } else {

      const columnNames = (data ?? []).map(
        (c: any) => c.column_name
      );

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

    const { error } = await supabase.rpc(
      "admin_drop_column",
      {
        target_table: selectedTable,
        column_to_drop: columnToDelete,
      }
    );

    if (error) {
      alert(error.message);
    } else {
      fetchColumns();
    }
  }

  /* =========================================================
     MAIN PAGE
     ========================================================= */

  return (
    <main className="superPage">

      {/* ================= HEADER ================= */}

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

        {/* ================= SIDEBAR ================= */}

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

        {/* ================= CONTENT ================= */}

        <section
          className="content"
          style={{
            backgroundImage: `url(${background})`,
          }}
        >

          {/* ================= TOP ================= */}

          <div className="top">

            <button className="exportButton">
              Generate & Export
            </button>

            <button className="pullButton">
              Pull Out
            </button>

          </div>

          <div className="superGrid">

            {/* =================================================
                LEFT AREA
                ================================================= */}

            <div className="leftArea">

              {/* =================================================
                  REGULAR USER HISTORY
                  ================================================= */}

              <div className="usersCard">

                <div className="usersHeader">

                  <h2>Users</h2>

                  <input
                    type="text"
                    placeholder="Search by name or email"
                    className="userSearch"
                    value={userSearchTerm}
                    onChange={(e) =>
                      setUserSearchTerm(e.target.value)
                    }
                  />

                </div>

                <div className="userColumns">
                  <span>Name</span>
                  <span>Last Update</span>
                  <span>Timestamp</span>
                </div>

                {/* Loading */}

                {usersLoading && (
                  <p>Loading users...</p>
                )}

                {/* Error */}

                {usersError && (
                  <p>Error: {usersError}</p>
                )}

                {/* Users */}

                {!usersLoading &&
                  !usersError &&
                  filteredUsers.map((user) => (

                    <div
                      className="userRow"
                      key={user.id}
                      onClick={() =>
                        setSelectedUser(user)
                      }
                    >

                      <div>

                        <strong>
                          {user.full_name}
                        </strong>

                        <small>
                          {user.email}
                        </small>

                      </div>

                      <span>
                        {formatWarehouse(
                          user.last_warehouse
                        )}
                      </span>

                      <span>
                        {formatTimestamp(
                          user.last_updated
                        )}
                      </span>

                    </div>

                  ))}

                {/* No search result */}

                {!usersLoading &&
                  !usersError &&
                  filteredUsers.length === 0 && (

                    <p>No users found.</p>

                  )}

              </div>

              {/* =================================================
                  MONTHLY WAREHOUSE
                  Still placeholder for now
                  ================================================= */}

              <div className="monthlyCard">

                <div className="monthlyHeader">

                  <h2>
                    Monthly Warehouse
                  </h2>

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

            {/* =================================================
                RIGHT AREA
                ================================================= */}

            <div className="rightArea">

              {/* =================================================
                  USER INFORMATION
                  ================================================= */}

              <div className="userInfoCard">

                <h2>
                  User Information
                </h2>

                {selectedUser ? (

                  <>

                    <div className="infoBlock">

                      <h3>
                        {selectedUser.full_name}
                      </h3>

                      <p>
                        {selectedUser.email}
                      </p>

                      <p>
                        Last Update:{" "}
                        {formatTimestamp(
                          selectedUser.last_updated
                        )}
                      </p>

                    </div>

                    <div className="userActions">

                      <button
                        onClick={() =>
                          handleResetPassword(
                            selectedUser
                          )
                        }
                      >
                        Reset Password
                      </button>

                      <button
                        onClick={() =>
                          handleRemoveUser(
                            selectedUser
                          )
                        }
                      >
                        Remove User
                      </button>

                    </div>

                  </>

                ) : (

                  <div className="infoBlock">

                    <p>
                      Select a user to view
                      their information.
                    </p>

                  </div>

                )}

              </div>

              {/* =================================================
                  DELETE COLUMN
                  ================================================= */}

              <div className="delColCard">

                <h2>
                  Delete Column
                </h2>

                <div className="delColBlock">

                  <h3>
                    Warehouse Type
                  </h3>

                  <select
                    value={selectedTable}
                    onChange={(e) =>
                      setSelectedTable(
                        e.target.value as
                          | "warehouse_laptops"
                          | "warehouse_ce"
                      )
                    }
                  >

                    <option value="warehouse_laptops">
                      Warehouse 1: Laptops & Yubikey
                    </option>

                    <option value="warehouse_ce">
                      Warehouse 2: Computer Equipment
                    </option>

                  </select>

                </div>

                <div className="delColBlock">

                  <h3>
                    List of Columns
                  </h3>

                  {loadingColumns && (
                    <p>
                      Loading columns...
                    </p>
                  )}

                  {columnsError && (
                    <p>
                      Error: {columnsError}
                    </p>
                  )}

                  {!loadingColumns &&
                    !columnsError && (

                      <select
                        value={columnToDelete}
                        onChange={(e) =>
                          setColumnToDelete(
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          -- Select a column --
                        </option>

                        {columns.map((col) => (

                          <option
                            key={col}
                            value={col}
                          >
                            {col}
                          </option>

                        ))}

                      </select>

                    )}

                </div>

                <div className="userActions">

                  <button
                    onClick={
                      handleDeleteColumn
                    }
                  >
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