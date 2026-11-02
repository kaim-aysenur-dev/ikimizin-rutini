import { Brand } from "@/components/brand";
import { PanelBackdrop } from "@/components/panel-backdrop";
import { SideNav, TabBar } from "@/components/shell/nav";
import { UserMenu } from "@/components/shell/user-menu";
import { TimerProvider } from "@/components/timers";
import { XpBadge } from "@/components/xp-badge";
import { requireUser } from "@/lib/auth/session";
import { imageUrl } from "@/lib/cloudinary";
import { SITE_NAME } from "@/lib/site";
import { todayIstanbul } from "@/lib/dates";
import { adventure } from "@/lib/xp-server";

// Oturum gerektiren bütün sayfaların kabuğu.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const adv = await adventure(user.id, user.accountId, todayIstanbul());
  const avatarUrl = user.avatarPublicId
    ? imageUrl(user.avatarPublicId, { width: 96, height: 96, crop: "fill", gravity: "face" })
    : null;

  return (
    <TimerProvider>
    <div className="shell">
      <PanelBackdrop initialXp={adv.xp} />
      <aside className="sidebar">
        <Brand />
        <SideNav />
        <p className="sidebar-foot">{SITE_NAME}</p>
      </aside>
      <div>
        <header className="topbar">
          <Brand />
          <div className="topbar-spacer" />
          <XpBadge initialXp={adv.xp} stats={adv.stats} meToday={adv.meToday} partnerToday={adv.partnerToday} partnerName={adv.partnerName} />
          <UserMenu name={user.displayName} account={user.accountUsername} avatarUrl={avatarUrl} />
        </header>
        {children}
      </div>
      <TabBar />
    </div>
    </TimerProvider>
  );
}
