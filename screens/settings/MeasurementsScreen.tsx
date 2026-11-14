import { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useAuth } from "../../AuthContext";
import { api, errorMessage } from "../../lib/api";
import { useTheme } from "../../themes/ThemeContext";

export default function MeasurementsScreen() {
	const theme = useTheme();
	const { refreshUser } = useAuth();
	const [height, setHeight] = useState("");
	const [clothingSize, setClothingSize] = useState("");
	const [preferences, setPreferences] = useState("");
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		let active = true;

		api.me()
			.then((profile) => {
				if (!active) return;
				setHeight(profile.height == null ? "" : String(profile.height));
				setClothingSize(profile.clothing_size ?? "");
				setPreferences(profile.preferences ?? "");
			})
			.catch((cause) => {
				if (active) setError(errorMessage(cause));
			})
			.finally(() => {
				if (active) setLoading(false);
			});

		return () => {
			active = false;
		};
	}, []);

	const save = async () => {
		setError("");
		const normalizedHeight = height.trim().replace(",", ".");
		const heightNumber = normalizedHeight ? Number(normalizedHeight) : null;

		if (
			heightNumber !== null &&
			(!Number.isFinite(heightNumber) || heightNumber < 50 || heightNumber > 300)
		) {
			setError("Enter a height between 50 and 300 cm.");
			return;
		}

		setSaving(true);
		try {
			await api.updateProfile({
				height: heightNumber,
				clothing_size: clothingSize.trim() || null,
				preferences: preferences.trim() || null,
			});
			await refreshUser();
			Alert.alert("Measurements saved", "Your profile has been updated.");
		} catch (cause) {
			setError(errorMessage(cause));
		} finally {
			setSaving(false);
		}
	};

	const inputStyle = [
		styles.input,
		{
			backgroundColor: theme.surface,
			borderColor: theme.border,
			color: theme.text,
		},
	];

	if (loading) {
		return (
			<View style={[styles.loading, { backgroundColor: theme.background }]}>
				<ActivityIndicator color={theme.primary} />
			</View>
		);
	}

	return (
		<ScrollView
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={styles.container}
			keyboardShouldPersistTaps="handled"
		>
			<Text style={[styles.intro, { color: theme.textMuted }]}>
				Add the basics now. You can leave any field blank and update it later.
			</Text>

			<Text style={[styles.label, { color: theme.textMuted }]}>Height (cm)</Text>
			<TextInput
				style={inputStyle}
				value={height}
				onChangeText={(value) => setHeight(value.replace(/[^0-9.,]/g, ""))}
				placeholder="Example: 175"
				placeholderTextColor={theme.textMuted}
				inputMode="decimal"
				maxLength={6}
			/>

			<Text style={[styles.helper, { color: theme.textMuted }]}>
				Use your height without shoes.
			</Text>

			<Text style={[styles.label, { color: theme.textMuted }]}>Clothing size</Text>
			<TextInput
				style={inputStyle}
				value={clothingSize}
				onChangeText={setClothingSize}
				placeholder="Example: M or 8"
				placeholderTextColor={theme.textMuted}
				autoCapitalize="characters"
				maxLength={20}
			/>

			<Text style={[styles.label, { color: theme.textMuted }]}>Fit preferences</Text>
			<TextInput
				style={[inputStyle, styles.multiline]}
				value={preferences}
				onChangeText={setPreferences}
				placeholder="Example: Relaxed tops, regular-fit pants"
				placeholderTextColor={theme.textMuted}
				multiline
				maxLength={1000}
				textAlignVertical="top"
			/>
			<Text style={[styles.counter, { color: theme.textMuted }]}>
				{preferences.length}/1000
			</Text>

			{error ? (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{error}</Text>
				</View>
			) : null}

			<Pressable
				style={[
					styles.button,
					{ backgroundColor: theme.primary, opacity: saving ? 0.6 : 1 },
				]}
				onPress={save}
				disabled={saving}
			>
				<Text style={styles.buttonText}>{saving ? "Saving..." : "Save Measurements"}</Text>
			</Pressable>

			{saving ? <ActivityIndicator style={styles.saving} color={theme.primary} /> : null}
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	container: {
		padding: 24,
	},
	loading: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	intro: {
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
		fontSize: 16,
		padding: 12,
	},
	helper: {
		fontSize: 12,
		marginBottom: 6,
		marginTop: 5,
	},
	multiline: {
		minHeight: 104,
	},
	counter: {
		fontSize: 12,
		marginTop: 4,
		textAlign: "right",
	},
	errorBox: {
		backgroundColor: "#fee2e2",
		borderRadius: 8,
		marginTop: 12,
		padding: 12,
	},
	errorText: {
		color: "#991b1b",
		fontSize: 14,
	},
	button: {
		alignItems: "center",
		borderRadius: 8,
		marginTop: 20,
		padding: 14,
	},
	buttonText: {
		color: "#fff",
		fontWeight: "600",
	},
	saving: {
		marginTop: 12,
	},
});
