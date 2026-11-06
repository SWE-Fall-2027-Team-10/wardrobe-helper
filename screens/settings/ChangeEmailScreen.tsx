// Change Email screen, opened from Settings. Two steps:
//   1. Current password + new email -> the server emails a code to the NEW address (nothing changes yet).
//   2. The code from that email -> the new address becomes the account's email.
// Confirming the code proves the user owns the new address, so a typo can't lock them out.
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
import { useAuth } from "../../AuthContext";
import { useTheme } from "../../themes/ThemeContext";
import { api, errorMessage } from "../../lib/api";

const RESEND_COOLDOWN_SECONDS = 60; // matches the server's limit

export default function ChangeEmailScreen() {
	const { user, refreshUser } = useAuth();
	const theme = useTheme();
	const navigation =
		useNavigation<NativeStackNavigationProp<ParamListBase>>();

	const [step, setStep] = useState<"form" | "code">("form");
	const [currentPassword, setCurrentPassword] = useState("");
	const [newEmail, setNewEmail] = useState("");
	const [code, setCode] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [cooldown, setCooldown] = useState(0);

	// Count the resend cooldown down once per second.
	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
		return () => clearTimeout(timer);
	}, [cooldown]);

	// Step 1, and "Resend code" on step 2 (same request again).
	const sendCode = async () => {
		setError("");
		const email = newEmail.trim().toLowerCase();
		if (!currentPassword || !email) {
			setError("Please fill in both fields.");
			return;
		}
		if (email === user?.email) {
			setError("That is already your email.");
			return;
		}

		setLoading(true);
		try {
			await api.requestEmailChange(currentPassword, email);
			setNewEmail(email);
			setCode("");
			setStep("code");
			setCooldown(RESEND_COOLDOWN_SECONDS);
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setLoading(false);
		}
	};

	// Step 2.
	const confirm = async () => {
		setError("");
		if (code.length !== 6) {
			setError("Enter the 6-digit code from the email.");
			return;
		}

		setLoading(true);
		try {
			const { email } = await api.confirmEmailChange(code);
			await refreshUser(); // so the rest of the app shows the new address
			Alert.alert("Email changed", `Your email is now ${email}.`);
			navigation.goBack();
		} catch (e) {
			setError(errorMessage(e));
			setCode("");
			setLoading(false);
		}
	};

	const startOver = () => {
		setStep("form");
		setCode("");
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
		<ScrollView
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={styles.container}
			keyboardShouldPersistTaps="handled"
		>
			{step === "form" ? (
				<>
					<Text style={[styles.body, { color: theme.textMuted }]}>
						Your email is currently {user?.email}. We'll send a code to the
						new address to make sure it's yours.
					</Text>

					<Text style={[styles.label, { color: theme.textMuted }]}>
						New email
					</Text>
					<TextInput
						style={inputStyle}
						placeholder="New email"
						placeholderTextColor={theme.textMuted}
						autoCapitalize="none"
						autoComplete="email"
						keyboardType="email-address"
						value={newEmail}
						onChangeText={setNewEmail}
					/>

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
				</>
			) : (
				<>
					<Text style={[styles.body, { color: theme.textMuted }]}>
						We sent a 6-digit code to {newEmail}. It expires in 15 minutes.
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
				</>
			)}

			{error ? (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			) : null}

			<Pressable
				style={[styles.button, { backgroundColor: theme.primary }]}
				onPress={step === "form" ? sendCode : confirm}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading
						? "Please wait..."
						: step === "form"
							? "Send Code"
							: "Confirm New Email"}
				</Text>
			</Pressable>

			{step === "code" && (
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
					<Pressable style={styles.linkButton} onPress={startOver} disabled={loading}>
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
