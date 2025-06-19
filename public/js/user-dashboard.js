    const searchInput = document.getElementById("searchInput");
    const cityFilter = document.getElementById("cityFilter");
    const amenityFilter = document.getElementById("amenityFilter");
    const hotelCards = document.querySelectorAll(".hotel-card-container");

    function filterHotels() {
      const search = searchInput.value.toLowerCase();
      const city = cityFilter.value.toLowerCase();
      const amenity = amenityFilter.value.toLowerCase();

      hotelCards.forEach(card => {
        const name = card.dataset.name;
        const cityName = card.dataset.city;
        const amenities = card.dataset.amenities;

        const matchName = name.includes(search);
        const matchCity = city === "" || cityName === city;
        const matchAmenity = amenity === "" || amenities.includes(amenity);

        card.style.display = (matchName && matchCity && matchAmenity) ? "" : "none";
      });
    }

    searchInput.addEventListener("input", filterHotels);
    cityFilter.addEventListener("change", filterHotels);
    amenityFilter.addEventListener("change", filterHotels);
