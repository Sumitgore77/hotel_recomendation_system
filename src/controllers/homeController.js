exports.renderHome = (req, res) => {
  const { search = "", rating = "", city = "" } = req.query;

  const allHotels = [
    {
      id: 1,
      name: "Hotel Taj",
      city: "Mumbai",
      image: "/Images/1.jpg",
      rating: 4.8,
      description: "Luxury hotel with sea view and premium rooms.",
    },
    {
      id: 2,
      name: "The Oberoi",
      city: "Delhi",
      image: "/Images/2.jpg",
      rating: 4.6,
      description: "Elegant ambiance with world-class dining experience.",
    },
    {
      id: 3,
      name: "Fairmont Jaipur",
      city: "Jaipur",
      image: "/Images/3.jpg",
      rating: 4.6,
      description: "Palace-style stay with luxury spa experience.",
    },
  ];

  const filteredHotels = allHotels.filter((hotel) => {
    const matchesSearch =
      search === "" ||
      hotel.name.toLowerCase().includes(search.toLowerCase()) ||
      hotel.description.toLowerCase().includes(search.toLowerCase());
    const matchesRating = rating === "" || hotel.rating >= parseFloat(rating);
    const matchesCity =
      city === "" || hotel.city.toLowerCase() === city.toLowerCase();
    return matchesSearch && matchesRating && matchesCity;
  });

  res.render("home", { hotels: filteredHotels, search, rating, city });
};
