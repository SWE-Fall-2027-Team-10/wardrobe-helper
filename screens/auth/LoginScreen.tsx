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
	// Two-factor sign-in: after a correct password the server emails a code and we ask for it here.
	const [needsCode, setNeedsCode] = useState(false);
	const [code, setCode] = useState("");
	const [notice, setNotice] = useState("");

	// Without a code: email + password. With needsCode: the same plus the emailed code.
	// `withCode = false` asks the server to send a new code (used by "Resend code").
	const onSignIn = async (withCode = needsCode) => {
		setError("");
		if (withCode && code.length !== 6) {
			setError("Enter the 6-digit code from your email.");
			return;
		}
		setLoading(true);

		try {
			const message = await signIn(email.trim(), password, withCode ? code : undefined);
			if (message) {
				// Password was right, and the account has two-factor sign-in on: show the code box.
				setNeedsCode(true);
				setNotice(message);
				setCode("");
			}
			// Otherwise the user is set and the navigator switches screens on its own.
		} catch (e) {
			const message = errorMessage(e);
			console.error("LOGIN ERROR:", e);
			setError(message);
			setCode("");
		} finally {
			setLoading(false);
		}
	};

	// Leave the code step, e.g. to fix a typo in the email.
	const cancelCode = () => {
		setNeedsCode(false);
		setCode("");
		setNotice("");
		setError("");
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

			{!needsCode ? (
				<>
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
				</>
			) : (
				<>
					<View style={styles.noticeBox}>
						<Text style={styles.noticeText}>{notice}</Text>
					</View>
					<TextInput
						style={[inputStyle, styles.codeInput]}
						placeholder="123456"
						placeholderTextColor={theme.textMuted}
						keyboardType="number-pad"
						textContentType="oneTimeCode"
						autoComplete="one-time-code"
						maxLength={6}
						value={code}
						onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ""))}
					/>
				</>
			)}

			{error ? (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			) : null}

			<Pressable
				style={[styles.button, { backgroundColor: theme.primary }]}
				onPress={() => onSignIn()}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Signing In..." : needsCode ? "Verify Code" : "Sign In"}
				</Text>
			</Pressable>

			{needsCode && (
				<>
					<Pressable
						style={[styles.buttonOutline, { borderColor: theme.primary }]}
						onPress={() => onSignIn(false)}
						disabled={loading}
					>
						<Text style={{ color: theme.primary }}>Resend code</Text>
					</Pressable>
					<Pressable style={styles.linkButton} onPress={cancelCode} disabled={loading}>
						<Text style={{ color: theme.textMuted }}>Back</Text>
					</Pressable>
				</>
			)}

			{!needsCode && (
				<>
					<Pressable
						style={[styles.buttonOutline, { borderColor: theme.primary }]}
						onPress={() => navigation.navigate("Register")}
						disabled={loading}
					>
						<Text style={{ color: theme.primary }}>Create Account</Text>
					</Pressable>

					<Pressable
						style={styles.linkButton}
						onPress={() => navigation.navigate("ForgotPassword")}
						disabled={loading}
					>
						<Text style={{ color: theme.textMuted }}>Forgot password?</Text>
					</Pressable>
				</>
			)}

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
	codeInput: {
		fontSize: 22,
		letterSpacing: 8,
		textAlign: "center",
	},
	noticeBox: {
		padding: 12,
		borderRadius: 8,
		backgroundColor: "#dcfce7",
		marginBottom: 12,
	},
	noticeText: {
		color: "#166534",
		fontSize: 14,
	},
	linkButton: {
		padding: 14,
		alignItems: "center",
		marginTop: 4,
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
