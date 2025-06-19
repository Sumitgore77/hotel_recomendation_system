 document.getElementById('searchInput').addEventListener('input', function () {
    const query = this.value.toLowerCase();
    document.querySelectorAll('.hotel-group').forEach(group => {
      const hotel = group.getAttribute('data-hotel');
      let groupVisible = hotel.includes(query);

      // Check each row for matching username
      const rows = group.querySelectorAll('tbody tr');
      let anyRowVisible = false;

      rows.forEach(row => {
        const username = row.getAttribute('data-username');
        const match = username.includes(query) || hotel.includes(query);
        row.style.display = match ? '' : 'none';
        if (match) anyRowVisible = true;
      });

      // Hide entire group if no row is visible
      group.style.display = anyRowVisible ? 'block' : 'none';
    });
  });