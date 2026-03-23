"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { BookOpenCheck, ChartSpline, Flame, Gem, GraduationCap, LayoutDashboard, LibraryBig, MessageSquareMore, MoonStar, UserRound, UserRoundCog } from "@/lib/icons";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";
import { BrandLoadingScreen } from "@/components/brand-loading-screen";
import { PlatformFooter } from "@/components/platform-footer";

type UserRole = "student" | "teacher" | "master";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: UserRole[];
};

const navigation: NavigationItem[] = [
  { href: "/", label: "Visão geral", icon: LayoutDashboard, roles: ["student", "teacher", "master"] },
  { href: "/aprendizado", label: "Aprendizado", icon: LibraryBig, roles: ["student"] },
  { href: "/atividades", label: "Atividades", icon: BookOpenCheck, roles: ["student", "teacher", "master"] },
  { href: "/forum", label: "Fórum", icon: MessageSquareMore, roles: ["student", "teacher", "master"] },
  { href: "/loja", label: "Loja", icon: Gem, roles: ["student"] },
  { href: "/perfil", label: "Perfil", icon: UserRoundCog, roles: ["student", "teacher", "master"] },
  { href: "/professor", label: "Professor", icon: GraduationCap, roles: ["teacher", "master"] },
  { href: "/relatorios", label: "Relatórios", icon: ChartSpline, roles: ["teacher", "master"] },
  { href: "/admin", label: "Master", icon: UserRoundCog, roles: ["master"] },
];

const DARK_MODE_STORAGE_KEY = "mtd-dark-mode";

function getDarkModeStorageKey(userId: string) {
  return `${DARK_MODE_STORAGE_KEY}:${userId}`;
}

export function PlatformShell({
  children,
  heading,
  description,
}: {
  children: React.ReactNode;
  heading: string;
  description: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { ready, user, logout, activeTheme } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (!ready || !user) {
      return;
    }
    try {
      const stored = window.localStorage.getItem(getDarkModeStorageKey(user.id));
      setDarkMode(stored === "true");
    } catch {
      setDarkMode(false);
    }
  }, [ready, user]);

  useEffect(() => {
    if (ready && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, ready, router, user]);

  useEffect(() => {
    if (!ready || !user) {
      return;
    }
    try {
      window.localStorage.setItem(getDarkModeStorageKey(user.id), darkMode ? "true" : "false");
    } catch {
      // ignore storage persistence issues
    }
  }, [darkMode, ready, user]);

  if (!ready || !user) {
    return (
      <div className={darkMode ? "theme-dark" : undefined}>
        <BrandLoadingScreen />
      </div>
    );
  }

  const visibleNavigation = navigation.filter((item) => item.roles.includes(user.role));

  return (
    <div className={`${darkMode ? "platform theme-dark" : "platform"}${activeTheme ? ` ${activeTheme}` : ""}`}>
      <aside className="platform-sidebar glass">
        <div className="brand-box">
          <div className="brand-mark">
            <Image
				alt="Logo oficial da MatGo"
				className="brand-image"
				height={52}
				src="/oficial.png"
				width={52}
				priority={true}
			/>
          </div>
          <div>
            <strong>MatGo</strong>
            <p>Matemática de uma forma divertida</p>
          </div>
        </div>

        <nav className="nav-list">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} className={active ? "nav-item active" : "nav-item"} href={item.href}>
                <Icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <div className="sidebar-mini">
            <Flame size={18} />
            <div>
              <strong>{user.full_name}</strong>
              <p>{user.role === "student" ? user.username ?? user.grade_band ?? "Aluno" : user.role === "master" ? "Master" : "Professor"} | {user.email}</p>
            </div>
          </div>
          <button className="secondary-button wide" onClick={logout} type="button">
            Sair
          </button>
          <button className="secondary-button wide" onClick={() => setDarkMode((value) => !value)} type="button">
            <MoonStar size={16} />
            {darkMode ? "Modo claro" : "Modo escuro"}
          </button>
        </div>
      </aside>

      <div className="platform-main">
        <header className="topbar glass">
          <div>
            <p className="eyebrow">Universo MatGo</p>
            <h1>{heading}</h1>
            <span>{description}</span>
          </div>
          <div className="topbar-actions">
            <div className="topbar-chip">
              <UserRound size={16} />
              {user.role === "student" ? user.grade_band ?? user.username ?? "aluno" : user.role === "master" ? "Master" : "Professor"}
            </div>
            {user.role === "student" ? (
              <div className="topbar-chip">
                <Flame size={16} />
                nivel {user.level}
              </div>
            ) : null}
          </div>
        </header>

        <div className="page-content">{children}</div>
        <PlatformFooter />
      </div>
    </div>
  );
}
