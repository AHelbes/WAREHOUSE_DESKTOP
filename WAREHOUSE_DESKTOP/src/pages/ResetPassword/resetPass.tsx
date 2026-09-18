import { useState, FormEvent } from "react";
import { supabase } from "../../supabase/supabaseClient";

type ResetPasswordProps = {
  onDone: () => void;
};

function ResetPassword({ onDone }: ResetPasswordProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    onDone(); // send them back to login once password is set
  };

  return (
    <main>
      <h2>Set a new password</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Save password"}
        </button>
      </form>
    </main>
  );
}

export default ResetPassword;