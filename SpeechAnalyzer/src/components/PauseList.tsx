// src/components/PauseList.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { PauseInfo } from "../types/analysis";
import { colors, radius } from "../theme";

interface Props {
  pauses: PauseInfo[];
  totalDuration: number;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function PauseList({ pauses, totalDuration }: Props) {
  if (pauses.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>✓</Text>
        <Text style={styles.emptyText}>Длинных пауз не обнаружено</Text>
      </View>
    );
  }

  // Мини-таймлайн
  const timelineWidth = 100; // проценты

  return (
    <View style={styles.container}>
      {/* Таймлайн */}
      {totalDuration > 0 && (
        <View style={styles.timeline}>
          <View style={styles.timelineTrack}>
            {pauses.map((p, i) => {
              const left = (p.start / totalDuration) * 100;
              const width = Math.max((p.duration / totalDuration) * 100, 1.5);
              return (
                <View
                  key={i}
                  style={[
                    styles.timelinePause,
                    {
                      left: `${left}%`,
                      width: `${width}%`,
                    },
                  ]}
                />
              );
            })}
          </View>
          <View style={styles.timelineLabels}>
            <Text style={styles.timelineLabel}>0:00</Text>
            <Text style={styles.timelineLabel}>{formatTime(totalDuration)}</Text>
          </View>
        </View>
      )}

      {/* Список пауз */}
      {pauses.map((p, i) => (
        <View key={i} style={styles.pauseRow}>
          <View style={styles.pauseIndex}>
            <Text style={styles.pauseIndexText}>{i + 1}</Text>
          </View>
          <View style={styles.pauseInfo}>
            <Text style={styles.pauseTime}>
              {formatTime(p.start)} → {formatTime(p.end)}
            </Text>
          </View>
          <View
            style={[
              styles.durationBadge,
              p.duration >= 3
                ? styles.durationBad
                : styles.durationWarn,
            ]}
          >
            <Text style={styles.durationText}>{p.duration.toFixed(1)}с</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  timeline: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e36",
  },
  timelineTrack: {
    height: 12,
    backgroundColor: "#1e1e36",
    borderRadius: 6,
    position: "relative",
    overflow: "hidden",
  },
  timelinePause: {
    position: "absolute",
    top: 0,
    height: 12,
    backgroundColor: colors.pause,
    borderRadius: 3,
  },
  timelineLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  timelineLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },
  pauseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 4,
  },
  pauseIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#1e1e36",
    alignItems: "center",
    justifyContent: "center",
  },
  pauseIndexText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  pauseInfo: { flex: 1 },
  pauseTime: { fontSize: 13, color: colors.textPrimary },
  durationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationWarn: { backgroundColor: colors.warn + "33" },
  durationBad: { backgroundColor: colors.bad + "33" },
  durationText: {
    fontSize: 12,
    color: colors.warn,
    fontWeight: "700",
  },
  empty: { alignItems: "center", paddingVertical: 16, gap: 6 },
  emptyIcon: { fontSize: 28, color: colors.good },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
});
