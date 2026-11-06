import { FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import type { Me } from '../../hooks/useMe';
import { AuthCard, authStyles as styles } from '../../components/AuthCard';
import { Button } from '../../components/Button';
import { Loader } from '../../components/Loader';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

interface InviteInfo {
  email: string;
  expiresAt: string;
}

export const Invite = () => {
  useDocumentTitle('Create your account');
  const { token = '' } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [mismatch, setMismatch] = useState(false);

  const invite = useQuery<InviteInfo>({
    queryKey: ['invite', token],
    queryFn: () => api.get(`/api/auth/invite/${encodeURIComponent(token)}`),
    retry: false,
  });

  const accept = useMutation({
    mutationFn: () =>
      api.post<Me>(`/api/auth/invite/${encodeURIComponent(token)}`, {
        displayName,
        password,
      }),
    onSuccess: (user) => {
      queryClient.clear();
      queryClient.setQueryData(['me'], user);
      navigate('/dashboard', { replace: true });
    },
  });

  if (invite.isLoading) {
    return <Loader />;
  }

  if (invite.isError || !invite.data) {
    return (
      <AuthCard
        title="Invite not valid"
        subtitle="This link has expired or was already used. Ask for a new one."
      >
        <p className={styles.footer}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </AuthCard>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (accept.isPending) return;
    if (password !== confirm) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    accept.mutate();
  };

  return (
    <AuthCard
      title="Welcome to CampSight"
      subtitle="Choose a password to finish creating your account."
    >
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <span className={styles.label}>Email</span>
          <span className={styles.readonly}>{invite.data.email}</span>
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="invite-name">
            Name (optional)
          </label>
          <input
            id="invite-name"
            className={styles.input}
            type="text"
            autoComplete="name"
            maxLength={80}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="invite-password">
            Password
          </label>
          <input
            id="invite-password"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="invite-confirm">
            Confirm password
          </label>
          <input
            id="invite-confirm"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {mismatch ? (
          <p className={styles.error} role="alert">
            The two passwords don't match
          </p>
        ) : null}
        {accept.isError ? (
          <p className={styles.error} role="alert">
            {accept.error instanceof Error
              ? accept.error.message
              : 'Could not create the account'}
          </p>
        ) : null}
        <Button type="submit" variant="primary" fullWidth disabled={accept.isPending}>
          {accept.isPending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthCard>
  );
};
