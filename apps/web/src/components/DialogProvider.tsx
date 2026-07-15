'use client';

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { Modal } from './Modal';

type DialogType = 'alert' | 'confirm' | 'prompt';

type DialogOptions = {
  title?: string;
  placeholder?: string;
  defaultValue?: string;
};

type DialogContextType = {
  alert: (message: string, options?: DialogOptions) => Promise<void>;
  confirm: (message: string, options?: DialogOptions) => Promise<boolean>;
  prompt: (message: string, options?: DialogOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<DialogType>('alert');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [inputValue, setInputValue] = useState('');
  
  const resolveRef = useRef<((value: any) => void) | null>(null);

  const showAlert = (msg: string, opts?: DialogOptions) => {
    setTitle(opts?.title || 'Notice');
    setMessage(msg);
    setType('alert');
    setIsOpen(true);
    return new Promise<void>((resolve) => {
      resolveRef.current = () => {
        setIsOpen(false);
        resolve();
      };
    });
  };

  const showConfirm = (msg: string, opts?: DialogOptions) => {
    setTitle(opts?.title || 'Are you sure?');
    setMessage(msg);
    setType('confirm');
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = (value: boolean) => {
        setIsOpen(false);
        resolve(value);
      };
    });
  };

  const showPrompt = (msg: string, opts?: DialogOptions) => {
    setTitle(opts?.title || 'Input Required');
    setMessage(msg);
    setPlaceholder(opts?.placeholder || '');
    setInputValue(opts?.defaultValue || '');
    setType('prompt');
    setIsOpen(true);
    return new Promise<string | null>((resolve) => {
      resolveRef.current = (value: string | null) => {
        setIsOpen(false);
        resolve(value);
      };
    });
  };

  const handleConfirm = () => {
    if (type === 'prompt') {
      resolveRef.current?.(inputValue);
    } else if (type === 'confirm') {
      resolveRef.current?.(true);
    } else {
      resolveRef.current?.(undefined);
    }
  };

  const handleCancel = () => {
    if (type === 'prompt') {
      resolveRef.current?.(null);
    } else if (type === 'confirm') {
      resolveRef.current?.(false);
    } else {
      resolveRef.current?.(undefined);
    }
    setIsOpen(false);
  };

  return (
    <DialogContext.Provider value={{ alert: showAlert, confirm: showConfirm, prompt: showPrompt }}>
      {children}
      
      <Modal isOpen={isOpen} onClose={handleCancel} title={title}>
        <div className="space-y-4">
          <p className="text-foreground text-sm">{message}</p>
          
          {type === 'prompt' && (
            <input 
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:ring-2 focus:ring-accent-blue outline-none animate-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm();
                if (e.key === 'Escape') handleCancel();
              }}
            />
          )}
          
          <div className="flex justify-end gap-3 pt-2">
            {type !== 'alert' && (
              <button 
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium border border-border rounded-xl hover:bg-surface-hover text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            )}
            <button 
              onClick={handleConfirm}
              className="px-4 py-2 text-sm font-medium bg-accent-blue hover:bg-accent-blue/80 text-white rounded-xl transition-colors shadow-lg shadow-accent-blue/20"
            >
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </DialogContext.Provider>
  );
}

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
};
