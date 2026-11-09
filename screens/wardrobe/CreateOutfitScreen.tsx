
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
  View,
} from 'react-native';
import { useTheme } from '../../themes/ThemeContext';
import { api, ClothingItem, errorMessage } from '../../lib/api';

export default function CreateOutfitScreen() {
  const theme = useTheme();

  const [outfitName, setOutfitName] = useState('');
  const [description, setDescription] = useState('');
  const [clothing, setClothing] = useState<ClothingItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadClothing();
  }, []);

  const loadClothing = async () => {
    try {
      const items = await api.getClothing();
      setClothing(items);
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: number) => {
    setSelectedItems(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
  };

  const saveOutfit = async () => {
    if (!outfitName.trim()) {
      Alert.alert('Missing name', 'Enter an outfit name.');
      return;
    }

    if (selectedItems.length === 0) {
      Alert.alert('Missing clothing', 'Select at least one clothing item.');
      return;
    }

    try {
      setSaving(true);

      await api.createOutfit(
        outfitName.trim(),
        description.trim(),
        selectedItems
      );

      Alert.alert('Success', 'Your outfit was saved!');

      setOutfitName('');
      setDescription('');
      setSelectedItems([]);
    } catch (error) {
      Alert.alert('Error', errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Create New Outfit
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.surface,
          },
        ]}
        placeholder="Outfit name"
        placeholderTextColor={theme.textMuted}
        value={outfitName}
        onChangeText={setOutfitName}
      />

      <TextInput
        style={[
          styles.input,
          styles.description,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: theme.surface,
          },
        ]}
        placeholder="Description (optional)"
        placeholderTextColor={theme.textMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={[styles.subtitle, { color: theme.text }]}>
        Select Clothing Items
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.primary} />
      ) : clothing.length === 0 ? (
        <Text style={{ color: theme.textMuted }}>
          You haven't added any clothing yet. Add clothing before creating an outfit.
        </Text>
      ) : (
        <FlatList
          data={clothing}
          keyExtractor={item => String(item.clothing_id)}
          renderItem={({ item }) => {
            const selected = selectedItems.includes(item.clothing_id);

            return (
              <Pressable
                onPress={() => toggleItem(item.clothing_id)}
                style={[
                  styles.item,
                  {
                    backgroundColor: theme.surface,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                ]}
              >
                <View style={styles.itemInfo}>
                  <Text style={{ color: theme.text, fontWeight: '600' }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: theme.textMuted }}>
                    {item.category}
                    {item.color ? ` • ${item.color}` : ''}
                  </Text>
                </View>

                <Text style={{ color: theme.primary, fontSize: 20 }}>
                  {selected ? '✓' : '+'}
                </Text>
              </Pressable>
            );
          }}
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}

      <Text style={{ color: theme.textMuted, marginVertical: 10 }}>
        Selected: {selectedItems.length} item(s)
      </Text>

      <Pressable
        onPress={saveOutfit}
        disabled={saving}
        style={[
          styles.saveButton,
          {
            backgroundColor: theme.primary,
            opacity: saving ? 0.6 : 1,
          },
        ]}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.saveText}>Save Outfit</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  description: {
    minHeight: 75,
    textAlignVertical: 'top',
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
  },
  saveButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

