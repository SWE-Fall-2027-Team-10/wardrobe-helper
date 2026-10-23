import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { themes } from '../../theme';
import { useThemeSettings } from '../../ThemeContext';

// Capitalizes the theme key for display: 'ocean' -> 'Ocean'
const displayName = (name: string) => name.charAt(0).toUpperCase() + name.slice(1);

export default function AppearanceScreen() {
  const { theme, themeName, setThemeName } = useThemeSettings(); // Creates an array of the theme entries, so we can map over them and display each one as an option.

  return (
    <ScrollView style={{ backgroundColor: theme.background }} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>Theme</Text>

      {/*Maps over the themes object and creates a Pressable for each theme option. When pressed, it sets the themeName in the context to the selected theme.*/}
      {Object.entries(themes).map(([name, option]) => {
        const selected = name === themeName;
        return (
          
          // button component for each theme option. When pressed, it sets the themeName in the context to the selected theme.
          <Pressable
            key={name}
            onPress={() => setThemeName(name)}
            style={[
              styles.option,
              { backgroundColor: theme.surface, borderColor: selected ? theme.primary : theme.border },
            ]}
          >
            {/* Small preview of the theme's colors */}
            <View style={[styles.preview, { backgroundColor: option.background, borderColor: option.border }]}>
              <View style={[styles.swatch, { backgroundColor: option.primary }]} />
              <View style={[styles.swatch, { backgroundColor: option.surface }]} />
              <View style={[styles.swatch, { backgroundColor: option.text }]} />
            </View>

            <Text style={[styles.label, { color: theme.text }]}>{displayName(name)}</Text>

            <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border }]}>
              {selected && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
            </View>
          </Pressable>

        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 10,
  },
  preview: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  label: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
