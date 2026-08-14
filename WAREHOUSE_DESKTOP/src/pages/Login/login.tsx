import { useState, FormEvent } from "react";
import "./login.css";
import logo from "../../assets/logo.png";
import background from "../../assets/background.png";
import { supabase } from "../../supabase/supabaseClient";

type LoginProps = {
  onLogin: () => void;
};

function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      console.error("Login error:", error.message);
      setError("Invalid username or password");
      setPassword("");
      return;
    }

    onLogin();
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
            type="email"
            name="email"
            placeholder="Username"
            className="loginInput"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            className="loginInput"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="loginError">{error}</p>}

          <button type="submit" className="loginButton" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;


