"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { BookOpenCheck, ChartSpline, Flame, Gem, GraduationCap, LayoutDashboard, LibraryBig, MessageSquareMore, MoonStar, Shield, UserRound, UserRoundCog } from "@/lib/icons";
import { useEffect, useState } from "react";

import { useAuth } from "@/components/auth-provider";

type UserRole = "student" | "teacher" | "master";

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  roles: UserRole[];
};

const navigation: NavigationItem[] = [
  { href: "/", label: "Visao geral", icon: LayoutDashboard, roles: ["student", "teacher", "master"] },
  { href: "/aprendizado", label: "Aprendizado", icon: LibraryBig, roles: ["student"] },
  { href: "/atividades", label: "Atividades", icon: BookOpenCheck, roles: ["student", "teacher", "master"] },
  { href: "/forum", label: "Forum", icon: MessageSquareMore, roles: ["student", "teacher", "master"] },
  { href: "/loja", label: "Loja", icon: Gem, roles: ["student", "teacher", "master"] },
  { href: "/perfil", label: "Perfil", icon: UserRoundCog, roles: ["student", "teacher", "master"] },
  { href: "/professor", label: "Professor", icon: GraduationCap, roles: ["teacher", "master"] },
  { href: "/relatorios", label: "Relatorios", icon: ChartSpline, roles: ["teacher", "master"] },
  { href: "/admin", label: "Master", icon: Shield, roles: ["master"] },
];

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
    if (ready && !user && pathname !== "/login") {
      router.replace("/login");
    }
  }, [pathname, ready, router, user]);

  if (!ready || !user) {
    return (
      <div className={darkMode ? "platform theme-dark" : "platform"}>
        <div className="auth-loading glass">
          <h2>Carregando a MatGo...</h2>
          <p>Preparando sua trilha, sua missao diaria e o painel certo para o seu perfil.</p>
        </div>
      </div>
    );
  }

  const visibleNavigation = navigation.filter((item) => item.roles.includes(user.role));

  return (
    <div className={`${darkMode ? "platform theme-dark" : "platform"}${activeTheme ? ` ${activeTheme}` : ""}`}>
      <aside className="platform-sidebar glass">
        <div className="brand-box">
          <div className="brand-mark">
            <Image alt="Coruja oficial da MatGo" className="brand-image" height={52} src="/oficial.png" width={52} />
          </div>
          <div>
            <strong>MatGo</strong>
            <p>Aprender, treinar e avancar</p>
          </div>
        </div>

        <nav className="nav-list">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link key={item.href} className={active ? "nav-item active" : "nav-item"} href={item.href}>
                <Icon size={18} />
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
              <p>{user.role === "teacher" ? "Professor" : user.role === "master" ? "Master" : user.grade_band ?? "Aluno"} | {user.email}</p>
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
              {user.role === "student" ? user.grade_band ?? "aluno" : user.role}
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
      </div>
    </div>
  );
}
