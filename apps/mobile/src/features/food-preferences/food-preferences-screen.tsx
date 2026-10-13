import { useState, type ReactNode } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { diets, type Diet, type FoodPreferences } from './food-preferences-api';
import { foodPreferencesErrorMessage } from './food-preferences-errors';
import { dietDescriptions, dietLabels, listLabels, type PreferenceList } from './labels';
import { useFoodPreferences, useSaveFoodPreferences } from './use-food-preferences';

import { PrimaryButton } from '@/components/primary-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IngredientPicker } from '@/features/ingredients/ingredient-picker';
import type { Ingredient } from '@/features/ingredients/ingredients-api';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning';

/** Diet and the foods the user likes or would rather avoid. */
export function FoodPreferencesScreen() {
  const { data: preferences, isPending, error, refetch, isRefetching } = useFoodPreferences();

  if (isPending) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator accessibilityLabel="Cargando tus preferencias" />
      </ThemedView>
    );
  }

  if (!preferences) {
    return (
      <ThemedView style={styles.centered}>
        <View style={styles.message}>
          <ThemedText type="subtitle" style={styles.centeredText}>
            No se han podido cargar tus preferencias
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.centeredText}>
            {foodPreferencesErrorMessage(error)}
          </ThemedText>
          <PrimaryButton label="Reintentar" loading={isRefetching} onPress={() => void refetch()} />
        </View>
      </ThemedView>
    );
  }

  return <FoodPreferencesForm saved={preferences} />;
}

function FoodPreferencesForm({ saved }: { saved: FoodPreferences }) {
  const save = useSaveFoodPreferences();
  // The form holds a draft; nothing reaches the API until it is saved.
  const { control, setValue, handleSubmit, reset } = useForm<FoodPreferences>({
    defaultValues: saved,
  });
  const { isDirty } = useFormState({ control });
  useUnsavedChangesWarning(isDirty);
  const diet = useWatch({ control, name: 'diet' });
  const liked = useWatch({ control, name: 'liked' });
  const avoided = useWatch({ control, name: 'avoided' });
  const [picking, setPicking] = useState<PreferenceList | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);

  function clearOutcome() {
    setJustSaved(false);
    setFailure(null);
  }

  function chooseDiet(chosen: Diet | null) {
    clearOutcome();
    setValue('diet', chosen, { shouldDirty: true });
  }

  /** Adds the ingredient to the list, or removes it if it is already there. */
  function toggle(list: PreferenceList, ingredient: Ingredient) {
    const current = list === 'liked' ? liked : avoided;
    const without = current.filter(({ id }) => id !== ingredient.id);
    clearOutcome();
    setValue(list, without.length < current.length ? without : [...current, ingredient], {
      shouldDirty: true,
    });
  }

  const submit = handleSubmit(async (values) => {
    setFailure(null);
    try {
      // The draft becomes what the API stored, so the form is clean again.
      reset(await save.mutateAsync(values));
      setJustSaved(true);
    } catch (error) {
      setFailure(foodPreferencesErrorMessage(error));
    }
  });

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.content}>
          <ThemedText type="subtitle">Preferencias alimentarias</ThemedText>

          <Section title="Dieta">
            <View accessibilityRole="radiogroup" style={styles.options}>
              <DietOption
                label="Sin preferencia"
                description="Como de todo."
                checked={diet === null}
                onPress={() => chooseDiet(null)}
              />
              {diets.map((option) => (
                <DietOption
                  key={option}
                  label={dietLabels[option]}
                  description={dietDescriptions[option]}
                  checked={diet === option}
                  onPress={() => chooseDiet(option)}
                />
              ))}
            </View>
          </Section>

          <IngredientList
            list="liked"
            ingredients={liked}
            empty="Todavía no has añadido ningún alimento que te guste."
            onRemove={(ingredient) => toggle('liked', ingredient)}
            onAdd={() => setPicking('liked')}
          />

          <IngredientList
            list="avoided"
            ingredients={avoided}
            empty="Todavía no has añadido ningún alimento que prefieras evitar."
            note="Indica aquí solo gustos. Las alergias e intolerancias tienen su propio apartado en Perfil."
            onRemove={(ingredient) => toggle('avoided', ingredient)}
            onAdd={() => setPicking('avoided')}
          />

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
              Preferencias guardadas.
            </ThemedText>
          )}
        </SafeAreaView>
      </ScrollView>

      {picking && (
        <IngredientPicker
          title={`Añadir a «${listLabels[picking]}»`}
          selected={picking === 'liked' ? liked : avoided}
          unavailable={{
            ingredients: picking === 'liked' ? avoided : liked,
            reason: `En «${listLabels[picking === 'liked' ? 'avoided' : 'liked']}»`,
          }}
          onToggle={(ingredient) => toggle(picking, ingredient)}
          onClose={() => setPicking(null)}
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

function DietOption({
  label,
  description,
  checked,
  onPress,
}: {
  label: string;
  description: string;
  checked: boolean;
  onPress(): void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ checked }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { borderColor: checked ? theme.text : theme.backgroundSelected },
        checked && { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <View style={styles.optionText}>
        <ThemedText type={checked ? 'smallBold' : 'small'}>{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      {checked && <ThemedText type="smallBold">✓</ThemedText>}
    </Pressable>
  );
}

function IngredientList({
  list,
  ingredients,
  empty,
  note,
  onRemove,
  onAdd,
}: {
  list: PreferenceList;
  ingredients: Ingredient[];
  empty: string;
  note?: string;
  onRemove(ingredient: Ingredient): void;
  onAdd(): void;
}) {
  const theme = useTheme();
  const title = listLabels[list];
  return (
    <Section title={title}>
      {note && (
        <ThemedText type="small" themeColor="textSecondary">
          {note}
        </ThemedText>
      )}
      {ingredients.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {empty}
        </ThemedText>
      ) : (
        <View style={styles.chips}>
          {ingredients.map((ingredient) => (
            <Pressable
              key={ingredient.id}
              accessibilityRole="button"
              accessibilityLabel={`Quitar ${ingredient.name} de «${title}»`}
              onPress={() => onRemove(ingredient)}
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
      <PrimaryButton label={`Añadir a «${title}»`} variant="secondary" onPress={onAdd} />
    </Section>
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
