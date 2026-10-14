import { useState, type ReactNode } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  allergens as allAllergens,
  type Allergen,
  type DietaryRestrictions,
  type DietaryRestrictionsDraft,
} from './dietary-restrictions-api';
import { dietaryRestrictionsErrorMessage } from './dietary-restrictions-errors';
import { allergenLabels } from './labels';
import { useDietaryRestrictions, useSaveDietaryRestrictions } from './use-dietary-restrictions';

import { Notice } from '@/components/notice';
import { ScreenState } from '@/components/screen-state';
import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { IngredientPicker } from '@/features/ingredients/ingredient-picker';
import type { Ingredient } from '@/features/ingredients/ingredients-api';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

/** Allergies and intolerances: what the user must not eat. */
export function DietaryRestrictionsScreen() {
  const { data: restrictions, isPending, error, refetch, isRefetching } = useDietaryRestrictions();

  if (isPending) {
    return <ScreenState kind="loading" label="Cargando tus restricciones" />;
  }

  if (!restrictions) {
    return (
      <ScreenState
        kind="error"
        title="No se han podido cargar tus alergias e intolerancias"
        message={dietaryRestrictionsErrorMessage(error)}
        retrying={isRefetching}
        onRetry={() => void refetch()}
      />
    );
  }

  return <DietaryRestrictionsForm saved={restrictions} />;
}

function DietaryRestrictionsForm({ saved }: { saved: DietaryRestrictions }) {
  const theme = useTheme();
  const save = useSaveDietaryRestrictions();
  // The form holds a draft; nothing reaches the API until it is saved.
  const { control, setValue, handleSubmit, reset } = useForm<DietaryRestrictionsDraft>({
    defaultValues: { allergens: saved.allergens, ingredients: saved.ingredients },
  });
  const { isDirty } = useFormState({ control });
  useUnsavedChangesWarning(isDirty);
  const allergens = useWatch({ control, name: 'allergens' });
  const ingredients = useWatch({ control, name: 'ingredients' });
  const [picking, setPicking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  function clearOutcome() {
    setJustSaved(false);
    setFailure(null);
  }

  function toggleAllergen(allergen: Allergen) {
    clearOutcome();
    // Kept in the order of the list so unchecking and checking again leaves
    // the draft as it was.
    const next = allergens.includes(allergen)
      ? allergens.filter((current) => current !== allergen)
      : allAllergens.filter((current) => current === allergen || allergens.includes(current));
    setValue('allergens', next, { shouldDirty: true });
  }

  /** Adds the ingredient to the list, or removes it if it is already there. */
  function toggleIngredient(ingredient: Ingredient) {
    const without = ingredients.filter(({ id }) => id !== ingredient.id);
    clearOutcome();
    setValue(
      'ingredients',
      without.length < ingredients.length ? without : [...ingredients, ingredient],
      { shouldDirty: true },
    );
  }

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      const stored = await save.mutateAsync(values);
      // The draft becomes what the API stored, so the form is clean again.
      reset({ allergens: stored.allergens, ingredients: stored.ingredients });
      setJustSaved(true);
    } catch (error) {
      setFailure(dietaryRestrictionsErrorMessage(error));
    }
  });

  const conflicts = saved.conflictingLikedIngredients;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.content}>
          <ThemedText type="title">Alergias e intolerancias</ThemedText>
          <ThemedText themeColor="textSecondary">
            Lo que marques aquí es una restricción de seguridad, no un gusto: la aplicación lo
            tratará como algo que no puedes comer.
          </ThemedText>
          <Notice tone="warning">
            La aplicación no puede garantizar la ausencia de trazas ni de contaminación cruzada.
            Comprueba siempre el etiquetado de los productos.
          </Notice>

          <Section title="Alérgenos e intolerancias">
            <View style={styles.options}>
              {allAllergens.map((allergen) => (
                <AllergenOption
                  key={allergen}
                  name={allergenLabels[allergen].name}
                  examples={allergenLabels[allergen].examples}
                  checked={allergens.includes(allergen)}
                  onPress={() => toggleAllergen(allergen)}
                />
              ))}
            </View>
          </Section>

          <Section title="Otros alimentos">
            <ThemedText type="small" themeColor="textSecondary">
              Si no puedes comer algún alimento concreto que no esté en la lista anterior, añádelo
              aquí.
            </ThemedText>
            {ingredients.length > 0 && (
              <View style={styles.chips}>
                {ingredients.map((ingredient) => (
                  <Pressable
                    key={ingredient.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar ${ingredient.name} de tus restricciones`}
                    onPress={() => toggleIngredient(ingredient)}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: theme.surfaceSecondary },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="small">{ingredient.name}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      ✕
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            )}
            <PrimaryButton
              label="Añadir alimento"
              variant="secondary"
              onPress={() => setPicking(true)}
            />
          </Section>

          {conflicts.length > 0 && (
            <Notice
              tone="warning"
              title="Conflicto con tus preferencias"
              accessibilityLabel="Conflicto con tus preferencias">
              En «Me gustan» tienes alimentos que chocan con las restricciones guardadas:{' '}
              {conflicts.map(({ name }) => name).join(', ')}. La restricción manda. Puedes quitarlos
              en Preferencias alimentarias.
            </Notice>
          )}

          <PrimaryButton
            label="Guardar"
            disabled={!isDirty}
            loading={save.isPending}
            onPress={() => void submit()}
          />
          {failure && <Notice tone="error">{failure} Tus cambios siguen aquí, sin guardar.</Notice>}
          {justSaved && <Notice tone="success">Restricciones guardadas.</Notice>}
        </SafeAreaView>
      </ScrollView>

      {picking && (
        <IngredientPicker
          title="Alimentos que no puedo comer"
          selected={ingredients}
          onToggle={toggleIngredient}
          onClose={() => setPicking(false)}
        />
      )}
    </ThemedView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card style={styles.section}>
      <ThemedText type="heading" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </Card>
  );
}

function AllergenOption({
  name,
  examples,
  checked,
  onPress,
}: {
  name: string;
  examples: string;
  checked: boolean;
  onPress(): void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={name}
      accessibilityHint={examples}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { borderColor: checked ? theme.textPrimary : theme.borderStrong },
        checked && { backgroundColor: theme.surfaceSecondary },
        pressed && styles.pressed,
      ]}>
      <View style={styles.optionText}>
        <ThemedText type={checked ? 'smallBold' : 'small'}>{name}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {examples}
        </ThemedText>
      </View>
      {checked && <ThemedText type="smallBold">✓</ThemedText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  content: {
    alignSelf: 'stretch',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xl,
    maxWidth: MaxContentWidth,
  },
  section: {
    gap: Spacing.lg,
  },
  options: {
    gap: Spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.md,
  },
  optionText: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
  },
  pressed: {
    opacity: 0.7,
  },
});
