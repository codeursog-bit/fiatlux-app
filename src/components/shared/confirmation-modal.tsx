'use client';

import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  isLoading = false,
  variant = 'danger'
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[400px] rounded-3xl p-8 border-none shadow-2xl">
        <DialogHeader>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center mb-4",
            variant === 'danger' ? "bg-red-50 text-red-600" :
            variant === 'warning' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"
          )}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black text-slate-900">{title}</DialogTitle>
          <DialogDescription className="text-slate-500 font-medium pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="flex-1 h-12 rounded-xl font-bold border-slate-200"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button 
            onClick={onConfirm}
            className={cn(
              "flex-1 h-12 rounded-xl font-bold text-white shadow-lg",
              variant === 'danger' ? "bg-red-600 hover:bg-red-700 shadow-red-900/20" :
              variant === 'warning' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-900/20" : "bg-fiatlux-primary hover:bg-blue-800 shadow-blue-900/20"
            )}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
