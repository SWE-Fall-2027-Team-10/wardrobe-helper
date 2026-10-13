import { ReactNode } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useThemeSettings } from './ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';
import MainTabs from './navigation/MainTabs';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import AppearanceScreen from './screens/settings/AppearanceScreen';

const Stack = createNativeStackNavigator();

// Logged in: the tab bar, plus screens that open on top of it.
// Logged out: the login and register screens.
function MyStack() {
  const { user } = useAuth();
  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Appearance" component={AppearanceScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
        </>
      )}
    </Stack.Navigator>
  );
}

// Gives the navigation headers, tab bar and status bar the current theme's colors
function ThemedNavigation({ children }: { children: ReactNode }) {
  const { theme, isDark } = useThemeSettings();
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.text,
      border: theme.border,
    },
  };
  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <ThemedNavigation>
            <MyStack />
          </ThemedNavigation>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}