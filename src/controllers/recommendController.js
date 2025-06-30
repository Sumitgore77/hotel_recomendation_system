const { recommendHotelsByUser } = require('../services/recommendService');

const getRecommendations = async (req, res) => {
  const userId = req.session.userId;

  try {
    if (!userId) {
      return res.redirect('/login'); // fallback to login if not logged in
    }

    const recommendations = await recommendHotelsByUser(userId);

    // Optional debug
    console.log("User ID:", userId);
    console.log("Recommended Hotels:", recommendations);

    res.render('recommendations', { recommendations });
  } catch (error) {
    console.error('Recommendation Error:', error);
    res.status(500).send('An error occurred while generating recommendations.');
  }
};

module.exports = { getRecommendations };
