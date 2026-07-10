"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

interface MfaVerifyInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function MfaVerifyInput({ id, value, onChange, disabled }: MfaVerifyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange(digits);
  };

  return (
    <Input
      id={id}
      value={value}
      onChange={handleChange}
      placeholder="000000"
      maxLength={6}
      disabled={disabled}
      inputMode="numeric"
      className="h-11 text-center text-lg tracking-[0.5em]"
    />
  );
}
