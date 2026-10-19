require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/clothing", require("./routes/clothing"));
app.use("/api/outfits", require("./routes/outfits"));
app.use("/api/favorites", require("./routes/favorites"));
app.use("/api/sharing", require("./routes/sharing"));
app.use((req, res) => res.status(404).json({ error: "Not found." }));
app.use((err, req, res, next) => {
	console.error(err);
	res.status(500).json({ error: "Server error." });
});
const port = process.env.PORT || 3000;
if (require.main === module)
	app.listen(port, () =>
		console.log(`Wardrobe Maker API running on port ${port}`),
	);
module.exports = app;
