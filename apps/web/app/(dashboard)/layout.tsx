import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { TabsNav } from "@/components/layout/tabs-nav";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <TabsNav />
        <main className="scrollbar-thin flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
