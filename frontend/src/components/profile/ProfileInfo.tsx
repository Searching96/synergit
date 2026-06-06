import { Users } from "lucide-react";

interface ProfileInfoProps {
  username: string;
}

export default function ProfileInfo({ username }: ProfileInfoProps) {
  const avatarInitial = (username.trim().charAt(0) || "U").toUpperCase();

  return (
    <aside className="w-full lg:w-[320px]">
      <div className="max-w-full mx-auto lg:mx-0">
        <div
          className="w-[90%] aspect-square rounded-full border border-[var(--border-default)] bg-[var(--surface-subtle)] text-[120px] font-semibold text-[var(--text-primary)] flex items-center justify-center"
          aria-label={`${username} avatar`}
        >
          {avatarInitial}
        </div>
        <p className="text-[30px] leading-[34px] font-semibold text-[var(--text-primary)]">{username}</p>
        <button
          type="button"
          className="mt-4 h-8 w-[90%] rounded-md border border-[var(--border-default)] bg-[var(--surface-subtle)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-button-muted)]"
        >
          Edit profile
        </button>
        <p className="mt-4 text-sm text-[var(--text-secondary)] inline-flex items-center gap-2">
          <Users size={14} /> 0 follower &middot; 0 following
        </p>
      </div>
    </aside>
  );
}
