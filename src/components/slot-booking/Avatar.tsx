'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const AVATAR_TONES = [
  'bg-violet-500/15 text-violet-600',
  'bg-sky-500/15 text-sky-600',
  'bg-emerald-500/15 text-emerald-600',
  'bg-amber-500/15 text-amber-600',
  'bg-rose-500/15 text-rose-600',
  'bg-indigo-500/15 text-indigo-600',
];

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('') || '?';

/** Profile picture when the user has one, otherwise coloured initials (also if the image fails to load). */
export function Avatar({ person, size = 28 }: { person: { userId: number; name: string; avatarUrl?: string | null }; size?: number }) {
  const [failed, setFailed] = useState(false);
  // A new URL (e.g. after a refresh) deserves a new attempt.
  useEffect(() => setFailed(false), [person.avatarUrl]);

  if (person.avatarUrl && !failed) {
    return (
      <img
        src={person.avatarUrl}
        alt={person.name}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full object-cover"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className={cn('shrink-0 rounded-full inline-flex items-center justify-center text-[10px] font-semibold', AVATAR_TONES[person.userId % AVATAR_TONES.length])}
    >
      {initials(person.name)}
    </span>
  );
}
