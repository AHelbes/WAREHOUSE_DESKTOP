import { useState } from "react";
import "./login.css";
import logo from "../../assets/logo.png";
import background from "../../assets/background.png";

type LoginProps = {
  onLogin: () => void;
};

function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (username === "user1" && password === "testing") {
      setError("");
      onLogin();
    } else {
      setError("Invalid username or password");
    }
  };

  return (
    <main className="login">
      <header className="header">
        <img src={logo} alt="Adventus" className="logo" />
      </header>

      <section
        className="background"
        style={{ backgroundImage: `url(${background})` }}
      >
        <div className="backgroundOver"></div>

        <form className="loginCard" onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            className="loginInput"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="loginInput"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="loginError">{error}</p>}

          <button type="submit" className="loginButton">
            Login
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;