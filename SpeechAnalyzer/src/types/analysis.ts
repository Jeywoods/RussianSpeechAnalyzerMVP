// src/types/analysis.ts

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface ParasiteWord {
  word: string;
  count: number;
  timestamps: number[];
}

export interface PauseInfo {
  start: number;
  end: number;
  duration: number;
}

export interface AnalysisResult {
  transcription: string;
  words: WordTimestamp[];
  parasite_words: ParasiteWord[];
  hesitations: WordTimestamp[];
  pauses: PauseInfo[];
  speech_rate: number;
  clean_speech_percent: number;
  total_duration: number;
  total_words: number;
  filler_words_count: number;
}
