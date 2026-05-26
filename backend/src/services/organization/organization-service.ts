import { supabase } from "@/backend/database/database";

export interface OrgNodeData {
  imageURL: string;
  name: string;
  email: string;
  title: string;
}

export interface OrgNodeOptions {
  nodeBGColor: string;
  nodeBGColorHover: string;
}

export interface OrgNode {
  id: string;
  data: OrgNodeData;
  options: OrgNodeOptions;
  children?: OrgNode[];
}

interface OrgUserRow {
  role_in_organization: string | null;
  users: {
    user_id: number;
    first_name: string | null;
    last_name: string | null;
    email: string;
    user_active: string | null;
    users_profile: {
      profile_picture: string | null;
    } | null;
  } | null;
}

const HOVER_PALETTE = [
  "#cdb4db", "#ffafcc", "#84a59d", "#00afb9",
  "#0081a7", "#f4a261", "#e76f51", "#2a9d8f",
  "#457b9d", "#e9c46a", "#a8dadc", "#06d6a0",
];

function roleToHoverColor(role: string): string {
  let hash = 0;
  for (let i = 0; i < role.length; i++) {
    hash = (hash * 31 + role.charCodeAt(i)) & 0xffffffff;
  }
  return HOVER_PALETTE[Math.abs(hash) % HOVER_PALETTE.length];
}

// Roles containing these keywords are classified as managers (Level 2)
const MANAGER_KEYWORDS = ["opm", "tm", "admin"];

function isManager(role: string): boolean {
  const lower = role.toLowerCase();
  return MANAGER_KEYWORDS.some((kw) => lower.includes(kw));
}

function rowToNode(row: OrgUserRow, idPrefix = ""): OrgNode {
  const role = row.role_in_organization ?? "Member";
  const u = row.users!;
  return {
    id: `${idPrefix}user_${u.user_id}`,
    data: {
      imageURL: u.users_profile?.profile_picture ?? "/assets/images/users/avatar-default.jpg",
      name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
      email: u.email ?? "",
      title: role,
    },
    options: {
      nodeBGColor: "#ffffff",
      nodeBGColorHover: roleToHoverColor(role),
    },
  };
}

async function verifyOwner(ownerId: number): Promise<string> {
  const { data, error } = await supabase
    .from("owner")
    .select("owner_id, owner_name")
    .eq("owner_id", ownerId)
    .single();

  if (error || !data) {
    throw new Error(
      `owner_id=${ownerId} does not exist in the owner table. ` +
      `This means the session is returning a wrong ownerId. ` +
      `Check getUserSession() — it should return the users.fk_owner_id value, not the user_id.`
    );
  }
  return (data.owner_name as string) ?? "Organisation";
}

export async function getOrganizationTree(ownerId: number): Promise<OrgNode> {

  const ownerName = await verifyOwner(ownerId);

  const { data, error } = await supabase
    .from("user_owner")
    .select(`
      role_in_organization,
      users!user_owner_fk_user_id_fkey (
        user_id,
        first_name,
        last_name,
        email,
        user_active,
        users_profile (
          profile_picture
        )
      )
    `)
    .eq("fk_owner_id", ownerId)
    .eq("is_active", true);

  if (error) {
    throw new Error(`Supabase query failed: ${error.message} (code: ${error.code})`);
  }

  if (!data || data.length === 0) {
    const { data: directUsers } = await supabase
      .from("users")
      .select("user_id, first_name, last_name, fk_owner_id")
      .eq("fk_owner_id", ownerId)
      .eq("user_active", "Y");

    const hint = directUsers && directUsers.length > 0
      ? `However, ${directUsers.length} user(s) have fk_owner_id=${ownerId} directly on the users table ` +
        `(e.g. user_id=${directUsers[0].user_id}). ` +
        `These users need rows in user_owner with fk_owner_id=${ownerId} and is_active=true. ` +
        `Run: INSERT INTO user_owner (fk_user_id, fk_owner_id, role_in_organization, is_active) ` +
        `SELECT user_id, fk_owner_id, user_role, true FROM users WHERE fk_owner_id=${ownerId} AND user_active='Y';`
      : `No users with fk_owner_id=${ownerId} found anywhere. Check the ownerId value.`;

    throw new Error(
      `No user_owner rows found for owner_id=${ownerId} (is_active=true). ${hint}`
    );
  }

  const rows = (data as unknown as OrgUserRow[]).filter(
    (r) => r.users !== null && r.users.user_active === "Y"
  );

  if (rows.length === 0) {
    throw new Error(
      `user_owner rows found for owner_id=${ownerId} but all joined users are inactive. Raw count: ${data.length}`
    );
  }

  // Level 1: Company root
  const companyRoot: OrgNode = {
    id: `company_${ownerId}`,
    data: {
      imageURL: "/assets/images/users/avatar-default.jpg",
      name: ownerName,
      email: "",
      title: "Company",
    },
    options: {
      nodeBGColor: "#ffffff",
      nodeBGColorHover: "#6366f1",
    },
  };

  // Level 2: Managers (role contains OPM or TM)
  // Level 3: Employees (PIC or any role without manager keyword)
  const managerRows = rows.filter((r) => isManager(r.role_in_organization ?? ""));
  const employeeRows = rows.filter((r) => !isManager(r.role_in_organization ?? ""));

  if (managerRows.length === 0) {
    // No managers found — employees are direct children of company
    const employeeNodes = employeeRows.map((r) => rowToNode(r));
    if (employeeNodes.length > 0) companyRoot.children = employeeNodes;
    return companyRoot;
  }

  // Build manager nodes (Level 2) each with employees as children (Level 3)
  const managerNodes: OrgNode[] = managerRows.map((r) => {
    const managerNode = rowToNode(r);
    if (employeeRows.length > 0) {
      // Prefix employee IDs with manager ID to keep React keys unique across the tree
      managerNode.children = employeeRows.map((er) => rowToNode(er, `${managerNode.id}_`));
    }
    return managerNode;
  });

  companyRoot.children = managerNodes;
  return companyRoot;
}

export function countNodes(node: OrgNode): number {
  return 1 + (node.children ?? []).reduce((s, c) => s + countNodes(c), 0);
}
