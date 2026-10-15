import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { PixelCat } from '@/components/mascot/PixelCat';
import { Dialog } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toaster';
import { brand } from '@/config/brand';
import { isUserData, mergeUserData, normalizeUserData } from '@/lib/userData';
import { useUserStore } from '@/stores/userStore';

/** Резервная копия прогресса в файл, восстановление из файла и полный сброс. */
export function DataControls() {
  const data = useUserStore((state) => state.data);
  const replaceData = useUserStore((state) => state.replaceData);
  const resetData = useUserStore((state) => state.resetData);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const exportData = (): void => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${brand.name.toLowerCase()}-progress-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Файл с прогрессом сохранён', 'Его можно перенести на другой компьютер и загрузить здесь же.');
  };

  const importData = async (file: File): Promise<void> => {
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isUserData(parsed)) throw new Error('format');
      replaceData(mergeUserData(data, normalizeUserData(parsed)));
      toast.success('Прогресс загружен', 'Данные из файла объединены с текущими — ничего не потерялось.');
    } catch {
      toast.error('Не удалось прочитать файл', 'Нужен файл, сохранённый кнопкой «Скачать копию».');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button className="btn btn-secondary btn-sm" onClick={exportData} type="button">
        <Download size={16} strokeWidth={2.5} />
        Скачать копию
      </button>
      <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()} type="button">
        <Upload size={16} strokeWidth={2.5} />
        Загрузить из файла
      </button>
      <input
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) void importData(file);
          event.target.value = '';
        }}
        ref={fileRef}
        type="file"
      />
      <button className="btn btn-ghost btn-sm text-red hover:bg-red/10 hover:text-red" onClick={() => setConfirmReset(true)} type="button">
        <RotateCcw size={16} strokeWidth={2.5} />
        Сбросить прогресс
      </button>

      <Dialog
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setConfirmReset(false)} type="button">
              Отмена
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                resetData();
                setConfirmReset(false);
                toast.info('Прогресс сброшен', 'Начинаем с чистого листа.');
              }}
              type="button"
            >
              Сбросить
            </button>
          </>
        }
        onClose={() => setConfirmReset(false)}
        open={confirmReset}
        size="sm"
        title="Сбросить весь прогресс?"
      >
        <div className="flex items-center gap-4">
          <PixelCat pose="cry" size={78} />
          <p className="text-[15px] font-semibold leading-6 text-ink-2">
            Опыт, достижения, серия дней, избранное и сохранённые наборы будут удалены с этого устройства. Перед сбросом можно скачать резервную копию.
          </p>
        </div>
      </Dialog>
    </div>
  );
}
