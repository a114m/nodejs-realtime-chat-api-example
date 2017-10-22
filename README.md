Realtime Chat Example
=========

This is a demo in `NodeJS` of real time chat service using `socket.io` as websocket, stores messages in `mysql` and index them in `elasticsearch`.

It fulfills the following usecase for a company that provides mobile apps bugs tracking/reporting as a service for other companies, and they provice real time chat service for these companies' apps to connect app users with developers work for the company own the app:
```
We have companies, each company has many applications, each application receive bug reports, crash reports and has an in-app chats.
A company also has many developers (those people who work in the company) and company’s applications has many users (those people who use the application).
This task will be concerned about the in-app chats

- A developer can start a chat with a user.
- A developer starts the chat with the first message (same api call).
- Messages are received on both ends (from/to developer, to/from user) in real time.
- Every chat within an application has a unique number starting from 1.
- Every message within a chat has a unique number starting from 1.
- A message has an optional attachment.
- Chats/messages are stored in mysql and indexed in elasticsearch. We need to be able to search chats using terms from the chats body.
```

**Important**:
This is project is meant to be just example of integrating services and is not suitable for production use, it doesn't follow best practices and not performance wise (for example it loads message history from mysql hitting 5 tables, while it's index in elasticsearch!)

### Installation
All you need is `docker daemon` and `docker-compose` installed on your system based on your OS/distro then:

```
# in the project root
$ docker-compose up
```
Hola! all services are up and running

**Make sure you don't already daemons for mysql/elasticsearch listening locally on default port that will definitely conflict with docker exposed ports*


### How demo works:
The app loads seed data of the models company, app, developer, user into database.

For demo purpose, a simple web client of two HTML pages is made, one for users and the other for developers.
Both have hardcoded `user_id, developer_id, chat_id`, they are passed to the server through web sockets handshake query since the app doesn't have authentication nor sessions.

The app uses the parameters passed by the client to identify the clients and load their chat history, send their new messages to the other connected clients on the same chat, add the new messages to chat history in mysql and index them in elasticsearch.


### Chat demo
- User route:
http://localhost:3000/user
- Developer route:
http://localhost:3000/dev


### ElasticSearch
- Index name: `chats`
- ES is listening to the default port, to check the messages stored in elasticsearch:
http://localhost:9200/chats/_search

### ERD and Database schema
- ERD:
![](/model_erd.png)
- MySQL Schema:
![](/model_schema.png)
