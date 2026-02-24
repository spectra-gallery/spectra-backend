const bcrypt = require('bcryptjs');

async function initial(db) {
  const Role = db.role;
  const User = db.user;

  // Initialize roles
  return new Promise((resolve, reject) => {
    Role.estimatedDocumentCount((err, count) => {
      if (err) {
        console.error('Error counting roles:', err);
        return reject(err);
      }

      if (count === 0) {
        const rolePromises = [];

        const roles = ['user', 'admin', 'creator', 'thinker', 'myself'];
        roles.forEach(roleName => {
          rolePromises.push(
            new Promise((res, rej) => {
              new Role({ name: roleName }).save((err) => {
                if (err) {
                  console.error(`Error adding '${roleName}' role:`, err);
                  return rej(err);
                }
                console.log(`Added '${roleName}' to roles collection`);
                res();
              });
            })
          );
        });

        Promise.all(rolePromises)
          .then(() => {
            console.log('All roles initialized successfully');
            // After roles are created, create admin user
            return createAdminUser(db);
          })
          .then(() => resolve())
          .catch(reject);
      } else {
        console.log('Roles already initialized');
        // Check if admin user exists, create if not
        createAdminUser(db).then(resolve).catch(reject);
      }
    });
  });
}

async function createAdminUser(db) {
  const User = db.user;
  const Role = db.role;

  try {
    // Check if admin user already exists
    const adminUser = await User.findOne({ username: 'admin' }).exec();

    if (!adminUser) {
      console.log('No admin user found, creating default admin user...');

      // Find admin role
      const adminRole = await Role.findOne({ name: 'admin' }).exec();

      if (!adminRole) {
        console.error('Admin role not found! Roles may not be initialized yet.');
        return;
      }

      // Get admin credentials from environment or use defaults
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@spectra.gallery';
      const adminPassword = process.env.ADMIN_PASSWORD || 'Spectra2024Admin!';

      // Hash password
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Create admin user
      const newAdmin = new User({
        username: adminUsername,
        slug: adminUsername.toLowerCase().replace(/ /g, '-'),
        email: adminEmail,
        password: hashedPassword,
        verified: true,
        creator: true,
        role: [adminRole._id],
        date: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      });

      await newAdmin.save();

      console.log('='.repeat(60));
      console.log('DEFAULT ADMIN USER CREATED');
      console.log('='.repeat(60));
      console.log(`Username: ${adminUsername}`);
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);
      console.log('='.repeat(60));
      console.log('IMPORTANT: Please change the admin password immediately!');
      console.log('='.repeat(60));
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
}

module.exports = initial;