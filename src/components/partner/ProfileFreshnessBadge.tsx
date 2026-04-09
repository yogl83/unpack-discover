import { Badge } from "@/components/ui/badge";

interface ProfileFreshnessProps {
  profile: {
    status: string;
    is_current: boolean;
    updated_at: string;
  } | null;
  compact?: boolean;
}

export function ProfileFreshnessBadge({ profile, compact }: ProfileFreshnessProps) {
  if (!profile) {
    return (
      <Badge variant="outline" className="bg-muted text-muted-foreground border-muted">
        {compact ? "—" : "Нет профайла"}
      </Badge>
    );
  }

  if (profile.status === "draft") {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        {compact ? "Черновик" : "Черновик"}
      </Badge>
    );
  }

  if (profile.status === "review") {
    return (
      <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
        {compact ? "Ревью" : "На рассмотрении"}
      </Badge>
    );
  }

  if (profile.status === "approved" && profile.is_current) {
    const daysSinceUpdate = Math.floor(
      (Date.now() - new Date(profile.updated_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUpdate > 90) {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
          {compact ? "Устарел" : "Устарел"}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
        {compact ? "Актуален" : "Актуален"}
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-muted text-muted-foreground">
      {profile.status === "archived" ? "Архив" : profile.status}
    </Badge>
  );
}
