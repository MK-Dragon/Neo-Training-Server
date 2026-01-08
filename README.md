# Neo-Training-Server
Final Project for TPSI




# How to Run:
1) Start the dockers with MySQL DB and Redis DB
2) Run the Auth_Service the
3) Start the React WebSite 



# External APIs and Documentation
- ChatBot: https://www.tawk.to/

<br><br><hr><hr><br><br>

# Database Deployment

## Deploy MySQL in Docker
Links:
- https://hub.docker.com/_/mysql

Prerequesitos:
- Docker / Docker Desktop
- Previlégios Sudo

Download da Image: (main recente)
```sh
docker pull mysql
```

Criar o Conteiner:
```sh
docker run --name db_nts_mysql -e MYSQL_ROOT_PASSWORD=123 -p 3344:3306 -d mysql:latest
```
Nota:
- Nome: db_605_mysql
- User: root
- Pass: 123
- Port: 3344

Mostrar contentores no Docker:
```sh
docker ps -a
```

Start Conteiner:
```sh
docker start db_nts_mysql
```

## Deploy Redis in Docker
Links:
- https://redis.io/docs/latest/operate/oss_and_stack/install/install-stack/docker/
- https://hub.docker.com/_/redis

Download da Image: (main recente)
```sh
docker pull redis
```

Criar o Conteiner:
```sh
docker run --name db_nts_redis -p 6380:6379 -d redis:latest
```
Start Conteiner:
```sh
docker start db_nts_redis
```

<br><br><hr><hr><br><br>

