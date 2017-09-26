const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const winston = require('winston');
const SocketServer = require('socket.io');

winston.level = process.env.LOG_LEVEL || 'debug';

const models = require('./models');
const esManager = require('./managers/es-manager');
const index = require('./routes/index');

/**
 * Initializing Database;
 */
models.init().then(res => {
  models.Company.count().then(count => {
    if (count < 1){
      winston.log(`Loading seed data...`);
      models.loadSeedData();
    }
  });
});


const app = express();

/**
 * View engine setup.
 */
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);


/**
 * Create socket.io listener
 */
const io = new SocketServer();

/**
 * Listening for web socket connection.
 */
// const indexMessage = (message, chat, company, app, user, sender_name=null) => {
io.on('connection', function(socket){
  let query = socket.handshake.query;
  models.Chat.findById(query.chat).then(chat =>{
    socket.join(`${chat.id}`);
    winston.debug(`a user connected to chat #${chat.id}`);
    chat.getApp().then(app => {
      chat.getUser().then(user => {
        app.getCompany().then(company => {
          if (query.dev){
            models.Developer.findById(query.dev).then(dev => {
              dev.getAccount().then(account => {
                let client_name = `${dev.name} (app team): `;
                retrieveChatHistory(chat, socket, account, client_name).catch(err => {
                  winston.error(`Error conntecting to chat: ${err}`);
                }).then(messages => {
                  socket.on('chat message', function(msg){
                    winston.debug('message: ' + msg);
                    chat.createMessage({
                      content: msg,
                      sender_id: account.id,
                    }).then(message => {
                      io.to(`${chat.id}`).emit('chat message', `${client_name}${msg}`);
                      esManager.indexMessage(message, chat, company, app, user, dev.name).then();
                    }).catch(err => {
                      winston.error(`Error sending message: ${err}`);
                    });
                  });
                });
              });
            });
          } else if (query.user) {
            models.User.findById(query.user).then(user => {
              user.getAccount().then(account => {
                retrieveChatHistory(chat, socket, account, null).catch(err => {
                  winston.error(`Error conntecting to chat: ${err}`);
                }).then(messages => {
                  socket.on('chat message', function(msg){
                    winston.debug('message: ' + msg);
                    chat.createMessage({
                      content: msg,
                      sender_id: account.id,
                    }).then(message => {
                      io.to(`${chat.id}`).emit('chat message', `${msg}`);
                      esManager.indexMessage(message, chat, company, app, user, null).then();
                    }).catch(err => {
                      winston.error(`Error conntecting to chat: ${err}`);
                    });
                  });
                });
              });
            });
          } else 
          return Promise.reject("Couldn't find user_id nor developer_id in request");
        });
      });
    });
  }).catch(err => {
    winston.error(`Error conntecting to chat: ${err}`);
  });
  socket.on('disconnect', function(){
    winston.debug('user disconnected');
  });
});


/**
 * Retrieves the chat history and sends it to the provided client.
 * @param {Object} chat - models.Chat instance to retrieve related messages (sequelize model).
 * @param {Object} socket - connection socket instance for the current user/dev (socket.io).
 * @param {Object} client_account - models.Account instance of the current connected user/dev (sequelize model).
 * @param {String} client_name - (optional) String represents the current client name that will prefex messages sent by him.
 */
const retrieveChatHistory = (chat, socket, client_account, client_name=null) => {
  return chat.getMessages().then(messages => {
    messages.reduce((promise_chain, message) => {
      return promise_chain.then(() => {
        if (message.sender_id === client_account.id){
          return new Promise((resolve, reject) => {
            socket.emit('chat message', `${client_name || ''}${message.content || message.attachment || ''}`)
            resolve();
          });
        } else
          return message.getSender().then(sender_account => {
            return sender_account.getDeveloper().then(dev => {
              if (dev)
                socket.emit('chat message', `${dev.name} (app team): ${message.content || message.attachment || ''}`);
              else
                socket.emit('chat message', `${message.content || message.attachment || ''}`);
            });
          });
      });
    }, Promise.resolve());
    return messages;
  });
};


/**
 * Catch 404 and forward to error handler.
 */
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/**
 * Error handler.
 */
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = {
  app,
  io
};
