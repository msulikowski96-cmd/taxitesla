import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, font, radius, space } from '../theme';

type IconName = keyof typeof Ionicons.glyphMap;

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  icon,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const v = buttonVariants[variant];
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      onPress={off ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !off && { opacity: 0.85, transform: [{ scale: 0.99 }] },
        off && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={18} color={v.fg} style={{ marginRight: space.sm }} />}
          <Text style={[styles.buttonText, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.white, fg: colors.black, border: colors.white },
  secondary: { bg: colors.surfaceAlt, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.text, border: colors.border },
  danger: { bg: 'transparent', fg: colors.danger, border: colors.danger },
};

export function Field({
  label,
  error,
  icon,
  right,
  ...props
}: TextInputProps & { label: string; error?: string | null; icon?: IconName; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrap,
          focused && { borderColor: colors.silver },
          !!error && { borderColor: colors.danger },
        ]}
      >
        {icon && <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginRight: space.sm }} />}
        <TextInput
          placeholderTextColor={colors.textDim}
          selectionColor={colors.accent}
          {...props}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          style={[styles.input, props.multiline && { minHeight: 72, textAlignVertical: 'top' }]}
        />
        {right}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  return (
    <View style={[styles.row, { justifyContent: 'space-between', marginTop: space.xl, marginBottom: space.sm }]}>
      <Text style={styles.sectionTitle}>{children.toUpperCase()}</Text>
      {right}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.white, borderColor: colors.white }]}
    >
      {icon && (
        <Ionicons name={icon} size={14} color={selected ? colors.black : colors.textMuted} style={{ marginRight: 6 }} />
      )}
      <Text style={[styles.chipText, selected && { color: colors.black }]}>{label}</Text>
    </Pressable>
  );
}

export function Checkbox({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={[styles.row, { alignItems: 'flex-start', marginBottom: space.md }]}
    >
      <View style={[styles.checkbox, checked && { backgroundColor: colors.white, borderColor: colors.white }]}>
        {checked && <Ionicons name="checkmark" size={14} color={colors.black} />}
      </View>
      <Text style={[styles.muted, { flex: 1 }]}>{children}</Text>
    </Pressable>
  );
}

export function Notice({ text, tone = 'error' }: { text: string; tone?: 'error' | 'info' | 'success' }) {
  const c = tone === 'error' ? colors.danger : tone === 'success' ? colors.success : colors.silver;
  const icon: IconName = tone === 'error' ? 'alert-circle' : tone === 'success' ? 'checkmark-circle' : 'information-circle';
  return (
    <View style={[styles.notice, { borderColor: c }]}>
      <Ionicons name={icon} size={18} color={c} style={{ marginRight: space.sm }} />
      <Text style={[styles.body, { flex: 1 }]}>{text}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  button: {
    height: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  label: { ...font.label, color: colors.textMuted, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    minHeight: 52,
  },
  input: { flex: 1, color: colors.text, fontSize: 16, paddingVertical: 12 },
  error: { color: colors.danger, fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
  },
  sectionTitle: { ...font.label, color: colors.textMuted },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: space.sm,
    marginBottom: space.sm,
  },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: space.md,
    marginTop: 1,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.md,
    backgroundColor: colors.surface,
  },
  h1: { ...font.h1, color: colors.text },
  h2: { ...font.h2, color: colors.text },
  h3: { ...font.h3, color: colors.text },
  body: { ...font.body, color: colors.text },
  muted: { ...font.small, color: colors.textMuted, lineHeight: 19 },
});
