"use client";

import { Button } from "@/components/ui/button";
import { MessageSquarePlus } from "lucide-react";

interface CommunicationButtonProps {
  c_id: number;
  p_id: number;
  e_id: number;
}

export default function CommunicationButton({
  c_id,
  p_id,
  e_id,
}: CommunicationButtonProps) {
  const handleNewCommunication = async () => {
    try {
      const res = await fetch("/api/evaluation/planning/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pic_id: 0,
          client_id: c_id,
          planning_id: p_id,
          evaluation_id: e_id,
        }),
      });
      if (res.ok) {
        alert("Communication created successfully.");
      }
    } catch (err) {
      console.error("Communication failed:", err);
    }
  };

  return (
    <Button size="sm" onClick={handleNewCommunication}>
      <MessageSquarePlus className="mr-1 h-4 w-4" />
      New Communication
    </Button>
  );
}