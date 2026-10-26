// src/components/home/Navbar.tsx
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, CircleUserRound, Star } from "lucide-react";
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
  const [reviewAlerts, setReviewAlerts] = useState<Array<{ id: string; task_id: number | null; message: string }>>([]);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  const reviewPanelRef = useRef<HTMLDivElement | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setRole({ isCustomer: false, isHelper: false, signedIn: false });
        setReviewAlerts([]);
        if (channel) { void supabase.removeChannel(channel); channel = null; }
        return;
      }

      const [c, h, reviewRes] = await Promise.all([
        supabase.from("customer_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase.from("helper_profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
        supabase
          .from("inbox_entries")
          .select("id, task_id, message")
          .eq("user_id", user.id)
          .eq("type", "task_review_request")
          .eq("is_read", false)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setRole({
        isCustomer: !!c.data,
        isHelper: !!h.data,
        signedIn: true,
      });
      setReviewAlerts(reviewRes.data ?? []);

      if (channel) void supabase.removeChannel(channel);
      channel = supabase
        .channel(`unread-${user.id}`)
.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "inbox_entries",
            filter: `user_id=eq.${user.id}`,
          },
          async () => {
            const { data } = await supabase
              .from("inbox_entries")
              .select("id, task_id, message")
              .eq("user_id", user.id)
              .eq("type", "task_review_request")
              .eq("is_read", false)
              .order("created_at", { ascending: false })
              .limit(5);
            setReviewAlerts(data ?? []);
          }
        )
        .subscribe();
    }

    void load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void load();
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (reviewPanelRef.current && !reviewPanelRef.current.contains(event.target as Node)) {
        setShowReviewPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      sub.subscription.unsubscribe();
      if (channel) void supabase.removeChannel(channel);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const totalAlertCount = reviewAlerts.length;

  const handleReviewClick = async (id: string, taskId: number | null) => {
    if (taskId) {
      await supabase.from("inbox_entries").update({ is_read: true }).eq("id", id);
      setReviewAlerts((current) => current.filter((item) => item.id !== id));
      setShowReviewPanel(false);
      navigate(`/tasks/${taskId}`);
      return;
    }

    await supabase.from("inbox_entries").update({ is_read: true }).eq("id", id);
    setReviewAlerts((current) => current.filter((item) => item.id !== id));
    setShowReviewPanel(false);
  };

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

            {role.isHelper && (
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
            <div ref={reviewPanelRef} className="relative">
              <button
                type="button"
                aria-label="Review notifications"
                onClick={() => setShowReviewPanel((value) => !value)}
                className="relative text-gray-700 hover:text-[#0B5FFF]"
              >
                <Bell size={20} className="cursor-pointer" />
                {totalAlertCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {totalAlertCount > 9 ? "9+" : totalAlertCount}
                  </span>
                )}
              </button>

              {showReviewPanel && totalAlertCount > 0 && (
                <div className="absolute right-0 top-full z-50 mt-3 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                  <div className="mb-2 flex items-center justify-between px-2 pt-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">Reviews</p>
                    <span className="text-[10px] font-medium text-[#0B5FFF]">{totalAlertCount} new</span>
                  </div>

                  <div className="space-y-2">
                    {reviewAlerts.map((alert) => {
                      const label = /helper/i.test(alert.message)
                        ? "Rate the Caddy"
                        : /customer/i.test(alert.message)
                          ? "Rate the customer"
                          : "Leave a review";

                      return (
                        <button
                          key={alert.id}
                          type="button"
                          onClick={() => void handleReviewClick(alert.id, alert.task_id)}
                          className="flex w-full items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2 py-2 text-left transition hover:border-blue-200 hover:bg-blue-50"
                        >
                          <span className="mt-0.5 rounded-full bg-yellow-100 p-1 text-yellow-600">
                            <Star size={12} fill="currentColor" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold text-gray-900">{label}</span>
                            <span className="mt-0.5 block text-[11px] leading-relaxed text-gray-500">
                              {alert.message.replace(/^Task\s+.+?\s+is complete\.\s+/i, "").replace(/please leave a quick rating for the .*?\.?$/i, "Please leave a star rating with an optional comment.")}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
            to={role.signedIn ? "/post-task" : "/login?redirect=%2Fpost-task"}
            className="rounded-full bg-[#0B5FFF] px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Post a Task
          </Link>
        </div>
      </div>
    </header>
  );
}