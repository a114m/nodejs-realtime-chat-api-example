Realtime Chat Task
=========
## How to start demo:
The app loads seed data of company/app/developer/user into database if database is empty.

A simple web chat client of two HTML pages one for users and the other for developers.
Both has hardcoded `user_id/developer_id, chat_id` for demo purpose, they are passed to the server through web sockets handshake query since the app doesn't neither authentication nor sessions.


### Chat:
- User route:
http://localhost:3000/user
- Developer route:
http://localhost:3000/dev


### ElasticSearch
- Index name: Chats
- ES is listening to the default port, the REST API url:
http://localhost:9200/chats/_search