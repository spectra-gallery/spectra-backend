
function initial(db) {
  const Role = db.role;

  Role.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {
      new Role({
        name: 'user',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'user\' to roles collection');
      });

      new Role({
        name: 'admin',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'admin\' to roles collection');
      });

      new Role({
        name: 'creator',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'creator\' to roles collection');
      });

      new Role({
        name: 'thinker',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'thinker\' to roles collection');
      });

      new Role({
        name: 'myself',
      }).save((err) => {
        if (err) {
          console.log('error', err);
        }

        console.log('added \'myself\' to roles collection');
      });
    }
  });
}

module.exports = initial;