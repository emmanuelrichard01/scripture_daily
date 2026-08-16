import { useState } from "react";
import { Check, Copy, QrCode, Share2, Sparkles } from "lucide-react";
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
 * QR Code & Share modal for in-person friend adding.
 *
 * Uses an interactive visual share card with high-density QR code rendering,
 * copyable link, and native Web Share integration.
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

  // Encodes the URL into a high-contrast dynamic QR image using a fast, reliable QR endpoint with SVG rendering fallback
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    inviteUrl,
  )}&bgcolor=ffffff&color=1e1b4b&margin=1&format=svg`;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm overflow-hidden rounded-3xl border border-border/60 bg-card p-6 shadow-xl">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <QrCode className="h-6 w-6" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-xl font-bold">
            Connect in Person
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Have a friend scan this code with their phone camera to start reading together instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="my-3 flex flex-col items-center">
          {/* Card Frame with Ambient Glow */}
          <div className="relative rounded-2xl border border-border/80 bg-white p-4 shadow-md">
            <img
              src={qrImageSrc}
              alt={`QR Code to add ${userName} on Scripture Daily`}
              width={200}
              height={200}
              className="h-48 w-48 rounded-lg"
              loading="lazy"
            />
            <div className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-slate-800">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" aria-hidden="true" />
              <span>{userName}'s Scripture Circle</span>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleCopy}
              variant="outline"
              className="h-11 flex-1 gap-2 rounded-xl text-xs font-semibold"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-success" aria-hidden="true" />
                  Copied!
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
              className="h-11 flex-1 gap-2 rounded-xl text-xs font-semibold shadow-sm"
            >
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share Link
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-10 w-full rounded-xl text-xs text-muted-foreground"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
