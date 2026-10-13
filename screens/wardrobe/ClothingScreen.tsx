// 1. React: only the hooks this screen actually uses
import { useState, useEffect } from 'react';

// 2. React Native components: only what you render
import { StyleSheet, Text, View, Pressable } from 'react-native';

// 3. Navigation: only if this screen moves to other screens
import { useNavigation, ParamListBase } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// 4. Your app's shared code: paths depend on how deep the file is
import { useTheme } from '../../ThemeContext';
import { useAuth } from '../../AuthContext';   // only if it needs the user or signOut
import { api } from '../../lib/api';           // only if it calls the server

export default function ClothingScreen() {
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Your Clothing</Text>
    </View>
  );
}

// Layout here; colors come from the theme above
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
});