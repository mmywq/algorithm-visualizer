import { PixelCat, type CatPose } from '@/components/mascot/PixelCat';

const poses: readonly CatPose[] = ['sit', 'happy', 'cry', 'wow', 'think', 'sleep', 'peek'];

/** Служебная витрина компонентов: доступна только в режиме разработки. */
export default function DesignPreviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="h-display">Витрина дизайна</h1>
      <section className="window">
        <div className="window-bar">
          <span className="window-title">Кэш — позы</span>
          <span className="window-dots">
            <span className="bg-brand" />
            <span className="bg-yellow" />
            <span className="bg-green" />
          </span>
        </div>
        <div className="flex flex-wrap items-end gap-10 p-8">
          {poses.map((pose) => (
            <div className="flex flex-col items-center gap-3" key={pose}>
              <PixelCat glow interactive pose={pose} size={156} />
              <span className="font-display text-[16px] text-ink-2">{pose}</span>
            </div>
          ))}
        </div>
        <div className="flex items-end gap-6 border-t-2 border-line p-6">
          {[26, 52, 78, 104].map((size) => (
            <PixelCat key={size} size={size} />
          ))}
        </div>
      </section>
      <section className="flex flex-wrap gap-3">
        <button className="btn btn-primary btn-lg font-display text-[24px]" type="button">
          Начать ▶
        </button>
        <button className="btn btn-green" type="button">
          Проверить
        </button>
        <button className="btn btn-yellow" type="button">
          Награда
        </button>
        <button className="btn btn-secondary" type="button">
          Вторичная
        </button>
        <button className="btn btn-ghost" type="button">
          Призрачная
        </button>
        <span className="tag border-green text-green">УР. 03</span>
        <span className="tag border-brand text-brand">+20 XP</span>
      </section>
    </div>
  );
}
