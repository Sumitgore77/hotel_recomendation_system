const natural = require("natural");
const TfIdf = natural.TfIdf;
const cosineSimilarity = require("compute-cosine-similarity");
const conn = require("../config/db");

function createDocument(hotel) {
  return [
    hotel.city_name,
    hotel.area_name,
    hotel.amenities,
    hotel.room_types,
    hotel.type || "standard"
  ].join(" ").toLowerCase();
}

function buildTfIdf(hotels) {
  const tfidf = new TfIdf();
  hotels.forEach(hotel => tfidf.addDocument(createDocument(hotel)));
  return tfidf;
}

function getVector(tfidf, index, vocabulary) {
  const termMap = new Map(tfidf.listTerms(index).map(t => [t.term, t.tfidf]));
  return vocabulary.map(term => termMap.get(term) || 0);
}

async function recommendHotelsByUser(userId, topN = 5) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        h.hotel_id, h.hotel_name, h.image, c.city_name, a.area_name,
        GROUP_CONCAT(DISTINCT am.amenity_name) AS amenities,
        GROUP_CONCAT(DISTINCT rm.room_type) AS room_types,
        'standard' AS type,
        (b.userid IS NOT NULL) AS is_booked_by_user
      FROM hotelmaster h
      JOIN citymaster c ON h.city_id = c.city_id
      JOIN areamaster a ON h.area_id = a.area_id
      LEFT JOIN hotelamenitiesjoin ha ON h.hotel_id = ha.hotel_id
      LEFT JOIN amenities am ON ha.amenity_id = am.amenity_id
      LEFT JOIN hotelroomjoin hr ON h.hotel_id = hr.hotel_id
      LEFT JOIN roomsmaster rm ON hr.room_id = rm.room_id
      LEFT JOIN bookingmaster b ON b.hotel_id = h.hotel_id AND b.userid = ?
      GROUP BY h.hotel_id;
    `;

    conn.query(query, [userId], (err, hotels) => {
      if (err) return reject(err);

      const bookedHotels = hotels.filter(h => h.is_booked_by_user === 1);
      const unbookedHotels = hotels.filter(h => h.is_booked_by_user === 0);

      if (bookedHotels.length === 0) return resolve([]); // no history to base on

      // Combine all hotels for a consistent vocabulary
      const allHotels = bookedHotels.concat(unbookedHotels);
      const tfidf = buildTfIdf(allHotels);

      const vocabulary = [...new Set(
        allHotels.flatMap((_, i) => tfidf.listTerms(i).map(t => t.term))
      )];

      const bookedVectors = bookedHotels.map((_, i) =>
        getVector(tfidf, i, vocabulary)
      );

      const recommendations = unbookedHotels.map((hotel, index) => {
        const i = bookedHotels.length + index;
        const vector = getVector(tfidf, i, vocabulary);

        const avgSimilarity =
          bookedVectors.reduce((sum, bv) => sum + cosineSimilarity(bv, vector), 0) / bookedVectors.length;

        return { hotel, score: avgSimilarity };
      });

      const topRecommendations = recommendations
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topN)
        .map(r => r.hotel);

      resolve(topRecommendations);
    });
  });
}

module.exports = { recommendHotelsByUser };
