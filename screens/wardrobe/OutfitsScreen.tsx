import { useCallback, useState } from "react";
import {
	ActivityIndicator,
	Image,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../ThemeContext";
import {
	api,
	Clothing,
	Outfit,
	SharedOutfit,
	errorMessage,
} from "../../lib/api";

export default function OutfitsScreen() {
	const theme = useTheme();
	const [clothes, setClothes] = useState<Clothing[]>([]);
	const [outfits, setOutfits] = useState<Outfit[]>([]);
	const [shared, setShared] = useState<SharedOutfit[]>([]);
	const [selected, setSelected] = useState<number[]>([]);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [items, saved, shares] = await Promise.all([
				api.clothing.list(),
				api.outfits.list(),
				api.sharing.list(),
			]);
			setClothes(items);
			setOutfits(saved);
			setShared(shares);
			setError("");
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setLoading(false);
		}
	}, []);
	useFocusEffect(
		useCallback(() => {
			void load();
		}, [load]),
	);
	const toggle = (id: number) =>
		setSelected((old) =>
			old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
		);
	const create = async () => {
		if (!name.trim() || !selected.length) {
			setError("Name your outfit and select at least one clothing item.");
			return;
		}
		setBusy(true);
		setError("");
		setMessage("");
		try {
			await api.outfits.create(name.trim(), selected, description.trim());
			setName("");
			setDescription("");
			setSelected([]);
			await load();
			setMessage("Outfit saved!");
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setBusy(false);
		}
	};
	const remove = async (id: number) => {
		setBusy(true);
		setError("");
		try {
			await api.outfits.remove(id);
			await load();
			setMessage("Outfit deleted.");
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setBusy(false);
		}
	};
	const share = async (id: number, visibility: "public" | "private") => {
		setBusy(true);
		setError("");
		try {
			await api.sharing.set(id, visibility);
			await load();
			setMessage(`Outfit visibility set to ${visibility}.`);
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setBusy(false);
		}
	};
	const unshare = async (id: number) => {
		setBusy(true);
		setError("");
		try {
			await api.sharing.remove(id);
			await load();
			setMessage("Sharing removed.");
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setBusy(false);
		}
	};
	const inputStyle = [
		styles.input,
		{
			color: theme.text,
			backgroundColor: theme.surface,
			borderColor: theme.border,
		},
	];
	return (
		<ScrollView
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={styles.page}
			keyboardShouldPersistTaps="handled"
		>
			<Text style={[styles.heading, { color: theme.text }]}>
				Your Outfits
			</Text>
			<Text style={{ color: theme.textMuted }}>
				Combine clothing from your wardrobe into saved looks.
			</Text>
			{error ? <Text style={styles.error}>{error}</Text> : null}
			{message ? <Text style={styles.success}>{message}</Text> : null}
			<View
				style={[
					styles.card,
					{
						backgroundColor: theme.surface,
						borderColor: theme.border,
					},
				]}
			>
				<Text style={[styles.subheading, { color: theme.text }]}>
					Create outfit
				</Text>
				<TextInput
					style={inputStyle}
					placeholder="Outfit name"
					placeholderTextColor={theme.textMuted}
					value={name}
					onChangeText={setName}
				/>
				<TextInput
					style={inputStyle}
					placeholder="Description (optional)"
					placeholderTextColor={theme.textMuted}
					value={description}
					onChangeText={setDescription}
				/>
				<Text style={{ color: theme.textMuted }}>
					Select clothing ({selected.length} selected)
				</Text>
				{clothes.length === 0 ? (
					<Text style={{ color: theme.textMuted }}>
						Add clothing on the Clothing tab first.
					</Text>
				) : null}
				{clothes.map((item) => (
					<Pressable
						key={item.clothing_id}
						onPress={() => toggle(item.clothing_id)}
						style={[
							styles.selectRow,
							{ borderColor: theme.border },
						]}
					>
						<Text style={{ color: theme.primary, fontSize: 20 }}>
							{selected.includes(item.clothing_id) ? "☑" : "☐"}
						</Text>
						{item.image_url ? (
							<Image
								source={{ uri: item.image_url }}
								style={styles.thumbnail}
							/>
						) : null}
						<Text style={{ color: theme.text, flex: 1 }}>
							{item.name} · {item.category}
						</Text>
					</Pressable>
				))}
				<Pressable
					disabled={busy || !clothes.length}
					onPress={create}
					style={[
						styles.button,
						{
							backgroundColor: theme.primary,
							opacity: busy || !clothes.length ? 0.5 : 1,
						},
					]}
				>
					<Text style={styles.buttonText}>Save outfit</Text>
				</Pressable>
			</View>
			<Text style={[styles.subheading, { color: theme.text }]}>
				Saved outfits ({outfits.length})
			</Text>
			{loading ? <ActivityIndicator color={theme.primary} /> : null}
			{!loading && !outfits.length ? (
				<Text style={{ color: theme.textMuted }}>
					No saved outfits yet.
				</Text>
			) : null}
			{outfits.map((outfit) => {
				const record = shared.find(
					(s) => s.outfit_id === outfit.outfit_id,
				);
				return (
					<View
						key={outfit.outfit_id}
						style={[
							styles.card,
							{
								backgroundColor: theme.surface,
								borderColor: theme.border,
							},
						]}
					>
						<Text
							style={[styles.subheading, { color: theme.text }]}
						>
							{outfit.outfit_name}
						</Text>
						{outfit.description ? (
							<Text style={{ color: theme.textMuted }}>
								{outfit.description}
							</Text>
						) : null}
						{outfit.items.map((item) => (
							<View
								key={item.clothing_id}
								style={styles.outfitItem}
							>
								{item.image_url ? (
									<Image
										source={{ uri: item.image_url }}
										style={styles.thumbnail}
									/>
								) : null}
								<Text style={{ color: theme.text }}>
									{item.name}
								</Text>
							</View>
						))}
						<Text style={{ color: theme.textMuted }}>
							Sharing: {record?.visibility ?? "Not shared"}
						</Text>
						<View style={styles.actions}>
							<Pressable
								disabled={busy}
								onPress={() =>
									share(outfit.outfit_id, "public")
								}
							>
								<Text style={{ color: theme.primary }}>
									Public
								</Text>
							</Pressable>
							<Pressable
								disabled={busy}
								onPress={() =>
									share(outfit.outfit_id, "private")
								}
							>
								<Text style={{ color: theme.primary }}>
									Private
								</Text>
							</Pressable>
							{record ? (
								<Pressable
									disabled={busy}
									onPress={() => unshare(outfit.outfit_id)}
								>
									<Text style={{ color: theme.primary }}>
										Unshare
									</Text>
								</Pressable>
							) : null}
							<Pressable
								disabled={busy}
								onPress={() => remove(outfit.outfit_id)}
							>
								<Text style={styles.error}>Delete</Text>
							</Pressable>
						</View>
					</View>
				);
			})}
		</ScrollView>
	);
}
const styles = StyleSheet.create({
	page: { padding: 16, paddingBottom: 40, gap: 12 },
	heading: { fontSize: 26, fontWeight: "700" },
	subheading: { fontSize: 18, fontWeight: "600" },
	card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
	input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
	button: { padding: 13, borderRadius: 8, alignItems: "center" },
	buttonText: { color: "#fff", fontWeight: "700" },
	selectRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		borderBottomWidth: 1,
		paddingVertical: 9,
	},
	thumbnail: { width: 42, height: 42, borderRadius: 6 },
	outfitItem: { flexDirection: "row", alignItems: "center", gap: 10 },
	actions: { flexDirection: "row", flexWrap: "wrap", gap: 16, paddingTop: 8 },
	error: { color: "#b91c1c" },
	success: { color: "#16803c" },
});
