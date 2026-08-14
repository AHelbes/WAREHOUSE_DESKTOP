import "./warehouse1.css";
import logo from "../../assets/logo.png";
import background from "../../assets/bgWarehouse.png";

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
            <span>Computer Equpments</span>
          </button>

          <button className="sideItem">
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
                  <div className="tableRow"></div>
                  <div className="tableRow"></div>
                  <div className="tableRow"></div>
                  <div className="tableRow"></div>
                  <div className="tableRow"></div>
                  <div className="tableRow"></div>
                  <div className="tableRow"></div>
                  <div className="tableRow"></div>
                  <div className="tableRow"></div>
                  <div className="tableRow"></div>
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