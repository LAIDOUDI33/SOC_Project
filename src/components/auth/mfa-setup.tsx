/**
 * National SOC Platform - MFA Setup Component
 * 
 * Dialog for setting up Multi-Factor Authentication:
 * - QR code display for authenticator apps
 * - Manual secret entry option
 * - Verification code input
 * - Backup codes generation
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  QrCode, 
  KeyRound, 
  Copy, 
  Check,
  Loader2,
  AlertCircle,
  CheckCircle,
  Smartphone,
  ExternalLink
} from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface MFASetupData {
  sessionId: string;
  secret: string;
  qrUrl: string;
  instructions: string[];
}

interface MFASetupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

// ============================================================
// COMPONENT
// ============================================================

export function MFADialog({ open, onOpenChange, onComplete }: MFASetupProps) {
  // State
  const [step, setStep] = useState<'setup' | 'verify' | 'complete'>('setup');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Setup data
  const [setupData, setSetupData] = useState<MFASetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // Initialize setup when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && step === 'setup') {
      initializeSetup();
    }
    onOpenChange(newOpen);
  };

  // Initialize MFA setup
  const initializeSetup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('soc_access_token');
      
      const response = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'setup' }),
      });

      const data = await response.json();

      if (data.success) {
        setSetupData(data);
      } else {
        setError(data.error || 'Failed to initialize MFA setup');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify TOTP code
  const handleVerify = async () => {
    if (!setupData || verificationCode.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('soc_access_token');

      // Step 1: Verify the code
      const verifyResponse = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'verify',
          sessionId: setupData.sessionId,
          code: verificationCode,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyData.success) {
        setError(verifyData.error || 'Verification failed');
        setIsLoading(false);
        return;
      }

      // Step 2: Enable MFA with final verification
      const enableResponse = await fetch('/api/auth/mfa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'enable',
          sessionId: setupData.sessionId,
          code: verificationCode,
        }),
      });

      const enableData = await enableResponse.json();

      if (enableData.success) {
        setBackupCodes(enableData.backupCodes || []);
        setStep('complete');
        onComplete?.();
      } else {
        setError(enableData.error || 'Failed to enable MFA');
      }
    } catch (err) {
      setError('Network error during verification');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard helper
  const copyToClipboard = async (text: string, type: 'secret' | 'codes') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'secret') {
        setCopiedSecret(true);
        setTimeout(() => setCopiedSecret(false), 2000);
      } else {
        setCopiedCodes(true);
        setTimeout(() => setCopiedCodes(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Reset state when closing
  const handleClose = () => {
    setStep('setup');
    setSetupData(null);
    setVerificationCode('');
    setBackupCodes([]);
    setError(null);
    onOpenChange(false);
  };

  // ============================================================
  // RENDER SETUP STEP
  // ============================================================

  const renderSetupStep = () => (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Setup Instructions
        </h4>
        <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal ml-4">
          <li>Install an authenticator app on your phone</li>
          <li>Scan the QR code or enter the secret manually</li>
          <li>Enter the verification code from the app</li>
        </ol>
      </div>

      {/* QR Code */}
      {setupData?.qrUrl && (
        <div className="flex flex-col items-center space-y-3">
          <Label>Scan this QR Code</Label>
          <div className="p-4 bg-white rounded-lg border">
            {/* In production, use a proper QR code library */}
            <div className="w-48 h-48 flex items-center justify-center bg-gray-100 rounded">
              <QrCode className="h-24 w-24 text-gray-400" />
            </div>
            {/* Actual implementation would render: */}
            {/* <img src={setupData.qrUrl} alt="MFA QR Code" /> */}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Use Google Authenticator, Authy, or any TOTP-compatible app
          </p>
        </div>
      )}

      {/* Secret Key (Manual Entry) */}
      {setupData?.secret && (
        <div className="space-y-2">
          <Label>Or enter this secret key manually:</Label>
          <div className="flex items-center gap-2">
            <Input
              value={setupData.secret}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => copyToClipboard(setupData.secret, 'secret')}
            >
              {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );

  // ============================================================
  // RENDER VERIFY STEP
  // ============================================================

  const renderVerifyStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h4 className="font-semibold">QR Code Scanned Successfully!</h4>
        <p className="text-sm text-muted-foreground">
          Enter the 6-digit verification code from your authenticator app
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="verify-code">Verification Code</Label>
        <div className="flex justify-center">
          <Input
            id="verify-code"
            type="text"
            placeholder="000000"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="text-center tracking-widest font-mono text-2xl max-w-[200px]"
            maxLength={6}
            autoFocus
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          The code changes every 30 seconds
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setStep('setup')} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={handleVerify} 
          disabled={verificationCode.length !== 6 || isLoading}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <KeyRound className="mr-2 h-4 w-4" />
              Verify & Enable
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // ============================================================
  // RENDER COMPLETE STEP
  // ============================================================

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Shield className="h-12 w-12 text-green-500 mx-auto" />
        <h4 className="font-semibold text-lg">MFA Enabled Successfully!</h4>
        <p className="text-sm text-muted-foreground">
          Your account is now protected with two-factor authentication
        </p>
      </div>

      {/* Backup Codes */}
      {backupCodes.length > 0 && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-semibold flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              Backup Codes
            </Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(backupCodes.join('\n'), 'codes')}
            >
              {copiedCodes ? <><Check className="mr-1 h-3 w-3" />Copied</> : <><Copy className="mr-1 h-3 w-3" />Copy All</>}
            </Button>
          </div>

          <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
              Save these codes in a secure location. Each code can only be used once.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((code, index) => (
              <code
                key={index}
                className="block bg-gray-100 dark:bg-gray-800 px-3 py-2 rounded text-center font-mono text-sm select-all"
              >
                {code}
              </code>
            ))}
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="text-sm space-y-2 text-muted-foreground">
        <p className="font-medium text-foreground">What happens next:</p>
        <ul className="space-y-1 ml-4 list-disc">
          <li>You'll be asked for a verification code at every login</li>
          <li>Use backup codes if you lose access to your authenticator app</li>
          <li>You can disable MFA anytime from Security Settings</li>
        </ul>
      </div>

      <Button onClick={handleClose} className="w-full">
        Done
      </Button>
    </div>
  );

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Set Up Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Add an extra layer of security to your account
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isLoading && step === 'setup' && !setupData && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Initializing MFA setup...</p>
          </div>
        )}

        {/* Setup Step */}
        {!isLoading && step === 'setup' && setupData && renderSetupStep()}

        {/* Verify Step */}
        {step === 'verify' && renderVerifyStep()}

        {/* Complete Step */}
        {step === 'complete' && renderCompleteStep()}

        {/* Navigation Buttons (Setup Step Only) */}
        {step === 'setup' && setupData && (
          <DialogFooter className="gap-3 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={() => setStep('verify')}>
              Continue
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Simple arrow icon component
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export default MFADialog;
