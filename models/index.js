const Sequelize = require('sequelize');
const winston = require('winston');


/**
 * Setting DB connection and general model configuration.
 */

const sequelize = new Sequelize(
  process.env.MYSQL_DB_NAME,
  process.env.MYSQL_USERNAME || 'root',
  process.env.MYSQL_PASSWORD || null,
  {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: parseInt(process.env.MYSQL_PORT) || 3306,
    dialect: 'mysql',
    pool: {
      max: 5,
      min: 0,
      idle: 10000
    },
    define: {
      timestamps: false,
      underscored: true,
      underscoredAll: true
    },
    logging: winston.silly
  }
);


/**
 * Initializing DB.
 */

const init = () => sequelize.sync({
  logging: winston.silly
});


/**
 * Defining models.
 */

const Company = sequelize.define('company', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  }
});

const App = sequelize.define('app', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  external_id: {
   type: Sequelize.STRING,
   unique: true
  },
  store: {
   type: Sequelize.STRING
  }
});

const Account = sequelize.define('account', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
});

const Developer = sequelize.define('developer', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  email: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true
    }
  },
  password: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  role: {
    type: Sequelize.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    },
  }
});

const User = sequelize.define('user', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  external_id: {
   type: Sequelize.STRING,
   unique: true
  }
});

const Chat = sequelize.define('apps_users', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  app_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    unique: 'Ugroup1',
    validate: {
      notEmpty: true
    }
  },
  user_id: {
    type: Sequelize.INTEGER,
    allowNull: false,
    unique: 'Ugroup1',
    validate: {
      notEmpty: true
    }
  }
});

const Message = sequelize.define('message', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content: {
   type: Sequelize.TEXT
  },
  is_read: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  attachment: {
    type: Sequelize.STRING(2083)
  },
},
{
  timestamps: true,
  createdAt: 'sent_at',
  updatedAt: false
});


/**
 * Defining model associations.
 */

Company.hasMany(App, {as: 'Apps'});
App.belongsTo(Company);

Company.hasMany(Developer, {as: 'Developers'});
Developer.belongsTo(Company);

Developer.belongsTo(Account);
Account.hasOne(Developer);
User.belongsTo(Account);
Account.hasOne(User);

User.belongsToMany(App, {as: 'Apps', through: Chat, foreignKey: 'user_id', otherKey: 'app_id'});
App.belongsToMany(User, {as: 'Users', through: Chat, foreignKey: 'app_id', otherKey: 'user_id'});

App.hasMany(Chat, {as: 'Chats', foreignKey: 'app_id'});
User.hasMany(Chat, {as: 'Chats', foreignKey: 'user_id'});
Chat.belongsTo(App, {foreignKey: 'app_id'}); //
Chat.belongsTo(User, {foreignKey: 'user_id'}); //

Chat.hasMany(Message, {as: 'Messages', foreignKey: 'chat_id'});
Message.belongsTo(Chat, {as: 'Chat', foreignKey: 'chat_id'});

Message.belongsTo(Account, {as: 'Sender', foreignKey: 'sender_id'});
Account.hasMany(Message, {as: 'Messages', foreignKey: 'sender_id'});


const loadSeedData = () => {
  Company.create({
    name: 'Snapchat'
  }).then(company => {
    App.create({
      name: 'SnapChat', store: 'GOOGLE-PLAY', external_id: 'com.snapchat', company_id: company.id
    }).then(app => {
      Account.create().then(user_account => {
        User.create({
          external_id: '12345', account_id: user_account.id
        }).then(user => {
          Account.create().then(developer_account => {
            Developer.create({
              name: 'shady', email: 'shady@gmail.com', password: 'someEncryptedpPassword', role: 'admin', company_id: company.id, account_id: developer_account.id
            }).then(developer => {
              Chat.create({app_id: app.id, user_id: user.id}).then(chat => winston.info('Seed data loaded successfully'));
            });
          });
        });
      });      
    });
  }).catch('Failed loading seed data');
}

module.exports = {
  init,
  loadSeedData,
  Company,
  App,
  Account,
  Developer,
  User,
  Chat,
  Message
}
