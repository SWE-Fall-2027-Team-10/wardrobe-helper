import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { themes, Theme } from './theme';
import { StyleSheet, Text, View, Pressable, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { NavigationContainer, useNavigation, ParamListBase } from '@react-navigation/native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { createNativeStackNavigator, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, clearToken, getToken, ApiError, User } from './lib/api';

const Stack = createNativeStackNavigator();

// ---------- Theme ----------

const ThemeContext = createContext<Theme | undefined>(undefined);

export const useTheme = () => {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return theme;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const theme = themes.light; // Default to light theme, you can change this or make it dynamic
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

// ---------- Auth ----------
// Holds the logged-in user. null = logged out, so the navigator shows the login screens.

type AuthContextValue = {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = () => {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error('useAuth must be used within AuthContext');
  }
  return auth;
};

const errorMessage = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong.');

const features = [
  'Your Clothing',
  'Your Outfits',
  'Create New Outfit',
  'AI Wardrobe Helper'
];

// ---------- Login / Register screens (shown when logged out) ----------

function LoginScreen() {
  const { signIn } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // On success the user is set and the navigator switches to Home automatically.
    } catch (e) {
      Alert.alert('Sign in failed', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <Text style={styles.title}>Wardrobe Helper</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={onSignIn} disabled={loading}>
        <Text style={styles.buttonText}>Sign In</Text>
      </Pressable>
      <Pressable style={styles.buttonOutline} onPress={() => navigation.navigate('Register')} disabled={loading}>
        <Text>Create Account</Text>
      </Pressable>
      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
    </SafeAreaView>
  );
}

function RegisterScreen() {
  const { signIn } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onRegister = async () => {
    if (password.length < 8) {
      Alert.alert('Password too short', 'Use at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.register({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        password,
      });
      // The API doesn't log you in on register, so log in right after.
      await signIn(email.trim(), password);
    } catch (e) {
      Alert.alert('Sign up failed', errorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.authContainer} keyboardShouldPersistTaps="handled">
      <TextInput style={styles.input} placeholder="First name" autoComplete="given-name" value={firstName} onChangeText={setFirstName} />
      <TextInput style={styles.input} placeholder="Last name" autoComplete="family-name" value={lastName} onChangeText={setLastName} />
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password (8+ characters)"
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
      />
      <Pressable style={styles.button} onPress={onRegister} disabled={loading}>
        <Text style={styles.buttonText}>Create Account</Text>
      </Pressable>
      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
    </ScrollView>
  );
}

// ---------- Main app screens (shown when logged in) ----------

function HomeScreen() {
  // Get the navigation object from the context
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

  // Navigation functions for each feature
  // Maybe later move these out of the HomePage function and create separate navigation hooks
  // so they are universal and we won't have to repeat them in each screen
  const goToClothing = () => navigation.navigate('Clothing');
  const goToOutfits = () => navigation.navigate('Outfits');
  const goToCreateNewOutfit = () => navigation.navigate('Create New Outfit');
  const goToAIWardrobeHelper = () => navigation.navigate('AI Wardrobe Helper');
  const goToSettings = () => navigation.navigate('Settings');

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <View style={styles.toolbar}>
        <Pressable onPress={goToClothing}>
          <Text>Clothing</Text>
        </Pressable>
        <Pressable onPress={goToOutfits}>
          <Text>Outfits</Text>
        </Pressable>
        <Pressable onPress={goToCreateNewOutfit}>
          <Text>Create New Outfit</Text>
        </Pressable>
        <Pressable onPress={goToAIWardrobeHelper}>
          <Text>AI Wardrobe Helper</Text>
        </Pressable>
        <Pressable onPress={goToSettings}>
          <Text>Settings</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ClothingScreen() {
  return (
    <View style={styles.content}>
      <Text>Clothing Screen</Text>
    </View>
  );
}

function OutfitsScreen() {
  return (
    <View style={styles.content}>
      <Text>Outfits Screen</Text>
    </View>
  );
}

function CreateNewOutfitScreen() {
  return (
    <View style={styles.content}>
      <Text>Create New Outfit Screen</Text>
    </View>
  );
}

function AIWardrobeHelperScreen() {
  return (
    <View style={styles.content}>
      <Text>AI Wardrobe Helper Screen</Text>
    </View>
  );
}

function SettingsScreen() {
  const { user, signOut } = useAuth();

  return (
    <View style={styles.content}>
      <Text>Signed in as {user?.first_name} {user?.last_name}</Text>
      <Text style={{ color: '#666', marginBottom: 12 }}>{user?.email}</Text>
      <Pressable style={styles.buttonOutline} onPress={signOut}>
        <Text>Sign Out</Text>
      </Pressable>
    </View>
  );
}

// Stack navigator for the main screens
// Shows the login screens when logged out, and the app screens when logged in
function MyStack({ loggedIn }: { loggedIn: boolean }) {
  return (
    <Stack.Navigator>
      {loggedIn ? (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Clothing" component={ClothingScreen} />
          <Stack.Screen name="Outfits" component={OutfitsScreen} />
          <Stack.Screen name="Create New Outfit" component={CreateNewOutfitScreen} />
          <Stack.Screen name="AI Wardrobe Helper" component={AIWardrobeHelperScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // On startup, if a token was saved from an earlier login, ask the server who it belongs to.
  useEffect(() => {
    (async () => {
      try {
        if (await getToken()) {
          setUser(await api.me());
        }
      } catch (e) {
        // Expired or invalid session: forget the token so the login screen shows.
        if (e instanceof ApiError && e.status === 401) await clearToken();
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  const auth: AuthContextValue = {
    user,
    signIn: async (email, password) => setUser(await api.login(email, password)),
    signOut: async () => {
      try {
        await api.logout();
      } catch {
        // Token is cleared locally either way; nothing else to do.
      }
      setUser(null);
    },
  };

  if (checkingSession) {
    // Avoids flashing the login screen while the saved session is checked
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthContext.Provider value={auth}>
          <NavigationContainer>
            <MyStack loggedIn={user !== null} />
          </NavigationContainer>
        </AuthContext.Provider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 'auto',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#222',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#222',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
});