'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import {
  type ModuleEmailNotificationConfig,
  MAINTENANCE_EVENTS,
  AVAILABLE_ROLES,
} from '@/config/types/email-notification';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ModuleEmailNotificationConfigProps {
  ownerId: number;
  moduleName: string;
  companyEmailEnabled: boolean;
  events: Array<{ eventType: string; displayName: string; description: string; defaultRoles: string[] }>;
}

interface RoleDropdownProps {
  eventType: string;
  selectedRoles: string[];
  onToggleRole: (role: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function RoleDropdown({ eventType, selectedRoles, onToggleRole, disabled, loading }: RoleDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full sm:max-w-sm">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate text-left">
          {selectedRoles.length > 0 ? `${selectedRoles.length} role${selectedRoles.length > 1 ? 's' : ''} selected` : 'Select roles'}
        </span>
        <span className={`shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full rounded-md border border-input bg-popover shadow-md max-h-60 overflow-y-auto">
          {AVAILABLE_ROLES.map((role) => (
            <label
              key={role}
              htmlFor={`${eventType}-${role}`}
              className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-muted"
            >
              <Checkbox
                id={`${eventType}-${role}`}
                checked={selectedRoles.includes(role)}
                onCheckedChange={() => onToggleRole(role)}
                disabled={disabled}
              />
              <span>{role}</span>
            </label>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-2">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving...</span>
          </div>
        ) : selectedRoles.length > 0 ? (
          selectedRoles.map((role) => (
            <span
              key={role}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
            >
              {role}
              <button
                type="button"
                aria-label={`Remove ${role}`}
                disabled={disabled}
                onClick={() => onToggleRole(role)}
                className="text-muted-foreground/70 hover:text-foreground disabled:opacity-50"
              >
                ×
              </button>
            </span>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">No roles selected. No emails will be sent for this event.</span>
        )}
      </div>
    </div>
  );
}

export function ModuleEmailNotificationConfig({
  ownerId,
  moduleName,
  companyEmailEnabled,
  events,
}: ModuleEmailNotificationConfigProps) {
  const [configs, setConfigs] = useState<ModuleEmailNotificationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingEvent, setSavingEvent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConfigs();
  }, [ownerId, moduleName]);

  const fetchConfigs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `/api/settings/module-email-notifications?ownerId=${ownerId}&moduleName=${moduleName}`
      );
      if (!response.ok) throw new Error('Failed to fetch configurations');
      const data = await response.json();
      setConfigs(data.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (eventType: string, enabled: boolean) => {
    const config = getConfigForEvent(eventType);

    const updatedConfigs = configs.map(c =>
      c.event_type === eventType ? { ...c, is_enabled: enabled } : c
    );
    
    // If config doesn't exist in configs array, add it
    if (!configs.find(c => c.event_type === eventType)) {
      setConfigs([...updatedConfigs, { ...config, is_enabled: enabled }]);
    } else {
      setConfigs(updatedConfigs);
    }

    await saveConfig(eventType, {
      ...config,
      is_enabled: enabled,
    });
  };

  const handleRoleToggle = async (eventType: string, role: string) => {
    const config = getConfigForEvent(eventType);

    const updatedRoles = config.notification_roles.includes(role)
      ? config.notification_roles.filter(r => r !== role)
      : [...config.notification_roles, role];

    const updatedConfigs = configs.map(c =>
      c.event_type === eventType ? { ...c, notification_roles: updatedRoles } : c
    );
    
    // If config doesn't exist in configs array, add it
    if (!configs.find(c => c.event_type === eventType)) {
      setConfigs([...updatedConfigs, { ...config, notification_roles: updatedRoles }]);
    } else {
      setConfigs(updatedConfigs);
    }

    setSavingEvent(eventType);
    await saveConfig(eventType, {
      ...config,
      notification_roles: updatedRoles,
    });
    setSavingEvent(null);
  };

  const saveConfig = async (eventType: string, configData: Partial<ModuleEmailNotificationConfig>) => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/settings/module-email-notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId,
          moduleName,
          eventType,
          isEnabled: configData.is_enabled ?? false,
          notificationRoles: configData.notification_roles ?? [],
          notificationUserIds: configData.notification_user_ids ?? [],
        }),
      });

      if (!response.ok) throw new Error('Failed to save configuration');

      const data = await response.json();

      // Update local state with saved config
      setConfigs(prev => prev.map(c =>
        c.event_type === eventType ? data.data : c
      ));

      toast.success('Configuration saved successfully');
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message || 'Failed to save configuration');
      // Revert to original state on error
      fetchConfigs();
    } finally {
      setSaving(false);
    }
  };

  const getConfigForEvent = (eventType: string) => {
    return configs.find(c => c.event_type === eventType) || {
      config_id: 0,
      fk_owner_id: ownerId,
      module_name: moduleName,
      event_type: eventType,
      is_enabled: false,
      notification_roles: events.find(e => e.eventType === eventType)?.defaultRoles || [],
      notification_user_ids: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((_, i) => (
          <div key={i} className="h-24 sm:h-28 rounded-xl border bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!companyEmailEnabled) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Email notifications are disabled at the company level. Enable them in company settings to configure module-specific email notifications.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => {
          const config = getConfigForEvent(event.eventType);

          return (
            <Card key={event.eventType}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <CardTitle className="text-base">
                      {event.displayName}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {event.description}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={config.is_enabled}
                    onCheckedChange={(checked) => handleToggle(event.eventType, checked)}
                    disabled={saving}
                    className="self-start sm:self-auto shrink-0 data-[state=checked]:bg-green-600"
                  />
                </div>
              </CardHeader>
              {config.is_enabled && (
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Notify Roles</Label>
                    <RoleDropdown
                      eventType={event.eventType}
                      selectedRoles={config.notification_roles}
                      onToggleRole={(role) => handleRoleToggle(event.eventType, role)}
                      disabled={saving}
                      loading={savingEvent === event.eventType}
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {saving && (
        <div className="text-sm text-muted-foreground">
          Saving configuration...
        </div>
      )}
    </div>
  );
}