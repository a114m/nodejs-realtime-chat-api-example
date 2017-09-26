const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const winston = require('winston');
const SocketServer = require('socket.io');

winston.level = process.env.LOG_LEVEL || 'debug';

/**
 * Initializing Database;
 */

const models = require('./models');
models.init().then(res => {
  models.Company.count().then(count => {
    if (count < 1){
      winston.log(`Loading seed data...`);
      models.loadSeedData();
    }
  });
});




const index = require('./routes/index');

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


/**
 * Create socket.io listener
 */

const io = new SocketServer();

/**
 * Listening for web socket connection.
 */

io.use((socket, next) => {
  let handshakeData = socket.request;
  next();
});

io.on('connection', function(socket){
  winston.debug('a user connected');

  let query = socket.handshake.query;
  models.Chat.findById(query.chat).then(chat =>{
    socket.join(`${chat.id}`);
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
                // io.emit('chat message', `${client_name}${msg}`);
                io.to(`${chat.id}`).emit('chat message', `${client_name}${msg}`);
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
                // io.emit('chat message', `${msg}`);
                io.to(`${chat.id}`).emit('chat message', `${msg}`);
              }).catch(err => {
                winston.error(`Error conntecting to chat: ${err}`);
              });
            });
          });
        });
      });
    } else 
    return Promise.reject("Couldn't find user_id nor developer_id in request");
  }).catch(err => {
    winston.error(`Error conntecting to chat: ${err}`);
  });
  socket.on('disconnect', function(){
    winston.debug('user disconnected');
  });
});


const retrieveChatHistory = (chat, socket, client_account, client_name) => {
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

module.exports = {
  app,
  io
};
