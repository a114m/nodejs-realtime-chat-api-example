const elasticsearch = require('elasticsearch');
const winston = require('winston');


const es = new elasticsearch.Client({
  host: process.env.ES_HOST || '127.0.0.1:9200',
  log: 'trace'
});

const index = process.env.ES_CHAT_INDEX || 'chats';
const type = process.env.ES_CHAT_TYPE || 'message';

const indexMessage = (message, chat, company, app, user, sender_name=null) => {
    let body = {
        chat_id: chat.id,
        sender_id: message.sender_id,
        company_id: company.id,
        company_name: company.name,
        app_id: app.id,
        app_name: app.name,
        user_id: user.id,
        user_external_id: user.external_id
    };

    if (message.content)
        body['content'] = message.content;
    if (message.attachment)
        body['attachment'] = message.attachment;
    if (sender_name)
        body['sender_name'] = sender_name;    

    return es.create({
        index,
        type,
        id: message.id,
        body
    }).then(res => {
        winston.debug(`Successfully indexed message with id: ${res._id}`);
        return true;
    }).catch(err => {
        winston.error(`Failed indexing message: ${err}`);
        return false;
    });
};

module.exports = {
    indexMessage    
};