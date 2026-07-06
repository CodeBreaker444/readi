'use client';

import { FeatureKey } from '@/lib/auth/feature-permissions-types';
import React from 'react';
import { usePermissions } from './PermissionsProvider';

interface FeatureGateProps {
  feature: FeatureKey;
  require: 'edit' | 'delete';
  children: React.ReactNode;
}

/** Renders children only if the current user's effective permission for `feature` allows `require`. */
export function FeatureGate({ feature, require, children }: FeatureGateProps) {
  const { canEdit, canDelete } = usePermissions();
  const allowed = require === 'delete' ? canDelete(feature) : canEdit(feature);
  if (!allowed) return null;
  return <>{children}</>;
}
