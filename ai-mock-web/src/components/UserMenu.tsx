"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { LogOut, ChevronDown } from "lucide-react";

/**
 * Compact account menu for the nav bar: avatar (or initial) that opens a
 * small dropdown with the signed-in user's name/email and a sign-out
 * action. Renders nothing while the session is loading or if signed out —
 * every page that uses this is already behind middleware auth, so signed-
 * out is a transient state at most (mid-redirect to /login).
 */
export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (status !== "authenticated" || !session?.user) return null;

  const { name, email, image } = session.user;
  const initial = (name || email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-full hover:bg-accent/20 transition-colors"
        aria-label="Account menu"
        aria-expanded={open}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- external Google avatar URL, not worth next/image config for a 32px icon
          <img
            src={image}
            alt={name || "Account"}
            referrerPolicy="no-referrer"
            className="w-8 h-8 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground text-sm font-bold">
            {initial}
          </div>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-foreground/60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
          <div className="px-4 py-3 border-b border-border/60">
            <p className="text-sm font-semibold text-foreground truncate">{name || "Account"}</p>
            {email && <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
