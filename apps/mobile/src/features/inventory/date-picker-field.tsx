import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { formatDay, fromCalendarDay, toCalendarDay, today } from './expiry';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DatePickerFieldProps = {
  /** A calendar day ("2026-10-20"), or null without a date. */
  value: string | null;
  onChange(day: string | null): void;
};

/**
 * An optional date: says "Sin fecha" or the date chosen, with buttons to add,
 * change or remove it. The calendar is the platform's own: a dialog on
 * Android and an inline calendar, in a sheet, on iOS.
 */
export function DatePickerField({ value, onChange }: DatePickerFieldProps) {
  const [picking, setPicking] = useState(false);
  const on = today();

  function open() {
    const initial = fromCalendarDay(value ?? on);
    if (Platform.OS === 'android') {
      // Android shows its own dialog; it only answers when a date is set.
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        onChange: (event, date) => {
          if (event.type === 'set' && date) {
            onChange(toCalendarDay(date));
          }
        },
      });
      return;
    }
    setPicking(true);
  }

  return (
    <View style={styles.field}>
      <ThemedText type="label">Fecha</ThemedText>
      <ThemedText
        type={value ? 'defaultBold' : 'default'}
        themeColor={value ? 'textPrimary' : 'textSecondary'}>
        {value ? formatDay(value) : 'Sin fecha'}
      </ThemedText>
      <View style={styles.actions}>
        <View style={styles.action}>
          <PrimaryButton
            label={value ? 'Cambiar fecha' : 'Añadir fecha'}
            variant="secondary"
            onPress={open}
          />
        </View>
        {value && (
          <View style={styles.action}>
            <PrimaryButton
              label="Quitar fecha"
              variant="secondary"
              onPress={() => onChange(null)}
            />
          </View>
        )}
      </View>

      {picking && (
        <CalendarSheet
          initial={fromCalendarDay(value ?? on)}
          onDone={(date) => {
            setPicking(false);
            onChange(toCalendarDay(date));
          }}
          onCancel={() => setPicking(false)}
        />
      )}
    </View>
  );
}

function CalendarSheet({
  initial,
  onDone,
  onCancel,
}: {
  initial: Date;
  onDone(date: Date): void;
  onCancel(): void;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState(initial);

  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        accessibilityLabel="Cerrar sin cambiar la fecha"
        onPress={onCancel}
        style={[styles.backdrop, { backgroundColor: theme.backdrop }]}>
        {/* Taps on the calendar do not reach the backdrop behind it. */}
        <Pressable accessible={false} style={styles.sheet}>
          <Card style={styles.calendar}>
            <ThemedText type="heading" accessibilityRole="header">
              Fecha
            </ThemedText>
            <DateTimePicker
              value={draft}
              mode="date"
              display="inline"
              locale="es-ES"
              themeVariant="light"
              accentColor={theme.textPrimary}
              onChange={(_, date) => {
                if (date) setDraft(date);
              }}
            />
            <View style={styles.actions}>
              <View style={styles.action}>
                <PrimaryButton label="Cancelar" variant="secondary" onPress={onCancel} />
              </View>
              <View style={styles.action}>
                <PrimaryButton label="Hecho" onPress={() => onDone(draft)} />
              </View>
            </View>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  action: {
    flexGrow: 1,
    flexBasis: 140,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  sheet: {
    alignSelf: 'stretch',
    alignItems: 'center',
  },
  calendar: {
    alignSelf: 'stretch',
    gap: Spacing.lg,
    maxWidth: MaxContentWidth / 2,
    width: '100%',
  },
});
