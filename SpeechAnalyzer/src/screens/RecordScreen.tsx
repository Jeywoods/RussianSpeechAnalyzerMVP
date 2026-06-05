// src/screens/RecordScreen.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Audio } from "expo-av";
import { analyzeAudio, checkServerHealth } from "../api/speechApi";
import { colors, radius, spacing } from "../theme";
import { MAX_RECORD_SECONDS } from "../config";

export default function RecordScreen({ navigation }: any) {
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [serverOk, setServerOk] = useState<boolean | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Проверяем сервер при запуске
  useEffect(() => {
    checkServerHealth().then(setServerOk);
  }, []);

  // Пульсация кнопки во время записи
  useEffect(() => {
    if (isRecording) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.12,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  const startRecording = async () => {
    // Запрашиваем разрешение
    const { status } = await Audio.requestPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Нет доступа к микрофону",
        "Разрешите приложению использовать микрофон в настройках телефона."
      );
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync({
        android: {
          extension: ".wav",
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC → сервер конвертирует
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          outputFormat: "lpcm" as any,
          audioQuality: 127, // MAX
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 256000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {},
      });

      recordingRef.current = recording;
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => {
          if (d + 1 >= MAX_RECORD_SECONDS) {
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);
    } catch (err: any) {
      Alert.alert("Ошибка записи", err.message);
    }
  };

  const stopRecording = async () => {
    if (!recordingRef.current || isAnalyzing) return;

    clearInterval(timerRef.current!);
    timerRef.current = null;

    setIsRecording(false);
    setIsAnalyzing(true);

    try {
      await recordingRef.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) throw new Error("Аудиофайл не создан");

      const result = await analyzeAudio(uri);
      navigation.navigate("Result", { result });
    } catch (err: any) {
      let msg = err.message;
      if (err.code === "ECONNREFUSED" || msg.includes("Network Error")) {
        msg =
          "Не удалось подключиться к серверу.\n\nПроверь:\n• Сервер запущен (python main.py)\n• Телефон и ПК в одной Wi-Fi сети\n• Правильный IP в config.ts";
      } else if (msg.includes("timeout")) {
        msg = "Сервер долго отвечает. Запись слишком длинная или ПК перегружен.";
      }
      Alert.alert("Ошибка анализа", msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const progress = duration / MAX_RECORD_SECONDS;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Шапка */}
        <View style={styles.header}>
          <Text style={styles.title}>Анализатор речи</Text>
          <View style={[styles.serverBadge,
            { backgroundColor: serverOk === null ? colors.textMuted + "33"
              : serverOk ? colors.good + "22" : colors.bad + "22" }]}>
            <View style={[styles.serverDot,
              { backgroundColor: serverOk === null ? colors.textMuted
                : serverOk ? colors.good : colors.bad }]} />
            <Text style={[styles.serverText,
              { color: serverOk === null ? colors.textMuted
                : serverOk ? colors.good : colors.bad }]}>
              {serverOk === null ? "Проверка..." : serverOk ? "Сервер OK" : "Нет сервера"}
            </Text>
          </View>
        </View>

        {/* Инструкция */}
        {!isRecording && !isAnalyzing && (
          <View style={styles.hint}>
            <Text style={styles.hintText}>
              Нажмите кнопку и говорите свободно.{"\n"}
              Запись до 3 минут.
            </Text>
          </View>
        )}

        {/* Центральная зона */}
        <View style={styles.center}>
          {isAnalyzing ? (
            <View style={styles.analyzingBox}>
              <ActivityIndicator size="large" color={colors.accent} />
              <Text style={styles.analyzingTitle}>Анализируем речь...</Text>
              <Text style={styles.analyzingHint}>
                Обычно занимает 15–60 секунд.{"\n"}Не закрывайте приложение.
              </Text>
            </View>
          ) : (
            <>
              {/* Таймер */}
              <Text style={styles.timer}>{formatTime(duration)}</Text>

              {/* Прогресс-дуга (текстовая) */}
              {isRecording && (
                <Text style={styles.progressText}>
                  {Math.round(progress * 100)}% от 3 минут
                </Text>
              )}

              {/* Кнопка записи */}
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.recordBtn,
                    isRecording && styles.recordBtnActive,
                  ]}
                  onPress={isRecording ? stopRecording : startRecording}
                  disabled={isAnalyzing}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.recordInner,
                      isRecording && styles.recordInnerActive,
                    ]}
                  />
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.btnHint}>
                {isRecording
                  ? "Нажмите для остановки и анализа"
                  : "Нажмите для начала записи"}
              </Text>
            </>
          )}
        </View>

        {/* Предупреждение если нет сервера */}
        {serverOk === false && !isRecording && !isAnalyzing && (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              ⚠️ Сервер недоступен. Запусти на ПК:{"\n"}
              <Text style={styles.warnCode}>python main.py</Text>
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  serverBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  serverDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  serverText: {
    fontSize: 12,
    fontWeight: "600",
  },
  hint: {
    backgroundColor: "#111122",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: "#1e1e36",
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  timer: {
    fontSize: 72,
    fontWeight: "100",
    color: colors.textPrimary,
    letterSpacing: -3,
    fontVariant: ["tabular-nums"],
  },
  progressText: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: -12,
  },
  recordBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "transparent",
    borderWidth: 3,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  recordBtnActive: {
    borderColor: colors.bad,
  },
  recordInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
  },
  recordInnerActive: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: colors.bad,
  },
  btnHint: {
    fontSize: 13,
    color: colors.textMuted,
  },
  analyzingBox: {
    alignItems: "center",
    gap: spacing.md,
  },
  analyzingTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  analyzingHint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  warnBox: {
    backgroundColor: colors.warn + "22",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warn + "44",
  },
  warnText: {
    color: colors.warn,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },
  warnCode: {
    fontFamily: "monospace",
    fontSize: 13,
    color: colors.textPrimary,
  },
});
