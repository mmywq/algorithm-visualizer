import type { CSSProperties, ReactNode } from 'react';
import type { ColorName } from '@/content/catalog';

interface WindowProps {
  readonly title: ReactNode;
  readonly children: ReactNode;
  readonly color?: ColorName;
  readonly actions?: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly as?: 'section' | 'div' | 'article' | 'aside';
}

/** Окно в духе ретро-интерфейса: полоса заголовка с пиксельным шрифтом и три «кнопки». */
export function Window({ title, children, color, actions, className = '', bodyClassName = '', as: Tag = 'section' }: WindowProps) {
  const style = color === undefined ? undefined : ({ '--cat': `var(--c-${color})`, '--cat-press': `var(--c-${color}-press)` } as CSSProperties);
  return (
    <Tag className={`window ${className}`} style={style}>
      <div className="window-bar">
        <span className="window-title">{title}</span>
        {actions}
        <span aria-hidden="true" className="window-dots">
          <span className="bg-brand" />
          <span className="bg-yellow" />
          <span className="bg-green" />
        </span>
      </div>
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}
