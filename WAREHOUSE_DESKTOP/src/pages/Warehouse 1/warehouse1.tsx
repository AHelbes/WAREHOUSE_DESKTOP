import "./warehouse1.css";
import logo from "../../assets/logo.png";
import background from "../../assets/bgWarehouse.png";
import { useEffect, useState } from "react";
import { supabase } from "../../supabase/supabaseClient";

type Warehouse1Props = {
  onBack: () => void;
  onWarehouse2: () => void;
  onSuperuser: () => void;
};

/*This is a label for the data that is going to come in from supabase. These are the columns that will be presented.*/
type LaptopData = {
  id: string;
  hostname: string | null;
  equipment_type: string | null;
  serial_number: string | null;
  shelf: string | null;
  status: string | null;
};

function Warehouse1({
  onBack,
  onWarehouse2,
  onSuperuser
}: Warehouse1Props) {
  /*Memory boxes. laptops is for the real rows, loading always starts true and lets user know the program is still loading, error starts null*/
  const [laptops, setLaptops] = useState<LaptopData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLaptops() {
      const { data, error } = await supabase
        .from("warehouse_laptops")
        .select("*")
        .order("hostname", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setLaptops(data ?? []);
      }
      setLoading(false);
    }

    fetchLaptops();
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

                  {!loading && !error && laptops.map((laptop) => (
                    <div className="tableRow" key={laptop.id}>
                      <span>{laptop.hostname}</span>
                      <span>{laptop.equipment_type}</span>
                      <span>{laptop.serial_number}</span>
                      <span>{laptop.shelf}</span>
                      <span>{laptop.status}</span>
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
export default Warehouse1;