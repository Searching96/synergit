import { useState } from "react";
import { authApi } from "../../services/api";
import { BookOpen } from "lucide-react";

interface AuthProps {
  onLoginSuccess: () => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await authApi.login({ username, password });
        localStorage.setItem('token', res.token);
        onLoginSuccess();
      } else {
        await authApi.register({ username, email, password });
        setIsLogin(true);
        setError('Registration successful! Please log in.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--surface-subtle)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-[var(--text-link)]">
          <BookOpen size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-[var(--text-primary)]">
          Synergit
        </h2>
        <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
          {isLogin ? 'Sign in to your account' : 'Create a new account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface-canvas)] py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className={`text-sm p-3 rounded-md ${error.includes('successful') ? 'bg-[var(--surface-success-subtle)] text-[var(--text-success)]' : 'bg-[var(--surface-danger-subtle)] text-[var(--text-danger)]'}`}>
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-[var(--border-input)] rounded-md shadow-sm focus:ring-[var(--ring-focus)] focus:border-[var(--border-focus)] sm:text-sm"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 appearance-none block w-full px-3 py-2 border border-[var(--border-input)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--ring-focus)] focus:border-[var(--border-focus)] sm:text-sm"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none block w-full px-3 py-2 border border-[var(--border-input)] rounded-md shadow-sm focus:outline-none focus:ring-[var(--ring-focus)] focus:border-[var(--border-focus)] sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-[var(--text-on-accent)] bg-[var(--accent-link)] hover:bg-[var(--accent-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--ring-focus)] disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign in' : 'Register')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button" // Adding type="button" prevents accidental form submissions
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
              }}
              className="text-sm font-medium text-[var(--text-link)] hover:text-[var(--text-link)]"
            >
              {isLogin ? "Don't have an account? Register" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
