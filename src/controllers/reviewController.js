const conn = require("../config/db");

// Render review page
exports.renderReviewPage = (req, res) => {
  const hotel_id = req.params.hotel_id;
  res.render("review-page", { hotel_id });
};

// Handle review submission
exports.submitReview = (req, res) => {
  const { hotel_id, rating, rev_text } = req.body;
  const rev_date = new Date();

  const sql = `
    INSERT INTO reviewmaster (rev_text, rating, rev_date)
    VALUES (?, ?, ?)
  `;

  conn.query(sql, [rev_text, rating, rev_date], (err) => {
    if (err) {
      console.error("Error submitting review:", err);
      return res.status(500).send("Database error while submitting review.");
    }
    console.log("✅ Review submitted.");
    res.redirect("/user/home");
  });
};
