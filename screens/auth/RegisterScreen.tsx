import { useState } from "react";
import {
	StyleSheet,
	Text,
	Pressable,
	TextInput,
	ActivityIndicator,
	ScrollView,
	View,
} from "react-native";
import { useAuth } from "../../AuthContext";
import { useTheme } from "../../ThemeContext";
import { api, errorMessage } from "../../lib/api";

export default function RegisterScreen() {
	const { signIn } = useAuth();
	const theme = useTheme();

	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const onRegister = async () => {
		setError("");

		if (!firstName.trim() || !lastName.trim() || !email.trim()) {
			setError("Please fill in all fields.");
			return;
		}

		if (password.length < 8) {
			setError("Password must be at least 8 characters.");
			return;
		}

		setLoading(true);

		try {
			const normalizedEmail = email.trim().toLowerCase();

			await api.register({
				first_name: firstName.trim(),
				last_name: lastName.trim(),
				email: normalizedEmail,
				password,
			});

			// Automatically sign in after successful registration.
			await signIn(normalizedEmail, password);
		} catch (e) {
			const message = errorMessage(e);
			console.error("REGISTRATION ERROR:", e);
			setError(message);
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
			<Text style={[styles.title, { color: theme.text }]}>
				Create Account
			</Text>

			<TextInput
				style={inputStyle}
				placeholder="First name"
				placeholderTextColor={theme.textMuted}
				autoComplete="given-name"
				value={firstName}
				onChangeText={setFirstName}
			/>

			<TextInput
				style={inputStyle}
				placeholder="Last name"
				placeholderTextColor={theme.textMuted}
				autoComplete="family-name"
				value={lastName}
				onChangeText={setLastName}
			/>

			<TextInput
				style={inputStyle}
				placeholder="Email"
				placeholderTextColor={theme.textMuted}
				autoCapitalize="none"
				autoComplete="email"
				keyboardType="email-address"
				value={email}
				onChangeText={setEmail}
			/>

			<TextInput
				style={inputStyle}
				placeholder="Password (8+ characters)"
				placeholderTextColor={theme.textMuted}
				secureTextEntry
				autoComplete="new-password"
				value={password}
				onChangeText={setPassword}
			/>

			{error ? (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			) : null}

			<Pressable
				style={[styles.button, { backgroundColor: theme.primary }]}
				onPress={onRegister}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Creating Account..." : "Create Account"}
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
		flexGrow: 1,
		justifyContent: "center",
		padding: 24,
	},
	title: {
		fontSize: 24,
		fontWeight: "bold",
		marginBottom: 24,
		textAlign: "center",
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
