# Neo-Training-Server
Final Project for TPSI




# How to Run:
1) Start the dockers with MySQL DB and Redis DB
2) Run the Auth_Service the
3) Start the React WebSite 

### Note: <br>
You will need to create a .env file with this format:

```env
VITE_GOOGLE_CLIENT_ID=909847643981-[code from google].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[secrete code from google]
VITE_IP_PORT_AUTH_SERVER=https://[C#'s IP]:[C#'s Port]
```
<br>
You will also need to create or edit the MySettings.json file at Auth_Services\Auth_Services\MySettings.json:

```env
{
  "UserDb": "MySQL username",
  "PassDb": "MySQL passwod",
  "IpDb": "MySQL IP",
  "PortDb": MySQL Port (int),
  "IpRedis": "Redis IP",
  "PortRedis": Redis port (int),
  "MailServer": "[Your Mail]@gmail.com",
  "MailKey": "[gmail mail key]"
}
```

<br><br><hr><hr><br><br>

# External APIs and Documentation
- ChatBot: https://www.tawk.to/

# External Libreries
QuestPDF: https://www.questpdf.com/invoice-tutorial.html

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

