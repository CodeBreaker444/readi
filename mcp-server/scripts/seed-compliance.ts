import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { prisma } from "../../src/lib/prisma";

// Load .env manually
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
        const match = line.match(/^\s*([\w.]+)\s*=\s*"?(.+?)"?\s*$/);
        if (match) process.env[match[1]] = match[2];
    }
}

async function main() {
    console.log("Cleaning old test data...");
    const OWNER_ID = 5; // Updated to match OPM Organization
    const PILOT_ID = 91; // Prajwal
    const TOOL_ID = 404;

    // Ensure Prajwal is in the same Organization (Org 5)
    await prisma.public_users.update({
        where: { user_id: PILOT_ID },
        data: { fk_owner_id: OWNER_ID },
    });

    await prisma.pilot_mission.deleteMany({ where: { mission_code: 'MISSION-MNT-RISK' } });
    await prisma.pilot_mission.deleteMany({ where: { mission_code: 'MISSION-WIND-AUDIT' } });
    await prisma.pilot_mission.deleteMany({ where: { mission_code: 'MISSION-AL-102' } });
    await prisma.pilot_mission.deleteMany({ where: { mission_code: 'MISSION-PROC-FAIL' } });
    await prisma.maintenance_ticket.deleteMany({ where: { ticket_number: 'TICKET-009' } });
    await prisma.alert_log.deleteMany({ where: { alert_type: 'WIND_ALERT' } });

    console.log("Seeding Compliance Test Data...");

    // 1. Ensure Tool 404 exists (use raw SQL to allow explicit tool_id override)
    await prisma.$executeRaw`
        INSERT INTO tool (tool_id, tool_name, tool_code, tool_active, fk_owner_id)
        VALUES (${TOOL_ID}, ${'DJI Matrice 300 RTK - Auditor Unit'}, ${'DJI-M300-AUDIT'}, ${'Y'}, ${OWNER_ID})
        ON CONFLICT (tool_id) DO UPDATE SET
            tool_name = EXCLUDED.tool_name,
            tool_code = EXCLUDED.tool_code,
            tool_active = EXCLUDED.tool_active,
            fk_owner_id = EXCLUDED.fk_owner_id
    `;

    // 2. Scenario 1: Altitude Violation
    const altitudeStartTime = new Date(Date.now() - 86400000);
    await prisma.$executeRaw`
        INSERT INTO pilot_mission (mission_code, mission_name, max_altitude, status_name, fk_pilot_user_id, fk_owner_id, scheduled_start, actual_start, pre_flight_check_ok)
        VALUES (${'MISSION-AL-102'}, ${'Solar Panel Compliance Test'}, ${142}, ${'Completed'}, ${PILOT_ID}, ${OWNER_ID}, ${altitudeStartTime}, ${altitudeStartTime}, ${true})
        ON CONFLICT (mission_code) DO UPDATE SET
            mission_name = EXCLUDED.mission_name,
            max_altitude = EXCLUDED.max_altitude,
            status_name = EXCLUDED.status_name,
            fk_pilot_user_id = EXCLUDED.fk_pilot_user_id,
            fk_owner_id = EXCLUDED.fk_owner_id,
            scheduled_start = EXCLUDED.scheduled_start,
            actual_start = EXCLUDED.actual_start,
            pre_flight_check_ok = EXCLUDED.pre_flight_check_ok
    `;

    // 3. Scenario 2: Weather Alert Violation
    const alertTime = new Date(Date.now() - 172800000); // 2 days ago
    const flightTime = new Date(alertTime.getTime() + 900000); // 15 mins after alert

    await prisma.alert_log.create({
        data: {
            alert_type: 'WIND_ALERT',
            alert_severity: 'HIGH',
            alert_message: 'Severe wind detected in sector 4. Grounding advised.',
            alert_status: 'OPEN',
            created_at: alertTime,
        },
    });

    await prisma.$executeRaw`
        INSERT INTO pilot_mission (mission_code, mission_name, status_name, fk_pilot_user_id, fk_owner_id, scheduled_start, actual_start, pre_flight_check_ok)
        VALUES (${'MISSION-WIND-AUDIT'}, ${'Emergency Powerline Check'}, ${'Completed'}, ${PILOT_ID}, ${OWNER_ID}, ${flightTime}, ${flightTime}, ${true})
        ON CONFLICT (mission_code) DO UPDATE SET
            mission_name = EXCLUDED.mission_name,
            status_name = EXCLUDED.status_name,
            fk_pilot_user_id = EXCLUDED.fk_pilot_user_id,
            fk_owner_id = EXCLUDED.fk_owner_id,
            scheduled_start = EXCLUDED.scheduled_start,
            actual_start = EXCLUDED.actual_start,
            pre_flight_check_ok = EXCLUDED.pre_flight_check_ok
    `;

    // 4. Scenario 3: Maintenance Risk
    const maintenanceTime = new Date();
    await prisma.maintenance_ticket.upsert({
        where: { ticket_number: 'TICKET-009' },
        create: {
            ticket_number: 'TICKET-009',
            ticket_title: 'Major Motor Vibration - DO NOT FLY',
            ticket_priority: 'high',
            ticket_status: 'open',
            fk_tool_id: TOOL_ID,
            fk_owner_id: OWNER_ID,
            reported_at: new Date(Date.now() - 43200000),
        },
        update: {
            ticket_title: 'Major Motor Vibration - DO NOT FLY',
            ticket_priority: 'high',
            ticket_status: 'open',
            fk_tool_id: TOOL_ID,
            fk_owner_id: OWNER_ID,
        },
    });

    await prisma.$executeRaw`
        INSERT INTO pilot_mission (mission_code, mission_name, status_name, fk_pilot_user_id, fk_tool_id, fk_owner_id, scheduled_start, actual_start, pre_flight_check_ok)
        VALUES (${'MISSION-MNT-RISK'}, ${'Infrastructure Audit Flight'}, ${'Completed'}, ${PILOT_ID}, ${TOOL_ID}, ${OWNER_ID}, ${maintenanceTime}, ${maintenanceTime}, ${true})
        ON CONFLICT (mission_code) DO UPDATE SET
            mission_name = EXCLUDED.mission_name,
            status_name = EXCLUDED.status_name,
            fk_pilot_user_id = EXCLUDED.fk_pilot_user_id,
            fk_tool_id = EXCLUDED.fk_tool_id,
            fk_owner_id = EXCLUDED.fk_owner_id,
            scheduled_start = EXCLUDED.scheduled_start,
            actual_start = EXCLUDED.actual_start,
            pre_flight_check_ok = EXCLUDED.pre_flight_check_ok
    `;

    // 5. Scenario 4: Missing Pre-Flight Check
    const procTime = new Date(Date.now() - 3600000);
    await prisma.$executeRaw`
        INSERT INTO pilot_mission (mission_code, mission_name, status_name, fk_pilot_user_id, fk_owner_id, scheduled_start, actual_start, pre_flight_check_ok)
        VALUES (${'MISSION-PROC-FAIL'}, ${'Mapping Mission No-Check'}, ${'Completed'}, ${PILOT_ID}, ${OWNER_ID}, ${procTime}, ${procTime}, ${false})
        ON CONFLICT (mission_code) DO UPDATE SET
            mission_name = EXCLUDED.mission_name,
            status_name = EXCLUDED.status_name,
            fk_pilot_user_id = EXCLUDED.fk_pilot_user_id,
            fk_owner_id = EXCLUDED.fk_owner_id,
            scheduled_start = EXCLUDED.scheduled_start,
            actual_start = EXCLUDED.actual_start,
            pre_flight_check_ok = EXCLUDED.pre_flight_check_ok
    `;

    console.log("Done! Compliance data injected successfully.");
}

main().catch(console.error);
