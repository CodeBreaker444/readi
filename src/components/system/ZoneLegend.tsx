'use client';

import { LINE_BUFFER_METERS, PERIMETER_COLOR, ZONE_COLORS } from '@/lib/operation-zones';
import { useTranslation } from 'react-i18next';

interface Props {
  isDark: boolean;
  /** Also explain the purple dot that marks the requested location (flight request map). */
  showWaypoint?: boolean;
}

/** Explains the colours used when operation zones are drawn on a map. Shared by the zones editor and flight requests. */
export function ZoneLegend({ isDark, showWaypoint = false }: Props) {
  const { t } = useTranslation();
  const muted = isDark ? 'text-slate-400' : 'text-gray-500';

  const items: { key: string; swatch: React.ReactNode; label: string; desc: string }[] = [
    {
      key: 'green',
      swatch: <span className="h-3.5 w-3.5 shrink-0 rounded-sm border-2" style={{ borderColor: ZONE_COLORS.green, background: `${ZONE_COLORS.green}40` }} />,
      label: t('systems.zones.legend.green', 'Green zone'),
      desc: t('systems.zones.legend.greenDesc', 'Surveyed area where flying is allowed.'),
    },
    {
      key: 'red',
      swatch: <span className="h-3.5 w-3.5 shrink-0 rounded-sm border-2" style={{ borderColor: ZONE_COLORS.red, background: `${ZONE_COLORS.red}40` }} />,
      label: t('systems.zones.legend.red', 'Red zone'),
      desc: t('systems.zones.legend.redDesc', 'No-fly area (also red lines and pins, within {{meters}} m). A location here is not allowed.', { meters: LINE_BUFFER_METERS }),
    },
    {
      key: 'gray',
      swatch: <span className="h-3.5 w-3.5 shrink-0 rounded-sm border-2" style={{ borderColor: ZONE_COLORS.unsurveyed, background: `${ZONE_COLORS.unsurveyed}40` }} />,
      label: t('systems.zones.legend.gray', 'Gray zone (unsurveyed)'),
      desc: t('systems.zones.legend.grayDesc', 'Area that has not been surveyed. Not cleared for flying.'),
    },
    {
      key: 'perimeter',
      swatch: <span className="h-0 w-5 shrink-0 border-t-[3px] border-dashed" style={{ borderColor: PERIMETER_COLOR }} />,
      label: t('systems.zones.legend.perimeter', 'Perimeter (dashed line)'),
      desc: t('systems.zones.legend.perimeterDesc', 'Outer operating boundary of the system. Outside it a location is not covered.'),
    },
  ];
  if (showWaypoint) {
    items.push({
      key: 'waypoint',
      swatch: <span className="h-3 w-3 shrink-0 rounded-full border-2 border-white" style={{ background: '#7c3aed', boxShadow: '0 0 0 2px rgba(124,58,237,0.35)' }} />,
      label: t('systems.zones.legend.waypoint', 'Requested location'),
      desc: t('systems.zones.legend.waypointDesc', 'The waypoint sent in the flight request.'),
    });
  }

  return (
    <div
      role="group"
      aria-label={t('systems.zones.legend.title', 'Map legend')}
      className={`mt-2 rounded-lg border px-3 py-2 ${isDark ? 'border-slate-700 bg-slate-800/40' : 'border-gray-200 bg-gray-50'}`}
    >
      <p className={`mb-1.5 text-[10px] font-semibold uppercase tracking-wide ${muted}`}>{t('systems.zones.legend.title', 'Map legend')}</p>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {items.map((it) => (
          <li key={it.key} className="flex items-start gap-2 text-xs">
            <span className="mt-0.5 flex w-5 justify-center">{it.swatch}</span>
            <span className={isDark ? 'text-slate-200' : 'text-gray-700'}>
              <span className="font-semibold">{it.label}</span>
              <span className={`block ${muted}`}>{it.desc}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
