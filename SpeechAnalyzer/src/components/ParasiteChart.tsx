// src/components/ParasiteChart.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ParasiteWord } from "../types/analysis";
import { colors, radius } from "../theme";

interface Props {
  parasites: ParasiteWord[];
}

export default function ParasiteChart({ parasites }: Props) {
  if (parasites.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>✓</Text>
        <Text style={styles.emptyText}>Слов-паразитов не найдено</Text>
      </View>
    );
  }

  const sorted = [...parasites].sort((a, b) => b.count - a.count);
  const maxCount = sorted[0].count;

  return (
    <View style={styles.container}>
      {sorted.map((p) => {
        const pct = (p.count / maxCount) * 100;
        const severity =
          p.count >= 5 ? colors.bad : p.count >= 3 ? colors.warn : colors.accent;
        return (
          <View key={p.word} style={styles.row}>
            <Text style={styles.wordLabel}>«{p.word}»</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct}%`, backgroundColor: severity },
                ]}
              />
            </View>
            <Text style={[styles.count, { color: severity }]}>
              {p.count}×
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    width: 110,
    fontStyle: "italic",
  },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#1e1e36",
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
  count: {
    fontSize: 13,
    fontWeight: "700",
    width: 30,
    textAlign: "right",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 16,
    gap: 6,
  },
  emptyIcon: {
    fontSize: 28,
    color: colors.good,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});
