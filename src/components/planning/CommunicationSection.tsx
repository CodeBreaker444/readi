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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
      toast.error(t("planning.communication.loadUsersError"));
    }
  }, [t]);

  useEffect(() => {
    if (sendDialogOpen) loadUsers();
  }, [sendDialogOpen, loadUsers]);

  const addUser = (user: User) => {
    setSelectedUsers((prev) => [...prev, user]);
    setUserSearch("");
    setDropdownOpen(false);
  };

  const removeUser = (userId: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

  const handleSend = async () => {
    if (selectedUsers.length === 0) {
      toast.error(t("planning.communication.recipientRequired"));
      return;
    }
    if (!sendForm.message.trim()) {
      toast.error(t("planning.communication.messageRequired"));
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
      selectedUsers.forEach((u) => formData.append("communication_to[]", String(u.user_id)));

      if (fileInputRef.current?.files?.[0]) {
        formData.append("communication_file", fileInputRef.current.files[0]);
      }

      await axios.post("/api/evaluation/mission/communication/add", formData);
      toast.success(t("planning.communication.sendSuccess"));
      setSendDialogOpen(false);
      setSendForm({ message: "", communication_level: "info" });
      setSelectedUsers([]);
    } catch (err) {
      toast.error(t("planning.communication.sendFailed"));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => setSendDialogOpen(true)}
        className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5 h-8"
      >
        <Send className="h-4 w-4" />
        {t("planning.communication.newCommunication")}
      </Button>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("planning.communication.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                {t("planning.communication.to")}{" "}
                <Badge variant="secondary" className="ml-1">
                  {selectedUsers.length} {t("planning.communication.selected")}
                </Badge>
              </Label>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedUsers.map((user) => (
                  <Badge key={user.user_id} variant="secondary" className="flex items-center gap-1">
                    <span className="text-xs">{user.first_name}</span>
                    <X className="h-3 w-3 cursor-pointer" onClick={() => removeUser(user.user_id)} />
                  </Badge>
                ))}
              </div>

              <div className="relative" ref={dropdownRef}>
                <Input
                  placeholder={t("planning.communication.searchUsers")}
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setDropdownOpen(true); }}
                />
                {dropdownOpen && userSearch && (
                  <div className="absolute z-50 mt-1 w-full border bg-popover rounded-md shadow-md">
                    {availableUsers.filter(u => u.first_name.toLowerCase().includes(userSearch.toLowerCase())).map(user => (
                      <button key={user.user_id} className="w-full text-left px-3 py-2 text-sm hover:bg-accent" onClick={() => addUser(user)}>
                        {user.first_name} ({user.email})
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("planning.communication.message")}</Label>
              <Textarea
                rows={4}
                value={sendForm.message}
                onChange={(e) => setSendForm(p => ({ ...p, message: e.target.value }))}
                placeholder={t("planning.communication.typeMessage")}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("planning.communication.level")}</Label>
              <Select value={sendForm.communication_level} onValueChange={(val) => setSendForm(p => ({ ...p, communication_level: val }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">{t("planning.communication.info")}</SelectItem>
                  <SelectItem value="warning">{t("planning.communication.warning")}</SelectItem>
                  <SelectItem value="danger">{t("planning.communication.issue")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("planning.communication.uploadFile")}</Label>
              <Input type="file" ref={fileInputRef} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>{t("planning.form.no")}</Button>
            <Button onClick={handleSend} disabled={sending} className="bg-violet-500 hover:bg-violet-600">
              {sending ? t("planning.communication.sending") : t("planning.communication.send")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}