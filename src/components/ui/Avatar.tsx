const avatarColors = ['brand', 'green', 'orange', 'pink', 'purple', 'teal', 'cyan', 'red'] as const;

export const AVATAR_COUNT = avatarColors.length;

export const avatarColor = (index: number): string => avatarColors[((index % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT]!;

const initials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((part) => part.length > 0);
  if (parts.length === 0) return '';
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
};

interface AvatarProps {
  readonly name: string;
  readonly avatar: number;
  readonly size?: number;
}

export function Avatar({ name, avatar, size = 36 }: AvatarProps) {
  const color = avatarColor(avatar);
  const text = initials(name);
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 select-none items-center justify-center rounded-full font-black text-on"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `rgb(var(--c-${color}))`,
        boxShadow: `inset 0 -${Math.max(2, size / 12)}px 0 rgb(var(--c-${color}-press))`,
      }}
    >
      {text.length > 0 ? (
        text
      ) : (
        <svg fill="none" height={size * 0.5} viewBox="0 0 24 24" width={size * 0.5}>
          <circle cx="12" cy="8" fill="currentColor" r="4.5" />
          <path d="M3.5 21c0-4.4 3.8-7.5 8.5-7.5s8.5 3.1 8.5 7.5" fill="currentColor" />
        </svg>
      )}
    </span>
  );
}
