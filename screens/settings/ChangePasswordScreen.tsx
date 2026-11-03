// Change Password screen, opened from Settings.
// The user confirms their current password, then picks a new one (typed twice).
// The server checks the current password and saves the new one: see PUT /api/auth/password.
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
import { useNavigation, ParamListBase } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../themes/ThemeContext";
import { api, errorMessage } from "../../lib/api";

const MIN_PASSWORD_LENGTH = 8; // same rule as registration

export default function ChangePasswordScreen() {
	const theme = useTheme();
	const navigation =
		useNavigation<NativeStackNavigationProp<ParamListBase>>();

	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const onSave = async () => {
		setError("");

		// Quick checks on the phone so the user gets instant feedback.
		// The server still checks everything again: the app can't be trusted to enforce rules.
		if (!currentPassword || !newPassword || !confirmPassword) {
			setError("Please fill in all fields.");
			return;
		}
		if (newPassword.length < MIN_PASSWORD_LENGTH) {
			setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("New passwords don't match.");
			return;
		}
		if (newPassword === currentPassword) {
			setError("New password must be different from your current one.");
			return;
		}

		setLoading(true);
		try {
			await api.changePassword(currentPassword, newPassword);
			Alert.alert("Password changed", "Your password has been updated. Any other devices have been signed out.");
			navigation.goBack();
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setLoading(false);
		}
	};

	const inputStyle = [
		styles.input,
		{
			borderColor: theme.border,
			backgroundColor: theme.surface,
			color: theme.text,
		},
	];

	return (
		<ScrollView
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={styles.container}
			keyboardShouldPersistTaps="handled"
		>
			<Text style={[styles.label, { color: theme.textMuted }]}>
				Current password
			</Text>
			<TextInput
				style={inputStyle}
				placeholder="Current password"
				placeholderTextColor={theme.textMuted}
				secureTextEntry
				autoComplete="current-password"
				textContentType="password"
				value={currentPassword}
				onChangeText={setCurrentPassword}
			/>

			<Text style={[styles.label, { color: theme.textMuted }]}>
				New password
			</Text>
			<TextInput
				style={inputStyle}
				placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
				placeholderTextColor={theme.textMuted}
				secureTextEntry
				autoComplete="new-password"
				textContentType="newPassword"
				value={newPassword}
				onChangeText={setNewPassword}
			/>
			<TextInput
				style={inputStyle}
				placeholder="Confirm new password"
				placeholderTextColor={theme.textMuted}
				secureTextEntry
				autoComplete="new-password"
				textContentType="newPassword"
				value={confirmPassword}
				onChangeText={setConfirmPassword}
			/>

			{error ? (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			) : null}

			<Pressable
				style={[styles.button, { backgroundColor: theme.primary }]}
				onPress={onSave}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Saving..." : "Change Password"}
				</Text>
			</Pressable>

			{loading && (
				<ActivityIndicator
					style={{ marginTop: 12 }}
					color={theme.primary}
				/>
			)}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 24,
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
