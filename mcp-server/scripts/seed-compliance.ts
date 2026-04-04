import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// Load .env manually
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match) process.env[match[1]] = match[2];
    }
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
    console.log("Cleaning old test data...");
    const OWNER_ID = 5; // Updated to match OPM Organization
    const PILOT_ID = 91; // Prajwal
    const TOOL_ID = 404;

    // Ensure Prajwal is in the same Organization (Org 5)
    await supabase.from('users').update({ fk_owner_id: OWNER_ID }).eq('user_id', PILOT_ID);

    await supabase.from('pilot_mission').delete().eq('mission_code', 'MISSION-MNT-RISK');
    await supabase.from('pilot_mission').delete().eq('mission_code', 'MISSION-WIND-AUDIT');
    await supabase.from('pilot_mission').delete().eq('MISSION-AL-102', 'MISSION-AL-102'); // Fixed typo
    await supabase.from('pilot_mission').delete().eq('mission_code', 'MISSION-AL-102');
    await supabase.from('pilot_mission').delete().eq('mission_code', 'MISSION-PROC-FAIL');
    await supabase.from('maintenance_ticket').delete().eq('ticket_number', 'TICKET-009');
    await supabase.from('alert_log').delete().eq('alert_type', 'WIND_ALERT');

    console.log("Seeding Compliance Test Data...");

    // 1. Ensure Tool 404 exists
    const { error: toolError } = await supabase.from('tool').upsert({
        tool_id: TOOL_ID,
        tool_name: "DJI Matrice 300 RTK - Auditor Unit",
        tool_code: "DJI-M300-AUDIT",
        fk_tool_type_id: 1, // Added missing required field
        tool_active: 'Y',
        fk_owner_id: OWNER_ID
    });
    if (toolError) console.error("Tool Error:", toolError);

    // 2. Scenario 1: Altitude Violation
    const altitudeStartTime = new Date(Date.now() - 86400000).toISOString();
    const { error: m1Error } = await supabase.from('pilot_mission').upsert({
        mission_code: "MISSION-AL-102",
        mission_name: "Solar Panel Compliance Test",
        max_altitude: 142,
        status_name: "Completed",
        fk_pilot_user_id: PILOT_ID,
        fk_owner_id: OWNER_ID,
        scheduled_start: altitudeStartTime, // Added
        actual_start: altitudeStartTime,
        pre_flight_check_ok: true
    });
    if (m1Error) console.error("Mission 1 Error:", m1Error);

    // 3. Scenario 2: Weather Alert Violation
    const alertTime = new Date(Date.now() - 172800000); // 2 days ago
    const flightTime = new Date(alertTime.getTime() + 900000).toISOString(); // 15 mins after alert
    const { error: alertError } = await supabase.from('alert_log').upsert({
        alert_type: "WIND_ALERT",
        alert_severity: "HIGH",
        alert_message: "Severe wind detected in sector 4. Grounding advised.",
        alert_status: "OPEN",
        created_at: alertTime.toISOString()
    });
    if (alertError) console.error("Alert Error:", alertError);

    const { error: m2Error } = await supabase.from('pilot_mission').upsert({
        mission_code: "MISSION-WIND-AUDIT",
        mission_name: "Emergency Powerline Check",
        status_name: "Completed",
        fk_pilot_user_id: PILOT_ID,
        fk_owner_id: OWNER_ID,
        scheduled_start: flightTime, // Added
        actual_start: flightTime,
        pre_flight_check_ok: true
    });
    if (m2Error) console.error("Mission 2 Error:", m2Error);

    // 4. Scenario 3: Maintenance Risk
    const maintenanceTime = new Date().toISOString();
    const { error: ticketError } = await supabase.from('maintenance_ticket').upsert({
        ticket_number: "TICKET-009",
        ticket_title: "Major Motor Vibration - DO NOT FLY",
        ticket_priority: "high",
        ticket_status: "open",
        fk_tool_id: TOOL_ID,
        fk_owner_id: OWNER_ID,
        reported_at: new Date(Date.now() - 43200000).toISOString() // 12 hours ago
    });
    if (ticketError) console.error("Ticket Error:", ticketError);

    const { error: m3Error } = await supabase.from('pilot_mission').upsert({
        mission_code: "MISSION-MNT-RISK",
        mission_name: "Infrastructure Audit Flight",
        status_name: "Completed",
        fk_pilot_user_id: PILOT_ID,
        fk_tool_id: TOOL_ID,
        fk_owner_id: OWNER_ID,
        scheduled_start: maintenanceTime, // Added
        actual_start: maintenanceTime,
        pre_flight_check_ok: true
    });
    if (m3Error) console.error("Mission 3 Error:", m3Error);

    // 5. Scenario 4: Missing Pre-Flight Check
    const procTime = new Date(Date.now() - 3600000).toISOString();
    const { error: m4Error } = await supabase.from('pilot_mission').upsert({
        mission_code: "MISSION-PROC-FAIL",
        mission_name: "Mapping Mission No-Check",
        status_name: "Completed",
        fk_pilot_user_id: PILOT_ID,
        fk_owner_id: OWNER_ID,
        scheduled_start: procTime, // Added
        actual_start: procTime,
        pre_flight_check_ok: false // FAILED!
    });
    if (m4Error) console.error("Mission 4 Error:", m4Error);

    console.log("Done! Compliance data injected successfully.");
}

main().catch(console.error);
