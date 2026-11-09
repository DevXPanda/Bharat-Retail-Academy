import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, KeyRound, LogOut, User } from 'lucide-react';
import { useAuth, useClient } from '../../context/AppProviders.jsx';
import { useAction } from '../../hooks/index.js';
import { Avatar } from '../ui/Display.jsx';
import { Button } from '../ui/Button.jsx';
import { Field, Input } from '../ui/Form.jsx';
import { Modal } from '../ui/Overlay.jsx';
import { Popover } from '../ui/Popover.jsx';

export function ChangePasswordModal({ open, onClose }) {
  const client = useClient();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const { run, loading } = useAction(() => client.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword }), {
    success: 'Password updated',
    onSuccess: () => {
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
      onClose();
    },
  });

  const submit = () => {
    if (form.newPassword.length < 8) return setError('New password must be at least 8 characters');
    if (form.newPassword !== form.confirm) return setError('Passwords do not match');
    setError('');
    return run();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Change password"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={submit}>Update password</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Current password" required>
          <Input type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} autoComplete="current-password" />
        </Field>
        <Field label="New password" required>
          <Input type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password" required error={error}>
          <Input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" />
        </Field>
      </div>
    </Modal>
  );
}

export function ProfileMenu({ profilePath, roleLabel }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const subtitle = roleLabel || user.teacher?.designation || user.role;

  return (
    <>
      <Popover
        width={220}
        trigger={
          <button type="button" className="flex items-center gap-3 rounded-xl py-1 pl-2 pr-1 hover:bg-slate-50">
            <Avatar name={user.name} src={user.avatar} size={40} />
            <span className="hidden text-left leading-tight sm:block">
              <span className="block text-sm font-bold text-ink">{user.name}</span>
              <span className="block max-w-[140px] truncate text-xs capitalize text-slate-500">{subtitle}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
        }
      >
        {(close) => (
          <ul className="py-1.5 text-[13px]">
            {profilePath && (
              <li>
                <button type="button" onClick={() => { close(); navigate(profilePath); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50">
                  <User className="h-4 w-4 text-slate-500" /> My profile
                </button>
              </li>
            )}
            <li>
              <button type="button" onClick={() => { close(); setPasswordOpen(true); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 hover:bg-slate-50">
                <KeyRound className="h-4 w-4 text-slate-500" /> Change password
              </button>
            </li>
            <li>
              <button type="button" onClick={() => { close(); logout(); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-red-600 hover:bg-red-50">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </li>
          </ul>
        )}
      </Popover>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}
