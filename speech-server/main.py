import asyncio
import tempfile
import os
import subprocess

# Импорт FastAPI для создания веб-сервера
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware

# Импорт модели распознавания речи
import onnx_asr

# Импорт самодельного анализатора речи и моделей данных
from analyzer import SpeechAnalyzer
from models import AnalysisResult

# Создание экземпляра FastAPI приложения
app = FastAPI(title="Speech Analyzer API")

# Добавление CORS middleware для разрешения запросов с любых доменов
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Разрешить все источники
    allow_methods=["*"],      # Разрешить все HTTP методы
    allow_headers=["*"],      # Разрешить все заголовки
)

print("Загрузка GigaAM v3 E2E (onnx-asr)...")
model = onnx_asr.load_model("gigaam-v3-e2e-rnnt")  #Модель с поддержкой таймстампов

# оздание экземпляра анализатора речи
analyzer = SpeechAnalyzer()
print("Модель готова!")

#Эндпоинт для проверки работоспособности сервера
@app.get("/health")
async def health():
    return {"status": "ok"}  # Возвращает статус "ok"

#для анализа аудиофайла
@app.post("/analyze")
async def analyze_audio(file: UploadFile = File(...)):  # Принимаем аудиофайл
    print("\n" + "=" * 60)
    print("НОВЫЙ ЗАПРОС НА АНАЛИЗ")
    print("=" * 60)
    
    # Сохранение загруженного файла во временный файл
    with tempfile.NamedTemporaryFile(delete=False, suffix=".tmp") as tmp:
        content = await file.read()  # Читаем содержимое файла
        tmp.write(content)           # Записываем во временный файл
        tmp_path = tmp.name          # Сохраняем путь к временному файлу

    print(f"Файл получен, размер: {len(content)} байт")

    #Путь для сконвертированного WAV файла
    wav_path = tmp_path + ".wav"
    
    try:
        # Конвертация аудио в WAV формат (моно, 16 кГц)
        print("Конвертация в WAV...")
        subprocess.run(
            f'ffmpeg -y -i "{tmp_path}" -ac 1 -ar 16000 "{wav_path}"',  # -ac 1 = моно, -ar 16000 = частота
            shell=True, capture_output=True, check=True
        )
        print("Конвертация завершена")
        
        #Распознавание речи с временными метками
        print("Распознавание речи...")
        recognition_result = model.with_timestamps().recognize(wav_path)  # Получаем текст и таймстампы
        
        print(f"Распознанный текст: {recognition_result.text}")
        
        words = []                    # Список собранных слов
        tokens = recognition_result.tokens        # Токены модели
        timestamps = recognition_result.timestamps # Временные метки токенов

        PUNCTUATION = {',', '.', '!', '?', '-', '—', ':', ';', '', ' '}  #Знаки препинания
        
        i = 0  # Индекс текущего токена
        while i < len(tokens):
            token = tokens[i].strip()
            
            #Пропускаем знаки препинания
            if token in PUNCTUATION:
                i += 1
                continue
                
            #Если токен начинается с пробела - это начало слова
            if tokens[i].startswith(' '):
                word_parts = [token.lower()]  # Части слова
                start = timestamps[i]          # Время начала слова
                j = i + 1
                
                # Собираем все части слова до следующего пробела
                while j < len(tokens):
                    next_token = tokens[j].strip()
                    if tokens[j].startswith(' '):  # Встретили пробел - слово кончилось
                        break
                    if next_token in PUNCTUATION:   # Пропускаем пунктуацию
                        j += 1
                        continue
                    word_parts.append(next_token.lower())  # Добавляем часть слова
                    j += 1
                    
                #Вычисляем время окончания слова
                end = timestamps[j - 1] + 0.2 if j < len(tokens) else timestamps[-1] + 0.3
                
                #Добавляем слово в список
                words.append({
                    "word": ''.join(word_parts),  # Склеиваем части
                    "start": start,
                    "end": end
                })
                i = j  # Перемещаем индекс
            else:
                i += 1
        
        print(f"Собрано слов: {len(words)}")
        
        #Подготовка данных для анализатора
        result_payload = {
            "text": recognition_result.text,
            "words": words,
            "segments": words
        }
        
        # Запуск анализатора речи
        print("Запуск анализатора...")
        analysis = analyzer.analyze(result_payload, wav_path=wav_path)
        
        print("РЕЗУЛЬТАТЫ АНАЛИЗА")
        print(f"Транскрипция: {analysis.transcription}")           # Распознанный текст
        print(f"Всего слов: {analysis.total_words}")               # Количество слов
        print(f"Длительность: {analysis.total_duration} сек")      # Длительность речи
        print(f"Темп речи: {analysis.speech_rate} слов/мин")       # Скорость речи
        print(f"Чистота речи: {analysis.clean_speech_percent}%")   # Процент чистой речи
        print(f"Всего слов-паразитов: {analysis.filler_words_count}")  # Общее количество паразитов
        
        #Вывод слов-паразитов
        print(f"\nСлова-паразиты ({len(analysis.parasite_words)}):")
        for pw in analysis.parasite_words:
            print(f"  - '{pw.word}': {pw.count} раз(а)")
            
        #Вывод хезитаций
        print(f"\nХезитации ({len(analysis.hesitations)}):")
        for h in analysis.hesitations:
            print(f"  - '{h.word}': {h.start:.2f}–{h.end:.2f} сек")
            
        #Вывод длинных пауз
        print(f"\nДлинные паузы ({len(analysis.pauses)}):")
        for p in analysis.pauses:
            print(f"  - {p.duration:.2f} сек (с {p.start:.2f} по {p.end:.2f})")
            
        print("=" * 60 + "\n")
        
        return analysis  
        
    finally:
        os.unlink(tmp_path)          
        if os.path.exists(wav_path): # Если есть WAV файл
            os.unlink(wav_path)      # Удаляем его

if __name__ == "__main__":
    import uvicorn  
    uvicorn.run(app, host="0.0.0.0", port=8000) 