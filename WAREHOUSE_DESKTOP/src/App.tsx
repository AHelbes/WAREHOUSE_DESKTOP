import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

import Login from "./pages/Login/login";
import Warehouse1 from "./pages/Warehouse 1/warehouse1";
import Warehouse2 from "./pages/Warehouse 2/warehouse2";
import Warehouse3 from "./pages/Warehouse 3/warehouse3";
import Superuser from "./pages/Superuser/superuser";
import ResetPassword from "./pages/ResetPassword/resetPass";
import { supabase } from "./supabase/supabaseClient";

import "./App.css";

type Page =
  | "login"
  | "warehouse1"
  | "warehouse2"
  | "warehouse3"
  | "superuser"
  | "resetPassword";

type UserRole = "regular" | "superuser" | null;

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("login");

  // Stores the currently logged-in user's role
  const [userRole, setUserRole] = useState<UserRole>(null);

  /* =========================================================
     GET LOGGED-IN USER ROLE
     ========================================================= */

  async function fetchUserRole() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Could not get logged-in user.");
      setUserRole(null);
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(
        "Could not get user role:",
        profileError.message
      );

      setUserRole(null);
      return null;
    }

    const role = profile.role as UserRole;

    setUserRole(role);

    console.log("Logged-in user role:", role);

    return role;
  }

  /* =========================================================
     LOGIN
     ========================================================= */

  async function handleLogin() {
    const role = await fetchUserRole();

    // Both regular users and superusers start in Warehouse 1
    if (role === "regular" || role === "superuser") {
      setCurrentPage("warehouse1");
      return;
    }

    alert("Unable to determine your account role.");
    setCurrentPage("login");
  }

  /* =========================================================
     OPEN SUPERUSER PAGE
     ========================================================= */

  function handleOpenSuperuser() {
    if (userRole !== "superuser") {
      alert("You do not have permission to access Superuser Controls.");
      return;
    }

    setCurrentPage("superuser");
  }

  /* =========================================================
     LOGOUT / BACK TO LOGIN
     ========================================================= */

  async function handleBackToLogin() {
    await supabase.auth.signOut();

    setUserRole(null);
    setCurrentPage("login");
  }

  /* =========================================================
     PASSWORD RESET DEEP LINK
     ========================================================= */

  useEffect(() => {
    const unlistenPromise = listen<string>(
      "deep-link-received",
      async (event) => {
        const url = new URL(event.payload);

        const hashParams = new URLSearchParams(
          url.hash.substring(1)
        );

        const access_token =
          hashParams.get("access_token");

        const refresh_token =
          hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          const { error } =
            await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

          if (!error) {
            setCurrentPage("resetPassword");
          } else {
            console.error(
              "Failed to set session from deep link:",
              error.message
            );
          }
        }
      }
    );

    return () => {
      unlistenPromise.then((unlisten) =>
        unlisten()
      );
    };
  }, []);

  /* =========================================================
     PAGE DISPLAY
     ========================================================= */

  return (
    <>
      {/* ================= LOGIN ================= */}

      {currentPage === "login" && (
        <Login
          onLogin={handleLogin}
        />
      )}

      {/* ================= WAREHOUSE 1 ================= */}

      {currentPage === "warehouse1" && (
        <Warehouse1
        onBack={handleBackToLogin}
        onWarehouse2={() => setCurrentPage("warehouse2")}
        onWarehouse3={() => setCurrentPage("warehouse3")}
        onSuperuser={handleOpenSuperuser}
        isSuperuser={userRole === "superuser"}
      />
      )}

      {/* ================= WAREHOUSE 2 ================= */}

      {currentPage === "warehouse2" && (
        <Warehouse2
        onBack={handleBackToLogin}
        onWarehouse1={() => setCurrentPage("warehouse1")}
        onWarehouse3={() => setCurrentPage("warehouse3")}
        onSuperuser={handleOpenSuperuser}
        isSuperuser={userRole === "superuser"}
        />
      )}

      {/* ================= WAREHOUSE 3 ================= */}

      {currentPage === "warehouse3" && (
        <Warehouse3
        onBack={handleBackToLogin}
        onWarehouse1={() => setCurrentPage("warehouse1")}
        onWarehouse2={() => setCurrentPage("warehouse2")}
        onSuperuser={handleOpenSuperuser}
        isSuperuser={userRole === "superuser"}
        />
      )}

      {/* ================= SUPERUSER ================= */}

      {currentPage === "superuser" &&
        userRole === "superuser" && (
          <Superuser
          onBack={handleBackToLogin}
          onWarehouse1={() => setCurrentPage("warehouse1")}
          onWarehouse2={() => setCurrentPage("warehouse2")}
          onWarehouse3={() => setCurrentPage("warehouse3")}
        />
      )}

      {/* ================= RESET PASSWORD ================= */}

      {currentPage === "resetPassword" && (
        <ResetPassword
          onDone={() =>
            setCurrentPage("login")
          }
        />
      )}
    </>
  );
}

export default App;