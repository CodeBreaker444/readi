'use client';

import { AccessLevel, FeatureKey, canDeleteFeature, canEditFeature } from '@/lib/auth/feature-permissions-types';
import axios from 'axios';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface PermissionsContextValue {
  loading: boolean;
  isManager: boolean;
  access: (feature: FeatureKey) => AccessLevel | null;
  canEdit: (feature: FeatureKey) => boolean;
  canDelete: (feature: FeatureKey) => boolean;
}

const PermissionsContext = createContext<PermissionsContextValue>({
  loading: true,
  isManager: false,
  access: () => null,
  canEdit: () => false,
  canDelete: () => false,
});

interface PermissionsProviderProps {
  children: React.ReactNode;
  /** Skip fetching (e.g. on auth pages, or before a session exists). */
  enabled?: boolean;
}

export function PermissionsProvider({ children, enabled = true }: PermissionsProviderProps) {
  const [permissions, setPermissions] = useState<Partial<Record<FeatureKey, AccessLevel | null>>>({});
  const [isManager, setIsManager] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    axios.get('/api/permissions/me').then((res) => {
      if (cancelled) return;
      if (res.data?.code === 1) {
        setPermissions(res.data.data.permissions ?? {});
        setIsManager(res.data.data.isManager ?? false);
      }
    }).catch(() => {
      // Fail closed: an empty map means every feature resolves to no-access.
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [enabled]);

  const value: PermissionsContextValue = {
    loading,
    isManager,
    access: (feature) => permissions[feature] ?? null,
    canEdit: (feature) => canEditFeature(permissions[feature]),
    canDelete: (feature) => canDeleteFeature(permissions[feature], isManager),
  };

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
