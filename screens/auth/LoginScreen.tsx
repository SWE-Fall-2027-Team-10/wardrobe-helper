import { useState } from "react";
import {
	StyleSheet,
	Text,
	Pressable,
	TextInput,
	ActivityIndicator,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, ParamListBase } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../../AuthContext";
import { useTheme } from "../../themes/ThemeContext";
import { errorMessage } from "../../lib/api";

export default function LoginScreen() {
	const { signIn } = useAuth();
	const theme = useTheme();
	const navigation =
		useNavigation<NativeStackNavigationProp<ParamListBase>>();

	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const onSignIn = async () => {
		console.log("SIGN IN BUTTON CLICKED");
		setError("");
		setLoading(true);

		try {
			console.log("Starting login request...");
			await signIn(email.trim(), password);
			console.log("Login successful");
		} catch (e) {
			const message = errorMessage(e);
			console.error("LOGIN ERROR:", e);
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
		<SafeAreaView
			style={[styles.container, { backgroundColor: theme.background }]}
		>
			<Text style={[styles.title, { color: theme.text }]}>
				Wardrobe Helper
			</Text>

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
				placeholder="Password"
				placeholderTextColor={theme.textMuted}
				secureTextEntry
				autoComplete="password"
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
				onPress={onSignIn}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Signing In..." : "Sign In"}
				</Text>
			</Pressable>

			<Pressable
				style={[styles.buttonOutline, { borderColor: theme.primary }]}
				onPress={() => navigation.navigate("Register")}
				disabled={loading}
			>
				<Text style={{ color: theme.primary }}>Create Account</Text>
			</Pressable>

			{loading && (
				<ActivityIndicator
					style={{ marginTop: 12 }}
					color={theme.primary}
				/>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
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
	buttonOutline: {
		borderWidth: 1,
		padding: 14,
		borderRadius: 8,
		alignItems: "center",
		marginTop: 12,
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
