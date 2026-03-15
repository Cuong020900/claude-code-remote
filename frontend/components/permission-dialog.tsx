'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PermissionDialogProps {
  open: boolean;
  sessionId: string;
  toolName: string;
  input: unknown;
  onApprove: () => void;
  onReject: () => void;
}

/** Modal dialog for approving/rejecting Claude Code permission requests */
export function PermissionDialog({
  open,
  sessionId,
  toolName,
  input,
  onApprove,
  onReject,
}: PermissionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onReject(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permission Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p>
            Session <code className="rounded bg-muted px-1">{sessionId.slice(0, 12)}...</code>
            {' '}wants to use:
          </p>
          <p className="font-mono font-semibold">{toolName}</p>
          <pre className="max-h-48 overflow-auto rounded bg-muted p-3 text-xs">
            {typeof input === 'string' ? input : JSON.stringify(input, null, 2)}
          </pre>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={onReject}>
            Reject
          </Button>
          <Button
            onClick={onApprove}
            className="bg-green-600 text-white hover:bg-green-700"
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
