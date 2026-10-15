import { Check, Copy, Download } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Switch } from '@/components/ui/Switch';
import { Tabs } from '@/components/ui/Tabs';
import { getSiteOrigin } from '@/config/brand';
import type { AlgorithmEntry } from '@/content/catalog';
import { copyText } from '@/lib/clipboard';
import { useDemoStateStore } from '@/stores/demoStateStore';

type ShareTab = 'link' | 'qr' | 'embed';

interface ShareDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly entry: AlgorithmEntry;
  readonly initialTab?: ShareTab;
}

const buildUrl = (entry: AlgorithmEntry, options: { step?: number; embed?: boolean }): string => {
  const params = new URLSearchParams(window.location.search);
  params.delete('tab');
  params.delete('embed');
  params.delete('s');
  if (options.step !== undefined && options.step > 0) params.set('s', String(options.step + 1));
  if (options.embed === true) params.set('embed', '1');
  const query = params.toString();
  return `${getSiteOrigin()}${entry.path}${query.length > 0 ? `?${query}` : ''}`;
};

function CopyField({ value, label, multiline = false }: { readonly value: string; readonly label: string; readonly multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = async (): Promise<void> => {
    if (await copyText(value)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  };
  return (
    <div>
      <p className="label">{label}</p>
      <div className={`flex gap-2 ${multiline ? 'flex-col' : ''}`}>
        {multiline ? (
          <textarea aria-label={label} className="input min-h-[96px] font-mono text-[13px]" readOnly rows={4} value={value} />
        ) : (
          <input aria-label={label} className="input font-mono text-[13px]" onFocus={(event) => event.target.select()} readOnly value={value} />
        )}
        <button className={`btn ${copied ? 'btn-green' : 'btn-primary'} ${multiline ? 'self-start' : ''}`} onClick={() => void copy()} type="button">
          {copied ? <Check size={18} strokeWidth={3} /> : <Copy size={18} strokeWidth={2.5} />}
          {copied ? 'Скопировано' : 'Копировать'}
        </button>
      </div>
    </div>
  );
}

export function ShareDialog({ open, onClose, entry, initialTab = 'link' }: ShareDialogProps) {
  const step = useDemoStateStore((state) => state.index);
  const [tab, setTab] = useState<ShareTab>(initialTab);
  const [withStep, setWithStep] = useState(step > 0);
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTab(initialTab);
    setWithStep(useDemoStateStore.getState().index > 0);
  }, [open, initialTab]);

  const link = useMemo(() => (open ? buildUrl(entry, withStep ? { step } : {}) : ''), [open, entry, withStep, step]);
  const embedUrl = useMemo(() => (open ? buildUrl(entry, { embed: true, ...(withStep ? { step } : {}) }) : ''), [open, entry, withStep, step]);
  const embedCode = `<iframe src="${embedUrl}" title="${entry.title}" width="100%" height="720" style="border:0;border-radius:16px" allow="fullscreen; clipboard-write" loading="lazy"></iframe>`;

  useEffect(() => {
    if (!open || tab !== 'qr') return;
    let cancelled = false;
    void import('qrcode').then((QRCode) =>
      QRCode.toDataURL(link, { margin: 1, width: 560, errorCorrectionLevel: 'M', color: { dark: '#1b1f2b', light: '#ffffff' } }).then((url) => {
        if (!cancelled) setQr(url);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [open, tab, link]);

  return (
    <Dialog
      description="Ссылка открывает демонстрацию с теми же входными данными. Удобно для домашних заданий и показа на лекции."
      onClose={onClose}
      open={open}
      title="Поделиться демонстрацией"
    >
      <Tabs
        ariaLabel="Способ"
        items={[
          { value: 'link', label: 'Ссылка' },
          { value: 'qr', label: 'QR-код' },
          { value: 'embed', label: 'Встроить' },
        ]}
        onChange={setTab}
        stretch
        value={tab}
      />

      <div className="mt-5">
        <Switch
          checked={withStep}
          description={step > 0 ? `Откроется сразу на шаге ${step + 1}` : 'Сначала выберите шаг в плеере'}
          disabled={step === 0}
          label="С текущего шага"
          onChange={setWithStep}
        />
      </div>

      <div className="mt-5">
        {tab === 'link' && <CopyField label="Ссылка" value={link} />}
        {tab === 'qr' && (
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-3xl border-2 border-line bg-white p-4">
              {qr === null ? (
                <div className="skeleton h-64 w-64" />
              ) : (
                <img alt="QR-код ссылки на демонстрацию" className="h-64 w-64" height={256} src={qr} width={256} />
              )}
            </div>
            <p className="text-center text-[15px] font-semibold text-ink-2">Выведите код на проектор — студенты откроют демонстрацию на телефонах.</p>
            {qr !== null && (
              <a className="btn btn-secondary" download={`${entry.id}-qr.png`} href={qr}>
                <Download size={18} strokeWidth={2.5} />
                Скачать PNG
              </a>
            )}
          </div>
        )}
        {tab === 'embed' && (
          <div className="flex flex-col gap-3">
            <CopyField label="HTML-код для Moodle, Stepik, Google Classroom или сайта курса" multiline value={embedCode} />
            <p className="text-sm font-semibold text-ink-3">Во встроенном виде показывается только демонстрация с плеером — без меню и навигации сайта.</p>
          </div>
        )}
      </div>
    </Dialog>
  );
}
