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
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import SettingsScreen from './screens/settings/SettingsScreen';
import AppearanceScreen from './screens/settings/AppearanceScreen';
import VerificationScreen from './screens/auth/VerificationScreen';
import ChangePasswordScreen from './screens/settings/ChangePasswordScreen';
import DeleteAccountScreen from './screens/settings/DeleteAccountScreen';
import ChangeEmailScreen from './screens/settings/ChangeEmailScreen';
import TwoFactorScreen from './screens/settings/TwoFactorScreen';
import CreateOutfitScreen from './screens/wardrobe/CreateOutfitScreen';

const Stack = createNativeStackNavigator();

function MyStack() {
  const { user } = useAuth();

  return (
    <Stack.Navigator>
      {!user ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Create Account' }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ title: 'Reset Password' }}
          />
        </>
      ) : !user.verified ? (
        <>
          <Stack.Screen
            name="Verification"
            component={VerificationScreen}
            options={{ title: 'Verify Email' }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Main"
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Appearance" component={AppearanceScreen} />
          <Stack.Screen
            name="ChangeEmail"
            component={ChangeEmailScreen}
            options={{ title: 'Change Email' }}
          />
          <Stack.Screen
            name="ChangePassword"
            component={ChangePasswordScreen}
            options={{ title: 'Change Password' }}
          />
          <Stack.Screen
            name="TwoFactor"
            component={TwoFactorScreen}
            options={{ title: 'Two-Factor Sign-In' }}
          />
          <Stack.Screen
            name="DeleteAccount"
            component={DeleteAccountScreen}
            options={{ title: 'Delete Account' }}
          />
          <Stack.Screen
            name="Create New Outfit"
            component={CreateOutfitScreen}
            options={{ title: 'Create New Outfit' }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

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
