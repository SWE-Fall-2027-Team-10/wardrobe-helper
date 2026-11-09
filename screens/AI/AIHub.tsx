
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../themes/ThemeContext';
import { api, ClothingItem, errorMessage } from '../../lib/api';

export default function AIHub() {
  const theme = useTheme();

  const [activeFeature, setActiveFeature] = useState<'advice' | 'preview'>('advice');

  const [clothing, setClothing] = useState<ClothingItem[]>([]);
  const [wardrobeText, setWardrobeText] = useState('');
  const [question, setQuestion] = useState('');
  const [advice, setAdvice] = useState('');
  const [adviceLoading, setAdviceLoading] = useState(false);

  const [photo, setPhoto] = useState<string | null>(null);
  const [outfit, setOutfit] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadWardrobe();
  }, []);

  const loadWardrobe = async () => {
    try {
      const items = await api.getClothing();
      setClothing(items);
      setWardrobeText(
        items.map(item =>
          [item.name, item.category, item.color].filter(Boolean).join(' ')
        ).join(', ')
      );
    } catch {
      setClothing([]);
    }
  };

  const getAdvice = async () => {
    if (!question.trim()) {
      Alert.alert('Missing question', 'Enter a fashion question first.');
      return;
    }

    try {
      setAdviceLoading(true);
      setAdvice('');

      const wardrobeItems = wardrobeText
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);

      const result = await api.advice(question.trim(), wardrobeItems);
      setAdvice(result.reply);
    } catch (error) {
      Alert.alert('AI Advice Error', errorMessage(error));
    } finally {
      setAdviceLoading(false);
    }
  };

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        'Allow photo library access to choose a photo.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const asset = result.assets[0];
      const mimeType = asset.mimeType || 'image/jpeg';
      setPhoto(`data:${mimeType};base64,${asset.base64}`);
      setPreview(null);
    }
  };

  const generatePreview = async () => {
    if (!photo) {
      Alert.alert('Photo required', 'Choose a photo first.');
      return;
    }

    if (!outfit.trim()) {
      Alert.alert('Outfit required', 'Describe the outfit you want to preview.');
      return;
    }

    try {
      setPreviewLoading(true);
      setPreview(null);

      const result = await api.preview(photo, outfit.trim());
      setPreview(`data:image/png;base64,${result.imageBase64}`);
    } catch (error) {
      Alert.alert('Preview Error', errorMessage(error));
    } finally {
      setPreviewLoading(false);
    }
  };

  const buttonStyle = (selected: boolean) => [
    styles.featureButton,
    {
      backgroundColor: selected ? theme.primary : theme.surface,
      borderColor: theme.border,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: theme.text }]}>AI Hub</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>
          Your personal AI-powered wardrobe assistant
        </Text>

        <View style={styles.featureRow}>
          <Pressable
            onPress={() => setActiveFeature('advice')}
            style={buttonStyle(activeFeature === 'advice')}
          >
            <Text
              style={{
                color: activeFeature === 'advice' ? '#FFFFFF' : theme.text,
                fontWeight: '600',
              }}
            >
              ✨ Wardrobe Advice
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveFeature('preview')}
            style={buttonStyle(activeFeature === 'preview')}
          >
            <Text
              style={{
                color: activeFeature === 'preview' ? '#FFFFFF' : theme.text,
                fontWeight: '600',
              }}
            >
              🖼 Outfit Preview
            </Text>
          </Pressable>
        </View>

        {activeFeature === 'advice' ? (
          <View style={styles.section}>
            <Text style={[styles.heading, { color: theme.text }]}>
              AI Wardrobe Advice
            </Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Ask for outfit ideas, color combinations, or fashion advice based
              on your clothing.
            </Text>

            <Text style={[styles.label, { color: theme.text }]}>
              Your wardrobe items
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.multiline,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              value={wardrobeText}
              onChangeText={setWardrobeText}
              placeholder="Example: Black jeans, white T-shirt, denim jacket"
              placeholderTextColor={theme.textMuted}
              multiline
            />

            <Text style={[styles.label, { color: theme.text }]}>
              Your question
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.multiline,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              value={question}
              onChangeText={setQuestion}
              placeholder="Example: Suggest an outfit for a casual dinner."
              placeholderTextColor={theme.textMuted}
              multiline
            />

            <Pressable
              onPress={getAdvice}
              disabled={adviceLoading}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.primary,
                  opacity: adviceLoading ? 0.6 : 1,
                },
              ]}
            >
              {adviceLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Get AI Advice</Text>
              )}
            </Pressable>

            {advice ? (
              <View
                style={[
                  styles.result,
                  {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.heading, { color: theme.text }]}>
                  Your AI Suggestions
                </Text>
                <Text style={[styles.resultText, { color: theme.text }]}>
                  {advice}
                </Text>
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={[styles.heading, { color: theme.text }]}>
              AI Outfit Preview
            </Text>
            <Text style={[styles.description, { color: theme.textMuted }]}>
              Choose a photo and describe an outfit to request an AI-generated
              preview.
            </Text>

            <Pressable
              onPress={choosePhoto}
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
            >
              <Text style={{ color: theme.text, fontWeight: '600' }}>
                Choose Photo
              </Text>
            </Pressable>

            {photo ? (
              <Image
                source={{ uri: photo }}
                style={styles.photo}
                resizeMode="contain"
              />
            ) : null}

            <Text style={[styles.label, { color: theme.text }]}>
              Describe your outfit
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.multiline,
                {
                  color: theme.text,
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                },
              ]}
              value={outfit}
              onChangeText={setOutfit}
              placeholder="Example: Blue jeans, white shirt, and denim jacket."
              placeholderTextColor={theme.textMuted}
              multiline
            />

            <Pressable
              onPress={generatePreview}
              disabled={previewLoading}
              style={[
                styles.primaryButton,
                {
                  backgroundColor: theme.primary,
                  opacity: previewLoading ? 0.6 : 1,
                },
              ]}
            >
              {previewLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Generate Preview</Text>
              )}
            </Pressable>

            {preview ? (
              <View style={styles.previewContainer}>
                <Text style={[styles.heading, { color: theme.text }]}>
                  Your Outfit Preview
                </Text>
                <Image
                  source={{ uri: preview }}
                  style={styles.photo}
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 35,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  featureButton: {
    flex: 1,
    padding: 13,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  section: {
    gap: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  multiline: {
    minHeight: 85,
    textAlignVertical: 'top',
  },
  primaryButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 5,
  },
  secondaryButton: {
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  result: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  resultText: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 10,
  },
  photo: {
    width: '100%',
    height: 300,
    borderRadius: 10,
    marginVertical: 10,
  },
  previewContainer: {
    marginTop: 15,
    gap: 10,
  },
});

