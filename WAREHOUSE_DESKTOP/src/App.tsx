import { useState } from "react";
import Login from "./pages/Login/login";
import Warehouse from "./pages/Warehouse/warehouse";
import "./App.css";

function App() {
  const [currentPage, setCurrentPage] =
    useState<"login" | "warehouse">("login");

  return (
    <>
      {currentPage === "login" && (
        <Login onLogin={() => setCurrentPage("warehouse")} />
      )}

      {currentPage === "warehouse" && (
        <Warehouse onBack={() => setCurrentPage("login")} />
      )}
    </>
  );
}

export default App;