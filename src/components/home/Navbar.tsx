// src/components/home/Navbar.tsx
import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Bell, CircleUserRound } from "lucide-react";
import Logo from "../Logo";
import { supabase } from "../../lib/supabaseClient";

type Role = {
  isCustomer: boolean;
  isHelper: boolean;
  signedIn: boolean;
};

export default function Navbar() {
  const [role, setRole] = useState<Role>({
    isCustomer: false,
    isHelper: false,
    signedIn: false,
  });
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setRole({ isCustomer: false, isHelper: false, signedIn: false });
        setUnread(0);
        if (channel) { void supabase.removeChannel(channel); channel = null; }
        return;
      }

      const [c, h, unreadRes] = await Promise.all([
        supabase.from("customer_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("helper_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("recipient_id", user.id)
          .is("read_at", null),
      ]);

      setRole({
        isCustomer: !!c.data,
        isHelper: !!h.data,
        signedIn: true,
      });
      setUnread(unreadRes.count ?? 0);

      if (channel) void supabase.removeChannel(channel);
      channel = supabase
        .channel(`unread-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
            filter: `recipient_id=eq.${user.id}`,
          },
          async () => {
            const { count } = await supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("recipient_id", user.id)
              .is("read_at", null);
            setUnread(count ?? 0);
          }
        )
        .subscribe();
    }

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    return () => {
      sub.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "text-[#0B5FFF] border-b-2 border-[#0B5FFF] pb-1"
      : "text-gray-700 hover:text-[#0B5FFF]";

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
        <div className="flex items-center gap-16">
          <Link to="/">
            <Logo />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium">
            <NavLink to="/" end className={navLinkClass}>Home</NavLink>
            <a href="#services">Services</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#safety">Safety</a>
            <NavLink to="/browse" className={navLinkClass}>Browse tasks</NavLink>

            {/* Role-based links — each shown at most once */}
            {role.isCustomer && (
              <NavLink to="/my-tasks" className={navLinkClass}>
                My tasks
              </NavLink>
            )}

            {(role.isCustomer || role.isHelper) && (
              <NavLink to="/my-bookings" className={navLinkClass}>
                My bookings
              </NavLink>
            )}

            {role.isHelper && (
              <NavLink to="/helper" className={navLinkClass}>
                Dashboard
              </NavLink>
            )}

            {role.signedIn && !role.isHelper && (
              <NavLink to="/helper/signup" className={navLinkClass}>
                Become a Caddy
              </NavLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-5">
          {role.signedIn ? (
            <Link
              to="/messages"
              aria-label="Messages"
              className="relative text-gray-700 hover:text-[#0B5FFF]"
            >
              <Bell size={20} className="cursor-pointer" />
              {unread > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          ) : (
            <Bell size={20} className="text-gray-300" />
          )}

          <Link
            to="/profile"
            aria-label="Profile"
            className="text-gray-700 hover:text-[#0B5FFF]"
          >
            <CircleUserRound size={22} className="cursor-pointer" />
          </Link>

          <Link
            to="/post-task"
            className="rounded-full bg-[#0B5FFF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Post a Task
          </Link>
        </div>
      </div>
    </header>
  );
}