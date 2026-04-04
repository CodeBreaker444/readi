import { Role, UserSession } from "./types";
import {
    PROFILE_TO_ROLE,
    ROLE_ALLOWED_TABLES,
    BLOCKED_COLUMNS
} from "./constants";

export {
    PROFILE_TO_ROLE,
    ROLE_ALLOWED_TABLES,
    BLOCKED_COLUMNS
};

export type { UserSession, Role };

export const ALL_ROLES = Object.values(PROFILE_TO_ROLE);
