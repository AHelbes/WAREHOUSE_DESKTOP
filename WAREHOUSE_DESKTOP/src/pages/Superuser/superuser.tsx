import "./superuser.css";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";

import logo from "../../assets/logo.png";
import background from "../../assets/bgWarehouse.png";

import Papa from "papaparse";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type SuperuserProps = {
  onBack: () => void;
  onWarehouse1: () => void;
  onWarehouse2: () => void;
  onWarehouse3: () => void;
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
  onWarehouse3,
}: SuperuserProps) {

  /* =========================================================
     REGULAR USER MANAGEMENT
     ========================================================= */
  const [regularUsers, setRegularUsers] = useState<RegularUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<RegularUser | null>(null);

  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);

  const [monthlySearchTerm, setMonthlySearchTerm] = useState("");

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
  setUsersError(null);

  const { data: profiles, error: profileError } =
    await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .in("role", ["regular", "superuser"])
      .order("full_name", { ascending: true });

  if (profileError) {
    setUsersError(profileError.message);
    setUsersLoading(false);
    return;
  }

  const usersWithActivity = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      const { data: activity, error: activityError } =
        await supabase
          .from("user_activity")
          .select(
            "warehouse, action, item_identifier, details, created_at"
          )
          .eq("user_id", profile.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle();

      if (activityError) {
        console.error(
          `Could not load activity for ${profile.email}:`,
          activityError
        );
      }

      return {
        ...profile,
        last_warehouse:
          activity?.warehouse ?? null,
        last_updated:
          activity?.created_at ?? null,
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
    const search = userSearchTerm
      .trim()
      .toLowerCase();

    return (
      String(user.full_name ?? "")
        .toLowerCase()
        .includes(search) ||
      String(user.email ?? "")
        .toLowerCase()
        .includes(search) ||
      String(user.role ?? "")
        .toLowerCase()
        .includes(search)
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
  ========================================================= */
  async function handleRemoveUser(user: RegularUser) {
  const {
    data: { user: currentUser },
    error: currentUserError,
  } = await supabase.auth.getUser();

  if (currentUserError || !currentUser) {
    alert("Could not verify the logged-in user.");
    return;
  }

  // Extra frontend protection.
  // The Edge Function also checks this securely.
  if (currentUser.id === user.id) {
    alert("You cannot remove your own account.");
    return;
  }

  const confirmed = window.confirm(
    `Remove ${user.full_name}?\n\nThis will permanently delete their account and cannot be undone.`
  );

  if (!confirmed) return;

  const { data, error } = await supabase.functions.invoke(
    "delete-user",
    {
      body: {
        userId: user.id,
      },
    }
  );

  if (error) {
    console.error("Delete user function error:", error);

    alert(
      `Could not remove user: ${error.message}`
    );

    return;
  }

  if (data?.error) {
    alert(`Could not remove user: ${data.error}`);
    return;
  }

  alert(
    data?.message ||
      `${user.full_name} has been removed.`
  );

  setSelectedUser(null);

  await fetchRegularUsers();
  }

  /* =========================================================
     MONTHLY WAREHOUSE
     ========================================================= */
  const [monthlyWarehouse, setMonthlyWarehouse] = useState<
    "warehouse_laptops" | "warehouse_ce"
  >("warehouse_laptops");

  const [monthlyMonth, setMonthlyMonth] = useState(
    new Date().getMonth() + 1
  );

  const [monthlyYear, setMonthlyYear] = useState(
    new Date().getFullYear()
  );

  const [monthlyRows, setMonthlyRows] = useState<
    Record<string, any>[]
  >([]);

  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [monthlyError, setMonthlyError] = useState<string | null>(null);

  async function fetchMonthlyWarehouse() {
    setMonthlyLoading(true);
    setMonthlyError(null);

    // First day of selected month
    const startDate = new Date(
      monthlyYear,
      monthlyMonth - 1,
      1
    );

    // First day of NEXT month
    const endDate = new Date(
      monthlyYear,
      monthlyMonth,
      1
    );

    const { data, error } = await supabase
      .from(monthlyWarehouse)
      .select("*")
      .gte("created_at", startDate.toISOString())
      .lt("created_at", endDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      setMonthlyError(error.message);
      setMonthlyRows([]);
    } else {
      setMonthlyRows(data ?? []);
    }

    setMonthlyLoading(false);
  }
  
  useEffect(() => {
    fetchMonthlyWarehouse();
  }, 
  [monthlyWarehouse, monthlyMonth, monthlyYear]);

  /* =========================================================
    SEARCH AND FILTER FUNCTION BAR
  ========================================================= */

  const filteredMonthlyRows = monthlyRows.filter((row) => {
    const search = monthlySearchTerm.trim().toLowerCase();
    
    if (!search) return true;

    return Object.entries(row).some(([key, value]) => {
      // Don't search internal/database-only fields
      if (
        key === "id" ||
        key === "created_by" ||
        key === "updated_by"
      ) {
        return false;
      }

      return String(value ?? "")
        .toLowerCase()
        .includes(search);
      });
    });

  /* =========================================================
     GENERATE AND EXPORT
     ========================================================= */

  function handleExportMonthlyCSV() {
  if (monthlyRows.length === 0) {
    alert("There are no units in the selected monthly warehouse.");
    return;
  }

  const warehouseName =
    monthlyWarehouse === "warehouse_laptops"
      ? "warehouse1"
      : "warehouse2";

  const cleanedRows = monthlyRows.map((row) => {
    const {
      id,
      created_by,
      updated_by,
      ...exportableFields
    } = row;

    return {
      ...exportableFields,
      qr_code:
        monthlyWarehouse === "warehouse_laptops"
          ? `warehouse_1:${id}`
          : `warehouse_2:${id}`,
    };
  });

  const csv = Papa.unparse(cleanedRows);

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;

  link.download =
    `${warehouseName}_${monthlyYear}_${String(monthlyMonth).padStart(
      2,
      "0"
    )}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
  }

  /* =========================================================
     GENERATE QR
     ========================================================= */

  async function generateMonthlyQRCode(
  row: Record<string, any>
) {
  if (!row.id) return null;

  const warehousePrefix =
    monthlyWarehouse === "warehouse_laptops"
      ? "warehouse_1"
      : "warehouse_2";

  try {
    return await QRCode.toDataURL(
      `${warehousePrefix}:${row.id}`,
      {
        width: 400,
        margin: 2,
      }
    );
  } catch (error) {
    console.error("QR generation failed:", error);
    return null;
  }
  }

  /* =========================================================
     EXPORT PDF FILE
     ========================================================= */

  async function handleExportMonthlyPDF() {
  if (monthlyRows.length === 0) {
    alert("There are no units in the selected monthly warehouse.");
    return;
  }

  const warehouseLabel =
    monthlyWarehouse === "warehouse_laptops"
      ? "Warehouse 1"
      : "Warehouse 2";

  const monthName = new Date(
    monthlyYear,
    monthlyMonth - 1
  ).toLocaleString("default", {
    month: "long",
  });

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  pdf.setFontSize(18);

  pdf.text(
    `${warehouseLabel} - ${monthName} ${monthlyYear}`,
    14,
    15
  );

  pdf.setFontSize(10);

  pdf.text(
    `Generated: ${new Date().toLocaleString()}`,
    14,
    22
  );

  const ignoredColumns = [
    "id",
    "created_by",
    "updated_by",
  ];

  const exportColumns = Object.keys(
    monthlyRows[0]
  ).filter(
    (column) => !ignoredColumns.includes(column)
  );

  autoTable(pdf, {
    startY: 28,

    head: [
      [
        ...exportColumns,
        "QR Identifier",
      ],
    ],

    body: monthlyRows.map((row) => [
      ...exportColumns.map((column) =>
        String(row[column] ?? "")
      ),

      `${
        monthlyWarehouse === "warehouse_laptops"
          ? "warehouse_1"
          : "warehouse_2"
      }:${row.id}`,
    ]),

    styles: {
      fontSize: 6,
    },

    headStyles: {
      fontSize: 6,
    },
  });

  /* =========================================================
   QR LABEL PAGES - 4 COLUMNS x 4 ROWS
   16 QR CODES MAXIMUM PER PAGE
   ========================================================= */

const qrColumns = 4;
const qrRows = 4;
const qrPerPage = qrColumns * qrRows; // 16

// Start QR labels on a fresh portrait page
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

for (let i = 0; i < monthlyRows.length; i++) {
  const row = monthlyRows[i];

  // Create a new page after every 16 QR codes
  if (i > 0 && i % qrPerPage === 0) {
    pdf.addPage("a4", "portrait");
  }

  const positionOnPage = i % qrPerPage;

  const column =
    positionOnPage % qrColumns;

  const gridRow =
    Math.floor(positionOnPage / qrColumns);

  const cellX =
    marginX + column * cellWidth;

  const cellY =
    marginY + gridRow * cellHeight;

  const centerX =
    cellX + cellWidth / 2;

  /* -------------------------
     GENERATE QR CODE
     ------------------------- */

  const qr =
    await generateMonthlyQRCode(row);

  if (!qr) continue;

  /* -------------------------
     QR POSITION
     ------------------------- */

  const qrX =
    centerX - qrSize / 2;

  const qrY =
    cellY + 3;

  pdf.addImage(
    qr,
    "PNG",
    qrX,
    qrY,
    qrSize,
    qrSize
  );

  /* -------------------------
     INFORMATION UNDER QR
     ------------------------- */

  let textY =
    qrY + qrSize + 4;

  // HOSTNAME
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

  // CHECKED BY
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

  // RACK & BAY
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

  // DATE
  textY += 3.5;

  const dateValue =
    row.created_at
      ? new Date(
          row.created_at
        ).toLocaleDateString()
      : "-";

  pdf.text(
    `Date: ${dateValue}`,
    centerX,
    textY,
    {
      align: "center",
      maxWidth: cellWidth - 4,
    }
  );
  }  

  const warehouseFile =
    monthlyWarehouse === "warehouse_laptops"
      ? "warehouse1"
      : "warehouse2";

  pdf.save(
    `${warehouseFile}_${monthlyYear}_${String(
      monthlyMonth
    ).padStart(2, "0")}.pdf`
  );
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
          value={monthlySearchTerm}
          onChange={(e) => setMonthlySearchTerm(e.target.value)}
        />

      </header>

      <div className="body">

        {/* ================= SIDEBAR ================= */}

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

          <button
            className="sideItem"
            onClick={onWarehouse3}
          >
            <span>Warehouse 3:</span>
            <span>Yubikeys</span>
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

            <button
              className="exportButton"
              onClick={handleExportMonthlyPDF}
              disabled={monthlyRows.length === 0}              
            >
              Export PDF
            </button>
            
            <button
              className="exportButton"
              onClick={handleExportMonthlyCSV}
              disabled={monthlyRows.length === 0}
            >
              Export CSV
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
                  <span>Last Warehouse Update</span>
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
                          {user.role === "superuser"
                            ? "Superuser"
                            : "Regular User"}
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

              <div className="monthlyCard">
                <div className="monthlyHeader">
                  <h2>Monthly Warehouse</h2>
                  {/* Warehouse */}
                  <select
                    value={monthlyWarehouse}
                    onChange={(e) =>
                      setMonthlyWarehouse(
                        e.target.value as
                          | "warehouse_laptops"
                          | "warehouse_ce"
                        )
                      }
                      >
                        <option value="warehouse_laptops">
                          Warehouse 1
                        </option>
                        
                        <option value="warehouse_ce">
                          Warehouse 2
                        </option>
                  </select>
                  
                  {/* Month */}
                  <select
                    value={monthlyMonth}
                    onChange={(e) =>
                      setMonthlyMonth(Number(e.target.value))
                    }
                    >
                      <option value={1}>January</option>
                      <option value={2}>February</option>
                      <option value={3}>March</option>
                      <option value={4}>April</option>
                      <option value={5}>May</option>
                      <option value={6}>June</option>
                      <option value={7}>July</option>
                      <option value={8}>August</option>
                      <option value={9}>September</option>
                      <option value={10}>October</option>
                      <option value={11}>November</option>
                      <option value={12}>December</option>
                  </select>
                  
                  {/* Year */}
                  <select
                    value={monthlyYear}
                    onChange={(e) =>
                      setMonthlyYear(Number(e.target.value))
                    }
                    >
                      <option value={2025}>2025</option>
                      <option value={2026}>2026</option>
                      <option value={2027}>2027</option>
                  </select>
                </div>
                
                {/* Loading */}
                {monthlyLoading && (
                  <p>Loading warehouse...</p>
                )}
                
                {/* Error */}
                {monthlyError && (
                  <p>Error: {monthlyError}</p>
                )}
                
                {/* Results */}
                {!monthlyLoading && !monthlyError && (
                  <div className="monthlyTable">
                    <div className="monthlyTableHeader">
                      <span>Hostname</span>
                      <span>Equipment</span>
                      <span>Serial Number</span>
                      <span>Date Added</span>
                    </div>
                    
                    {filteredMonthlyRows.map((row) => (
                    
                    <div
                      className="monthlyTableRow"
                      key={row.id}
                      >
                    
                      <span>
                        {row.hostname || "—"}
                      </span>
                      <span>
                        {row.equipment_type || "—"}
                      </span>
                      <span>
                        {row.serial_number || "—"}
                      </span>
                      <span>
                        {row.created_at
                          ? new Date(
                            row.created_at
                          ).toLocaleDateString()
                        : "—"}
                      </span>
                    </div>
                  ))}
                  
                  {filteredMonthlyRows.length === 0 && (
                    <p className="monthlyEmpty">
                      {monthlyRows.length === 0
                        ? "No units found for this month."
                        : "No units match your search."
                      }
                    </p>
                    )}
                  </div>
                )}
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
                        Email Address: {selectedUser.email}
                      </p>

                      <p>
                        Last Seen: {" "}
                        {formatTimestamp(
                          selectedUser.last_updated
                        )}
                      </p>

                    </div>
                    {/*
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
                    */}
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