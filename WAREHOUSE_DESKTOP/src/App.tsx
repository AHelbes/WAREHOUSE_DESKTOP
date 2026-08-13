import { useState } from "react";

import Login from "./pages/Login/login";
import Warehouse1 from "./pages/Warehouse 1/warehouse1";
import Warehouse2 from "./pages/Warehouse 2/warehouse2";
import Superuser from "./pages/Superuser/superuser";

import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState<
    "login" | "warehouse1" | "warehouse2" | "superuser"
  >("login");

  return (
    <>
      {currentPage === "login" && (
        <Login
          onLogin={() => setCurrentPage("warehouse1")}
        />
      )}

      {currentPage === "warehouse1" && (
        <Warehouse1
          onBack={() => setCurrentPage("login")}
          onWarehouse2={() => setCurrentPage("warehouse2")}
          onSuperuser={() => setCurrentPage("superuser")}
        />
      )}

      {currentPage === "warehouse2" && (
        <Warehouse2
          onBack={() => setCurrentPage("login")}
          onWarehouse1={() => setCurrentPage("warehouse1")}
          onSuperuser={() => setCurrentPage("superuser")}
        />
      )}

      {currentPage === "superuser" && (
        <Superuser
          onBack={() => setCurrentPage("login")}
          onWarehouse1={() => setCurrentPage("warehouse1")}
          onWarehouse2={() => setCurrentPage("warehouse2")}
        />
      )}
    </>
  );
}

export default App;