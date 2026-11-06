// Delete Account screen, opened from Settings.
// Explains what will be lost, asks for the password, then asks once more in a dialog before deleting.
// On success AuthContext sets user to null, so App.tsx shows the login screen on its own.
import { useState } from "react";
import {
	StyleSheet,
	Text,
	Pressable,
	TextInput,
	ActivityIndicator,
	ScrollView,
	View,
	Alert,
} from "react-native";
import { useAuth } from "../../AuthContext";
import { useTheme } from "../../themes/ThemeContext";
import { errorMessage } from "../../lib/api";

const DANGER = "#d11"; // same red as the Delete Account row in Settings

export default function DeleteAccountScreen() {
	const { user, deleteAccount } = useAuth();
	const theme = useTheme();

	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const doDelete = async () => {
		setLoading(true);
		try {
			await deleteAccount(password);
			// No navigation needed: user is now null, so the login screen appears.
		} catch (e) {
			setError(errorMessage(e));
			setLoading(false);
		}
	};

	const onDeletePress = () => {
		setError("");
		if (!password) {
			setError("Enter your password to confirm.");
			return;
		}
		Alert.alert(
			"Delete account?",
			"This permanently deletes your account and everything in it. This can't be undone.",
			[
				{ text: "Cancel", style: "cancel" },
				{ text: "Delete", style: "destructive", onPress: doDelete },
			],
		);
	};

	return (
		<ScrollView
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={styles.container}
			keyboardShouldPersistTaps="handled"
		>
			<Text style={[styles.title, { color: theme.text }]}>
				This can't be undone
			</Text>
			<Text style={[styles.body, { color: theme.textMuted }]}>
				Deleting {user?.email ?? "your account"} permanently removes:
			</Text>
			<Text style={[styles.body, { color: theme.text }]}>
				{"•"} Your profile and measurements{"\n"}
				{"•"} All your clothing{"\n"}
				{"•"} Your outfits, favorites and shared outfits
			</Text>

			<Text style={[styles.label, { color: theme.textMuted }]}>
				Confirm with your password
			</Text>
			<TextInput
				style={[
					styles.input,
					{
						borderColor: theme.border,
						backgroundColor: theme.surface,
						color: theme.text,
					},
				]}
				placeholder="Password"
				placeholderTextColor={theme.textMuted}
				secureTextEntry
				autoComplete="current-password"
				textContentType="password"
				value={password}
				onChangeText={setPassword}
			/>

			{error ? (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			) : null}

			<Pressable
				style={[styles.button, { backgroundColor: DANGER }]}
				onPress={onDeletePress}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Deleting..." : "Delete My Account"}
				</Text>
			</Pressable>

			{loading && (
				<ActivityIndicator style={{ marginTop: 12 }} color={DANGER} />
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 24,
	},
	title: {
		fontSize: 22,
		fontWeight: "bold",
		marginBottom: 12,
	},
	body: {
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 12,
	},
	label: {
		fontSize: 13,
		fontWeight: "600",
		textTransform: "uppercase",
		marginBottom: 6,
		marginTop: 12,
	},
	input: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
	},
	button: {
		padding: 14,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 8,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
	},
	errorBox: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: "#fee2e2",
		marginBottom: 12,
	},
	errorText: {
		color: "#991b1b",
		fontSize: 14,
	},
});
