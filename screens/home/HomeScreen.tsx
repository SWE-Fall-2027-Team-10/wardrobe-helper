import { StyleSheet, Text, View, Pressable, ScrollView } from "react-native";
import { useNavigation, ParamListBase } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../themes/ThemeContext";
import { useAuth } from "../../AuthContext";

// Creates shortcut buttons for the biggest features of the app, so users can quickly access them from the home screen. 
// Each shortcut has a label, description, screen to navigate to, and an emoji for visual appeal.
const shortcuts = [
	{
		label: "Your Clothing",
		description: "Browse and add to your wardrobe",
		screen: "Clothing",
		emoji: "👕",
	},
	{
		label: "Create New Outfit",
		description: "Put together a new look",
		screen: "Outfits",
		emoji: "➕",
	},
	{
		label: "Your Outfits",
		description: "See your saved outfits",
		screen: "Outfits",
		emoji: "🧥",
	},
	{
		label: "AI Hub",
		description: "AI Feature Hub",
		screen: "AI Hub",
		emoji: "✨",
	},
];

// Home Screen
// The home screen is the first screen users see when they open the app. It greets them by name and provides quick access to the main features of the app through shortcut buttons.
export default function HomeScreen() {
	const theme = useTheme();
	const { user } = useAuth();
	const navigation =
		useNavigation<NativeStackNavigationProp<ParamListBase>>();
	return (
		<ScrollView
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={styles.container}
		>
			<Text style={[styles.greeting, { color: theme.text }]}>
				Hi, {user?.first_name} 👋
			</Text>
			<Text style={[styles.subtitle, { color: theme.textMuted }]}>
				What are we wearing today?
			</Text>
			<View style={styles.grid}>
				{shortcuts.map((item) => (
					<Pressable
						key={item.label}
						onPress={() => navigation.navigate(item.screen)}
						style={({ pressed }) => [
							styles.card,
							{
								backgroundColor: theme.surface,
								borderColor: theme.border,
								opacity: pressed ? 0.7 : 1,
							},
						]}
					>
						<Text style={styles.cardEmoji}>{item.emoji}</Text>
						<Text style={[styles.cardLabel, { color: theme.text }]}>
							{item.label}
						</Text>
						<Text
							style={[
								styles.cardDescription,
								{ color: theme.textMuted },
							]}
						>
							{item.description}
						</Text>
					</Pressable>
				))}
			</View>
		</ScrollView>
	);
}
const styles = StyleSheet.create({
	container: { padding: 16 },
	greeting: { fontSize: 28, fontWeight: "bold" },
	subtitle: { fontSize: 16, marginTop: 4, marginBottom: 24 },
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
		rowGap: 12,
	},
	card: { width: "48%", padding: 16, borderRadius: 12, borderWidth: 1 },
	cardEmoji: { fontSize: 28, marginBottom: 8 },
	cardLabel: { fontSize: 16, fontWeight: "600" },
	cardDescription: { fontSize: 13, marginTop: 4 },
});
