import { type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type PressableProps,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, fonts } from "../theme";

export function Screen({
  children,
  scroll = true,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.column}>
          {scroll ? (
            <ScrollView
              contentContainerStyle={styles.scroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={styles.scroll}>{children}</View>
          )}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

export function Eyebrow({ children }: { children: string }) {
  return <Text style={styles.eyebrow}>{children}</Text>;
}

export function Title({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Body({ children, dim = false }: { children: ReactNode; dim?: boolean }) {
  return <Text style={[styles.body, dim && styles.dim]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  tone = "clay",
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: "clay" | "ink" | "paper" | "field";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === "clay" && styles.buttonClay,
        tone === "ink" && styles.buttonInk,
        tone === "paper" && styles.buttonPaper,
        tone === "field" && styles.buttonField,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonLabel, tone === "paper" && styles.buttonLabelInk]}>{label}</Text>
    </Pressable>
  );
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={styles.textButton}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor={colors.inkSoft} style={styles.input} {...props} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Sheet({
  visible,
  title,
  children,
  onClose,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <Text style={styles.sheetTitle}>{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function BackLink({ label, onPress }: { label: string; onPress: PressableProps["onPress"] }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <Text style={styles.back}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.sand },
  safe: { flex: 1 },
  column: { flex: 1, width: "100%", maxWidth: 560, alignSelf: "center" },
  scroll: { paddingHorizontal: 20, paddingBottom: 28, gap: 14 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.sand,
  },
  eyebrow: {
    fontFamily: fonts.bodySemi,
    color: colors.clay,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontSize: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 40,
    lineHeight: 44,
    color: colors.ink,
    textTransform: "uppercase",
  },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.ink },
  dim: { color: colors.inkSoft },
  button: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center" },
  buttonClay: { backgroundColor: colors.clay },
  buttonInk: { backgroundColor: colors.ink },
  buttonField: { backgroundColor: colors.field },
  buttonPaper: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.7 },
  buttonLabel: { fontFamily: fonts.bodySemi, color: colors.white, fontSize: 16 },
  buttonLabelInk: { color: colors.ink },
  textButton: { fontFamily: fonts.bodySemi, color: colors.clayDark, fontSize: 15 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: fonts.bodyMedium, color: colors.inkSoft, fontSize: 13 },
  input: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.ink,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(23, 21, 18, 0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.sand,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    gap: 12,
  },
  sheetTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, textTransform: "uppercase" },
  back: { fontFamily: fonts.bodySemi, color: colors.inkSoft, fontSize: 15 },
});
