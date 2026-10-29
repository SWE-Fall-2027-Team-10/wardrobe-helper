const express = require("express");
const db = require("../db");
const { requireAuth, requireVerified } = require("../auth");
const router = express.Router();
router.use(requireAuth, requireVerified); // only verified accounts can use these routes

router.get("/", async (req, res, next) => {
	try {
		const [outfits] = await db.query(
			"SELECT * FROM Outfits WHERE user_id = ? ORDER BY created_at DESC, outfit_id DESC",
			[req.user.user_id],
		);
		if (!outfits.length) return res.json([]);
		const ids = outfits.map((o) => o.outfit_id);
		const [items] = await db.query(
			`SELECT oi.outfit_id, c.* FROM Outfit_Items oi JOIN Clothing c ON c.clothing_id = oi.clothing_id WHERE oi.outfit_id IN (${ids.map(() => "?").join(",")}) AND c.user_id = ? ORDER BY oi.outfit_item_id`,
			[...ids, req.user.user_id],
		);
		res.json(
			outfits.map((o) => ({
				...o,
				items: items.filter((i) => i.outfit_id === o.outfit_id),
			})),
		);
	} catch (e) {
		next(e);
	}
});

router.post("/", async (req, res, next) => {
	const name =
		typeof req.body?.outfit_name === "string"
			? req.body.outfit_name.trim()
			: "";
	const description =
		typeof req.body?.description === "string"
			? req.body.description.trim()
			: null;
	const ids = req.body?.clothing_ids;
	if (
		!name ||
		name.length > 100 ||
		!Array.isArray(ids) ||
		!ids.length ||
		ids.length > 50 ||
		!ids.every(Number.isSafeInteger) ||
		ids.some((x) => x <= 0) ||
		new Set(ids).size !== ids.length
	) {
		return res
			.status(400)
			.json({
				error: "Provide an outfit name and a list of 1-50 unique clothing IDs.",
			});
	}
	let conn;
	try {
		conn = await db.getConnection();
		await conn.beginTransaction();
		const [owned] = await conn.query(
			`SELECT clothing_id FROM Clothing WHERE user_id = ? AND clothing_id IN (${ids.map(() => "?").join(",")}) FOR UPDATE`,
			[req.user.user_id, ...ids],
		);
		if (owned.length !== ids.length) {
			await conn.rollback();
			return res
				.status(400)
				.json({
					error: "Some clothing items are missing or do not belong to you.",
				});
		}
		const [created] = await conn.query(
			"INSERT INTO Outfits (user_id, outfit_name, description) VALUES (?, ?, ?)",
			[req.user.user_id, name, description],
		);
		for (const id of ids)
			await conn.query(
				"INSERT INTO Outfit_Items (outfit_id, clothing_id) VALUES (?, ?)",
				[created.insertId, id],
			);
		await conn.commit();
		res.status(201).json({
			outfit_id: created.insertId,
			message: "Outfit saved.",
		});
	} catch (e) {
		if (conn) await conn.rollback().catch(() => {});
		next(e);
	} finally {
		if (conn) conn.release();
	}
});

router.delete("/:id", async (req, res, next) => {
	try {
		const [r] = await db.query(
			"DELETE FROM Outfits WHERE outfit_id = ? AND user_id = ?",
			[req.params.id, req.user.user_id],
		);
		if (!r.affectedRows)
			return res.status(404).json({ error: "Outfit not found." });
		res.json({ message: "Outfit deleted." });
	} catch (e) {
		next(e);
	}
});
module.exports = router;
