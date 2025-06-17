exports.showHome = (req, res) => {
  const hotels = [
    {
      id: 1,
      name: "Hotel Taj",
      image: "/Images/.jpg",
      rating: 4.8,
      description: "Luxury hotel with sea view and premium rooms."
    },
    {
      id: 2,
      name: "The Oberoi",
      image: "/Images/.jpg",
      rating: 4.6,
      description: "Elegant ambiance with world-class dining experience."
    },
    {
      id: 3,
      name: "Trident",
      image: "/Images/.jpg",
      rating: 4.4,
      description: "Affordable comfort and great hospitality."
    },
    {
      id: 4,
      name: "Leela Palace",
      image: "/Images/.jpg",
      rating: 4.9,
      description: "Royal luxury with traditional Indian architecture."
    },
    {
      id: 5,
      name: "ITC Grand",
      image: "/Images/.jpg",
      rating: 4.5,
      description: "Green hotel with exquisite fine dining."
    },
    {
      id: 6,
      name: "JW Marriott",
      image: "/Images/.jpg",
      rating: 4.7,
      description: "Modern amenities with excellent customer service."
    },
    {
      id: 7,
      name: "Hyatt Regency",
      image: "/Images/.jpg",
      rating: 4.3,
      description: "Business-friendly stay with elegant decor."
    },
    {
      id: 8,
      name: "Radisson Blu",
      image: "/Images/.jpg",
      rating: 4.2,
      description: "Comfortable rooms with a lively bar and buffet."
    },
    {
      id: 9,
      name: "Fairmont Jaipur",
      image: "/Images/.jpg",
      rating: 4.6,
      description: "Palace-style stay with luxury spa experience."
    }
  ];

  console.log("Rendering home page...");

  res.render("home", { hotels });
};
