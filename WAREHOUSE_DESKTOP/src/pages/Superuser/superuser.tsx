import "./superuser.css";

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
          </div>
        </section>
      </div>
    </main>
  );
}
export default Superuser;