// src/components/TranscriptionView.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { AnalysisResult, WordTimestamp } from "../types/analysis";
import { colors, radius } from "../theme";

interface Props {
  result: AnalysisResult;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function TranscriptionView({ result }: Props) {
  const [expanded, setExpanded] = useState(false);

  const parasiteSet = new Set(result.parasite_words.map((p) => p.word));
  const hesitationSet = new Set(result.hesitations.map((h) => h.word));

  // Строим карту: индекс слова → пауза перед ним
  const pauseBeforeWord = new Map<number, number>();
  result.pauses.forEach((pause) => {
    for (let i = 1; i < result.words.length; i++) {
      if (Math.abs(result.words[i].start - pause.end) < 0.3) {
        pauseBeforeWord.set(i, pause.duration);
        break;
      }
    }
  });

  const wordsToShow = expanded ? result.words : result.words.slice(0, 60);

  return (
    <View style={styles.container}>
      {/* Легенда */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.parasite }]} />
          <Text style={styles.legendText}>Паразиты</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.hesitation }]} />
          <Text style={styles.legendText}>Хезитации</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.pause }]} />
          <Text style={styles.legendText}>Паузы</Text>
        </View>
      </View>

      {/* Текст с подсветкой */}
      <View style={styles.textContainer}>
        <Text style={styles.text}>
          {wordsToShow.map((w, i) => {
            const isParasite = parasiteSet.has(w.word);
            const isHesitation = hesitationSet.has(w.word);
            const pauseDuration = pauseBeforeWord.get(i);

            return (
              <React.Fragment key={i}>
                {pauseDuration !== undefined && (
                  <Text style={styles.pauseTag}>
                    {" "}
                    ⏸{pauseDuration.toFixed(1)}с{" "}
                  </Text>
                )}
                <Text
                  style={[
                    styles.word,
                    isParasite && styles.parasiteWord,
                    isHesitation && styles.hesitationWord,
                  ]}
                >
                  {w.word}
                  {" "}
                </Text>
              </React.Fragment>
            );
          })}
          {!expanded && result.words.length > 60 && (
            <Text style={styles.fadeText}>...</Text>
          )}
        </Text>
      </View>

      {result.words.length > 60 && (
        <TouchableOpacity
          style={styles.expandBtn}
          onPress={() => setExpanded((e) => !e)}
        >
          <Text style={styles.expandText}>
            {expanded
              ? "Свернуть"
              : `Показать все ${result.words.length} слов`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111122",
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e1e36",
  },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e36",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  textContainer: {},
  text: {
    fontSize: 15,
    lineHeight: 28,
    color: colors.textPrimary,
  },
  word: {
    color: colors.textPrimary,
  },
  parasiteWord: {
    color: colors.parasite,
    backgroundColor: colors.parasite + "22",
    borderRadius: 3,
  },
  hesitationWord: {
    color: colors.hesitation,
    backgroundColor: colors.hesitation + "22",
    borderRadius: 3,
  },
  pauseTag: {
    color: colors.pause,
    fontSize: 11,
    backgroundColor: colors.pause + "22",
    borderRadius: 4,
  },
  fadeText: {
    color: colors.textMuted,
  },
  expandBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e1e36",
  },
  expandText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
});
