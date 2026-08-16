import { useState } from "react";
import { Check, Copy, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface QRCodeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  inviteUrl: string;
  userName: string;
}

/**
 * Clean QR Code & Share modal for in-person friend adding.
 */
export function QRCodeModal({
  isOpen,
  onOpenChange,
  inviteUrl,
  userName,
}: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Invite link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Read the Bible with me on Scripture Daily",
          text: `Join ${userName} reading ten chapters a day on Scripture Daily!`,
          url: inviteUrl,
        });
      } else {
        await handleCopy();
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Sharing not supported on this browser");
    }
  };

  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    inviteUrl,
  )}&bgcolor=ffffff&color=18181b&margin=1&format=svg`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden rounded-2xl border border-border/70 bg-card p-5 sm:p-6 shadow-xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
            <QrCode className="h-5 w-5" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-lg font-bold">
            Connect in Person
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Have a friend scan this code with their camera to join your reading circle.
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 flex flex-col items-center">
          <div className="rounded-xl border border-border bg-white p-3.5">
            <img
              src={qrImageSrc}
              alt={`QR Code to add ${userName} on Scripture Daily`}
              width={192}
              height={192}
              className="h-44 w-44 rounded-md"
              loading="lazy"
            />
            <p className="mt-2 text-center text-xs font-semibold text-zinc-800">
              {userName}'s Circle
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCopy}
              variant="outline"
              className="h-11 flex-1 gap-2 rounded-xl text-xs font-semibold cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy Link
                </>
              )}
            </Button>
            <Button
              type="button"
              onClick={handleNativeShare}
              className="h-11 flex-1 gap-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 cursor-pointer"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share Link
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-10 w-full rounded-xl text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
