# 🎙 Russian Speech Analyzer MVP

> Мобильное приложение для распознавания и анализа русской речи.  
> Пользователь записывает речь, получает расшифровку и видит допущенные ошибки —  
> хезитации и прочие речевые паттерны — чтобы осознанно работать над своей речью.

![Status](https://img.shields.io/badge/статус-MVP-yellow)
![React Native](https://img.shields.io/badge/React_Native-Expo_SDK_51-blue?logo=react)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white)

---

## 🛠 Стек

| Слой | Технология |
|------|------------|
| 📱 Mobile | React Native (Expo SDK 51) |
| ⚙️ Backend | FastAPI (Python) |
| 🗣 ASR | GigaAM v3 (SberBank) |
| 📊 Анализ | librosa |

## 📁 Структура

- `SpeechAnalyzer/` — React Native приложение  
- `speech-server/` — FastAPI сервер

## ⚙️ Как работает

1. Пользователь **записывает речь** в приложении
2. Аудио отправляется на **FastAPI-сервер**
3. Сервер распознаёт речь через **GigaAM v3** и анализирует хезитации с помощью **librosa**
4. Приложение отображает **расшифровку** и найденные ошибки

---

## 🚧 Статус

MVP — базовый функционал реализован, проект в активной разработке (дипломная работа).
