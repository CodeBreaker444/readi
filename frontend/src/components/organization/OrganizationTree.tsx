'use client';

import { OrganizationNode } from "@/src/config/types";

interface TreeNodeProps {
  node: OrganizationNode;
  level?: number;
}

function TreeNode({ node, level = 0 }: TreeNodeProps) {
  return (
    <div className="tree-node" style={{ marginLeft: level * 30 }}>
      <div className="card mb-2 shadow-sm">
        <div className="card-body py-2">
          <div className="d-flex align-items-center">
            <div className="me-3">
              <div
                className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                style={{ width: 40, height: 40, fontSize: 18, fontWeight: 'bold' }}
              >
                {node.name.charAt(0)}
              </div>
            </div>
            <div>
              <h6 className="mb-0">{node.name}</h6>
              {node.title && (
                <small className="text-muted">{node.title}</small>
              )}
              {node.department && (
                <span className="badge bg-light text-dark ms-2">
                  {node.department}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      {node.children && node.children.length > 0 && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

interface OrganizationTreeProps {
  data: OrganizationNode;
}

export default function OrganizationTree({ data }: OrganizationTreeProps) {
  return (
    <div className="organization-tree">
      <style jsx>{`
        .organization-tree {
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }
        .tree-node {
          position: relative;
        }
        .tree-children {
          border-left: 2px solid #dee2e6;
          padding-left: 20px;
          margin-left: 20px;
        }
      `}</style>
      <TreeNode node={data} />
    </div>
  );
}