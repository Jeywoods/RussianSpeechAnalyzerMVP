from pydantic import BaseModel
from typing import List, Dict

# Модель слова с временными метками
class WordTimestamp(BaseModel):
    word: str          #Текст слова
    start: float       #Время начала в секундах
    end: float         #Время окончания в секундах

# Модель информации о паузе
class PauseInfo(BaseModel):
    start: float       #Начало паузы
    end: float         #Конец паузы
    duration: float    #Длительность паузы

# Модель слова-паразита
class ParasiteWord(BaseModel):
    word: str          #Текст слова-паразита 
    count: int         #Сколько раз встретилось
    timestamps: List[float]  #Временные метки каждого вхождения

# Модель полного результата анализа
class AnalysisResult(BaseModel):
    transcription: str                    #Полный распознанный текст
    words: List[WordTimestamp]            #Все слова с временными метками
    parasite_words: List[ParasiteWord]    #Слова-паразиты с деталями
    hesitations: List[WordTimestamp]      #Хезитации 
    pauses: List[PauseInfo]               #Длинные паузы
    speech_rate: float                    #Темп речи (слов/минуту)
    clean_speech_percent: float           #Чистота речи в процентах
    total_duration: float                 #Общая длительность в секундах
    total_words: int                      #Общее количество слов
    filler_words_count: int               #Общее количество слов-паразитов