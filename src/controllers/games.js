export const getGamesList = (req, res) => {
  res.render('games/index', {
    title: 'Games Library',
  });
};

export const getPowerGridTycoonPage = (req, res) => {
  res.render('games/power-grid-tycoon', {
    title: 'Power Grid Tycoon',
  });
};

export const getTetrisPage = (req, res) => {
  res.render('games/tetris', {
    title: 'Tetris',
  });
};
