import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import Login from "./pages/Login/login";
import Warehouse1 from "./pages/Warehouse 1/warehouse1";
import Warehouse2 from "./pages/Warehouse 2/warehouse2";
import Superuser from "./pages/Superuser/superuser";
import ResetPassword from "./pages/ResetPassword/resetPass";
import { supabase } from "./supabase/supabaseClient";

import "./App.css";

function App() {
  const [currentPage, setCurrentPage] = useState< 
  "login" | "warehouse1" | "warehouse2" | "superuser" | "resetPassword"
  >("login");

  useEffect(() => {
    // This runs once when the app starts. It sets up a listener that
    // waits for the Rust side to say "hey, a warehouse:// link was clicked."
    const unlistenPromise = listen<string>("deep-link-received", async (event) => {
      const url = new URL(event.payload);

      // The tokens live after the "#" in the link, e.g.
      // warehouse://reset-password#access_token=xxx&refresh_token=yyy
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (!error) {
          setCurrentPage("resetPassword");
        } else {
          console.error("Failed to set session from deep link:", error.message);
        }
      }
    });

    // Cleanup: stop listening if App ever unmounts
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

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

      {currentPage === "resetPassword" && (
        <ResetPassword
          onDone={() => setCurrentPage("login")}
        />
      )}
    </>
  );
}

export default App;