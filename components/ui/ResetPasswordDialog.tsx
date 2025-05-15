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

export function ResetPasswordDialog({
  open,
  onConfirm,
  onCancel,
  defaultPassword = "Start1234",
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Passwort wirklich zurücksetzen?</DialogTitle>
          <DialogDescription>
            Das Passwort wird auf <span className="font-mono">{defaultPassword}</span> zurückgesetzt. <br />
            Der Benutzer muss es beim nächsten Login ändern.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Zurücksetzen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
