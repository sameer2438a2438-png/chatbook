import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToasts } from "../hooks/useToasts";
import { login } from "../services/auth";
import { errorMessage } from "../services/api";
import Spinner from "../components/Spinner";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { setSession } = useAuth();
  const { push } = useToasts();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await login({ email, password });
      setSession(res.access_token, res.user);
      push(`Welcome back, ${res.user.username}!`, "success");
      navigate("/");
    } catch (err) {
      push(errorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">ChatBook</h1>
            <p className="text-xs text-slate-400">Answers from your books only</p>
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold">Log in</h2>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? <Spinner className="h-4 w-4" /> : "Log in"}
          </button>
          <p className="text-center text-sm text-slate-500 dark:text-slate-400">
            No account?{" "}
            <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
              Register
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
