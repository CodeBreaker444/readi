import {
  buildTicketEmailTitle,
  buildTicketTitle,
  getTicketComponentIds,
  getTicketedComponentIds,
  hasSystemLevelTicket,
  hasTicketCoverageConflict,
  mergeResetComponentIds,
} from '@/backend/services/system/maintenance-ticket-rules';
import {
  buildAlertContent,
  collectAlertItems,
  extractNotifiedComponentIds,
  filterNotYetNotified,
} from '@/backend/services/system/maintenance-alert-logic';
import type { MaintenanceDrone } from '@/config/types/maintenance';

const ticket = (primary: number | null, items: number[] = []) => ({
  fk_component_id: primary,
  maintenance_ticket_item: items.map((id) => ({ fk_component_id: id })),
});

describe('ticket coverage conflicts', () => {
  it('no open tickets -> never a conflict', () => {
    expect(hasTicketCoverageConflict([], [])).toBe(false);
    expect(hasTicketCoverageConflict([], [1])).toBe(false);
  });
  it('system-level new ticket conflicts with any open ticket', () => {
    expect(hasTicketCoverageConflict([ticket(1)], [])).toBe(true);
  });
  it('open system-level ticket blocks everything', () => {
    expect(hasTicketCoverageConflict([ticket(null)], [5])).toBe(true);
  });
  it('different components are allowed, overlapping ones are not', () => {
    expect(hasTicketCoverageConflict([ticket(1, [1, 2])], [3])).toBe(false);
    expect(hasTicketCoverageConflict([ticket(1, [1, 2])], [3, 2])).toBe(true);
  });
  it('a conflict in a later open ticket is still found', () => {
    expect(hasTicketCoverageConflict([ticket(1), ticket(null)], [9])).toBe(true);
  });
});

describe('which components reset on close', () => {
  it('dedupes primary + items', () => {
    expect(getTicketComponentIds(ticket(1, [1, 2]))).toEqual([1, 2]);
  });
  it('component ticket resets only its components', () => {
    const t = [ticket(1, [1, 2])];
    expect(hasSystemLevelTicket(t)).toBe(false);
    expect(mergeResetComponentIds(getTicketedComponentIds(t), [])).toEqual([1, 2]);
  });
  it('system-level ticket resets all system components', () => {
    const t = [ticket(null)];
    expect(hasSystemLevelTicket(t)).toBe(true);
    expect(mergeResetComponentIds(getTicketedComponentIds(t), [4, 5, 6])).toEqual([4, 5, 6]);
  });
});

describe('ticket titles', () => {
  it('saved title lists all components, email title only the first (known quirk)', () => {
    expect(buildTicketTitle(7, [3, 5])).toBe('Component Maintenance - #3, #5');
    expect(buildTicketEmailTitle(7, [3, 5])).toBe('Component Maintenance - #3');
    expect(buildTicketTitle(7, [])).toBe('Maintenance - System #7');
    expect(buildTicketEmailTitle(7, undefined)).toBe('Maintenance - System #7');
  });
});

describe('maintenance alert logic', () => {
  const model = { factory_serie: null, factory_model: null, maintenance_cycle_hour: 0, maintenance_cycle_flight: 0, maintenance_cycle_day: 0 };
  const comp = (id: number, status: any, trigger: (string | null)[] = []) => ({
    tool_component_id: id, component_name: `C${id}`, component_type: null, serial_number: null,
    last_maintenance: null, activation_date: null, total_hours: 0, total_flights: 0, total_days: 0,
    status, trigger, model,
  });
  const drone = { tool_id: 1, code: 'D-1', components: [comp(1, 'OK'), comp(2, 'ALERT', ['HOUR', null, null]), comp(3, 'DUE', [null, 'FLIGHT', 'DAY']), comp(4, 'IN_MAINTENANCE')] } as unknown as MaintenanceDrone;

  it('only ALERT and DUE components generate alerts', () => {
    const items = collectAlertItems([drone]);
    expect(items.map((i) => i.tool_component_id)).toEqual([2, 3]);
    expect(items[1].triggers).toEqual(['FLIGHT', 'DAY']);
  });
  it('already-notified components are skipped (one alert per component per day)', () => {
    const items = collectAlertItems([drone]);
    expect(filterNotYetNotified(items, new Set([2])).map((i) => i.tool_component_id)).toEqual([3]);
  });
  it('reads component ids from notification_data safely', () => {
    const ids = extractNotifiedComponentIds([
      { notification_data: { component_id: 5 } },
      { notification_data: { component_id: '6' } },
      { notification_data: null },
    ]);
    expect([...ids]).toEqual([5]);
  });
  it('builds DUE and ALERT wording', () => {
    const [alert, due] = collectAlertItems([drone]);
    expect(buildAlertContent(alert)).toMatchObject({ isDue: false, title: 'Maintenance Alert — D-1' });
    expect(buildAlertContent(alert).message).toContain('approaching');
    expect(buildAlertContent(due)).toMatchObject({ isDue: true, title: 'Maintenance Required — D-1' });
    expect(buildAlertContent(due).message).toContain('flight, day');
  });
});
