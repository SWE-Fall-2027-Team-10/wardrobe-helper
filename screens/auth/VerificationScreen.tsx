// Shown to users who are logged in but haven't verified their email yet (see MyStack in App.tsx).
// They enter the 6-digit code from their email; once /verify succeeds, refreshUser() reloads the user,
// user.verified becomes true, and App.tsx switches to the main tabs on its own.
import { useEffect, useState } from "react";
import {
	StyleSheet,
	Text,
	Pressable,
	TextInput,
	ActivityIndicator,
	View,
	ScrollView,
} from "react-native";
import { useAuth } from "../../AuthContext";
import { useTheme } from "../../themes/ThemeContext";
import { api, errorMessage } from "../../lib/api";

const RESEND_COOLDOWN_SECONDS = 60; // matches the server's limit in routes/auth.js

export default function VerificationScreen() {
	const { user, signOut, refreshUser } = useAuth();
	const theme = useTheme();

	const [code, setCode] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [notice, setNotice] = useState("");
	const [cooldown, setCooldown] = useState(0); // seconds until "Resend" can be pressed again

	// Count the resend cooldown down once per second.
	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
		return () => clearTimeout(timer);
	}, [cooldown]);

	const onVerify = async () => {
		setError("");
		setNotice("");

		if (code.length !== 6) {
			setError("Enter the 6-digit code from your email.");
			return;
		}

		setLoading(true);
		try {
			await api.checkVerification(code);
			// Reloading the user flips user.verified to true, so App.tsx shows the main tabs.
			await refreshUser();
		} catch (e) {
			setError(errorMessage(e));
			setCode("");
		} finally {
			setLoading(false);
		}
	};

	const onResend = async () => {
		setError("");
		setNotice("");
		setLoading(true);
		try {
			const { message } = await api.sendVerification();
			setNotice(message);
			setCooldown(RESEND_COOLDOWN_SECONDS);
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
			<Text style={[styles.title, { color: theme.text }]}>
				Check your email
			</Text>
			<Text style={[styles.instructions, { color: theme.textMuted }]}>
				We sent a 6-digit code to {user?.email}. It expires in 15 minutes.
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
				placeholder="123456"
				placeholderTextColor={theme.textMuted}
				keyboardType="number-pad"
				textContentType="oneTimeCode"
				autoComplete="one-time-code"
				maxLength={6}
				value={code}
				onChangeText={(text) => setCode(text.replace(/[^0-9]/g, ""))}
			/>

			{error ? (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			) : null}

			{notice ? (
				<View style={styles.noticeBox}>
					<Text style={styles.noticeText}>{notice}</Text>
				</View>
			) : null}

			<Pressable
				style={[styles.button, { backgroundColor: theme.primary }]}
				onPress={onVerify}
				disabled={loading}
			>
				<Text style={styles.buttonText}>
					{loading ? "Please wait..." : "Verify"}
				</Text>
			</Pressable>

			<Pressable
				style={[
					styles.buttonOutline,
					{ borderColor: theme.primary, opacity: cooldown > 0 ? 0.5 : 1 },
				]}
				onPress={onResend}
				disabled={loading || cooldown > 0}
			>
				<Text style={{ color: theme.primary }}>
					{cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
				</Text>
			</Pressable>

			{/* Signing out sets user to null, so App.tsx shows the login screen again. */}
			<Pressable style={styles.linkButton} onPress={signOut} disabled={loading}>
				<Text style={{ color: theme.textMuted }}>
					Wrong email? Sign out
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
		marginBottom: 12,
		textAlign: "center",
	},
	instructions: {
		fontSize: 15,
		marginBottom: 24,
		textAlign: "center",
	},
	input: {
		borderWidth: 1,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
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
});
