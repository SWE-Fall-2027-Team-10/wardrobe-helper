const express = require("express");
const db = require("../db");
const { requireAuth } = require("../auth");
const router = express.Router();
router.use(requireAuth);
const fields = ["name", "category", "color", "size", "brand", "image_url"];
function validate(body, creating) {
	if (!body || typeof body !== "object" || Array.isArray(body))
		return "Invalid request body.";
	if (creating && (!body.name || !body.category))
		return "Name and category are required.";
	if (Object.keys(body).some((k) => !fields.includes(k)))
		return "Unknown clothing field.";
	if (!Object.keys(body).length) return "No fields supplied.";
	for (const k of fields) {
		if (
			body[k] !== undefined &&
			body[k] !== null &&
			typeof body[k] !== "string"
		)
			return `${k} must be text.`;
		if (
			typeof body[k] === "string" &&
			body[k].length > (k === "image_url" ? 255 : 100)
		)
			return `${k} is too long.`;
	}
	if (body.name !== undefined && !String(body.name || "").trim())
		return "Name cannot be empty.";
	if (body.category !== undefined && !String(body.category || "").trim())
		return "Category cannot be empty.";
	return null;
}
router.post("/", async (req, res, next) => {
	const error = validate(req.body, true);
	if (error) return res.status(400).json({ error });
	try {
		const { name, category, color, size, brand, image_url } = req.body;
		const [r] = await db.query(
			"INSERT INTO Clothing (user_id, name, category, color, size, brand, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
			[
				req.user.user_id,
				name.trim(),
				category.trim(),
				color || null,
				size || null,
				brand || null,
				image_url || null,
			],
		);
		res.status(201).json({
			clothing_id: r.insertId,
			message: "Clothing item saved.",
		});
	} catch (e) {
		next(e);
	}
});
router.get("/", async (req, res, next) => {
	try {
		const { q, category, color } = req.query;
		let sql = "SELECT * FROM Clothing WHERE user_id = ?";
		const params = [req.user.user_id];
		if (q) {
			sql += " AND (name LIKE ? OR brand LIKE ?)";
			params.push(`%${q}%`, `%${q}%`);
		}
		if (category) {
			sql += " AND category = ?";
			params.push(category);
		}
		if (color) {
			sql += " AND color = ?";
			params.push(color);
		}
		const [rows] = await db.query(
			sql + " ORDER BY created_at DESC, clothing_id DESC",
			params,
		);
		res.json(rows);
	} catch (e) {
		next(e);
	}
});
router.put("/:id", async (req, res, next) => {
	const error = validate(req.body, false);
	if (error) return res.status(400).json({ error });
	const keys = Object.keys(req.body);
	try {
		const values = keys.map((k) =>
			typeof req.body[k] === "string" ? req.body[k].trim() : null,
		);
		const [r] = await db.query(
			`UPDATE Clothing SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE clothing_id = ? AND user_id = ?`,
			[...values, req.params.id, req.user.user_id],
		);
		if (!r.affectedRows)
			return res.status(404).json({ error: "Item not found." });
		res.json({ message: "Clothing item updated." });
	} catch (e) {
		next(e);
	}
});
router.delete("/:id", async (req, res, next) => {
	try {
		const [r] = await db.query(
			"DELETE FROM Clothing WHERE clothing_id = ? AND user_id = ?",
			[req.params.id, req.user.user_id],
		);
		if (!r.affectedRows)
			return res.status(404).json({ error: "Item not found." });
		res.json({ message: "Clothing item removed." });
	} catch (e) {
		next(e);
	}
});
module.exports = router;
