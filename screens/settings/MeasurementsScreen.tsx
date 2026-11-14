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

type SizeCategory = "all" | "tops" | "bottoms";

const SIZE_CATEGORIES: { key: SizeCategory; label: string }[] = [
	{ key: "all", label: "All" },
	{ key: "tops", label: "Tops" },
	{ key: "bottoms", label: "Bottoms" },
];

export default function MeasurementsScreen() {
	const theme = useTheme();
	const { refreshUser } = useAuth();
	const [height, setHeight] = useState("");
	const [clothingSize, setClothingSize] = useState("");
	const [topSize, setTopSize] = useState("");
	const [bottomSize, setBottomSize] = useState("");
	const [sizeCategory, setSizeCategory] = useState<SizeCategory>("all");
	const [preferences, setPreferences] = useState("");
	const [loading, setLoading] = useState(true);
	const [loadError, setLoadError] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	const loadProfile = async () => {
		setLoading(true);
		setLoadError("");
		try {
			const profile = await api.me();
			setHeight(profile.height == null ? "" : String(profile.height));
			setClothingSize(profile.clothing_size ?? "");
			setTopSize(profile.top_size ?? "");
			setBottomSize(profile.bottom_size ?? "");
			setPreferences(profile.preferences ?? "");
		} catch (cause) {
			setLoadError(errorMessage(cause));
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		void loadProfile();
	}, []);

	const selectedSize =
		sizeCategory === "all"
			? clothingSize
			: sizeCategory === "tops"
				? topSize
				: bottomSize;

	const setSelectedSize = (value: string) => {
		if (sizeCategory === "all") setClothingSize(value);
		else if (sizeCategory === "tops") setTopSize(value);
		else setBottomSize(value);
	};

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
				top_size: topSize.trim() || null,
				bottom_size: bottomSize.trim() || null,
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

	if (loadError) {
		return (
			<View style={[styles.loadError, { backgroundColor: theme.background }]}>
				<Text style={styles.errorText}>{loadError}</Text>
				<Pressable
					style={[styles.retryButton, { borderColor: theme.primary }]}
					onPress={loadProfile}
				>
					<Text style={{ color: theme.primary, fontWeight: "600" }}>Try Again</Text>
				</Pressable>
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
			<View style={styles.sizeCategories}>
				{SIZE_CATEGORIES.map((category) => {
					const selected = sizeCategory === category.key;
					const value =
						category.key === "all"
							? clothingSize
							: category.key === "tops"
								? topSize
								: bottomSize;

					return (
						<Pressable
							key={category.key}
							onPress={() => setSizeCategory(category.key)}
							style={[
								styles.sizeCategory,
								{
									backgroundColor: selected ? theme.primary : theme.surface,
									borderColor: selected ? theme.primary : theme.border,
								},
							]}
						>
							<Text style={{ color: selected ? "#fff" : theme.text, fontWeight: "600" }}>
								{category.label}
							</Text>
							<Text style={{ color: selected ? "#fff" : theme.textMuted, fontSize: 12 }}>
								{value.trim() || "Not set"}
							</Text>
						</Pressable>
					);
				})}
			</View>
			<TextInput
				style={inputStyle}
				value={selectedSize}
				onChangeText={setSelectedSize}
				placeholder={`Size for ${sizeCategory}`}
				placeholderTextColor={theme.textMuted}
				autoCapitalize="characters"
				maxLength={20}
			/>
			<Text style={[styles.helper, { color: theme.textMuted }]}>
				The All size is the default. Tops and Bottoms override it when provided.
			</Text>

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
	loadError: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
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
	sizeCategories: {
		flexDirection: "row",
		gap: 8,
		marginBottom: 10,
	},
	sizeCategory: {
		alignItems: "center",
		borderRadius: 8,
		borderWidth: 1,
		flex: 1,
		gap: 2,
		paddingHorizontal: 8,
		paddingVertical: 10,
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
	retryButton: {
		borderRadius: 8,
		borderWidth: 1,
		marginTop: 16,
		paddingHorizontal: 20,
		paddingVertical: 12,
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
