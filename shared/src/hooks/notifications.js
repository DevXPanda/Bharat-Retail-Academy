import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useClient, useAuth } from '../context/AppProviders.jsx';
import { useGet, useInvalidate } from './index.js';

// Sidebar sections are named after the portal route segment: /leads -> "leads", /app/payments -> "payments".
export function sectionFromPath(pathname = '') {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'app') parts.shift();
  return parts[0] || null;
}

/** Per-section notification state: `counts` for sidebar badges, `unread` = row ids not yet opened. */
export function useSectionNotifications() {
  const { user } = useAuth();
  const { data } = useGet('/notifications/sections', undefined, { enabled: Boolean(user), refetchInterval: 60000 });
  return { counts: data?.counts || {}, unread: data?.unread || {} };
}

/** Marks a section's sidebar badge as seen (the user opened the section). */
export function useMarkSectionSeen() {
  const client = useClient();
  const invalidate = useInvalidate();
  return useCallback(
    async (section) => {
      try {
        await client.patch(`/notifications/sections/${section}/seen`);
        await invalidate('/notifications');
      } catch {
        /* badge simply stays until the next refresh */
      }
    },
    [client, invalidate],
  );
}

/** For lists: highlight rows with unopened notifications and clear them once the user opens the row. */
export function useRowHighlight(sectionOverride) {
  const { pathname } = useLocation();
  const client = useClient();
  const invalidate = useInvalidate();
  const section = sectionOverride || sectionFromPath(pathname);
  const { unread } = useSectionNotifications();
  const ids = useMemo(() => new Set(((section && unread[section]) || []).map(String)), [section, unread]);

  const isUnread = useCallback((id) => ids.size > 0 && id != null && ids.has(String(id)), [ids]);
  const markRead = useCallback(
    async (id) => {
      if (!section || id == null || !ids.has(String(id))) return;
      try {
        await client.patch(`/notifications/sections/${section}/read`, { ref: String(id) });
        await invalidate('/notifications');
      } catch {
        /* highlight stays; user can retry by opening again */
      }
    },
    [client, invalidate, section, ids],
  );
  return { isUnread, markRead };
}
