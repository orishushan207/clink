"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import { REPORT_REASONS, type ReportReason } from "@/types";
import { reportMedia } from "@/lib/reports";
import { cn } from "@/lib/utils";
import { Flag } from "lucide-react";
import toast from "react-hot-toast";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  mediaId: string;
  guestId: string;
  eventId: string;
}

export default function ReportModal({
  open,
  onClose,
  mediaId,
  guestId,
  eventId,
}: ReportModalProps) {
  const [selected, setSelected] = useState<ReportReason | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selected) return;

    setLoading(true);
    try {
      await reportMedia(mediaId, guestId, eventId, selected);
      toast.success("הדיווח נשלח בהצלחה");
      onClose();
      setSelected(null);
    } catch {
      toast.error("שגיאה בשליחת הדיווח");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="דיווח על תוכן">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Flag className="h-4 w-4" />
          <span>בחר את הסיבה לדיווח:</span>
        </div>

        <div className="flex flex-col gap-2">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelected(reason)}
              className={cn(
                "text-right px-4 py-3 rounded-xl border transition-all text-sm font-medium",
                selected === reason
                  ? "border-party-gold bg-party-gold-light/15 text-yellow-300"
                  : "border-party-border bg-party-surface2 text-gray-300 hover:border-white/20"
              )}
            >
              {reason}
            </button>
          ))}
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            variant="ghost"
            size="md"
            onClick={onClose}
            className="flex-1"
          >
            ביטול
          </Button>
          <Button
            size="md"
            onClick={handleSubmit}
            loading={loading}
            disabled={!selected}
            className="flex-1"
          >
            שלח דיווח
          </Button>
        </div>
      </div>
    </Modal>
  );
}
