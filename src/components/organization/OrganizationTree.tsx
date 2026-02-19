"use client";

import { OrgNode } from "@/backend/services/organization/organizatio-service";
import { useEffect, useRef, useState } from "react";

interface OrganizationTreeProps {
  data: OrgNode | null;
  isDark?: boolean;
}

export default function OrganizationTree({ data, isDark = false }: OrganizationTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeRef      = useRef<ApexTreeInstance | null>(null);
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && !!window.ApexTree
  );

  // Load ApexTree once
  useEffect(() => {
    if (window.ApexTree) { setScriptReady(true); return; }
    const script    = document.createElement("script");
    script.src      = "https://cdn.jsdelivr.net/npm/apextree";
    script.async    = true;
    script.onload   = () => setScriptReady(true);
    script.onerror  = () => console.error("ApexTree load failed");
    document.head.appendChild(script);
  }, []);

  // Render / re-render tree
  useEffect(() => {
    if (!scriptReady || !data || !containerRef.current || !window.ApexTree) return;

    if (treeRef.current?.destroy) {
      treeRef.current.destroy();
      treeRef.current = null;
    }
    containerRef.current.innerHTML = "";

    const bg          = isDark ? "#0f172a" : "#f8fafc";
    const card        = isDark ? "#1e293b" : "#ffffff";
    const border      = isDark ? "#334155" : "#e2e8f0";
    const textPrimary = isDark ? "#f1f5f9" : "#0f172a";
    const textSub     = isDark ? "#94a3b8" : "#64748b";
    const textMuted   = isDark ? "#475569" : "#94a3b8";
    const accent      = "#6366f1"; 

    const options: ApexTreeOptions = {
      contentKey:           "data",
      width:                "100%",
      height:               "100%",
      nodeWidth:            240,
      nodeHeight:           100,
      fontColor:            textPrimary,
      borderColor:          border,
      childrenSpacing:      70,
      siblingSpacing:       18,
      direction:            "top",
      enableExpandCollapse: true,
      enableToolbar:        true,
      canvasStyle:          `background:${bg}; border:none;`,
      nodeTemplate: (content: OrgNode["data"]) => {
        const initial = (content.name || content.title || "?")[0].toUpperCase();
        const hue     = stringToHue(content.title);
        const avatarBg = `hsl(${hue},60%,${isDark ? "30%" : "90%"})`;
        const avatarFg = `hsl(${hue},60%,${isDark ? "75%" : "35%"})`;

        return `
          <div style="
            display:flex; align-items:center; gap:10px;
            height:100%; padding:0 14px;
            background:${card};
            border-radius:12px;
            border:1px solid ${border};
            box-shadow: 0 1px 3px rgba(0,0,0,${isDark ? ".4" : ".06"}),
                        0 4px 12px rgba(0,0,0,${isDark ? ".3" : ".04"});
            transition: box-shadow .2s, transform .2s;
          ">
            <div style="
              width:38px; height:38px; border-radius:10px;
              background:${avatarBg}; color:${avatarFg};
              display:flex; align-items:center; justify-content:center;
              font-size:15px; font-weight:700; flex-shrink:0;
              font-family:'DM Mono', monospace;
            ">${escapeHtml(initial)}</div>
            <div style="flex:1; min-width:0;">
              <p style="
                margin:0 0 2px; font-size:11px; font-weight:600;
                text-transform:uppercase; letter-spacing:.06em;
                color:${accent}; white-space:nowrap;
                overflow:hidden; text-overflow:ellipsis;
              ">${escapeHtml(content.title)}</p>
              <p style="
                margin:0; font-size:13px; font-weight:500;
                color:${textPrimary}; white-space:nowrap;
                overflow:hidden; text-overflow:ellipsis;
              ">${escapeHtml(content.name) || "<span style='color:" + textMuted + "'>—</span>"}</p>
              <p style="
                margin:0; font-size:10px; color:${textSub};
                white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
              ">${escapeHtml(content.email) || ""}</p>
            </div>
          </div>`;
      },
    };

    const tree = new window.ApexTree(containerRef.current, options);
    tree.render(data);
    treeRef.current = tree;
  }, [scriptReady, data, isDark]);

  if (!data) return null;

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "640px",
        minHeight: "500px",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    />
  );
}

function stringToHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % 360;
}

function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface ApexTreeOptions {
  contentKey:           string;
  width:                string;
  height:               string;
  nodeWidth:            number;
  nodeHeight:           number;
  fontColor:            string;
  borderColor:          string;
  childrenSpacing:      number;
  siblingSpacing:       number;
  direction:            string;
  enableExpandCollapse: boolean;
  enableToolbar:        boolean;
  canvasStyle:          string;
  nodeTemplate:         (content: OrgNode["data"]) => string;
}

interface ApexTreeInstance {
  render:   (data: OrgNode) => void;
  destroy?: () => void;
}

declare global {
  interface Window {
    ApexTree: new (el: HTMLElement, options: ApexTreeOptions) => ApexTreeInstance;
  }
}

export function countVisible(node: OrgNode): number {
  return 1 + (node.children ?? []).reduce((s, c) => s + countVisible(c), 0);
}
export function countDepth(node: OrgNode, d = 1): number {
  if (!node.children?.length) return d;
  return Math.max(...node.children.map((c) => countDepth(c, d + 1)));
}