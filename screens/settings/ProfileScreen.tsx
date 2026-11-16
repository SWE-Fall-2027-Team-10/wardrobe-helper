// Profile screen, opened from Settings or the avatar button on the Home header.
// Lets the user edit their name, birthday, body measurements, sizes, fit and style notes.
// Email is shown here but changed on its own screen, since that needs a code (see ChangeEmailScreen).
//
// Measurements: the server always stores centimeters. The Inches/Centimeters switch only changes how
// numbers are shown and typed here; everything is converted back to cm before saving.
// Only the fields that actually changed are sent to PUT /api/auth/me.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	StyleSheet,
	Text,
	Pressable,
	TextInput,
	ActivityIndicator,
	ScrollView,
	View,
	Alert,
	Image,
	KeyboardAvoidingView,
	Platform,
} from "react-native";
import { useNavigation, ParamListBase, usePreventRemove } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTheme } from "../../themes/ThemeContext";
import { useAuth } from "../../AuthContext";
import {
	api,
	errorMessage,
	CLOTHING_SIZES,
	ClothingSize,
	FitPreference,
	MeasurementUnit,
	ProfileUpdate,
	User,
} from "../../lib/api";

const CM_PER_INCH = 2.54;
const LENGTHS = ["chest", "waist", "hips", "inseam"] as const;
type LengthField = (typeof LENGTHS)[number];
const LENGTH_LABELS: Record<LengthField, string> = {
	chest: "Chest",
	waist: "Waist",
	hips: "Hips",
	inseam: "Inseam",
};
const FITS: { value: FitPreference; label: string }[] = [
	{ value: "slim", label: "Slim" },
	{ value: "regular", label: "Regular" },
	{ value: "relaxed", label: "Relaxed" },
];
const NOTES_MAX = 1000;

// Everything on the form is kept as the text the user typed, in the currently chosen unit.
type Form = {
	first_name: string;
	last_name: string;
	date_of_birth: string;
	unit: MeasurementUnit;
	heightA: string; // feet (imperial) or centimeters (metric)
	heightB: string; // inches (imperial only)
	chest: string;
	waist: string;
	hips: string;
	inseam: string;
	shoe_size: string;
	clothing_size: ClothingSize | null;
	fit_preference: FitPreference | null;
	preferences: string;
};

// ---- Unit conversion helpers ----

// Drops trailing zeros: 32.0 -> "32", 32.50 -> "32.5"
const trim = (n: number, decimals = 1) => String(Number(n.toFixed(decimals)));

const formatLength = (cm: number | null | undefined, unit: MeasurementUnit) =>
	cm == null ? "" : unit === "metric" ? trim(cm) : trim(cm / CM_PER_INCH);

const formatHeight = (cm: number | null | undefined, unit: MeasurementUnit) => {
	if (cm == null) return { heightA: "", heightB: "" };
	if (unit === "metric") return { heightA: trim(cm, 0), heightB: "" };
	const totalInches = Math.round(cm / CM_PER_INCH);
	return { heightA: String(Math.floor(totalInches / 12)), heightB: String(totalInches % 12) };
};

// Parses what the user typed. "" -> null (cleared). Anything that isn't a positive number -> NaN.
const parseNumber = (text: string) => {
	const t = text.trim().replace(",", ".");
	if (!t) return null;
	const n = Number(t);
	return Number.isFinite(n) && n >= 0 ? n : NaN;
};

const lengthToCm = (text: string, unit: MeasurementUnit) => {
	const n = parseNumber(text);
	if (n === null || Number.isNaN(n)) return n;
	return unit === "metric" ? n : n * CM_PER_INCH;
};

const heightToCm = (a: string, b: string, unit: MeasurementUnit) => {
	if (unit === "metric") return parseNumber(a);
	const feet = parseNumber(a);
	const inches = parseNumber(b);
	if (feet === null && inches === null) return null;
	if (Number.isNaN(feet) || Number.isNaN(inches)) return NaN;
	if ((inches ?? 0) >= 12) return NaN;
	return ((feet ?? 0) * 12 + (inches ?? 0)) * CM_PER_INCH;
};

const formFromUser = (u: User, unit: MeasurementUnit = u.measurement_unit ?? "imperial"): Form => ({
	first_name: u.first_name ?? "",
	last_name: u.last_name ?? "",
	date_of_birth: u.date_of_birth ?? "",
	unit,
	...formatHeight(u.height, unit),
	chest: formatLength(u.chest, unit),
	waist: formatLength(u.waist, unit),
	hips: formatLength(u.hips, unit),
	inseam: formatLength(u.inseam, unit),
	shoe_size: u.shoe_size ?? "",
	clothing_size: u.clothing_size ?? null,
	fit_preference: u.fit_preference ?? null,
	preferences: u.preferences ?? "",
});

// Compares the form with the saved user and returns only what changed, or an error message.
// A measurement whose text still matches how the saved value is displayed counts as unchanged,
// so rounding (e.g. 81.28 cm shown as 32 in) never sneaks a slightly different number into the database.
function buildChanges(form: Form, saved: User): { changes: ProfileUpdate } | { error: string } {
	const original = formFromUser(saved, form.unit);
	const changes: ProfileUpdate = {};

	const first = form.first_name.trim();
	const last = form.last_name.trim();
	if (!first || !last) return { error: "First and last name can't be empty." };
	if (first !== saved.first_name) changes.first_name = first;
	if (last !== saved.last_name) changes.last_name = last;

	const dob = form.date_of_birth.trim();
	if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return { error: "Birthday must look like YYYY-MM-DD, e.g. 2003-05-21." };
	if (dob !== (saved.date_of_birth ?? "")) changes.date_of_birth = dob || null;

	if (form.heightA !== original.heightA || form.heightB !== original.heightB) {
		const cm = heightToCm(form.heightA, form.heightB, form.unit);
		if (Number.isNaN(cm)) return { error: form.unit === "imperial" ? "Height must be feet and inches (0–11)." : "Height must be a number." };
		changes.height = cm === null ? null : Math.round(cm * 100) / 100;
	}

	for (const field of LENGTHS) {
		if (form[field] === original[field]) continue;
		const cm = lengthToCm(form[field], form.unit);
		if (Number.isNaN(cm)) return { error: `${LENGTH_LABELS[field]} must be a number.` };
		changes[field] = cm === null ? null : Math.round(cm * 100) / 100;
	}

	const shoe = form.shoe_size.trim();
	if (shoe !== (saved.shoe_size ?? "")) changes.shoe_size = shoe || null;
	if (form.clothing_size !== (saved.clothing_size ?? null)) changes.clothing_size = form.clothing_size;
	if (form.fit_preference !== (saved.fit_preference ?? null)) changes.fit_preference = form.fit_preference;
	if (form.unit !== (saved.measurement_unit ?? "imperial")) changes.measurement_unit = form.unit;

	const notes = form.preferences.trim();
	if (notes !== (saved.preferences ?? "")) changes.preferences = notes || null;

	return { changes };
}

export default function ProfileScreen() {
	const theme = useTheme();
	const { user, updateProfile } = useAuth();
	const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();

	// `saved` is the last version from the server; `form` is what's on screen.
	const [saved, setSaved] = useState<User | null>(null);
	const [form, setForm] = useState<Form | null>(null);
	const [loadError, setLoadError] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");

	// The user from login has no profile fields, so always fetch the full profile when the screen opens.
	const load = useCallback(async () => {
		setLoadError("");
		try {
			const me = await api.me();
			setSaved(me);
			setForm(formFromUser(me));
		} catch (e) {
			setLoadError(errorMessage(e));
		}
	}, []);
	useEffect(() => {
		load();
	}, [load]);

	const result = useMemo(() => (form && saved ? buildChanges(form, saved) : null), [form, saved]);
	const dirty = !!result && ("error" in result || Object.keys(result.changes).length > 0);

	// Ask before leaving with unsaved edits (back button, swipe back, etc.)
	usePreventRemove(dirty && !saving, ({ data }) => {
		Alert.alert("Discard changes?", "You have unsaved changes to your profile.", [
			{ text: "Keep editing", style: "cancel" },
			{ text: "Discard", style: "destructive", onPress: () => navigation.dispatch(data.action) },
		]);
	});

	const set = <K extends keyof Form>(key: K, value: Form[K]) => {
		setError("");
		setForm((f) => (f ? { ...f, [key]: value } : f));
	};

	// Switching units converts what's typed. Untouched fields are re-formatted from the saved value
	// (no rounding drift); edited fields are converted from what the user typed.
	const switchUnit = (unit: MeasurementUnit) => {
		if (!form || !saved || unit === form.unit) return;
		const before = formFromUser(saved, form.unit);
		const after = formFromUser(saved, unit);
		const next: Form = { ...form, unit };

		if (form.heightA === before.heightA && form.heightB === before.heightB) {
			next.heightA = after.heightA;
			next.heightB = after.heightB;
		} else {
			const cm = heightToCm(form.heightA, form.heightB, form.unit);
			Object.assign(next, Number.isNaN(cm) ? { heightA: "", heightB: "" } : formatHeight(cm, unit));
		}
		for (const field of LENGTHS) {
			if (form[field] === before[field]) next[field] = after[field];
			else {
				const cm = lengthToCm(form[field], form.unit);
				next[field] = Number.isNaN(cm) ? "" : formatLength(cm, unit);
			}
		}
		setError("");
		setForm(next);
	};

	const onSave = async () => {
		if (!result) return;
		if ("error" in result) {
			setError(result.error);
			return;
		}
		if (!Object.keys(result.changes).length) return;
		setSaving(true);
		setError("");
		try {
			const updated = await updateProfile(result.changes);
			setSaved(updated);
			setForm(formFromUser(updated, form?.unit));
			Alert.alert("Profile saved", "Your profile has been updated.");
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setSaving(false);
		}
	};

	if (!form || !saved) {
		return (
			<View style={[styles.center, { backgroundColor: theme.background }]}>
				{loadError ? (
					<>
						<Text style={{ color: theme.text, marginBottom: 12, textAlign: "center" }}>{loadError}</Text>
						<Pressable style={[styles.button, { backgroundColor: theme.primary }]} onPress={load}>
							<Text style={styles.buttonText}>Try again</Text>
						</Pressable>
					</>
				) : (
					<ActivityIndicator color={theme.primary} />
				)}
			</View>
		);
	}

	const inputStyle = [styles.input, { borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }];
	const lengthUnit = form.unit === "metric" ? "cm" : "in";
	const initials = `${form.first_name.trim()[0] ?? ""}${form.last_name.trim()[0] ?? ""}`.toUpperCase() || "?";

	const SectionTitle = ({ children }: { children: string }) => (
		<Text style={[styles.section, { color: theme.textMuted }]}>{children}</Text>
	);
	const Label = ({ children }: { children: string }) => (
		<Text style={[styles.label, { color: theme.textMuted }]}>{children}</Text>
	);
	// A row of selectable pills; pressing the selected one again clears it (unless `required`).
	const Chips = <T extends string>({
		options,
		value,
		onChange,
		required,
	}: {
		options: { value: T; label: string }[];
		value: T | null;
		onChange: (v: T | null) => void;
		required?: boolean;
	}) => (
		<View style={styles.chips}>
			{options.map((o) => {
				const selected = o.value === value;
				return (
					<Pressable
						key={o.value}
						onPress={() => onChange(selected && !required ? null : o.value)}
						style={[
							styles.chip,
							{
								borderColor: selected ? theme.primary : theme.border,
								backgroundColor: selected ? theme.primary : theme.surface,
							},
						]}
					>
						<Text style={{ color: selected ? "#fff" : theme.text, fontWeight: "600" }}>{o.label}</Text>
					</Pressable>
				);
			})}
		</View>
	);

	return (
		<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={100}>
			<ScrollView
				style={{ backgroundColor: theme.background }}
				contentContainerStyle={styles.container}
				keyboardShouldPersistTaps="handled"
			>
				{/* Header: avatar + email */}
				<View style={styles.header}>
					{saved.profile_image ? (
						<Image source={{ uri: saved.profile_image }} style={styles.avatar} />
					) : (
						<View style={[styles.avatar, { backgroundColor: theme.primary }]}>
							<Text style={styles.avatarText}>{initials}</Text>
						</View>
					)}
					<Text style={[styles.name, { color: theme.text }]}>
						{form.first_name.trim() || "Your"} {form.last_name.trim() || "Name"}
					</Text>
					<Pressable onPress={() => navigation.navigate("ChangeEmail")} hitSlop={8}>
						<Text style={{ color: theme.textMuted }}>
							{user?.email ?? saved.email} · <Text style={{ color: theme.primary }}>Change</Text>
						</Text>
					</Pressable>
				</View>

				<SectionTitle>About you</SectionTitle>
				<View style={styles.row}>
					<View style={styles.half}>
						<Label>First name</Label>
						<TextInput
							style={inputStyle}
							value={form.first_name}
							onChangeText={(t) => set("first_name", t)}
							placeholder="First name"
							placeholderTextColor={theme.textMuted}
							autoComplete="given-name"
							textContentType="givenName"
							maxLength={50}
						/>
					</View>
					<View style={styles.half}>
						<Label>Last name</Label>
						<TextInput
							style={inputStyle}
							value={form.last_name}
							onChangeText={(t) => set("last_name", t)}
							placeholder="Last name"
							placeholderTextColor={theme.textMuted}
							autoComplete="family-name"
							textContentType="familyName"
							maxLength={50}
						/>
					</View>
				</View>
				<Label>Birthday</Label>
				<TextInput
					style={inputStyle}
					value={form.date_of_birth}
					onChangeText={(t) => set("date_of_birth", t)}
					placeholder="YYYY-MM-DD (optional)"
					placeholderTextColor={theme.textMuted}
					keyboardType="numbers-and-punctuation"
					autoComplete="birthdate-full"
					maxLength={10}
				/>

				<SectionTitle>Measurements</SectionTitle>
				<Text style={[styles.hint, { color: theme.textMuted }]}>
					Used for size recommendations and AI outfit previews. All optional.
				</Text>
				<Chips
					options={[
						{ value: "imperial" as MeasurementUnit, label: "Inches" },
						{ value: "metric" as MeasurementUnit, label: "Centimeters" },
					]}
					value={form.unit}
					onChange={(u) => u && switchUnit(u)}
					required
				/>

				<Label>Height</Label>
				{form.unit === "imperial" ? (
					<View style={styles.row}>
						<View style={[styles.half, styles.withSuffix]}>
							<TextInput
								style={[inputStyle, styles.flex]}
								value={form.heightA}
								onChangeText={(t) => set("heightA", t)}
								placeholder="5"
								placeholderTextColor={theme.textMuted}
								keyboardType="number-pad"
								maxLength={1}
							/>
							<Text style={[styles.suffix, { color: theme.textMuted }]}>ft</Text>
						</View>
						<View style={[styles.half, styles.withSuffix]}>
							<TextInput
								style={[inputStyle, styles.flex]}
								value={form.heightB}
								onChangeText={(t) => set("heightB", t)}
								placeholder="10"
								placeholderTextColor={theme.textMuted}
								keyboardType="number-pad"
								maxLength={2}
							/>
							<Text style={[styles.suffix, { color: theme.textMuted }]}>in</Text>
						</View>
					</View>
				) : (
					<View style={styles.withSuffix}>
						<TextInput
							style={[inputStyle, styles.flex]}
							value={form.heightA}
							onChangeText={(t) => set("heightA", t)}
							placeholder="178"
							placeholderTextColor={theme.textMuted}
							keyboardType="decimal-pad"
							maxLength={5}
						/>
						<Text style={[styles.suffix, { color: theme.textMuted }]}>cm</Text>
					</View>
				)}

				<View style={styles.grid}>
					{LENGTHS.map((field) => (
						<View key={field} style={styles.half}>
							<Label>{LENGTH_LABELS[field]}</Label>
							<View style={styles.withSuffix}>
								<TextInput
									style={[inputStyle, styles.flex]}
									value={form[field]}
									onChangeText={(t) => set(field, t)}
									placeholder="—"
									placeholderTextColor={theme.textMuted}
									keyboardType="decimal-pad"
									maxLength={6}
								/>
								<Text style={[styles.suffix, { color: theme.textMuted }]}>{lengthUnit}</Text>
							</View>
						</View>
					))}
				</View>

				<SectionTitle>Sizes & fit</SectionTitle>
				<Label>Usual clothing size</Label>
				<Chips
					options={CLOTHING_SIZES.map((s) => ({ value: s, label: s }))}
					value={form.clothing_size}
					onChange={(v) => set("clothing_size", v)}
				/>
				<Label>Preferred fit</Label>
				<Chips options={FITS} value={form.fit_preference} onChange={(v) => set("fit_preference", v)} />
				<Label>Shoe size</Label>
				<TextInput
					style={inputStyle}
					value={form.shoe_size}
					onChangeText={(t) => set("shoe_size", t)}
					placeholder="e.g. 10.5 US or 44 EU"
					placeholderTextColor={theme.textMuted}
					maxLength={10}
				/>

				<SectionTitle>Style notes</SectionTitle>
				<TextInput
					style={[inputStyle, styles.notes]}
					value={form.preferences}
					onChangeText={(t) => set("preferences", t)}
					placeholder="Colors you love, styles you avoid, dress codes you dress for…"
					placeholderTextColor={theme.textMuted}
					multiline
					maxLength={NOTES_MAX}
					textAlignVertical="top"
				/>
				<Text style={[styles.counter, { color: theme.textMuted }]}>
					{form.preferences.length}/{NOTES_MAX}
				</Text>

				{error ? (
					<View style={styles.errorBox}>
						<Text style={styles.errorText}>{error}</Text>
					</View>
				) : null}

				<Pressable
					style={[styles.button, { backgroundColor: theme.primary, opacity: !dirty || saving ? 0.5 : 1 }]}
					onPress={onSave}
					disabled={!dirty || saving}
				>
					{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{dirty ? "Save Profile" : "Saved"}</Text>}
				</Pressable>
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { padding: 24, paddingBottom: 48 },
	center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
	header: { alignItems: "center", marginBottom: 8 },
	avatar: { width: 88, height: 88, borderRadius: 44, justifyContent: "center", alignItems: "center", marginBottom: 12 },
	avatarText: { color: "#fff", fontSize: 32, fontWeight: "700" },
	name: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
	section: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", marginTop: 28, marginBottom: 4 },
	label: { fontSize: 13, fontWeight: "600", marginBottom: 6, marginTop: 8 },
	hint: { fontSize: 13, marginBottom: 8 },
	input: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 8 },
	row: { flexDirection: "row", gap: 12 },
	grid: { flexDirection: "row", flexWrap: "wrap", columnGap: 12 },
	half: { flexBasis: "47%", flexGrow: 1 },
	flex: { flex: 1 },
	withSuffix: { flexDirection: "row", alignItems: "center", gap: 8 },
	suffix: { width: 24, marginBottom: 8 },
	chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
	chip: { borderWidth: 1, borderRadius: 18, paddingVertical: 8, paddingHorizontal: 14 },
	notes: { minHeight: 110 },
	counter: { fontSize: 12, textAlign: "right", marginBottom: 8 },
	button: { padding: 14, borderRadius: 8, alignItems: "center", marginTop: 16 },
	buttonText: { color: "#fff", fontWeight: "600" },
	errorBox: { padding: 12, borderRadius: 8, backgroundColor: "#fee2e2", marginTop: 8 },
	errorText: { color: "#991b1b", fontSize: 14 },
});
