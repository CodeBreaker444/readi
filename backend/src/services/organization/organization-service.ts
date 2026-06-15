import { prisma } from '@/lib/prisma';
import { getChartOverrides } from "./chart-override-service";

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
  userId?: number; // raw DB user_id; undefined for the company root
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

function rowToNode(row: OrgUserRow): OrgNode {
  const role = row.role_in_organization ?? "Member";
  const u = row.users!;
  return {
    id: `user_${u.user_id}`,
    userId: u.user_id,
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
  const owner = await prisma.owner.findUnique({
    where: { owner_id: ownerId },
    select: { owner_id: true, owner_name: true },
  });
  if (!owner) {
    throw new Error(
      `owner_id=${ownerId} does not exist in the owner table. ` +
      `This means the session is returning a wrong ownerId. ` +
      `Check getUserSession() — it should return the users.fk_owner_id value, not the user_id.`
    );
  }
  return owner.owner_name ?? "Organisation";
}

export async function getOrganizationTree(ownerId: number): Promise<OrgNode> {

  const ownerName = await verifyOwner(ownerId);

  const data = await prisma.user_owner.findMany({
    where: { fk_owner_id: ownerId, is_active: true },
    select: {
      role_in_organization: true,
      users: {
        select: {
          user_id: true,
          first_name: true,
          last_name: true,
          email: true,
          user_active: true,
          users_profile: {
            select: { profile_picture: true },
          },
        },
      },
    },
  });

  if (data.length === 0) {
    const directUsers = await prisma.public_users.findMany({
      where: { fk_owner_id: ownerId, user_active: 'Y' },
      select: { user_id: true, first_name: true, last_name: true, fk_owner_id: true },
    });

    const hint = directUsers.length > 0
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

  // Build flat node map: userId → OrgNode
  const nodeMap = new Map<number, OrgNode>();
  for (const row of rows) {
    const node = rowToNode(row);
    nodeMap.set(row.users!.user_id, node);
  }

  const overrides = await getChartOverrides(ownerId);
  const overrideMap = new Map<number, number | null>(
    overrides.map((o) => [o.user_id, o.parent_user_id])
  );

  // Determine parent for each user
  const childrenOf = new Map<string, OrgNode[]>();
  const addChild = (parentId: string, child: OrgNode) => {
    if (!childrenOf.has(parentId)) childrenOf.set(parentId, []);
    childrenOf.get(parentId)!.push(child);
  };

  for (const [userId, node] of nodeMap) {
    if (overrideMap.has(userId)) {
      const parentUserId = overrideMap.get(userId)!;
      if (parentUserId === null) {
        addChild(companyRoot.id, node);
      } else {
        addChild(`user_${parentUserId}`, node);
      }
    } else {
      // Role-based default: managers under company, others under first manager
      if (isManager(node.data.title)) {
        addChild(companyRoot.id, node);
      } else {
        const firstManager = [...nodeMap.values()].find((n) => isManager(n.data.title));
        addChild(firstManager?.id ?? companyRoot.id, node);
      }
    }
  }

  // Recursively attach collected children
  const attachChildren = (node: OrgNode) => {
    const kids = childrenOf.get(node.id) ?? [];
    if (kids.length > 0) {
      node.children = kids;
      kids.forEach(attachChildren);
    }
  };
  attachChildren(companyRoot);

  return companyRoot;
}

export function countNodes(node: OrgNode): number {
  return 1 + (node.children ?? []).reduce((s, c) => s + countNodes(c), 0);
}

export function flattenNodes(node: OrgNode): OrgNode[] {
  return [node, ...(node.children ?? []).flatMap(flattenNodes)];
}
