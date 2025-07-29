import i18n from 'i18next';
import { initReactI18next } from '../../node_modules/react-i18next';
import enTranslations from './locales/en.json';
import jaTranslations from './locales/ja.json';

const resources = {
  en: {
    translation: enTranslations
  },
  ja: {
    translation: jaTranslations
  }
};

// Get saved language from localStorage or default to system language
const getSavedLanguage = () => {
  const saved = localStorage.getItem('dataflow-language');
  if (saved && (saved === 'en' || saved === 'ja')) {
    return saved;
  }
  
  // Try to detect browser language
  const browserLang = navigator.language.toLowerCase();
  if (browserLang.startsWith('ja')) {
    return 'ja';
  }
  return 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Save language preference when it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('dataflow-language', lng);
});

export default i18n;