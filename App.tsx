import { ReactNode } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useThemeSettings } from './themes/ThemeContext';
import { AuthProvider, useAuth } from './AuthContext';
import MainTabs from './navigation/MainTabs';
import LoginScreen from './screens/auth/LoginScreen';
import RegisterScreen from './screens/auth/RegisterScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import AppearanceScreen from './screens/settings/AppearanceScreen';
import VerificationScreen from './screens/auth/VerificationScreen';

const Stack = createNativeStackNavigator();

// Logged out: the login and register screens.
// Logged in but not verified: only the verification screen.
// Logged in and verified: the tab bar, plus screens that open on top of it.
// Changing `user` in AuthContext is what switches between these (no navigate() calls needed).
function MyStack() {
  const { user } = useAuth();
  return (
    <Stack.Navigator>
      {!user ? (
        <>
          {/* Seperate stack for logged out users, so they don't see the tab bar or other screens. */}
          {/* The login screen is the first screen, so it will be shown first. The register screen can be opened from the login screen. */}
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Register" component={RegisterScreen} options={{ title: 'Create Account' }} />
        </>
      ) : !user.verified ? (
        <>
          {/* Logged in but not verified: this is the only screen until /verify succeeds and refreshUser() runs. */}
          <Stack.Screen name="Verification" component={VerificationScreen} options={{ title: 'Verify Email' }} />
        </>
      ) : (
        <>
          {/* Main screen is the tab navigator, which has its own headers for each tab. */}
          {/* You can find the main screens in navigation/MainTabs.tsx. The other screens here that are not in main are stacked on top of the tabs, so they cover the tab bar while open. */}
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Appearance" component={AppearanceScreen} />
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