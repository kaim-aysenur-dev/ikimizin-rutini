import { Brand } from "@/components/brand";
import { PanelBackdrop } from "@/components/panel-backdrop";
import { SideNav, TabBar } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { TimerProvider } from "@/components/timers";
import { XpBadge } from "@/components/xp-badge";
import { requireUser } from "@/lib/auth/session";
import { imageUrl } from "@/lib/cloudinary";
import { SITE_NAME } from "@/lib/site";
import { totalXp } from "@/lib/xp-server";

// Oturum gerektiren bütün sayfaların kabuğu.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const xp = await totalXp(user.id);
  const avatarUrl = user.avatarPublicId
    ? imageUrl(user.avatarPublicId, { width: 96, height: 96, crop: "fill", gravity: "face" })
    : null;

  return (
    <TimerProvider>
    <div className="shell">
      <PanelBackdrop />
      <aside className="sidebar">
        <Brand />
        <SideNav />
        <p className="sidebar-foot">{SITE_NAME}</p>
      </aside>
      <div>
        <header className="topbar">
          <Brand />
          <div className="topbar-spacer" />
          <XpBadge initialXp={xp} />
          <UserMenu name={user.displayName} account={user.accountUsername} avatarUrl={avatarUrl} />
        </header>
        {children}
      </div>
      <TabBar />
    </div>
    </TimerProvider>
  );
}
