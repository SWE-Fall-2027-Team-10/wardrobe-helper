// The bottom tab bar shown after logging in.
// Each tab is one of the app's main areas. Screens that open "on top" of the tabs
// (Settings, Appearance, and later things like an outfit's detail page) live in the
// stack in App.tsx instead, so they cover the tab bar while open.
import { Text, Pressable } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation, ParamListBase } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../themes/ThemeContext';
import HomeScreen from '../screens/home/HomeScreen';
import ClothingScreen from '../screens/wardrobe/ClothingScreen';
import OutfitsScreen from '../screens/wardrobe/OutfitsScreen';
import AIWardrobeHelperScreen from '../screens/AI/AIHub';

const Tab = createBottomTabNavigator();

// Placeholder icons using emoji so there's no extra icon library to install yet.
// Swap these for a real icon set later.
const tabIcon = (emoji: string) => ({ focused }: { focused: boolean }) => (
  <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>{emoji}</Text>
);

// Gear button in the Home header that opens Settings
function SettingsButton() {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const theme = useTheme();
  return (
    <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={12} style={{ marginRight: 16 }}>
      <Text style={{ fontSize: 20, color: theme.text }}>⚙️</Text>
    </Pressable>
  );
}

export default function MainTabs() {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: tabIcon('🏠'), headerRight: () => <SettingsButton /> }}
      />
      <Tab.Screen
        name="Clothing"
        component={ClothingScreen}
        options={{ title: 'Your Clothing', tabBarLabel: 'Clothing', tabBarIcon: tabIcon('👕') }}
      />
      <Tab.Screen
        name="Outfits"
        component={OutfitsScreen}
        options={{ title: 'Your Outfits', tabBarLabel: 'Outfits', tabBarIcon: tabIcon('🧥') }}
      />
      <Tab.Screen
        name="AI Hub"
        component={AIWardrobeHelperScreen}
        options={{ tabBarLabel: 'AI Hub', tabBarIcon: tabIcon('✨') }}
      />
    </Tab.Navigator>
  );
}
