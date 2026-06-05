// src/components/StatsCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, radius } from "../theme";

interface Props {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  subtitle?: string;
}

export default function StatsCard({ label, value, unit, color, subtitle }: Props) {
  const valueColor = color ?? colors.textPrimary;

  return (
    <View style={[styles.card, { borderColor: valueColor + "33" }]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: valueColor }]}>{value}</Text>
        {unit && <Text style={[styles.unit, { color: valueColor + "aa" }]}>{unit}</Text>}
      </View>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#111122",
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e1e36",
    minHeight: 80,
    justifyContent: "space-between",
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 3,
  },
  value: {
    fontSize: 26,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: 30,
  },
  unit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
});
