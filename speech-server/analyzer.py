# Импорт моделей данных и типов
from models import AnalysisResult, WordTimestamp, PauseInfo, ParasiteWord
from typing import List, Dict
import re                     # Регулярные выражения для очистки текста
import librosa                # Библиотека для анализа аудио
import numpy as np            # Математические операции для аудиоанализа

# Класс для анализа речи (паузы, паразиты, хезитации, темп)
class SpeechAnalyzer:
    
    # Набор слов-паразитов (засоряют речь)
    PARASITE_WORDS = {
        "типа", "короче", "как бы", "вот", "ну", "это",
        "это самое", "так сказать", "понимаешь", "понимаете",
        "значит", "допустим", "предположим", "собственно",
        "в общем", "в общем-то", "честно говоря", "скажем так",
        "буквально", "реально", "конкретно", "фактически",
        "по сути", "как говорится", "так-то", "ну вот",
        "ну типа", "ну это", "ну как бы", "блин",
        "вообще", "вообще-то", "прямо скажем"
    }
    
    # Звуки-хезитации (запинки, протяжные звуки)
    HESITATIONS = {
        "ээ", "эм", "мм", "аа", "ыы", "хм", "гм",
        "э-э", "м-м", "а-а",
    }
    
    # Буквы из которых могут состоять хезитации
    HESITATION_LETTERS = {"э", "м", "а", "ы", "х", "г"}
    
    # Минимальная длительность паузы в секундах
    PAUSE_THRESHOLD = 1.5
    
    # Главный метод: анализ речи из результата ASR
    def analyze(self, asr_result: dict, wav_path: str = None) -> AnalysisResult:
        # Извлекаем текст и слова из результата распознавания
        text = asr_result.get("text", "")
        raw_words = asr_result.get("words", [])
        
        # Преобразуем слова в объекты WordTimestamp
        words = [WordTimestamp(
                    word=w["word"],
                    start=w["start"],
                    end=w["end"]
                 ) for w in raw_words]
        
        print(f"[АНАЛИЗ] Начинаю анализ {len(words)} слов")
        
        # Находим длинные паузы
        pauses = self._find_pauses(words)
        print(f"[АНАЛИЗ] Найдено пауз: {len(pauses)}")
        
        # Находим слова-паразиты
        parasite_words = self._find_parasites(words)
        print(f"[АНАЛИЗ] Найдено слов-паразитов: {len(parasite_words)}")
        
        # Поиск хезитаций в тексте (слова типа "ээ", "мм")
        text_hesitations = self._find_hesitations(words)
        
        # Поиск хезитаций в аудио (анализ звука между словами)
        audio_hesitations = []
        if wav_path:
            audio_hesitations = self._find_hesitations_audio(wav_path, words)
        
        # Объединяем хезитации из текста и аудио
        all_hesitations = text_hesitations + audio_hesitations
        
        # Удаляем дубликаты (если времена совпадают с точностью до 0.3 сек)
        unique_hesitations = []
        for h in all_hesitations:
            is_dup = False
            for uh in unique_hesitations:
                if abs(h.start - uh.start) < 0.3:
                    is_dup = True
                    break
            if not is_dup:
                unique_hesitations.append(h)
        
        print(f"[АНАЛИЗ] Найдено хезитаций: {len(unique_hesitations)} (текстовых: {len(text_hesitations)}, аудио: {len(audio_hesitations)})")
        
        # Общая длительность (время последнего слова)
        total_duration = words[-1].end if words else 0
        
        # Количество значимых слов (без хезитаций)
        total_words = len([w for w in words if w.word not in self.HESITATIONS and not self._is_hesitation(w.word)])
        
        # Расчет темпа речи (слов в минуту)
        speech_rate = self._calc_speech_rate(total_words, total_duration)
        print(f"[АНАЛИЗ] Темп речи: {speech_rate} слов/мин")
        
        # Расчет чистоты речи (процент времени без мусора)
        clean_percent = self._calc_clean_percent(words, parasite_words, unique_hesitations, pauses, total_duration)
        
        # Общее количество слов-паразитов (сумма всех вхождений)
        filler_count = sum(p.count for p in parasite_words)
        
        print(f"[АНАЛИЗ] Чистота речи: {clean_percent}%")
        print(f"[АНАЛИЗ] Слов-паразитов всего: {filler_count}")
        
        # Возвращаем объект AnalysisResult со всеми метриками
        return AnalysisResult(
            transcription=text,
            words=words,
            parasite_words=parasite_words,
            hesitations=unique_hesitations,
            pauses=pauses,
            speech_rate=speech_rate,
            clean_speech_percent=clean_percent,
            total_duration=round(total_duration, 2),
            total_words=total_words,
            filler_words_count=filler_count
        )
    
    # Поиск хезитаций в аудиосигнале (между словами)
    def _find_hesitations_audio(self, wav_path: str, words: List[WordTimestamp]) -> List[WordTimestamp]:
        try:
            # Загружаем аудио с частотой 16кГЦ
            y, sr = librosa.load(wav_path, sr=16000)
            
            # Находим промежутки между словами
            gaps = []
            for i in range(1, len(words)):
                gap_start = words[i-1].end
                gap_end = words[i].start
                if gap_end - gap_start >= 0.2:  # Минимум 0.2 секунды
                    gaps.append((gap_start, gap_end))
            
            # Добавляем паузу в начале 
            if words and words[0].start >= 0.3:
                gaps.append((0, words[0].start))
            
            # Добавляем паузу в конце
            if words and sr and len(y)/sr - words[-1].end >= 0.3:
                gaps.append((words[-1].end, len(y)/sr))
            
            hesitations = []
            for gap_start, gap_end in gaps:
                # Преобразуем время в сэмплы
                start_sample = int(gap_start * sr)
                end_sample = int(gap_end * sr)
                
                # Проверка границ
                if start_sample >= len(y) or end_sample > len(y) or end_sample <= start_sample:
                    continue
                
                # Вырезаем сегмент между словами
                segment = y[start_sample:end_sample]
                
                #средняя квардратичная амплитуда для меры громкости
                rms = np.sqrt(np.mean(segment**2))
                
                #не тишина
                if 0.01 < rms < 0.1:
                    duration = gap_end - gap_start
                    if 0.2 <= duration <= 2.5:  # Ограничение по длительности
                        try:
                            #определяем есть ли голос
                            f0, voiced_flag, _ = librosa.pyin(
                                segment, fmin=80, fmax=400, sr=sr,
                                frame_length=2048, hop_length=512
                            )
                            voiced_frames = np.sum(voiced_flag) if voiced_flag is not None else 0
                            total_frames = len(voiced_flag) if voiced_flag is not None else 1
                            
                            # Если есть голос
                            if voiced_frames / total_frames > 0.3:
                                # Определяем тип хезитации по громкости
                                if rms < 0.05:
                                    label = "ммм"  # Тихое мычание
                                else:
                                    label = "эээ"  # Громкое "эээ"
                                
                                hesitations.append(WordTimestamp(
                                    word=label,
                                    start=round(gap_start, 2),
                                    end=round(gap_end, 2)
                                ))
                                print(f"[ХЕЗИТАЦИИ АУДИО] Найдена: '{label}' на {gap_start:.2f}–{gap_end:.2f} сек (rms={rms:.3f})")
                        except:
                            pass  # Игнорируем ошибки анализа тона
            
            return hesitations
        except Exception as e:
            print(f"[ХЕЗИТАЦИИ АУДИО] Ошибка при анализе аудио: {e}")
            return []
    
    # Проверка, является ли слово хезитацией
    def _is_hesitation(self, word: str) -> bool:
        clean = re.sub(r'[^\w]', '', word)  # Удаляем знаки препинания
        
        # Проверка по словарю хезитаций
        if clean in self.HESITATIONS or word in self.HESITATIONS:
            return True
        
        # Проверка на повторяющиеся буквы (ммм, эээ, ааа)
        if len(clean) >= 2 and len(set(clean)) == 1 and clean[0] in self.HESITATION_LETTERS:
            return True
        
        return False
    
    # Заглушка (не используется)
    def _extract_words(self, segments) -> List[WordTimestamp]:
        return segments
    
    # Поиск длинных пауз между словами
    def _find_pauses(self, words: List[WordTimestamp]) -> List[PauseInfo]:
        pauses = []
        for i in range(1, len(words)):
            gap = words[i].start - words[i-1].end  # Время между словами
            if gap >= self.PAUSE_THRESHOLD:        # Если пауза достаточно длинная
                pauses.append(PauseInfo(
                    start=words[i-1].end,
                    end=words[i].start,
                    duration=round(gap, 2)
                ))
        return pauses
    
    # Поиск слов-паразитов
    def _find_parasites(self, words: List[WordTimestamp]) -> List[ParasiteWord]:
        counts: Dict[str, List[float]] = {}  # Слово -> список времен
        
        # Проверяем каждое слово
        for w in words:
            clean = re.sub(r'[^\w]', '', w.word)  # Очищаем от пунктуации
            if clean in self.PARASITE_WORDS:       # Если слово в списке паразитов
                counts.setdefault(clean, []).append(w.start)  # Запоминаем время
        
        # Проверяем биграммы (два слова подряд)
        for i in range(len(words) - 1):
            bigram = f"{words[i].word} {words[i+1].word}"  # Два слова
            bigram = re.sub(r'[^\w\s]', '', bigram)        # Очищаем
            if bigram in self.PARASITE_WORDS:
                counts.setdefault(bigram, []).append(words[i].start)
        
        # Создаем объекты ParasiteWord из собранных данных
        return [
            ParasiteWord(word=w, count=len(ts), timestamps=ts)
            for w, ts in counts.items()
        ]
    
    # Поиск хезитаций в тексте (на основе распознанных слов)
    def _find_hesitations(self, words: List[WordTimestamp]) -> List[WordTimestamp]:
        result = []
        for w in words:
            if self._is_hesitation(w.word):  # Проверяем, является ли слово хезитацией
                result.append(w)
                print(f"[ХЕЗИТАЦИИ ТЕКСТ] Найдена: '{w.word}' на {w.start:.2f}–{w.end:.2f} сек")
        return result
    
    # Расчет темпа речи (слов в минуту)
    def _calc_speech_rate(self, word_count: int, duration: float) -> float:
        if duration < 1:
            return 0
        return round((word_count / duration) * 60, 1)  # (слов/сек) * 60 = слов/мин
    
    # Расчет чистоты речи (процент времени без мусора)
    def _calc_clean_percent(self, words, parasites, hesitations, 
                             pauses, total_duration) -> float:
        if total_duration == 0:
            return 100.0
        
        # Время, занятое "мусором"
        filler_time = sum(w.end - w.start for w in hesitations)     # Хезитации
        parasite_time = sum(w.end - w.start for p in parasites for w in words if w.word == p.word)  # Паразиты
        pause_time = sum(p.duration for p in pauses)                # Паузы
        dirty_time = filler_time + parasite_time + pause_time       # Общее время мусора
        
        clean_time = max(0, total_duration - dirty_time)
        
        # Процент чистоты
        return round((clean_time / total_duration) * 100, 1)