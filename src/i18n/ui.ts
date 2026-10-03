/**
 * The site's own interface words in each language: buttons, labels and headings that wrap the
 * page content. Page content itself lives in src/content/translations/.
 *
 * English pages keep their existing wording in the components; these strings are used where a
 * component is shown on a Hindi or Punjabi page.
 */
export const LANGS = ['en', 'hi', 'pa'] as const;
export type Lang = (typeof LANGS)[number];

interface UiStrings {
  /** The language's own name for itself, as shown in the switcher. */
  name: string;
  htmlLang: string;
  ogLocale: string;
  /** Where the language's home page is. */
  home: string;
  homeCrumb: string;
  skip: string;
  updated: string;
  readNext: string;
  faq: string;
  call: string;
  calculate: string;
  inspection: string;
  calculator: string;
  languages: string;
  englishNote: string;
}

export const UI: Record<Lang, UiStrings> = {
  en: {
    name: 'English',
    htmlLang: 'en-IN',
    ogLocale: 'en_IN',
    home: '/',
    homeCrumb: 'Home',
    skip: 'Skip to content',
    updated: 'Updated',
    readNext: 'Read next',
    faq: 'Questions we are asked',
    call: 'Call',
    calculate: 'Calculate',
    inspection: 'Book a free site inspection',
    calculator: 'Or work it out in the calculator',
    languages: 'Language',
    englishNote: '',
  },
  hi: {
    name: 'हिन्दी',
    htmlLang: 'hi-IN',
    ogLocale: 'hi_IN',
    home: '/hi/',
    homeCrumb: 'होम',
    skip: 'मुख्य सामग्री पर जाएँ',
    updated: 'अपडेट किया गया',
    readNext: 'आगे पढ़ें',
    faq: 'अक्सर पूछे जाने वाले सवाल',
    call: 'कॉल करें',
    calculate: 'हिसाब',
    inspection: 'मुफ़्त साइट निरीक्षण बुक करें',
    calculator: 'या कैलकुलेटर में हिसाब लगाएँ (अंग्रेज़ी में)',
    languages: 'भाषा',
    englishNote: 'हमारी बाकी गाइड अभी अंग्रेज़ी में हैं।',
  },
  pa: {
    name: 'ਪੰਜਾਬੀ',
    htmlLang: 'pa-IN',
    ogLocale: 'pa_IN',
    home: '/pa/',
    homeCrumb: 'ਹੋਮ',
    skip: 'ਮੁੱਖ ਸਮੱਗਰੀ ਤੇ ਜਾਓ',
    updated: 'ਅੱਪਡੇਟ ਕੀਤਾ',
    readNext: 'ਅੱਗੇ ਪੜ੍ਹੋ',
    faq: 'ਅਕਸਰ ਪੁੱਛੇ ਜਾਂਦੇ ਸਵਾਲ',
    call: 'ਕਾਲ ਕਰੋ',
    calculate: 'ਹਿਸਾਬ',
    inspection: 'ਮੁਫ਼ਤ ਸਾਈਟ ਨਿਰੀਖਣ ਬੁੱਕ ਕਰੋ',
    calculator: 'ਜਾਂ ਕੈਲਕੁਲੇਟਰ ਵਿੱਚ ਹਿਸਾਬ ਲਗਾਓ (ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ)',
    languages: 'ਭਾਸ਼ਾ',
    englishNote: 'ਸਾਡੀਆਂ ਬਾਕੀ ਗਾਈਡਾਂ ਹਾਲੇ ਅੰਗਰੇਜ਼ੀ ਵਿੱਚ ਹਨ।',
  },
};

/** The path a translation is served at. */
export const translationPath = (id: string) => {
  const [lang, ...rest] = id.split('/');
  const slug = rest.join('/');
  return slug === '' || slug === 'index' ? `/${lang}/` : `/${lang}/${slug}/`;
};
