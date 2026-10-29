const express = require("express");
const db = require("../db");
const { requireAuth, requireVerified } = require("../auth");
const router = express.Router();
router.use(requireAuth, requireVerified); // only verified accounts can use these routes
router.get("/", async (req, res, next) => {
	try {
		const [rows] = await db.query(
			"SELECT s.share_id, s.outfit_id, s.visibility, s.shared_at, o.outfit_name FROM Shared_Outfits s JOIN Outfits o ON o.outfit_id = s.outfit_id WHERE s.user_id = ? AND o.user_id = ? ORDER BY s.shared_at DESC",
			[req.user.user_id, req.user.user_id],
		);
		res.json(rows);
	} catch (e) {
		next(e);
	}
});
router.post("/:outfitId", async (req, res, next) => {
	const id = Number(req.params.outfitId);
	const visibility = req.body?.visibility ?? "public";
	if (
		!Number.isSafeInteger(id) ||
		id <= 0 ||
		!["public", "private"].includes(visibility)
	)
		return res
			.status(400)
			.json({
				error: "Invalid outfit ID or visibility (public/private).",
			});
	try {
		const [owned] = await db.query(
			"SELECT outfit_id FROM Outfits WHERE outfit_id = ? AND user_id = ?",
			[id, req.user.user_id],
		);
		if (!owned.length)
			return res.status(404).json({ error: "Outfit not found." });
		const [existing] = await db.query(
			"SELECT share_id FROM Shared_Outfits WHERE outfit_id = ? AND user_id = ?",
			[id, req.user.user_id],
		);
		if (existing.length) {
			await db.query(
				"UPDATE Shared_Outfits SET visibility = ? WHERE share_id = ? AND user_id = ?",
				[visibility, existing[0].share_id, req.user.user_id],
			);
			return res.json({
				share_id: existing[0].share_id,
				visibility,
				message: "Sharing updated.",
			});
		}
		const [r] = await db.query(
			"INSERT INTO Shared_Outfits (outfit_id, user_id, visibility) VALUES (?, ?, ?)",
			[id, req.user.user_id, visibility],
		);
		res.status(201).json({
			share_id: r.insertId,
			visibility,
			message: "Sharing saved.",
		});
	} catch (e) {
		next(e);
	}
});
router.delete("/:outfitId", async (req, res, next) => {
	try {
		const [r] = await db.query(
			"DELETE FROM Shared_Outfits WHERE outfit_id = ? AND user_id = ?",
			[req.params.outfitId, req.user.user_id],
		);
		if (!r.affectedRows)
			return res.status(404).json({ error: "Sharing record not found." });
		res.json({ message: "Sharing removed." });
	} catch (e) {
		next(e);
	}
});
module.exports = router;
