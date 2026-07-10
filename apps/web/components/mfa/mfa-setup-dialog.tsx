"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MfaVerifyInput } from "./mfa-verify-input";
import { apiClient } from "@/lib/api/client";
import type { MfaSetupResponse } from "@sekiro/shared";

interface MfaSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnabled: () => void;
}

export function MfaSetupDialog({ open, onOpenChange, onEnabled }: MfaSetupDialogProps) {
  const [setup, setSetup] = React.useState<MfaSetupResponse | null>(null);
  const [code, setCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  React.useEffect(() => {
    if (open && !setup) {
      setLoading(true);
      apiClient
        .post<MfaSetupResponse>("/auth/mfa/setup", {})
        .then(setSetup)
        .catch((err) => toast.error(err.message || "生成二维码失败"))
        .finally(() => setLoading(false));
    }
  }, [open, setup]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      toast.error("请输入 6 位验证码");
      return;
    }
    setVerifying(true);
    try {
      await apiClient.post("/auth/mfa/verify", { code });
      toast.success("两步验证已开启");
      onEnabled();
      onOpenChange(false);
      setSetup(null);
      setCode("");
    } catch (err: any) {
      toast.error(err.message || "验证码错误");
    } finally {
      setVerifying(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setSetup(null);
    setCode("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>开启两步验证</DialogTitle>
          <DialogDescription>
            使用 Authenticator 应用扫描二维码，然后输入 6 位验证码完成绑定。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">加载中...</div>
        ) : (
          <div className="space-y-4">
            {setup?.qrCodeUrl && (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={setup.qrCodeUrl}
                  alt="MFA QR Code"
                  className="h-48 w-48 rounded border"
                />
                <div className="w-full space-y-1">
                  <Label>手动输入密钥</Label>
                  <Input value={setup.manualEntryKey} readOnly />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="mfa-code">验证码</Label>
              <MfaVerifyInput id="mfa-code" value={code} onChange={setCode} disabled={verifying} />
            </div>

            <Button onClick={handleVerify} disabled={verifying || code.length !== 6} className="w-full">
              {verifying ? "验证中..." : "确认开启"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
