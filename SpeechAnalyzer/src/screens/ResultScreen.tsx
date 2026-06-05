import React, { useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { AnalysisResult } from "../types/analysis";
import StatsCard from "../components/StatsCard";
import TranscriptionView from "../components/TranscriptionView";
import ParasiteChart from "../components/ParasiteChart";
import PauseList from "../components/PauseList";
import { colors, radius, spacing } from "../theme";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m > 0 ? `${m} мин ${s} сек` : `${s} сек`;
}

function speechRateLabel(rate: number): string {
  if (rate < 80) return "Очень медленно";
  if (rate < 120) return "Медленно";
  if (rate < 160) return "Норма";
  if (rate < 200) return "Быстро";
  return "Очень быстро";
}

function speechRateColor(rate: number): string {
  if (rate < 80 || rate > 200) return colors.bad;
  if (rate < 120 || rate > 180) return colors.warn;
  return colors.good;
}

function cleanPercentColor(pct: number): string {
  if (pct >= 85) return colors.good;
  if (pct >= 70) return colors.warn;
  return colors.bad;
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ResultScreen({ navigation, route }: any) {
  const result: AnalysisResult = route.params.result;
  const scrollRef = useRef<ScrollView>(null);

  const hesCount = result.hesitations.length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Новая запись</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Результаты анализа</Text>
        <View style={{ width: 100 }} />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Общая инфо */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryDuration}>
            Длительность: {formatDuration(result.total_duration)}
          </Text>
          <Text style={styles.summaryWords}>
            {result.total_words} слов
          </Text>
        </View>

        {/* Главные 4 метрики */}
        <Section title="Общие метрики">
          <View style={styles.statsRow}>
            <StatsCard
              label="Темп речи"
              value={result.speech_rate}
              unit="сл/мин"
              color={speechRateColor(result.speech_rate)}
              subtitle={speechRateLabel(result.speech_rate)}
            />
            <StatsCard
              label="Чистая речь"
              value={`${result.clean_speech_percent}%`}
              color={cleanPercentColor(result.clean_speech_percent)}
            />
          </View>
          <View style={styles.statsRow}>
            <StatsCard
              label="Слова-паразиты"
              value={result.filler_words_count}
              unit="шт"
              color={
                result.filler_words_count === 0
                  ? colors.good
                  : result.filler_words_count < 5
                  ? colors.warn
                  : colors.bad
              }
            />
            <StatsCard
              label="Хезитации"
              value={hesCount}
              unit="шт"
              color={
                hesCount === 0
                  ? colors.good
                  : hesCount < 5
                  ? colors.warn
                  : colors.bad
              }
              subtitle="ээ, мм, аа..."
            />
          </View>
          <StatsCard
            label="Длинные паузы (>1.5 сек)"
            value={result.pauses.length}
            unit="пауз"
            color={
              result.pauses.length === 0
                ? colors.good
                : result.pauses.length < 3
                ? colors.warn
                : colors.bad
            }
          />
        </Section>

        {/* Транскрипция */}
        <Section title="📝 Транскрипция">
          <TranscriptionView result={result} />
        </Section>

        {/* Слова-паразиты */}
        <Section title="🚫 Слова-паразиты">
          <View style={styles.card}>
            <ParasiteChart parasites={result.parasite_words} />
          </View>
        </Section>

        {/* Хезитации */}
        {hesCount > 0 && (
          <Section title="😶 Хезитации (ээ, мм, аа...)">
            <View style={styles.card}>
              <View style={styles.hesitationsList}>
                {/* Группируем по типу */}
                {Array.from(
                  result.hesitations.reduce((acc, h) => {
                    acc.set(h.word, (acc.get(h.word) || 0) + 1);
                    return acc;
                  }, new Map<string, number>())
                )
                  .sort((a, b) => b[1] - a[1])
                  .map(([word, count]) => (
                    <View key={word} style={styles.hesitationItem}>
                      <Text style={styles.hesitationWord}>«{word}»</Text>
                      <Text style={styles.hesitationCount}>{count}×</Text>
                    </View>
                  ))}
              </View>
            </View>
          </Section>
        )}

        {/* Паузы */}
        <Section title="⏸ Длинные паузы">
          <View style={styles.card}>
            <PauseList
              pauses={result.pauses}
              totalDuration={result.total_duration}
            />
          </View>
        </Section>

        {/* Рекомендации */}
        <Section title="💡 Рекомендации">
          <View style={styles.card}>
            {result.speech_rate > 180 && (
              <Text style={styles.tip}>
                • Слишком быстрый темп ({result.speech_rate} сл/мин). Норма: 120–150. Делайте осознанные паузы между предложениями.
              </Text>
            )}
            {result.speech_rate < 100 && result.speech_rate > 0 && (
              <Text style={styles.tip}>
                • Медленный темп ({result.speech_rate} сл/мин). Попробуйте говорить увереннее, без длинных раздумий.
              </Text>
            )}
            {result.filler_words_count > 5 && (
              <Text style={styles.tip}>
                • {result.filler_words_count} слов-паразитов — это много. Замените паузой или просто молчанием.
              </Text>
            )}
            {hesCount > 5 && (
              <Text style={styles.tip}>
                • {hesCount} хезитаций. Вместо «ээ» и «мм» делайте тихую паузу — это звучит увереннее.
              </Text>
            )}
            {result.pauses.length > 3 && (
              <Text style={styles.tip}>
                • {result.pauses.length} длинных пауз. Готовьтесь к речи заранее или используйте план.
              </Text>
            )}
            {result.clean_speech_percent >= 85 &&
              result.filler_words_count < 5 &&
              hesCount < 5 && (
                <Text style={[styles.tip, { color: colors.good }]}>
                  ✓ Отличный результат! Речь чистая и уверенная.
                </Text>
              )}
          </View>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e36",
  },
  backBtn: { width: 120 },
  backText: { color: colors.accent, fontSize: 14, fontWeight: "600" },
  topTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700",
  },
  scroll: { flex: 1 },
  content: { padding: spacing.md },
  summaryBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  summaryDuration: { color: colors.textSecondary, fontSize: 13 },
  summaryWords: { color: colors.textSecondary, fontSize: 13 },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: spacing.sm,
    letterSpacing: -0.3,
  },
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: "#111122",
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#1e1e36",
  },
  hesitationsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  hesitationItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.hesitation + "22",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hesitationWord: {
    color: colors.hesitation,
    fontSize: 14,
    fontStyle: "italic",
  },
  hesitationCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  tip: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 8,
  },
});
