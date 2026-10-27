import { motion } from 'framer-motion';
import { ArrowRight, BarChart3, Check, ChevronDown, Code2, MonitorPlay, Presentation, QrCode, ShieldCheck, Users, WifiOff } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Marquee } from '@/components/fx/Marquee';
import { Reveal } from '@/components/fx/Reveal';
import { CatSays } from '@/components/mascot/CatSays';
import { PixelCat } from '@/components/mascot/PixelCat';
import { categoryVars } from '@/components/ui/cat';
import { CategoryIcon } from '@/components/ui/CategoryArt';
import { Window } from '@/components/ui/Window';
import { catalog, categories, entriesOfCategory } from '@/content/catalog';
import { usePageMeta } from '@/hooks/usePageMeta';
import { submitLicenseRequest, type LicenseRequest } from '@/lib/leads';
import { pluralize } from '@/lib/progress';

const features = [
  {
    icon: Presentation,
    color: 'brand',
    title: 'Режим лекции',
    text: 'Демонстрация на весь экран проектора, управление с клавиатуры или презентационного пульта, крупный текст пояснений.',
  },
  {
    icon: Users,
    color: 'cyan',
    title: 'Классы и задания',
    text: 'Студенты вступают по коду или QR. Задание — набор алгоритмов со сроком; засчитывается за теорию, демонстрацию и тест.',
  },
  {
    icon: BarChart3,
    color: 'green',
    title: 'Сводка прогресса',
    text: 'Таблица по группе: кто что прошёл, на каком этапе застрял. Видно прогресс каждого студента по каждому алгоритму.',
  },
  {
    icon: Code2,
    color: 'purple',
    title: 'Встраивание в LMS',
    text: 'Код для Moodle, Stepik, Google Classroom или сайта курса: в материалы встраивается только демонстрация с плеером.',
  },
  {
    icon: QrCode,
    color: 'yellow',
    title: 'Ссылка на шаг',
    text: 'Поделитесь точным состоянием: тот же массив, тот же граф, тот же шаг. Удобно для разбора ошибок и домашних заданий.',
  },
  {
    icon: WifiOff,
    color: 'orange',
    title: 'Без установки и офлайн',
    text: 'Работает в браузере на любых компьютерах аудитории; после первой загрузки — и без интернета.',
  },
] as const;

const tiers = [
  {
    name: 'Школа',
    color: 'green',
    audience: 'для школ, лицеев и кружков',
    items: ['все демонстрации, теория и тесты', 'классы и задания', 'режим лекции и QR-ссылки'],
  },
  {
    name: 'Кафедра',
    color: 'brand',
    audience: 'для кафедры или факультета',
    items: ['всё из формата «Школа»', 'встраивание в LMS курса', 'сводка прогресса по группам'],
    featured: true,
  },
  {
    name: 'Вуз',
    color: 'purple',
    audience: 'для всего учебного заведения',
    items: ['всё из формата «Кафедра»', 'несколько кафедр и преподавателей', 'размещение на домене вуза', 'помощь с внедрением'],
  },
] as const;

const faq = [
  {
    q: 'Нужно ли что-то устанавливать на компьютеры аудитории?',
    a: 'Нет. Достаточно современного браузера. Сайт можно добавить на рабочий стол как приложение — тогда он откроется и без интернета.',
  },
  {
    q: 'Можно ли пользоваться бесплатно?',
    a: 'Все демонстрации, теория и тесты открыты без регистрации. Лицензия добавляет инструменты для преподавателя: классы, задания, сводку прогресса и встраивание.',
  },
  {
    q: 'Где хранятся данные студентов?',
    a: 'Для работы классов хранятся только имя, почта и прогресс по алгоритмам. Преподаватель видит лишь прогресс своих студентов. Подробности — в политике конфиденциальности.',
  },
  {
    q: 'Подходит ли содержание к нашей программе?',
    a: `${catalog.length} алгоритмов в ${categories.length} разделах повторяют классический курс «Алгоритмы и структуры данных»: от стека и очереди до графов, динамического программирования и строк.`,
  },
  {
    q: 'Как оформить договор и получить закрывающие документы?',
    a: 'Оставьте заявку — мы свяжемся, согласуем формат лицензии, число пользователей и подготовим договор.',
  },
];

export default function SchoolsPage() {
  usePageMeta({
    title: 'Для вузов, колледжей и школ',
    description: 'Наглядное пособие по алгоритмам и структурам данных для преподавателей: режим лекции, классы и задания, сводка прогресса, встраивание в LMS.',
  });

  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      <Hero />
      <div className="relative left-1/2 -my-6 w-screen -translate-x-1/2 sm:-my-10">
        <Marquee
          color="cyan"
          items={['режим лекции', 'классы и задания', 'сводка прогресса', 'встраивание в LMS', 'офлайн в аудитории', `${catalog.length} алгоритмов`]}
          reverse
        />
      </div>
      <Features />
      <Steps />
      <Coverage />
      <Pricing />
      <Faq />
      <RequestForm />
    </div>
  );
}

function Hero() {
  const sample = [
    { name: 'Студент 1', cells: [1, 1, 1, 0.66] },
    { name: 'Студент 2', cells: [1, 1, 0.33, 0] },
    { name: 'Студент 3', cells: [1, 1, 1, 1] },
    { name: 'Студент 4', cells: [0.66, 0.33, 0, 0] },
  ];
  return (
    <section className="grid grid-cols-1 items-center gap-12 pt-4 lg:grid-cols-[1.05fr_1fr] lg:pt-10">
      <div>
        <p className="tag border-cyan text-cyan">ДЛЯ ВУЗОВ, КОЛЛЕДЖЕЙ И ШКОЛ</p>
        <h1 className="h-display mt-6 text-ink">
          Наглядное пособие по алгоритмам <span className="text-brand">для всей группы</span>
        </h1>
        <p className="mt-6 max-w-xl text-[18px] font-semibold leading-8 text-ink-2">
          Покажите алгоритм на лекции, выдайте задание и смотрите, кто разобрался, а кому нужна помощь. Студенты занимаются в своём темпе — с теорией, анимацией
          и тестами.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a className="btn btn-primary btn-lg font-display text-[24px]" href="#request">
            Оставить заявку ▶
          </a>
          <Link className="btn btn-secondary btn-lg" to="/catalog">
            <MonitorPlay size={20} strokeWidth={2.5} />
            Посмотреть демонстрации
          </Link>
        </div>
      </div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="relative pt-14"
        initial={{ opacity: 0, y: 20 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 160, damping: 20 }}
      >
        <div className="absolute -top-[1px] right-6 z-[2]">
          <PixelCat pose="peek" size={64} />
        </div>
        <Window bodyClassName="p-4 sm:p-5" className="relative z-[1] shadow-pixel-lg" color="cyan" title="группа_ивт-21.exe">
          <p className="text-sm font-bold text-ink-3">Задание «Сортировки» · срок 20 октября</p>
          <div className="mt-3 overflow-hidden rounded-xl border-2 border-line">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-surface-2 text-[12px] font-extrabold text-ink-2">
                  <th className="px-3 py-2" scope="col">
                    Студент
                  </th>
                  {['Пузырёк', 'Вставки', 'Слияние', 'Быстрая'].map((title) => (
                    <th className="px-2 py-2 text-center" key={title} scope="col">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.map((row) => (
                  <tr className="border-t-2 border-line" key={row.name}>
                    <th className="px-3 py-2 font-bold text-ink" scope="row">
                      {row.name}
                    </th>
                    {row.cells.map((value, index) => (
                      <td className="px-2 py-2 text-center" key={index}>
                        {value === 1 ? (
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border-2 border-green-press bg-green text-on">
                            <Check size={14} strokeWidth={3.5} />
                          </span>
                        ) : (
                          <span className="font-display text-[16px] text-ink-3">{Math.round(value * 3)}/3</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] font-bold text-ink-3">Пример сводки: так преподаватель видит прогресс группы по заданию.</p>
            <Link className="btn btn-secondary btn-sm" to="/cabinet/classes/demo">
              Открыть демо-класс
              <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </Window>
      </motion.div>
    </section>
  );
}

function Features() {
  return (
    <section aria-labelledby="features-title">
      <p className="tag border-brand text-brand">ВОЗМОЖНОСТИ</p>
      <h2 className="h-section mt-3" id="features-title">
        Всё, что нужно преподавателю
      </h2>
      <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Reveal as="li" className="card h-full p-6" delay={(index % 3) * 0.06} key={feature.title}>
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl border-2 text-on"
                style={{
                  background: `rgb(var(--c-${feature.color}))`,
                  borderColor: `rgb(var(--c-${feature.color}-press))`,
                  boxShadow: `0 4px 0 rgb(var(--c-${feature.color}-press))`,
                }}
              >
                <Icon size={24} strokeWidth={2.5} />
              </span>
              <h3 className="mt-5 text-xl font-black text-ink">{feature.title}</h3>
              <p className="mt-2 text-[15px] font-semibold leading-6 text-ink-2">{feature.text}</p>
            </Reveal>
          );
        })}
      </ul>
    </section>
  );
}

function Steps() {
  const steps = [
    { title: 'Создайте класс', text: 'Один клик в личном кабинете — и у класса есть код и QR для студентов.' },
    { title: 'Выдайте задание', text: 'Отметьте алгоритмы из программы и поставьте срок. Студенты увидят задание у себя.' },
    { title: 'Следите за прогрессом', text: 'Сводка показывает, кто прошёл теорию, демонстрацию и тест по каждому алгоритму.' },
  ];
  return (
    <section aria-labelledby="steps-title">
      <p className="tag border-green text-green">КАК ЭТО РАБОТАЕТ</p>
      <h2 className="h-section mt-3" id="steps-title">
        Три шага до первой пары
      </h2>
      <ol className="mt-8 grid gap-5 md:grid-cols-3">
        {steps.map((step, index) => (
          <Reveal as="li" className="card relative h-full overflow-hidden p-6" delay={index * 0.08} key={step.title}>
            <span aria-hidden="true" className="absolute -right-2 -top-6 font-display text-[96px] leading-none text-line">
              {index + 1}
            </span>
            <h3 className="relative text-xl font-black text-ink">{step.title}</h3>
            <p className="relative mt-2 text-[15px] font-semibold leading-6 text-ink-2">{step.text}</p>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

function Coverage() {
  return (
    <Reveal>
      <Window bodyClassName="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_1.3fr] lg:items-center" color="purple" title="program.txt">
        <div>
          <p className="tag border-purple text-purple">ПРОГРАММА</p>
          <h2 className="h-section mt-4">Покрывает курс «Алгоритмы и структуры данных»</h2>
          <p className="mt-3 text-[16px] font-semibold leading-7 text-ink-2">
            Разделы идут в порядке типовой рабочей программы. Каждый алгоритм — отдельная страница, которую можно выдать в задании или встроить в материалы
            курса.
          </p>
          <div className="mt-6 flex items-end gap-3">
            <PixelCat pose="happy" size={78} />
            <CatSays className="mb-6 max-w-[240px]" tail="left" text={`${catalog.length} алгоритмов — и я знаю их все!`} />
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {categories.map((category) => {
            const count = entriesOfCategory(category.id).length;
            return (
              <li
                className="flex items-center gap-3 rounded-xl border-2 border-line bg-surface-2 px-3 py-2.5"
                key={category.id}
                style={categoryVars(category.id)}
              >
                <CategoryIcon category={category.id} className="shrink-0 text-cat" size={20} />
                <span className="min-w-0 flex-1 truncate font-bold text-ink">{category.title}</span>
                <span className="font-display text-[16px] text-ink-3">{count}</span>
              </li>
            );
          })}
        </ul>
      </Window>
    </Reveal>
  );
}

function Pricing() {
  return (
    <section aria-labelledby="pricing-title">
      <p className="tag border-yellow text-yellow">ЛИЦЕНЗИИ</p>
      <h2 className="h-section mt-3" id="pricing-title">
        Выберите формат
      </h2>
      <p className="mt-3 max-w-2xl text-[17px] font-semibold leading-7 text-ink-2">
        Стоимость зависит от числа пользователей и срока. Оставьте заявку — подготовим предложение под ваш курс.
      </p>
      <div className="mt-8 grid gap-5 lg:grid-cols-3">
        {tiers.map((tier, index) => (
          <Reveal delay={index * 0.06} key={tier.name}>
            <Window
              bodyClassName="flex h-full flex-col p-6"
              className={`h-full ${'featured' in tier ? 'shadow-pixel-lg' : ''}`}
              color={tier.color}
              title={'featured' in tier ? `${tier.name.toUpperCase()} ★ ЧАЩЕ ВЫБИРАЮТ` : tier.name.toUpperCase()}
            >
              <h3 className="font-display text-[32px] leading-none text-ink">{tier.name}</h3>
              <p className="mt-2 text-[15px] font-semibold text-ink-2">{tier.audience}</p>
              <ul className="mt-5 flex flex-col gap-2.5">
                {tier.items.map((item) => (
                  <li className="flex items-start gap-2.5 text-[15px] font-bold text-ink" key={item}>
                    <Check className="mt-0.5 shrink-0 text-green" size={18} strokeWidth={3} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-7">
                <a className={`btn w-full ${'featured' in tier ? 'btn-primary' : 'btn-secondary'}`} href="#request">
                  Запросить предложение
                  <ArrowRight size={18} strokeWidth={2.75} />
                </a>
              </div>
            </Window>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section aria-labelledby="faq-title">
      <p className="tag border-cyan text-cyan">ВОПРОСЫ</p>
      <h2 className="h-section mt-3" id="faq-title">
        Частые вопросы
      </h2>
      <ul className="mt-8 flex flex-col gap-3">
        {faq.map((item, index) => {
          const expanded = open === index;
          return (
            <li className="card overflow-hidden" key={item.q}>
              <button
                aria-expanded={expanded}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
                onClick={() => setOpen(expanded ? null : index)}
                type="button"
              >
                <span className="min-w-0 flex-1 text-[17px] font-black text-ink">{item.q}</span>
                <ChevronDown className={`shrink-0 text-ink-3 transition-transform ${expanded ? 'rotate-180' : ''}`} size={22} strokeWidth={2.5} />
              </button>
              <motion.div animate={{ height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0 }} className="overflow-hidden" initial={false}>
                <p className="px-5 pb-5 text-[15px] font-semibold leading-7 text-ink-2">{item.a}</p>
              </motion.div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const emptyRequest: LicenseRequest = { name: '', organization: '', role: '', email: '', phone: '', students: '', message: '' };

function RequestForm() {
  const [form, setForm] = useState<LicenseRequest>(emptyRequest);
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'sent' | 'error'; message?: string }>({ status: 'idle' });

  const field = (key: keyof LicenseRequest) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: event.target.value }),
  });

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    if (form.name.trim().length < 2 || form.organization.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(form.email)) {
      setState({ status: 'error', message: 'Заполните имя, организацию и рабочую почту.' });
      return;
    }
    if (!consent) {
      setState({ status: 'error', message: 'Нужно согласие на обработку персональных данных.' });
      return;
    }
    setState({ status: 'sending' });
    const result = await submitLicenseRequest(form);
    if (result.ok) {
      setState({
        status: 'sent',
        message:
          result.via === 'cloud' ? 'Заявка отправлена! Мы свяжемся с вами по указанной почте.' : 'Открылось письмо с заявкой — отправьте его из своей почты.',
      });
      setForm(emptyRequest);
    } else {
      setState({ status: 'error', message: result.error });
    }
  };

  return (
    <section aria-labelledby="request-title" className="scroll-mt-24" id="request">
      <Window bodyClassName="grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[0.8fr_1.2fr]" color="brand" title="request.exe">
        <div>
          <p className="tag border-brand text-brand">ЗАЯВКА</p>
          <h2 className="h-section mt-4" id="request-title">
            Обсудим ваш курс
          </h2>
          <p className="mt-3 text-[16px] font-semibold leading-7 text-ink-2">
            Расскажите о курсе и группах — подготовим предложение и покажем, как устроены инструменты для преподавателя.
          </p>
          <p className="mt-5 flex items-start gap-2 text-sm font-bold text-ink-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-green" size={18} strokeWidth={2.5} />
            Данные используются только для ответа на заявку.
          </p>
          <PixelCat className="mt-6 hidden lg:inline-block" pose="sit" size={104} />
        </div>
        {state.status === 'sent' ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-green/50 bg-green/10 p-8 text-center">
            <PixelCat pose="happy" size={104} />
            <p className="mt-4 text-lg font-black text-ink">Спасибо!</p>
            <p className="mt-2 text-[15px] font-semibold text-ink-2">{state.message}</p>
          </div>
        ) : (
          <form className="grid gap-3 sm:grid-cols-2" noValidate onSubmit={(event) => void submit(event)}>
            <div>
              <label className="label" htmlFor="lead-name">
                Имя и фамилия *
              </label>
              <input autoComplete="name" className="input" id="lead-name" maxLength={80} {...field('name')} />
            </div>
            <div>
              <label className="label" htmlFor="lead-org">
                Учебное заведение *
              </label>
              <input autoComplete="organization" className="input" id="lead-org" maxLength={120} {...field('organization')} />
            </div>
            <div>
              <label className="label" htmlFor="lead-role">
                Должность
              </label>
              <input
                autoComplete="organization-title"
                className="input"
                id="lead-role"
                maxLength={80}
                placeholder="Преподаватель, заведующий кафедрой…"
                {...field('role')}
              />
            </div>
            <div>
              <label className="label" htmlFor="lead-students">
                Сколько студентов
              </label>
              <input className="input" id="lead-students" inputMode="numeric" maxLength={20} placeholder="Например: 120" {...field('students')} />
            </div>
            <div>
              <label className="label" htmlFor="lead-email">
                Рабочая почта *
              </label>
              <input autoComplete="email" className="input" id="lead-email" inputMode="email" maxLength={120} type="email" {...field('email')} />
            </div>
            <div>
              <label className="label" htmlFor="lead-phone">
                Телефон
              </label>
              <input autoComplete="tel" className="input" id="lead-phone" inputMode="tel" maxLength={30} type="tel" {...field('phone')} />
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="lead-message">
                Комментарий
              </label>
              <textarea
                className="input min-h-[96px]"
                id="lead-message"
                maxLength={1500}
                placeholder="Какой курс, сколько групп, когда планируете начать"
                rows={4}
                {...field('message')}
              />
            </div>
            <label className="flex items-start gap-3 text-sm font-semibold leading-5 text-ink-2 sm:col-span-2">
              <input
                checked={consent}
                className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--c-brand))]"
                onChange={(event) => setConsent(event.target.checked)}
                type="checkbox"
              />
              <span>
                Согласен(на) на обработку персональных данных в соответствии с{' '}
                <Link className="link" to="/privacy">
                  политикой конфиденциальности
                </Link>
                .
              </span>
            </label>
            {state.status === 'error' && (
              <p className="rounded-xl border-2 border-red/40 bg-red/10 px-3 py-2 text-sm font-bold text-red sm:col-span-2" role="alert">
                {state.message}
              </p>
            )}
            <button className="btn btn-primary btn-lg font-display text-[24px] sm:col-span-2" disabled={state.status === 'sending'} type="submit">
              {state.status === 'sending' ? 'Отправляем…' : 'Отправить заявку ▶'}
            </button>
            <p className="text-[13px] font-semibold text-ink-3 sm:col-span-2">
              Уже {catalog.length} {pluralize(catalog.length, 'демонстрация', 'демонстрации', 'демонстраций')} доступны бесплатно — заявка нужна только для
              инструментов преподавателя.
            </p>
          </form>
        )}
      </Window>
    </section>
  );
}
