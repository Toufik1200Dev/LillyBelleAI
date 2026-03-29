// ─── Date Formatting ──────────────────────────────────────────────────────────

const locale = 'fr-FR';

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "à l'instant";
  if (diffMinutes < 60) return `il y a ${diffMinutes} min`;
  if (diffHours < 24) return `il y a ${diffHours} h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `il y a ${diffDays} j`;

  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function groupByDate(items: Array<{ created_at: string }>): Map<string, typeof items> {
  const groups = new Map<string, typeof items>();

  for (const item of items) {
    const date = new Date(item.created_at);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    let key: string;
    if (diffDays === 0) key = "Aujourd'hui";
    else if (diffDays === 1) key = 'Hier';
    else if (diffDays < 7) key = 'Cette semaine';
    else if (diffDays < 30) key = 'Ce mois-ci';
    else key = 'Plus ancien';

    const group = groups.get(key) ?? [];
    group.push(item);
    groups.set(key, group);
  }

  return groups;
}
