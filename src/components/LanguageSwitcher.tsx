import { useI18n } from '../i18n/I18nContext';
import type { Locale } from '../i18n/messages';

const OPTIONS: { value: Locale; short: string }[] = [
  { value: 'fr', short: 'FR' },
  { value: 'he', short: 'עב' },
];

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="lang-switch" role="group" aria-label={t('nav.language')}>
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={
            locale === option.value ? 'lang-option active' : 'lang-option'
          }
          aria-pressed={locale === option.value}
          onClick={() => setLocale(option.value)}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}
