"use client";

import { OrgNode } from "@/backend/services/organization/organization-service";
import { Maximize2, Minus, Plus } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface OrganizationTreeProps {
  data: OrgNode | null;
  isDark?: boolean;
}

function stringToHue(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h) % 360;
}

function resolveTitle(title: string): string {
  const lower = title.toLowerCase().trim();
  if (lower === "administrator" || lower === "admin") return "Accountable Manager";
  return title;
}

function NodeCard({
  node,
  isDark,
  hasChildren,
  expanded,
  onToggle,
}: {
  node: OrgNode;
  isDark: boolean;
  hasChildren: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const card        = isDark ? "#1e293b" : "#ffffff";
  const border      = isDark ? "#334155" : "#e2e8f0";
  const textPrimary = isDark ? "#f1f5f9" : "#0f172a";
  const textSub     = isDark ? "#94a3b8" : "#64748b";
  const accent      = "#6366f1";
  const title       = resolveTitle(node.data.title);
  const hue         = stringToHue(title);
  const avatarBg    = `hsl(${hue},60%,${isDark ? "30%" : "90%"})`;
  const avatarFg    = `hsl(${hue},60%,${isDark ? "75%" : "35%"})`;
  const initial     = (node.data.name || title || "?")[0].toUpperCase();

  return (
    <div style={{ position: "relative", width: 240 }}>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10,
          height: 84, padding: "0 14px",
          background: card,
          borderRadius: 12,
          border: `1px solid ${border}`,
          boxShadow: `0 1px 3px rgba(0,0,0,${isDark ? ".4" : ".06"}),
                      0 4px 12px rgba(0,0,0,${isDark ? ".3" : ".04"})`,
        }}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: avatarBg, color: avatarFg,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, fontWeight: 700, flexShrink: 0,
        }}>
          {initial}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: "0 0 2px", fontSize: 11, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: ".06em",
            color: accent, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {title}
          </p>
          <p style={{
            margin: 0, fontSize: 13, fontWeight: 500,
            color: textPrimary, whiteSpace: "nowrap",
            overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {node.data.name || "—"}
          </p>
          <p style={{
            margin: 0, fontSize: 10, color: textSub,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {node.data.email}
          </p>
        </div>
      </div>

      {hasChildren && (
        <button
          onClick={onToggle}
          style={{
            position: "absolute", bottom: -10, left: "50%",
            transform: "translateX(-50%)",
            width: 20, height: 20, borderRadius: "50%",
            background: accent,
            border: `2px solid ${isDark ? "#0f172a" : "#f8fafc"}`,
            color: "#fff", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 2, fontSize: 14, lineHeight: 1,
            boxShadow: "0 1px 4px rgba(0,0,0,.25)",
          }}
        >
          {expanded ? "−" : "+"}
        </button>
      )}
    </div>
  );
}

function TreeNode({ node, isDark }: { node: OrgNode; isDark: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const children    = node.children ?? [];
  const hasChildren = children.length > 0;
  const lineColor   = isDark ? "#334155" : "#cbd5e1";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <NodeCard
        node={node}
        isDark={isDark}
        hasChildren={hasChildren}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
      />

      {hasChildren && expanded && (
        <>
          <div style={{ width: 1, height: 28, background: lineColor }} />

          <div style={{ display: "flex", alignItems: "flex-start" }}>
            {children.map((child, i) => {
              const isFirst = i === 0;
              const isLast  = i === children.length - 1;
              const isOnly  = children.length === 1;

              return (
                <div
                  key={child.id}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    padding: "0 16px",
                    position: "relative",
                  }}
                >
                  {!isOnly && (
                    <div style={{
                      position: "absolute",
                      top: 0,
                      left:  isFirst ? "50%" : 0,
                      right: isLast  ? "50%" : 0,
                      height: 1,
                      background: lineColor,
                    }} />
                  )}
                  <div style={{ width: 1, height: 28, background: lineColor }} />
                  <TreeNode node={child} isDark={isDark} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.5;
const ZOOM_STEP = 0.15;

export default function OrganizationTree({ data, isDark = false }: OrganizationTreeProps) {
  const [scale, setScale]   = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanning           = useRef(false);
  const panStart            = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const [panning, setPanning] = useState(false);

  const bg      = isDark ? "#0f172a" : "#f8fafc";
  const toolbar = isDark ? "#1e293b" : "#ffffff";
  const tbBorder = isDark ? "#334155" : "#e2e8f0";
  const tbText  = isDark ? "#94a3b8" : "#64748b";

  const zoomIn      = () => setScale(s => Math.min(+(s + ZOOM_STEP).toFixed(2), MAX_SCALE));
  const zoomOut     = () => setScale(s => Math.max(+(s - ZOOM_STEP).toFixed(2), MIN_SCALE));
  const fitToScreen = () => { setScale(1); setOffset({ x: 0, y: 0 }); };

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) return;
    e.preventDefault();
    isPanning.current = true;
    setPanning(true);
    panStart.current = { mx: e.clientX, my: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setOffset({
      x: panStart.current.ox + (e.clientX - panStart.current.mx),
      y: panStart.current.oy + (e.clientY - panStart.current.my),
    });
  }, []);

  const onMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 2) { isPanning.current = false; setPanning(false); }
  }, []);

  const onMouseLeave = useCallback(() => {
    isPanning.current = false;
    setPanning(false);
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    setScale(s => Math.min(Math.max(+(s + delta).toFixed(2), MIN_SCALE), MAX_SCALE));
  }, []);

  if (!data) return null;

  const btnStyle: React.CSSProperties = {
    width: 30, height: 30, borderRadius: 8,
    background: toolbar,
    border: `1px solid ${tbBorder}`,
    color: tbText,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 1px 3px rgba(0,0,0,.08)",
    transition: "background .15s",
  };

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onWheel={onWheel}
      onContextMenu={e => e.preventDefault()}
      style={{
        position: "relative",
        width: "100%",
        height: 640,
        minHeight: 500,
        background: bg,
        borderRadius: 12,
        overflow: "hidden",
        cursor: panning ? "grabbing" : "default",
        userSelect: "none",
      }}
    >
      {/* Toolbar */}
      <div style={{
        position: "absolute", top: 12, right: 12, zIndex: 10,
        display: "flex", gap: 4,
        background: toolbar,
        border: `1px solid ${tbBorder}`,
        borderRadius: 10,
        padding: 4,
        boxShadow: "0 2px 8px rgba(0,0,0,.1)",
      }}>
        <button style={btnStyle} onClick={zoomIn} title="Zoom in">
          <Plus size={14} />
        </button>
        <button style={btnStyle} onClick={zoomOut} title="Zoom out">
          <Minus size={14} />
        </button>
        <button style={btnStyle} onClick={fitToScreen} title="Fit to screen">
          <Maximize2 size={13} />
        </button>
        <div style={{
          alignSelf: "center", padding: "0 6px",
          fontSize: 11, fontWeight: 600,
          color: tbText, minWidth: 36, textAlign: "center",
          borderLeft: `1px solid ${tbBorder}`,
        }}>
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Pan hint */}
      <div style={{
        position: "absolute", bottom: 12, left: 12, zIndex: 10,
        fontSize: 10, color: tbText,
        background: toolbar,
        border: `1px solid ${tbBorder}`,
        borderRadius: 6,
        padding: "3px 8px",
        opacity: 0.7,
      }}>
        Right-click drag to pan · Scroll to zoom
      </div>

      {/* Canvas */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0,
          width: "100%",
          transformOrigin: "top center",
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
          display: "flex",
          justifyContent: "center",
          paddingTop: 40,
          paddingBottom: 48,
          paddingLeft: 32,
          paddingRight: 32,
          pointerEvents: panning ? "none" : "auto",
        }}
      >
        <TreeNode node={data} isDark={isDark} />
      </div>
    </div>
  );
}

export function countVisible(node: OrgNode): number {
  return 1 + (node.children ?? []).reduce((s, c) => s + countVisible(c), 0);
}
export function countDepth(node: OrgNode, d = 1): number {
  if (!node.children?.length) return d;
  return Math.max(...node.children.map((c) => countDepth(c, d + 1)));
}
