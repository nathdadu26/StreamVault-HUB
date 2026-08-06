/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Icons } from "@/src/components/Icons";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/40 bg-muted/20 py-10 mt-auto">
      <div className="container mx-auto px-6 flex flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
               <Icons.ShieldCheck className="h-4 w-4" />
            </div>
            <span className="text-sm font-black tracking-tight text-foreground/80 uppercase">StreamVault</span>
          </div>
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] text-center">
            @StreamVaultHUB
          </p>
        </div>
      </div>
    </footer>
  );
}
