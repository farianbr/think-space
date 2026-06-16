import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Users, ArrowRight, MailCheck } from "../lib/icons";
import { api } from "../lib/api";
import { useAuth } from "../contexts/authContext";
import { Button, Spinner } from "../components/ui";
import { roleMeta } from "../lib/roles";

function Shell({ children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-sunken p-4">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-8 shadow-pop">
        {children}
      </div>
    </div>
  );
}

export default function InvitePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .get(`/invites/${token}`)
      .then((res) => active && setInvite(res.data.invite))
      .catch((err) => active && setError(err?.response?.data?.message || "Invitation not found"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    try {
      const res = await api.post(`/invites/${token}/accept`);
      toast.success("Invitation accepted");
      navigate(`/board/${res.data.boardId}`, { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not accept invitation");
      setAccepting(false);
    }
  };

  const goAuth = (path) =>
    navigate(path, {
      state: { from: { pathname: `/invite/${token}` }, email: invite?.email },
    });

  if (loading) {
    return (
      <Shell>
        <div className="flex justify-center py-6">
          <Spinner size="lg" />
        </div>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-ink">Invitation unavailable</h1>
        <p className="mt-2 text-sm text-muted">{error}</p>
        <Button className="mt-6 w-full justify-center" onClick={() => navigate("/")}>
          Go home
        </Button>
      </Shell>
    );
  }

  const role = roleMeta(invite.role)?.label || invite.role;

  if (invite.expired) {
    return (
      <Shell>
        <h1 className="text-lg font-semibold text-ink">This invitation has expired</h1>
        <p className="mt-2 text-sm text-muted">
          Ask {invite.inviterName} to send you a new invitation to "{invite.boardTitle}".
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Users className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <h1 className="mt-4 text-xl font-semibold text-ink">You've been invited</h1>
      <p className="mt-2 text-sm text-muted">
        <strong className="text-ink">{invite.inviterName}</strong> invited you to join{" "}
        <strong className="text-ink">"{invite.boardTitle}"</strong> as{" "}
        <strong className="text-ink">{role}</strong>.
      </p>

      {user ? (
        <Button
          className="mt-6 w-full justify-center"
          iconRight={ArrowRight}
          loading={accepting}
          onClick={accept}
        >
          {invite.accepted ? "Open board" : "Accept invitation"}
        </Button>
      ) : (
        <div className="mt-6 flex flex-col gap-2">
          <p className="flex items-center gap-2 rounded-lg bg-sunken px-3 py-2 text-xs text-muted">
            <MailCheck className="size-4 shrink-0 text-accent" aria-hidden />
            Invitation sent to {invite.email}
          </p>
          <Button
            className="w-full justify-center"
            iconRight={ArrowRight}
            onClick={() => goAuth("/register")}
          >
            Create account & join
          </Button>
          <Button
            variant="secondary"
            className="w-full justify-center"
            onClick={() => goAuth("/login")}
          >
            I already have an account
          </Button>
        </div>
      )}
    </Shell>
  );
}
