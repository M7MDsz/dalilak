"use client";
// Owner: profile. The account row of spec 3.13: «تسجيل الخروج» (returns to / and keeps the account) and «إعادة ضبط
// العرض», which asks first: «حذف بيانات {name}؟» · «سيُحذف تقدّمك ونقاطك من هذا المتصفح.» · «احذف وابدأ من جديد» /
// «إلغاء»; confirming deletes this account and returns to /. The store action runs first, then go("/") (ARCH 11.1: the
// app Guard renders nothing once no user is signed in, so nothing half-drawn shows on the way out).
import { useState, type ReactNode } from "react";

import { IconLogout, IconReset } from "@/components/icons";
import { Sheet, useGo } from "@/components/motion";
import { Button } from "@/components/ui";
import { ROUTE_PATHS } from "@/lib/routes";
import { useAppStore } from "@/lib/store";
import { TID } from "@/lib/testids";

import { PROFILE_COPY, resetTitle } from "./copy";

export function AccountRow({ name, className }: { readonly name: string; readonly className?: string }): ReactNode {
  const go = useGo();
  const [confirming, setConfirming] = useState(false);

  const signOut = () => {
    useAppStore.getState().signOut();
    go(ROUTE_PATHS.signin);
  };
  const reset = () => {
    setConfirming(false);
    useAppStore.getState().resetCurrentAccount();
    go(ROUTE_PATHS.signin);
  };

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-3">
        <Button data-testid={TID.profile.signout} icon={<IconLogout size={18} />} iconPosition="start" onClick={signOut} size="sm" variant="secondary">
          {PROFILE_COPY.signOut}
        </Button>
        <Button data-testid={TID.profile.reset} icon={<IconReset size={18} />} iconPosition="start" onClick={() => setConfirming(true)} size="sm" variant="ghost">
          {PROFILE_COPY.reset}
        </Button>
      </div>
      <Sheet
        description={PROFILE_COPY.resetBody}
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
            <Button className="sm:min-w-44" data-testid={TID.profile.resetConfirm} onClick={reset}>
              {PROFILE_COPY.resetConfirm}
            </Button>
            <Button className="sm:min-w-28" onClick={() => setConfirming(false)} variant="secondary">
              {PROFILE_COPY.cancel}
            </Button>
          </div>
        }
        onOpenChange={setConfirming}
        open={confirming}
        size="sm"
        title={resetTitle(name)}
      />
    </div>
  );
}
