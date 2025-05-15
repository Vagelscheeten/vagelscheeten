"use client";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function DeleteUserDialog({
  open,
  onConfirm,
  onCancel,
  userEmail
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  userEmail?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nutzer wirklich löschen?</DialogTitle>
          <DialogDescription>
            Willst du den Nutzer <span className="font-mono">{userEmail}</span> wirklich löschen?<br />
            Diese Aktion kann nicht rückgängig gemacht werden!
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Löschen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
