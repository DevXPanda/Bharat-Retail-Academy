import { useRef, useState } from 'react';
import { Camera, Loader2, PenSquare } from 'lucide-react';
import { Avatar, Button, ChangePasswordModal, ChatCenter, Field, Input, PageHeader, Select, StatusBadge, Textarea, formatDate, useAction, useAuth, useClient } from './ui.js';

export function Messages() {
  const [newChat, setNewChat] = useState(false);
  const tabs = [{ key: 'all', label: 'All', countKey: 'all' }, { key: 'unread', label: 'Unread', countKey: 'unread' }, { key: 'starred', label: 'Starred', countKey: 'starred' }, { key: 'archived', label: 'Archived', countKey: 'archived' }];
  return (
    <>
      <PageHeader title="Messages" subtitle="Ask your teachers a question or contact support." actions={<Button size="lg" icon={PenSquare} onClick={() => setNewChat(true)}>New Message</Button>} />
      <ChatCenter tabs={tabs} newChatOpen={newChat} onNewChatClose={() => setNewChat(false)} height="calc(100vh - 260px)" />
    </>
  );
}

export function Profile() {
  const client = useClient();
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ name: user.name, phone: user.phone || '', gender: user.gender || '', location: user.location || '', about: user.about || '', avatar: user.avatar || '' });
  const [passwordOpen, setPasswordOpen] = useState(false);
  const photoInput = useRef(null);
  const [upload, setUpload] = useState({ loading: false, progress: 0, error: '' });
  const changePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUpload({ loading: false, progress: 0, error: 'Choose a JPG, PNG or WebP image.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUpload({ loading: false, progress: 0, error: 'Choose an image smaller than 2 MB.' });
      return;
    }
    setUpload({ loading: true, progress: 0, error: '' });
    try {
      const photo = await client.upload('image', file, (progress) => setUpload((current) => ({ ...current, progress })));
      setForm((current) => ({ ...current, avatar: photo.url }));
      setUpload({ loading: false, progress: 0, error: '' });
    } catch (error) {
      setUpload({ loading: false, progress: 0, error: error.message || 'Photo upload failed. Please try again.' });
    }
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = useAction(() => {
    const body = { name: form.name.trim() };
    ['phone', 'gender', 'location', 'about', 'avatar'].forEach((k) => { if (form[k] !== '') body[k] = form[k]; });
    return client.patch('/auth/me', body);
  }, { success: 'Profile updated', onSuccess: () => refreshUser() });

  return (
    <>
      <PageHeader title="My Profile" subtitle="Update your personal details and password." />
      <section className="student-panel student-profile">
        <header className="student-profile-header">
          <div className="student-profile-identity">
            <div className="student-avatar-editor">
              <button type="button" className="student-avatar-button" aria-label="Change profile photo" title="Change photo (JPG, PNG or WebP, max 2 MB)" aria-describedby={upload.error ? 'student-avatar-error' : undefined} aria-busy={upload.loading} disabled={upload.loading || save.loading} onClick={() => photoInput.current?.click()}>
                <Avatar name={user.name} src={form.avatar} size={64} />
                <span className="student-avatar-camera">{upload.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}</span>
              </button>
              <input ref={photoInput} type="file" hidden accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" onChange={changePhoto} />
              <span role="status" className="sr-only">{upload.loading ? `Uploading photo ${upload.progress}%` : ''}</span>
            </div>
            <div className="min-w-0">
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <div className="student-profile-meta"><StatusBadge status={user.status} />{user.studentCode && <span>{user.studentCode}</span>}<span>Joined {formatDate(user.createdAt)}</span></div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setPasswordOpen(true)}>Change password</Button>
        </header>
        {upload.error && <p id="student-avatar-error" className="student-avatar-error" role="alert">{upload.error}</p>}
        <form onSubmit={(event) => { event.preventDefault(); if (!save.loading && !upload.loading && form.name.trim().length >= 2) save.run(); }}>
          <div className="student-profile-content">
            <h3 className="student-profile-section-title">Personal information</h3>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Field label="Full name" required><Input name="name" autoComplete="name" required minLength={2} value={form.name} onChange={(event) => set('name', event.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={user.email} disabled /></Field>
              <Field label="Mobile number"><Input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(event) => set('phone', event.target.value)} /></Field>
              <Field label="Gender"><Select value={form.gender} onChange={(event) => set('gender', event.target.value)}><option value="">Prefer not to say</option><option>Male</option><option>Female</option><option>Other</option></Select></Field>
              <Field label="Location" className="xl:col-span-2"><Input name="location" autoComplete="address-level2" value={form.location} onChange={(event) => set('location', event.target.value)} placeholder="City, Country" /></Field>
              <Field label="About" className="md:col-span-2 xl:col-span-3"><Textarea rows={4} value={form.about} onChange={(event) => set('about', event.target.value)} placeholder="A little about yourself" /></Field>
            </div>
          </div>
          <footer className="student-profile-actions"><Button type="submit" loading={save.loading} disabled={upload.loading || form.name.trim().length < 2}>Save changes</Button></footer>
        </form>
      </section>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}
