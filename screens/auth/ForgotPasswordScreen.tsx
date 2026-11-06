// Forgot Password screen, opened from "Forgot password?" on the login screen (no login needed). Two steps:
//   1. Email -> the server emails a reset code if an account uses that address.
//   2. Code + new password (typed twice) -> password is reset and the user goes back to log in.
import { useEffect, useState } from "react";
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
const RESEND_COOLDOWN_SECONDS = 60; // matches the server's limit

export default function ForgotPasswordScreen() {
	const theme = useTheme();
	const navigation =
		useNavigation<NativeStackNavigationProp<ParamListBase>>();

	const [step, setStep] = useState<"email" | "reset">("email");
	const [email, setEmail] = useState("");
	const [code, setCode] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [cooldown, setCooldown] = useState(0);

	// Count the resend cooldown down once per second.
	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
		return () => clearTimeout(timer);
	}, [cooldown]);

	// Step 1, and "Resend code" on step 2.
	const sendCode = async () => {
		setError("");
		const address = email.trim().toLowerCase();
		if (!address) {
			setError("Enter the email for your account.");
			return;
		}

		setLoading(true);
		try {
			await api.forgotPassword(address);
			setEmail(address);
			setStep("reset");
			setCooldown(RESEND_COOLDOWN_SECONDS);
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setLoading(false);
		}
	};

	// Step 2.
	const resetPassword = async () => {
		setError("");
		if (code.length !== 6) {
			setError("Enter the 6-digit code from the email.");
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

		setLoading(true);
		try {
			await api.resetPassword(email, code, newPassword);
			Alert.alert("Password reset", "You can now log in with your new password.");
			navigation.goBack();
		} catch (e) {
			setError(errorMessage(e));
			setCode("");
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
			{step === "email" ? (
				<>
					<Text style={[styles.body, { color: theme.textMuted }]}>
						Enter the email you signed up with and we'll send you a code to
						reset your password.
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
				</>
			) : (
				<>
					<Text style={[styles.body, { color: theme.textMuted }]}>
						If an account uses {email}, we sent it a 6-digit code. It expires
						in 15 minutes.
					</Text>
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
					<TextInput
						style={inputStyle}
						placeholder={`New password (at least ${MIN_PASSWORD_LENGTH} characters)`}
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
				</>
			)}

			{error ? (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			) : null}

			<Pressable
				style={[styles.button, { backgroundColor: theme.primary }]}
				onPress={step === "email" ? sendCode : resetPassword}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading
						? "Please wait..."
						: step === "email"
							? "Send Code"
							: "Reset Password"}
				</Text>
			</Pressable>

			{step === "reset" && (
				<>
					<Pressable
						style={[
							styles.buttonOutline,
							{ borderColor: theme.primary, opacity: cooldown > 0 ? 0.5 : 1 },
						]}
						onPress={sendCode}
						disabled={loading || cooldown > 0}
					>
						<Text style={{ color: theme.primary }}>
							{cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
						</Text>
					</Pressable>
					<Pressable
						style={styles.linkButton}
						onPress={() => {
							setStep("email");
							setError("");
						}}
						disabled={loading}
					>
						<Text style={{ color: theme.textMuted }}>Use a different email</Text>
					</Pressable>
				</>
			)}

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
	body: {
		fontSize: 15,
		lineHeight: 22,
		marginBottom: 16,
	},
	input: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
	},
	codeInput: {
		fontSize: 22,
		letterSpacing: 8,
		textAlign: "center",
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
	linkButton: {
		padding: 14,
		alignItems: "center",
		marginTop: 4,
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
