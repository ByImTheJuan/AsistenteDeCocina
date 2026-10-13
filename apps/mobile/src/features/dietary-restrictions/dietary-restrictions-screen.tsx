import { useState, type ReactNode } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { IngredientPicker } from '@/features/ingredients/ingredient-picker';
import type { Ingredient } from '@/features/ingredients/ingredients-api';
import { useTheme } from '@/hooks/use-theme';

/** Allergies and intolerances: what the user must not eat. */
export function DietaryRestrictionsScreen() {
  const { data: restrictions, isPending, error, refetch, isRefetching } = useDietaryRestrictions();

  if (isPending) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Cargando tus restricciones" />
      </ThemedView>
    );
  }

  if (!restrictions) {
    return (
      <ThemedView style={styles.centered}>
        <View style={styles.message}>
          <ThemedText type="subtitle" style={styles.centeredText}>
            No se han podido cargar tus alergias e intolerancias
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            {dietaryRestrictionsErrorMessage(error)}
          </ThemedText>
          <PrimaryButton label="Reintentar" loading={isRefetching} onPress={() => void refetch()} />
        </View>
      </ThemedView>
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
          <ThemedText type="subtitle">Alergias e intolerancias</ThemedText>
          <ThemedText themeColor="textSecondary">
            Lo que marques aquí es una restricción de seguridad, no un gusto: la aplicación lo
            tratará como algo que no puedes comer.
          </ThemedText>
          <View style={[styles.notice, { borderColor: theme.danger }]}>
            <ThemedText type="small">
              La aplicación no puede garantizar la ausencia de trazas ni de contaminación cruzada.
              Comprueba siempre el etiquetado de los productos.
            </ThemedText>
          </View>

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
                      { backgroundColor: theme.backgroundSelected },
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
            <View
              accessible
              accessibilityLabel="Conflicto con tus preferencias"
              style={[styles.notice, { borderColor: theme.danger }]}>
              <ThemedText type="smallBold">Conflicto con tus preferencias</ThemedText>
              <ThemedText type="small">
                En «Me gustan» tienes alimentos que chocan con las restricciones guardadas:{' '}
                {conflicts.map(({ name }) => name).join(', ')}. La restricción manda. Puedes
                quitarlos en Preferencias alimentarias.
              </ThemedText>
            </View>
          )}

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
              Restricciones guardadas.
            </ThemedText>
          )}
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
    <ThemedView type="backgroundElement" style={styles.section}>
      <ThemedText type="smallBold" accessibilityRole="header">
        {title}
      </ThemedText>
      {children}
    </ThemedView>
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
        { borderColor: checked ? theme.text : theme.backgroundSelected },
        checked && { backgroundColor: theme.backgroundSelected },
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
  notice: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  section: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.four,
  },
  options: {
    gap: Spacing.two,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 48,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Spacing.three,
  },
  optionText: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
