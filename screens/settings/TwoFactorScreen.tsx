// Two-Factor Sign-In screen (Settings > 2FA Settings).
// When it's on, logging in needs the password AND a 6-digit code emailed to the user,
// so a stolen password alone isn't enough. Turning it on or off needs the current password.
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
import { api, errorMessage } from "../../lib/api";

export default function TwoFactorScreen() {
	const { user, refreshUser } = useAuth();
	const theme = useTheme();

	const enabled = Boolean(user?.two_factor_enabled);
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const onToggle = async () => {
		setError("");
		if (!password) {
			setError("Enter your password to confirm.");
			return;
		}

		setLoading(true);
		try {
			const { message } = await api.setTwoFactor(!enabled, password);
			await refreshUser(); // updates user.two_factor_enabled, which redraws this screen
			setPassword("");
			Alert.alert("Two-factor sign-in", message);
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setLoading(false);
		}
	};

	return (
		<ScrollView
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={styles.container}
			keyboardShouldPersistTaps="handled"
		>
			<View
				style={[
					styles.statusBox,
					{ backgroundColor: theme.surface, borderColor: theme.border },
				]}
			>
				<Text style={[styles.statusLabel, { color: theme.textMuted }]}>
					Status
				</Text>
				<Text
					style={[
						styles.statusValue,
						{ color: enabled ? "#166534" : theme.text },
					]}
				>
					{enabled ? "On" : "Off"}
				</Text>
			</View>

			<Text style={[styles.body, { color: theme.textMuted }]}>
				{enabled
					? `Each time you log in, we email a 6-digit code to ${user?.email}. You need your password and that code.`
					: `Add a second step to logging in: after your password, enter a 6-digit code we email to ${user?.email}. Someone who learns your password still can't get in.`}
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
				style={
					enabled
						? [styles.buttonOutline, { borderColor: theme.primary }]
						: [styles.button, { backgroundColor: theme.primary }]
				}
				onPress={onToggle}
				disabled={loading}
			>
				<Text style={enabled ? { color: theme.primary } : styles.buttonText}>
					{loading
						? "Saving..."
						: enabled
							? "Turn Off Two-Factor Sign-In"
							: "Turn On Two-Factor Sign-In"}
				</Text>
			</Pressable>

			{loading && (
				<ActivityIndicator style={{ marginTop: 12 }} color={theme.primary} />
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 24,
	},
	statusBox: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		borderWidth: 1,
		borderRadius: 8,
		padding: 14,
		marginBottom: 16,
	},
	statusLabel: {
		fontSize: 13,
		fontWeight: "600",
		textTransform: "uppercase",
	},
	statusValue: {
		fontSize: 16,
		fontWeight: "600",
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
		marginTop: 8,
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
	buttonOutline: {
		borderWidth: 1,
		padding: 14,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 8,
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
