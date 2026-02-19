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

const ROOT_KEYWORDS        = ["accountable", "ceo", "chief executive", "director general", "managing director", "president", "general manager", "head of", "administrator", "admin"];
const MID_MANAGER_KEYWORDS = ["operation", "operations", "ops manager"];
const LEAF_KEYWORDS        = ["pilot", "crew", "staff", "operator", "technician", "engineer", "commander"];

function matchesAny(role: string, keywords: string[]): boolean {
  const lower = role.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function rowToNode(row: OrgUserRow): OrgNode {
  const role = row.role_in_organization ?? "Member";
  const u    = row.users!;
  return {
    id: `user_${u.user_id}`,
    data: {
      imageURL: u.users_profile?.profile_picture ?? "/assets/images/users/avatar-default.jpg",
      name:     `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim(),
      email:    u.email ?? "",
      title:    role,
    },
    options: {
      nodeBGColor:      "#ffffff",
      nodeBGColorHover: roleToHoverColor(role),
    },
  };
}

async function verifyOwner(ownerId: number): Promise<void> {
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
}

export async function getOrganizationTree(ownerId: number): Promise<OrgNode> {

  await verifyOwner(ownerId);

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

  const byRole = new Map<string, OrgUserRow[]>();
  for (const row of rows) {
    const role = row.role_in_organization ?? "Member";
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role)!.push(row);
  }

  const allRoles = [...byRole.keys()];

  const rootRole =
    allRoles.find((r) => matchesAny(r, ROOT_KEYWORDS)) ??
    allRoles.reduce((a, b) =>
      byRole.get(a)!.length <= byRole.get(b)!.length ? a : b
    );

  const root: OrgNode = rowToNode(byRole.get(rootRole)![0]);

  const nonRootRoles    = allRoles.filter((r) => r !== rootRole);
  const midManagerRoles = nonRootRoles.filter((r) => matchesAny(r, MID_MANAGER_KEYWORDS));
  const leafRoles       = nonRootRoles.filter((r) => !midManagerRoles.includes(r) && matchesAny(r, LEAF_KEYWORDS));
  const directRoles     = nonRootRoles.filter((r) => !midManagerRoles.includes(r) && !leafRoles.includes(r));

  const midManagerNodes: OrgNode[] = midManagerRoles.flatMap((mmRole) =>
    byRole.get(mmRole)!.map((r) => {
      const node = rowToNode(r);
      const subs = leafRoles.flatMap((lr) => byRole.get(lr)!.map(rowToNode));
      if (subs.length > 0) node.children = subs;
      return node;
    })
  );

  const rootChildren: OrgNode[] = [
    ...directRoles.flatMap((role) => byRole.get(role)!.map(rowToNode)),
    ...midManagerNodes,
  ];

  if (rootChildren.length > 0) root.children = rootChildren;
  return root;
}

export function countNodes(node: OrgNode): number {
  return 1 + (node.children ?? []).reduce((s, c) => s + countNodes(c), 0);
}