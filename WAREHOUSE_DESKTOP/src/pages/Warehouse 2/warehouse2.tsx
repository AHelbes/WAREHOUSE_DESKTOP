import "./warehouse2.css";
import logo from "../../assets/logo.png";
import background from "../../assets/bgWarehouse.png";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";

type Warehouse2Props = {
  onBack: () => void;
  onWarehouse1: () => void;
  onSuperuser: () => void;
};

/*This is a label for the data that is going to come in from supabase. These are the columns that will be presented.*/
type CeData = {
  id: string;
  hostname: string | null;
  equipment_type: string | null;
  serial_number: string | null;
  shelf: string | null;
  status: string | null;
};

function Warehouse2({
  onBack,
  onWarehouse1,
  onSuperuser,
}: Warehouse2Props) {
  /*Memory boxes. Ce is for the real rows, loading always starts true and lets user know the program is still loading, error starts null*/
    const [ce, setCe] = useState<CeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
  
    useEffect(() => {
      async function fetchCe() {
        const { data, error } = await supabase
          .from("warehouse_ce")
          .select("*")
          .order("hostname", { ascending: true });
  
        if (error) {
          setError(error.message);
        } else {
          setCe(data ?? []);
        }
        setLoading(false);
      }
  
      fetchCe();
    }, []);

  return (
    <main className="page">
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
          <button className="sideItem" onClick={onWarehouse1}>
            <span>Warehouse 1:</span>
            <span>Laptops & Yubikey</span>
          </button>

          <button className="sideItem active">
            Warehouse 2:
            <span>Computer Equipment</span>
          </button>

          <button
            className="sideItem"
            onClick={onSuperuser}
          >
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
                <div className="card">
                  <h2>Add/Remove Data Columns</h2>
                </div>

                <div className="card edit">
                  <h2>Edit Data</h2>
                </div>
              </div>

              <div className="table">
                <div className="tableTitle">
                  Warehouse
                </div>
                <div className="tableBody">
                  {loading && <div className="tableRow">Loading...</div>}
                  {error && <div className="tableRow">Error: {error}</div>}

                  {!loading && !error && ce.map((ce) => (
                    <div className="tableRow" key={ce.id}>
                      <span>{ce.hostname}</span>
                      <span>{ce.equipment_type}</span>
                      <span>{ce.serial_number}</span>
                      <span>{ce.shelf}</span>
                      <span>{ce.status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bottomButtons">
                <button>
                  Edit Data
                </button>
                <button>
                  Import Excel
                </button>
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
export default Warehouse2;