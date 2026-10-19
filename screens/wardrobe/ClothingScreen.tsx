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
import { api, Clothing, errorMessage } from "../../lib/api";

export default function ClothingScreen() {
	const theme = useTheme();
	const [items, setItems] = useState<Clothing[]>([]);
	const [favorites, setFavorites] = useState<number[]>([]);
	const [search, setSearch] = useState("");
	const [name, setName] = useState("");
	const [category, setCategory] = useState("Tops");
	const [color, setColor] = useState("");
	const [imageUrl, setImageUrl] = useState("");
	const [editing, setEditing] = useState<number | null>(null);
	const [loading, setLoading] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	const load = useCallback(async () => {
		setLoading(true);
		try {
			const [clothes, favs] = await Promise.all([
				api.clothing.list(),
				api.favorites.list(),
			]);
			setItems(clothes);
			setFavorites(favs.map((f) => f.clothing_id));
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

	const resetForm = () => {
		setName("");
		setCategory("Tops");
		setColor("");
		setImageUrl("");
		setEditing(null);
	};
	const save = async () => {
		if (!name.trim() || !category.trim()) {
			setError("Name and category are required.");
			return;
		}
		setBusy(true);
		setError("");
		setMessage("");
		try {
			const input = {
				name: name.trim(),
				category: category.trim(),
				color: color.trim(),
				image_url: imageUrl.trim(),
			};
			if (editing !== null) await api.clothing.update(editing, input);
			else await api.clothing.create(input);
			setMessage(
				editing !== null ? "Clothing updated." : "Clothing added.",
			);
			resetForm();
			await load();
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setBusy(false);
		}
	};
	const edit = (item: Clothing) => {
		setEditing(item.clothing_id);
		setName(item.name);
		setCategory(item.category || "Tops");
		setColor(item.color || "");
		setImageUrl(item.image_url || "");
		setMessage("");
	};
	const remove = async (id: number) => {
		setBusy(true);
		setError("");
		try {
			await api.clothing.remove(id);
			if (editing === id) resetForm();
			await load();
			setMessage("Clothing removed.");
		} catch (e) {
			setError(errorMessage(e));
		} finally {
			setBusy(false);
		}
	};
	const toggleFavorite = async (id: number) => {
		setBusy(true);
		setError("");
		try {
			if (favorites.includes(id)) await api.favorites.remove(id);
			else await api.favorites.add(id);
			await load();
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
	const filtered = items.filter((i) =>
		`${i.name} ${i.category || ""} ${i.brand || ""} ${i.color || ""}`
			.toLowerCase()
			.includes(search.toLowerCase()),
	);
	return (
		<ScrollView
			style={{ backgroundColor: theme.background }}
			contentContainerStyle={styles.page}
			keyboardShouldPersistTaps="handled"
		>
			<Text style={[styles.heading, { color: theme.text }]}>
				Your Clothing
			</Text>
			<Text style={{ color: theme.textMuted }}>
				Add and manage the pieces in your wardrobe.
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
					{editing !== null ? "Edit clothing" : "Add clothing"}
				</Text>
				<TextInput
					style={inputStyle}
					placeholder="Item name (e.g. Black Hoodie)"
					placeholderTextColor={theme.textMuted}
					value={name}
					onChangeText={setName}
				/>
				<TextInput
					style={inputStyle}
					placeholder="Category (e.g. Tops)"
					placeholderTextColor={theme.textMuted}
					value={category}
					onChangeText={setCategory}
				/>
				<TextInput
					style={inputStyle}
					placeholder="Color (optional)"
					placeholderTextColor={theme.textMuted}
					value={color}
					onChangeText={setColor}
				/>
				<TextInput
					style={inputStyle}
					placeholder="Image URL (optional)"
					placeholderTextColor={theme.textMuted}
					value={imageUrl}
					onChangeText={setImageUrl}
					autoCapitalize="none"
				/>
				<Pressable
					disabled={busy}
					onPress={save}
					style={[
						styles.button,
						{
							backgroundColor: theme.primary,
							opacity: busy ? 0.5 : 1,
						},
					]}
				>
					<Text style={styles.buttonText}>
						{editing !== null ? "Save changes" : "Add item"}
					</Text>
				</Pressable>
				{editing !== null ? (
					<Pressable onPress={resetForm} style={styles.smallButton}>
						<Text style={{ color: theme.text }}>
							Cancel editing
						</Text>
					</Pressable>
				) : null}
			</View>
			<TextInput
				style={inputStyle}
				placeholder="Search your clothing..."
				placeholderTextColor={theme.textMuted}
				value={search}
				onChangeText={setSearch}
			/>
			{loading ? <ActivityIndicator color={theme.primary} /> : null}
			{!loading && filtered.length === 0 ? (
				<Text style={{ color: theme.textMuted }}>
					No clothing items found.
				</Text>
			) : null}
			{filtered.map((item) => (
				<View
					key={item.clothing_id}
					style={[
						styles.item,
						{
							backgroundColor: theme.surface,
							borderColor: theme.border,
						},
					]}
				>
					{item.image_url ? (
						<Image
							source={{ uri: item.image_url }}
							style={styles.image}
						/>
					) : null}
					<View style={{ flex: 1 }}>
						<Text style={[styles.itemTitle, { color: theme.text }]}>
							{item.name}
						</Text>
						<Text style={{ color: theme.textMuted }}>
							{[item.category, item.color]
								.filter(Boolean)
								.join(" • ")}
						</Text>
						<View style={styles.actions}>
							<Pressable
								disabled={busy}
								onPress={() => toggleFavorite(item.clothing_id)}
							>
								<Text style={{ color: theme.primary }}>
									{favorites.includes(item.clothing_id)
										? "♥ Favorited"
										: "♡ Favorite"}
								</Text>
							</Pressable>
							<Pressable
								disabled={busy}
								onPress={() => edit(item)}
							>
								<Text style={{ color: theme.primary }}>
									Edit
								</Text>
							</Pressable>
							<Pressable
								disabled={busy}
								onPress={() => remove(item.clothing_id)}
							>
								<Text style={styles.danger}>Delete</Text>
							</Pressable>
						</View>
					</View>
				</View>
			))}
		</ScrollView>
	);
}
const styles = StyleSheet.create({
	page: { padding: 16, gap: 12, paddingBottom: 40 },
	heading: { fontSize: 26, fontWeight: "700" },
	subheading: { fontSize: 18, fontWeight: "600", marginBottom: 6 },
	card: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
	input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15 },
	button: { padding: 13, borderRadius: 8, alignItems: "center" },
	buttonText: { color: "#fff", fontWeight: "700" },
	smallButton: { alignItems: "center", padding: 8 },
	item: {
		borderWidth: 1,
		borderRadius: 10,
		padding: 12,
		flexDirection: "row",
		gap: 12,
		alignItems: "center",
	},
	image: { width: 68, height: 68, borderRadius: 8 },
	itemTitle: { fontSize: 16, fontWeight: "600" },
	actions: { flexDirection: "row", gap: 16, marginTop: 10, flexWrap: "wrap" },
	danger: { color: "#c62828" },
	error: { color: "#b91c1c" },
	success: { color: "#16803c" },
});
