const express = require("express");
const matchesRouter = require('./routes/matches');
const app = express();

app.use(express.json());


app.use('/matches', matchesRouter);

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    error: 'Internal Server Error',
  });
});
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
