import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useFormState, type Control } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  nutritionGoalFields,
  type NutritionGoalField,
  type NutritionGoals,
} from './nutrition-goals-api';
import { nutritionGoalsErrorMessage } from './nutrition-goals-errors';
import {
  goalSettings,
  nutritionGoalsFormSchema,
  toForm,
  toGoals,
  type NutritionGoalsForm,
} from './nutrition-goals-form';
import { useNutritionGoals, useSaveNutritionGoals } from './use-nutrition-goals';

import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

/** Calories and protein the user wants to aim for. */
export function NutritionGoalsScreen() {
  const { data: goals, isPending, error, refetch, isRefetching } = useNutritionGoals();

  if (isPending) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Cargando tus objetivos" />
      </ThemedView>
    );
  }

  if (!goals) {
    return (
      <ThemedView style={styles.centered}>
        <View style={styles.message}>
          <ThemedText type="subtitle" style={styles.centeredText}>
            No se han podido cargar tus objetivos nutricionales
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            {nutritionGoalsErrorMessage(error)}
          </ThemedText>
          <PrimaryButton label="Reintentar" loading={isRefetching} onPress={() => void refetch()} />
        </View>
      </ThemedView>
    );
  }

  return <NutritionGoalsFormView saved={goals} />;
}

function NutritionGoalsFormView({ saved }: { saved: NutritionGoals }) {
  const save = useSaveNutritionGoals();
  // The form holds a draft; nothing reaches the API until it is saved.
  const { control, handleSubmit, reset } = useForm<NutritionGoalsForm>({
    resolver: zodResolver(nutritionGoalsFormSchema),
    defaultValues: toForm(saved),
  });
  const { isDirty } = useFormState({ control });
  useUnsavedChangesWarning(isDirty);
  const [failure, setFailure] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  function clearOutcome() {
    setJustSaved(false);
    setFailure(null);
  }

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      // The draft becomes what the API stored, so the form is clean again.
      reset(toForm(await save.mutateAsync(toGoals(values))));
      setJustSaved(true);
    } catch (error) {
      setFailure(nutritionGoalsErrorMessage(error));
    }
  });

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior="padding" style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.content}>
            <ThemedText type="subtitle">Objetivos nutricionales</ThemedText>
            <ThemedText themeColor="textSecondary">
              Los eliges tú y todos son opcionales. La aplicación no los calcula ni sustituye el
              consejo de un profesional.
            </ThemedText>

            {nutritionGoalFields.map((field) => (
              <GoalSection key={field} field={field} control={control} onChange={clearOutcome} />
            ))}

            <PrimaryButton
              label="Guardar"
              disabled={!isDirty}
              loading={save.isPending}
              onPress={() => void submit()}
            />
            {failure && (
              <ThemedText
                type="small"
                themeColor="danger"
                accessibilityRole="alert"
                style={styles.centeredText}>
                {failure} Tus cambios siguen aquí, sin guardar.
              </ThemedText>
            )}
            {justSaved && (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                accessibilityLiveRegion="polite"
                style={styles.centeredText}>
                Objetivos guardados.
              </ThemedText>
            )}
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

function GoalSection({
  field,
  control,
  onChange,
}: {
  field: NutritionGoalField;
  control: Control<NutritionGoalsForm>;
  onChange(): void;
}) {
  const { title, description, unit } = goalSettings[field];

  return (
    <Controller
      control={control}
      name={field}
      render={({ field: { value: goal, onChange: setGoal, onBlur }, fieldState }) => {
        const hasValue = goal.value.trim() !== '';
        // Without a value there is no goal to apply, whatever the switch holds.
        const applied = hasValue && goal.enabled;
        // The error of the value is nested under the goal.
        const valueError = (fieldState.error as { value?: { message?: string } } | undefined)?.value
          ?.message;

        return (
          <ThemedView type="backgroundElement" style={styles.section}>
            <ThemedText type="smallBold" accessibilityRole="header">
              {title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {description}
            </ThemedText>
            <TextField
              label={`${title} (${unit})`}
              placeholder="Sin objetivo"
              value={goal.value}
              onChangeText={(text) => {
                onChange();
                setGoal({ value: text, enabled: goal.enabled });
              }}
              onBlur={onBlur}
              error={valueError}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={6}
              returnKeyType="done"
            />
            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <ThemedText type="small">Aplicar este objetivo</ThemedText>
                {hasValue && !applied && (
                  <ThemedText type="small" themeColor="textSecondary">
                    Desactivado: se conserva el valor, pero no se aplica.
                  </ThemedText>
                )}
              </View>
              <Switch
                accessibilityLabel={`Aplicar el objetivo de ${title.toLowerCase()}`}
                accessibilityState={{ checked: applied, disabled: !hasValue }}
                value={applied}
                disabled={!hasValue}
                onValueChange={(enabled) => {
                  onChange();
                  setGoal({ value: goal.value, enabled });
                }}
              />
            </View>
          </ThemedView>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  centeredText: {
    textAlign: 'center',
  },
  message: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    alignSelf: 'stretch',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  section: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  switchText: {
    flex: 1,
  },
});
