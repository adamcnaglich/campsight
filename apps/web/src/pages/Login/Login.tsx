import { FormEvent, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { useMe, type Me } from '../../hooks/useMe';
import { AuthCard, authStyles as styles } from '../../components/AuthCard';
import { Button } from '../../components/Button';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export const Login = () => {
  useDocumentTitle('Sign in');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: me } = useMe();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const from =
    (location.state as { from?: string } | null)?.from || '/dashboard';

  const login = useMutation({
    mutationFn: () => api.post<Me>('/api/auth/login', { email, password }),
    onSuccess: (user) => {
      // Drop anything cached for a previous account before entering the app.
      queryClient.clear();
      queryClient.setQueryData(['me'], user);
      navigate(from, { replace: true });
    },
  });

  if (me) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || login.isPending) return;
    login.mutate();
  };

  return (
    <AuthCard
      title="CampSight"
      subtitle="Sign in to watch campsites and get alerts when they open up."
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-email">
            Email
          </label>
          <input
            id="login-email"
            className={styles.input}
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="login-password">
            Password
          </label>
          <input
            id="login-password"
            className={styles.input}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {login.isError ? (
          <p className={styles.error} role="alert">
            {login.error instanceof Error
              ? login.error.message
              : 'Sign-in failed'}
          </p>
        ) : null}
        <Button type="submit" variant="primary" fullWidth disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className={styles.footer}>
        Accounts are by invitation. Ask the person who runs this site for a
        link.
      </p>
    </AuthCard>
  );
};
