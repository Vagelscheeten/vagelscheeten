import React from 'react';
import { Dialog, DialogContent, DialogTitle } from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';

interface AssignHelferModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  items: { id: string; name: string }[];
  onSelect: (id: string) => void;
}

export const AssignHelferModal: React.FC<AssignHelferModalProps> = ({ open, onClose, title, items, onSelect }) => {
  return (
    <Dialog open={open} onOpenChange={open => !open ? onClose() : undefined}>
      <DialogContent className="max-w-md w-full rounded-lg p-6 bg-white shadow-xl">
        <div className="mb-4">
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
        </div>
        <div className="space-y-2 mb-6">
          {items.length === 0 ? (
            <p className="text-gray-500 italic">Keine Auswahl verfügbar.</p>
          ) : (
            items.map(item => (
              <Button
                key={item.id}
                className="w-full justify-start"
                variant="outline"
                onClick={() => { onSelect(item.id); onClose(); }}
              >
                {item.name}
              </Button>
            ))
          )}
        </div>
        <div>
          <Button variant="ghost" onClick={onClose} className="w-full">Abbrechen</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
