"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import { Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface User {
  user_id: number;
  first_name: string;
  email: string;
}

interface CommunicationSectionProps {
  clientId: number;
  planningId: number;
  evaluationId: number;
}

export default function CommunicationSection({
  clientId,
  planningId,
  evaluationId,
}: CommunicationSectionProps) {
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sendForm, setSendForm] = useState({
    message: "",
    communication_level: "info",
  });

  const loadUsers = useCallback(async () => {
    try {
      const res = await axios.post("/api/evaluation/mission/users");
      setAvailableUsers(res.data.data ?? []);
    } catch (err) {
      console.error("Failed to load users:", err);
      toast.error("Failed to load users.");
    }
  }, [clientId]);

  useEffect(() => {
    if (sendDialogOpen) {
      loadUsers();
    }
  }, [sendDialogOpen, loadUsers]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredUsers = availableUsers.filter((u) => {
    const alreadySelected = selectedUsers.some((s) => s.user_id === u.user_id);
    if (alreadySelected) return false;
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.first_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  });

  const addUser = (user: User) => {
    setSelectedUsers((prev) => [...prev, user]);
    setUserSearch("");
    setDropdownOpen(false);
  };

  const removeUser = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

  const resetForm = () => {
    setSendForm({ message: "", communication_level: "info" });
    setSelectedUsers([]);
    setUserSearch("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one recipient.");
      return;
    }
    if (!sendForm.message.trim()) {
      toast.error("Message is required.");
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("message", sendForm.message);
      formData.append("communication_level", sendForm.communication_level);
      formData.append("fk_client_id", String(clientId));
      formData.append("fk_planning_id", String(planningId));
      formData.append("fk_evaluation_id", String(evaluationId));

      selectedUsers.forEach((user) => {
        formData.append("communication_to[]", String(user.user_id));
      });

      const fileInput = fileInputRef.current;
      if (fileInput?.files?.[0]) {
        formData.append("communication_file", fileInput.files[0]);
      }

      await axios.post("/api/evaluation/mission/communication/add", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Communication sent successfully.");
      setSendDialogOpen(false);
      resetForm();
    } catch (err) {
      console.error("Send failed:", err);
      toast.error("Failed to send communication.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          resetForm();
          setSendDialogOpen(true);
        }}
        className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 h-8"
      >
        <Send className="h-4 w-4" />
        Add Communication
      </Button>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Send Communication</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                To{" "}
                <Badge variant="secondary" className="ml-1">
                  {selectedUsers.length} selected
                </Badge>
              </Label>

              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedUsers.map((user) => (
                    <Badge
                      key={user.user_id}
                      variant="secondary"
                      className="flex items-center gap-1 pl-2 pr-1 py-1"
                    >
                      <span className="text-xs">{user.first_name}</span>
                      <button
                        type="button"
                        onClick={() => removeUser(user.user_id)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="relative" ref={dropdownRef}>
                <Input
                  placeholder="Search users by name or email..."
                  value={userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                />
                {dropdownOpen && filteredUsers.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover shadow-md">
                    {filteredUsers.map((user) => (
                      <button
                        key={user.user_id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                        onClick={() => addUser(user)}
                      >
                        <span className="font-medium">{user.first_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {dropdownOpen && userSearch && filteredUsers.length === 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
                    No users found.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                rows={6}
                value={sendForm.message}
                onChange={(e) =>
                  setSendForm((p) => ({ ...p, message: e.target.value }))
                }
                placeholder="Type your message..."
              />
            </div>

            {/* Level */}
            <div className="space-y-2">
              <Label>Level</Label>
              <Select
                value={sendForm.communication_level}
                onValueChange={(val) =>
                  setSendForm((p) => ({ ...p, communication_level: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="danger">Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Upload File</Label>
              <Input type="file" ref={fileInputRef} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending}
              className="bg-violet-500 hover:bg-violet-600"
            >
              {sending ? "Sending..." : "Send"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}