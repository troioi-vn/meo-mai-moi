#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the locales directory
const localesDir = path.join(__dirname, '../src/i18n/locales');

// Keys that should be removed entirely (they exist in English as placeholders too)
const keysToRemove = [
  // English also has these as placeholders - they're auto-generated and not needed
  'redirecting_one',
  'redirecting_other', 
  'cooldownMessage_one',
  'cooldownMessage_other',
  'resendInButton_one', 
  'resendInButton_other',
  'sendAgainIn_one',
  'sendAgainIn_other',
  'resendIn_one',
  'resendIn_other',
  'limitError_one',
  'limitError_other',
  'other_one',
  'other_other',
  'year_one',
  'year_other',
  'month_one', 
  'month_other',
  'day_one',
  'day_other'
];

// Russian pluralization forms that should be properly translated
const russianPluralizationKeys = {
  // These need proper Russian pluralization (one, few, many, other)
  'redirecting_few': 'Перенаправление через {{count}} секунды...',
  'redirecting_many': 'Перенаправление через {{count}} секунд...',
  'cooldownMessage_few': 'Подождите {{count}} секунды перед повторной отправкой.',
  'cooldownMessage_many': 'Подождите {{count}} секунд перед повторной отправкой.',
  'resendInButton_few': 'Отправить через {{count}} сек',
  'resendInButton_many': 'Отправить через {{count}} сек',
  'sendAgainIn_few': 'Отправить снова через {{count}} сек',
  'sendAgainIn_many': 'Отправить снова через {{count}} сек',
  'resendIn_few': 'Отправить через {{count}} сек',
  'resendIn_many': 'Отправить через {{count}} сек',
  'limitError_few': 'Максимум {{count}} категории разрешено',
  'limitError_many': 'Максимум {{count}} категорий разрешено',
  'year_few': '{{count}} года',
  'year_many': '{{count}} лет', 
  'month_few': '{{count}} месяца',
  'month_many': '{{count}} месяцев',
  'day_few': '{{count}} дня',
  'day_many': '{{count}} дней'
};

// Keys that need proper Russian translation
const keysToTranslate = {
  // Auth translations
  'passwordsMustMatch': 'Пароли не совпадают.',
  'unexpectedError': 'Произошла неожиданная ошибка.',
  'completeForm': 'Заполните форму ниже, чтобы создать аккаунт',
  'generatePassword': 'Сгенерировать',
  'register': 'Зарегистрироваться',
  'emailChangeDisabledReason': 'Приглашённые аккаунты должны сохранить email, на который было отправлено приглашение. Попросите пригласившего отправить новую ссылку, если нужно сменить адрес.',
  'loading': 'Загрузка регистрации...',
  'orEmail': 'Или продолжить с email',
  
  // Titles and subtitles
  'waitlist': 'Присоединиться к списку ожидания',
  'complete': 'Завершить регистрацию',
  'create': 'Создать аккаунт',
  'open': 'Любой может присоединиться к нашему сообществу',
  'valid': 'У вас есть действительное приглашение',
  'inviteOnly': 'В настоящее время мы работаем только по приглашениям',
  
  // Forgot password
  'tooManyRequests': 'Слишком много запросов. Подождите перед повторной попыткой.',
  'errorGeneric': 'Не удалось отправить инструкции по сбросу. Попробуйте ещё раз.',
  'checkEmailTitle': 'Проверьте свой email',
  'checkEmailDescription': 'Мы отправили инструкции по сбросу пароля на {{email}}',
  'successToast': 'Инструкции по сбросу пароля отправлены на ваш email.',
  'sendAnotherEmail': 'Отправить другой email',
  'resetPasswordTitle': 'Сбросить пароль',
  'resetPasswordDescription': 'Введите ваш email адрес и мы отправим вам ссылку для сброса пароля',
  'sending': 'Отправка...',
  
  // Reset password
  'invalidTokenMessage': 'Неверная ссылка сброса. Отсутствует параметр email.',
  'invalidLink': 'Неверная ссылка сброса.',
  'invalidOrExpiredToken': 'Неверный или истёкший токен сброса.',
  'validationFailed': 'Не удалось проверить токен сброса. Попробуйте ещё раз.',
  'validatingTitle': 'Проверка ссылки сброса',
  'validatingDescription': 'Подождите, пока мы проверим вашу ссылку сброса пароля.',
  'invalidLinkTitle': 'Неверная ссылка сброса',
  'requestNewLabel': 'Запросить новую ссылку сброса',
  'successTitle': 'Пароль успешно сброшен',
  'successDescription': 'Ваш пароль был сброшен. Теперь вы можете войти с новым паролем.',
  'successAlert': 'Пароль успешно сброшен. Войдите с новым паролем.',
  'goToLogin': 'Перейти к входу',
  'emailLabel': 'Email адрес',
  'newPasswordPlaceholder': 'Введите новый пароль',
  'confirmPasswordPlaceholder': 'Подтвердите пароль',
  'resetting': 'Сброс пароля...',
  
  // Two factor / email verification
  'maxAttemptsReached': 'Вы достигли максимального количества попыток отправки.',
  'errorResend': 'Не удалось отправить письмо подтверждения повторно',
  'useAnotherEmail': 'Использовать другой email'
};

function cleanJsonFile(filePath) {
  console.log(`\n🔧 Processing: ${path.relative(localesDir, filePath)}`);
  
  const content = fs.readFileSync(filePath, 'utf8');
  let data;
  
  try {
    data = JSON.parse(content);
  } catch (error) {
    console.error(`❌ Error parsing JSON in ${filePath}:`, error.message);
    return;
  }
  
  let changes = 0;
  let removals = 0;
  
  function processObject(obj, keyPath = '') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = keyPath ? `${keyPath}.${key}` : key;
      
      if (typeof value === 'object' && value !== null) {
        processObject(value, fullKey);
      } else if (value === '__STRING_NOT_TRANSLATED__') {
        // Check if this key should be removed entirely
        if (keysToRemove.some(removeKey => key.includes(removeKey) || fullKey.includes(removeKey))) {
          delete obj[key];
          removals++;
          console.log(`  ❌ Removed: ${fullKey}`);
        }
        // Check if this is a Russian pluralization key
        else if (russianPluralizationKeys[key]) {
          obj[key] = russianPluralizationKeys[key];
          changes++;
          console.log(`  🔄 Pluralized: ${fullKey} → ${russianPluralizationKeys[key]}`);
        }
        // Check if we have a translation for this key
        else if (keysToTranslate[key]) {
          obj[key] = keysToTranslate[key];
          changes++;
          console.log(`  ✅ Translated: ${fullKey} → ${keysToTranslate[key]}`);
        }
        // Check by full key path
        else {
          const simpleKey = fullKey.split('.').pop();
          if (keysToTranslate[simpleKey]) {
            obj[key] = keysToTranslate[simpleKey];
            changes++;
            console.log(`  ✅ Translated: ${fullKey} → ${keysToTranslate[simpleKey]}`);
          } else {
            console.log(`  ⚠️  Needs manual translation: ${fullKey}`);
          }
        }
      }
    }
  }
  
  processObject(data);
  
  if (changes > 0 || removals > 0) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
    console.log(`  📝 Applied ${changes} translations and ${removals} removals`);
  } else {
    console.log(`  ✨ No changes needed`);
  }
  
  return { changes, removals };
}

function main() {
  console.log('🧹 Cleaning translation placeholders...\n');
  
  let totalChanges = 0;
  let totalRemovals = 0;
  
  // Process Russian locale files
  const ruDir = path.join(localesDir, 'ru');
  const ruFiles = fs.readdirSync(ruDir).filter(file => file.endsWith('.json'));
  
  for (const file of ruFiles) {
    const filePath = path.join(ruDir, file);
    const result = cleanJsonFile(filePath);
    if (result) {
      totalChanges += result.changes;
      totalRemovals += result.removals;
    }
  }
  
  // Also clean English files of unnecessary placeholders
  console.log('\n🔧 Cleaning English placeholders...');
  const enDir = path.join(localesDir, 'en');
  const enFiles = fs.readdirSync(enDir).filter(file => file.endsWith('.json'));
  
  for (const file of enFiles) {
    const filePath = path.join(enDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    let data = JSON.parse(content);
    let removed = 0;
    
    function removeUnnecessaryPlaceholders(obj) {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          removeUnnecessaryPlaceholders(value);
        } else if (value === '__STRING_NOT_TRANSLATED__' && keysToRemove.some(removeKey => key.includes(removeKey))) {
          delete obj[key];
          removed++;
          console.log(`  ❌ Removed from EN: ${key}`);
        }
      }
    }
    
    removeUnnecessaryPlaceholders(data);
    
    if (removed > 0) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      console.log(`  📝 Removed ${removed} unnecessary placeholders from ${file}`);
      totalRemovals += removed;
    }
  }
  
  console.log(`\n✨ Summary:`);
  console.log(`   📝 Applied ${totalChanges} translations`);
  console.log(`   ❌ Removed ${totalRemovals} unnecessary placeholders`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review remaining placeholders that need manual translation`);
  console.log(`   2. Consider running 'bun run i18n:unused' to find unused keys (but be careful!)`);
  console.log(`   3. Only run 'bun run i18n:clean' if you're sure about removing unused keys`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}