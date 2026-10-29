import { StyleSheet, Text, Pressable, SectionList, Alert } from 'react-native';
import { useNavigation, ParamListBase } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../AuthContext';
import { useTheme } from '../../themes/ThemeContext';

type SettingsItem = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
};

// Settings Screen
// The settings screen is where users can manage their account and app settings. 
// It provides options for signing out, changing email and password, managing 2FA settings, deleting the account, and changing the app's appearance.
export default function SettingsScreen() {
  const { signOut } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  const notYet = (label: string) => () => Alert.alert(label, 'This feature is not implemented yet.');

  const settingsSections: { title: string; data: SettingsItem[] }[] = [
    { title: 'Account and Security', data: [
      { label: 'Sign Out', onPress: signOut },
      // TODO: Merge the "Change Email" and "Change Password" and "2FA Settings" into one "Credentials" screen, and implement the backend for those features. 
      { label: 'Change Email', onPress: notYet('Change Email') },
      { label: 'Change Password', onPress: notYet('Change Password') },
      { label: '2FA Settings', onPress: notYet('2FA Settings') },
      // TODO: Implement the "Delete Account" feature SAFELY, with a confirmation dialog and a warning that this action is irreversible. This should also delete all user data from the server.
      { label: 'Delete Account', onPress: notYet('Delete Account'), destructive: true },
    ]},
    { title: 'App Settings', data: [
      { label: 'Appearance', onPress: () => navigation.navigate('Appearance') },
    ]},
  ];

  return (
    <SectionList
      style={{ backgroundColor: theme.background }}
      sections={settingsSections}
      keyExtractor={(item) => item.label}
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionHeader, { color: theme.textMuted }]}>{section.title}</Text>
      )}
      renderItem={({ item }) => (
        <Pressable
          style={[styles.row, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
          onPress={item.onPress}
        >
          <Text style={{ color: item.destructive ? '#d11' : theme.text, fontSize: 16 }}>{item.label}</Text>
          <Text style={{ color: theme.textMuted, fontSize: 18 }}>›</Text>
        </Pressable>
      )}
    />
  );
}

// Man I really need to make a global style sheet for this app.
// Im going to cry if I have to write more stylesheets
const styles = StyleSheet.create({
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});