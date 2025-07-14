// index.js
const app = require("./src/app");
let mysql=require("./src/config/db.js");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
