"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wand2, MessageSquareText, Images, ScanSearch, LogOut } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { apiJson } from "@/lib/client/api";

type User = { id: string; email: string; name: string } | null;

const LINKS = [
  { href: "/", label: "工作台", index: "01", icon: Wand2 },
  { href: "/plaza", label: "提示词广场", index: "02", icon: Images },
  { href: "/analyze", label: "图像解析", index: "03", icon: ScanSearch }
];

export function TopBar({ user, onLogout }: { user: User; onLogout?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await apiJson("/api/auth/logout", { method: "POST" });
    if (onLogout) onLogout();
    router.push("/login");
  }

  return (
    <header className="topbar">
      <div className="topbarLeft">
        <Link href="/" className="logo">
          <span className="logoMark">Q</span>
          <span className="logoText">y · Gen</span>
          <span className="logoDot" />
        </Link>
        <nav className="nav">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
            const Icon = l.icon;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`navLink ${active ? "navActive" : ""}`}
              >
                <span className="navIndex">{l.index}</span>
                <Icon size={14} strokeWidth={2.2} />
                <span>{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="topbarRight">
        <ThemeToggle />
        {user ? (
          <div className="userChip">
            <span>
              <strong>{user.name}</strong>
            </span>
            <button
              className="iconButtonSm button buttonSecondary"
              onClick={handleLogout}
              title="退出登录"
              style={{ width: 26, height: 26, padding: 0, borderRadius: "50%" }}
            >
              <LogOut size={12} />
            </button>
            <div className="userAvatar">{user.name?.[0]?.toUpperCase() ?? "·"}</div>
          </div>
        ) : (
          <Link href="/login" className="button buttonAccent" style={{ height: 36, padding: "0 16px" }}>
            登录 / 注册
          </Link>
        )}
      </div>
    </header>
  );
}
