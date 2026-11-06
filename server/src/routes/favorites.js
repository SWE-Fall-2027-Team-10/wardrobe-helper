const express = require("express");
const db = require("../db");
const { requireAuth, requireVerified } = require("../auth");
const router = express.Router();
router.use(requireAuth, requireVerified); // only verified accounts can use these routes
router.get("/", async (req, res, next) => {
	try {
		const [rows] = await db.query(
			"SELECT f.favorite_id, f.created_at AS favorited_at, c.* FROM Favorites f JOIN Clothing c ON c.clothing_id = f.clothing_id WHERE f.user_id = ? AND c.user_id = ? ORDER BY f.created_at DESC",
			[req.user.user_id, req.user.user_id],
		);
		res.json(rows);
	} catch (e) {
		next(e);
	}
});
router.post("/:clothingId", async (req, res, next) => {
	const id = Number(req.params.clothingId);
	if (!Number.isSafeInteger(id) || id <= 0)
		return res.status(400).json({ error: "Invalid clothing ID." });
	try {
		const [owned] = await db.query(
			"SELECT clothing_id FROM Clothing WHERE clothing_id = ? AND user_id = ?",
			[id, req.user.user_id],
		);
		if (!owned.length)
			return res.status(404).json({ error: "Clothing item not found." });
		const [existing] = await db.query(
			"SELECT favorite_id FROM Favorites WHERE clothing_id = ? AND user_id = ?",
			[id, req.user.user_id],
		);
		if (existing.length)
			return res.json({
				favorite_id: existing[0].favorite_id,
				message: "Already favorited.",
			});
		const [r] = await db.query(
			"INSERT INTO Favorites (user_id, clothing_id) VALUES (?, ?)",
			[req.user.user_id, id],
		);
		res.status(201).json({
			favorite_id: r.insertId,
			message: "Added to favorites.",
		});
	} catch (e) {
		next(e);
	}
});
router.delete("/:clothingId", async (req, res, next) => {
	try {
		const [r] = await db.query(
			"DELETE FROM Favorites WHERE clothing_id = ? AND user_id = ?",
			[req.params.clothingId, req.user.user_id],
		);
		if (!r.affectedRows)
			return res.status(404).json({ error: "Favorite not found." });
		res.json({ message: "Removed from favorites." });
	} catch (e) {
		next(e);
	}
});
module.exports = router;
