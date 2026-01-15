// DbServices.cs

using Auth_Services.ModelRequests;
using Auth_Services.Models;
using Auth_Services.Services;
using MySqlConnector;
using StackExchange.Redis;
using System;
using System.Collections.Generic;
using System.Data;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Threading.Tasks;
using static System.Runtime.InteropServices.JavaScript.JSType;
using static System.String;

namespace Auth_Services.Services
{
    public class DbServices
    {
        // MySQL Connection Details
        private string ServerIP = "localhost";
        private int Port = 3306;
        private string DB = "YOUR-DATABASE";
        private string User = "USER";
        private string Pass = "PASSWORD";

        private MySqlConnectionStringBuilder Builder;

        // Redis Connection Details
        private int RedisPort = 6379;
        private string RedisIp = "localhost";
        private readonly IDatabase _redisDb;
        private readonly ConnectionMultiplexer _redis;
        private string RedisConnectionString = "localhost:6379,allowAdmin=true";
        private readonly TimeSpan DefaultCacheExpiration = TimeSpan.FromMinutes(1);

        /*
        Redis Cache Keys:

        (none for now)
         */


        public DbServices(string server, int port, string db, string user, string pass, string redisIp, int redisPort)
        {
            // MySQL
            ServerIP = server;
            Port = port;
            DB = db;
            User = user;
            Pass = pass;

            Builder = new MySqlConnectionStringBuilder
            {
                Server = this.ServerIP,
                Port = (uint)this.Port,
                Database = this.DB,
                UserID = this.User,
                Password = this.Pass,
                SslMode = MySqlSslMode.Required,
            };

            // Redis
            RedisPort = redisPort;
            RedisIp = redisIp;
            RedisConnectionString = $"{RedisIp}:{RedisPort},allowAdmin=true";


            try
            {
                _redis = ConnectionMultiplexer.Connect(RedisConnectionString);
                _redisDb = _redis.GetDatabase();
                Console.WriteLine("Redis connection established successfully.");
            }
            catch (Exception ex)
            {
                // Handle or log the error if Redis connection fails
                Console.WriteLine($"Failed to connect to Redis: {ex.Message}");
            }
        }



        // --- Helper Methods for Redis ---

        // Retrieves a cached item from Redis.
        public async Task<T> GetCachedItemAsync<T>(string key) where T : class
        {
            try
            {
                if (_redisDb == null) return null;

                var cachedValue = await _redisDb.StringGetAsync(key);
                if (cachedValue.IsNullOrEmpty)
                {
                    return null; // Cache miss
                }

                // Deserialize the JSON string back into the object type T
                return JsonSerializer.Deserialize<T>(cachedValue!)!;
            }
            catch (Exception)
            {
                return null;
            }

        }

        // Sets an item in Redis with an expiration time.
        public async Task SetCachedItemAsync<T>(string key, T item, TimeSpan? expiry = null)
        {
            try
            {
                if (_redisDb == null) return;

                // Default expiration: 5 minutes (adjust as needed)
                var expiration = expiry ?? TimeSpan.FromMinutes(5);

                // Serialize the object to a JSON string
                var jsonValue = JsonSerializer.Serialize(item);

                await _redisDb.StringSetAsync(key, jsonValue, expiration);
            }
            catch (Exception)
            {
                return;
            }
        }

        // Removes a key from Redis.
        public async Task InvalidateCacheKeyAsync(string key)
        {
            try
            {
                if (_redisDb == null) return;
                await _redisDb.KeyDeleteAsync(key);
            }
            catch (Exception)
            {
                return;
            }
        }



        // Generic methods:
        public async Task<List<T>> GetDataAsync<T>(
            string query,
            Func<MySqlDataReader, T> mapFunction,
            params MySqlParameter[] parameters) // Added params array
        {
            var results = new List<T>();

            // ... Connection string builder logic stays the same ...

            using (var conn = new MySqlConnection(Builder.ConnectionString))
            {
                await conn.OpenAsync();
                using (var command = new MySqlCommand(query, conn))
                {
                    // Attach parameters to the command if they exist
                    if (parameters != null)
                    {
                        command.Parameters.AddRange(parameters);
                    }

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            results.Add(mapFunction((MySqlDataReader)reader));
                        }
                    }
                }
            }
            return results;
        }

        public async Task<int> ExecuteNonQueryAsync(string query, params MySqlParameter[] parameters)
        {
            // ... Connection string builder logic (same as before) ...

            using (var conn = new MySqlConnection(Builder.ConnectionString))
            {
                await conn.OpenAsync();

                using (var command = new MySqlCommand(query, conn))
                {
                    if (parameters != null)
                    {
                        command.Parameters.AddRange(parameters);
                    }

                    // Returns the number of rows affected
                    return await command.ExecuteNonQueryAsync();
                }
            }
        }


        // Testing method to get all users
        public async Task getAllUsers() // testing method
        {
            var users = await GetDataAsync<User>(
                "SELECT user_id, username FROM users;",
                reader => new User
                {
                    Id = reader.GetInt32(0),
                    Username = reader.GetString(1)
                }
            );
            Console.WriteLine("\n\n** Reading results:");
            foreach (var user in users)
            {
                Console.WriteLine($"\t{user.Id}: {user.Username}");
            }
        }


        // Login Method
        public async Task<User> LoginUser(LoginRequest user_login)
        {
            // Try Redis first
            string cacheKey = $"user_{user_login.Username}";

            User user = await GetCachedItemAsync<User>(cacheKey);
            if (user != null)
            {
                Console.WriteLine($"\tCache HIT for key: {cacheKey}");
                if (user.Password == user_login.Password)
                {
                    return user; // Cache HIT: Return data from Redis
                }
                else
                {
                    return new User { Id = 0 }; // Password mismatch
                }
            }
            else
            {
                Console.WriteLine($"\tCache MISS for key: {cacheKey}");
            }

            // go to DB
            try
            {
                string query = @"
        SELECT user_id, activeted, email
        FROM users
        WHERE username = @user AND pass_hash = @pass;";

                user_login.Password = DEncript.EncryptString(user_login.Password);

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@user", user_login.Username),
                new MySqlParameter("@pass", user_login.Password)
            };

                var users = await GetDataAsync<User>(
                    query,
                    reader => new User
                    {
                        Id = reader.GetInt32(0),
                        Activated = reader.GetInt32(1),
                        Email = reader.GetString(2),
                        Username = user_login.Password
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Login successful for user: {user_login.Username}");

                    // TODO: Cache User:

                    return users[0];
                }
                else
                {
                    Console.WriteLine($"\n\n** Login failed for user: {user_login.Username}");
                    return new User { Id = 0 };
                }
            }
            catch
            {
                Console.WriteLine($"\n\n** Login failed - Connection failed");
                return new User { Id = 0 };
            }
            
        }

        // Add Login Entry
        public async Task<int> AddLoginEntry(User user, string platform, string ipAddress)
        {
            try
            {
                string sql = @"INSERT INTO audit (user_id, token, created_at, expires_at, platform, ip_address) 
                       VALUES (@userId, @token, @created, @expires, @platform, @ip);";

                var parameters = new[]
                {
                    new MySqlParameter("@userId", user.Id),
                    new MySqlParameter("@token", user.Token ?? (object)DBNull.Value),
                    new MySqlParameter("@created", user.CreatedAt),
                    new MySqlParameter("@expires", user.ExpiresAt),
                    new MySqlParameter("@platform", platform),
                    new MySqlParameter("@ip", ipAddress)
                };

                return await ExecuteNonQueryAsync(sql, parameters);
            }
            catch (Exception ex)
            {
                // Print the FULL error to the console to see the MySQL message
                Console.WriteLine("DATABASE ERROR: " + ex.ToString());
                return 0;
            }
        }



        // Token Validation Method
        public async Task<User> ValidateToken(ValidateTokenRequest user_token)
        {
            // Try Redis first
            string cacheKey = $"user_{user_token.Username}";

            User user = await GetCachedItemAsync<User>(cacheKey);
            if (user != null)
            {
                Console.WriteLine($"\tCache HIT for key: {cacheKey}");
                if (user.Token == user_token.Token)
                {
                    return user; // Cache HIT: Return data from Redis
                }
                else
                {
                    return new User { Id = 0 }; // Password mismatch
                }
            }
            else
            {
                Console.WriteLine($"\tCache MISS for key: {cacheKey}");
            }

            // go to DB
            try
            {
                string query = @"
        SELECT u.user_id, u.username, u.email, a.token, a.expires_at 
        FROM users u 
        JOIN audit a ON u.user_id = a.user_id 
        WHERE u.username = @user AND a.token = @token 
        ORDER BY a.created_at DESC LIMIT 1;";

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@user", user_token.Username),
                new MySqlParameter("@token", user_token.Token)
            };

                var users = await GetDataAsync<User>(
                    query,
                    reader => new User
                    {
                        Id = reader.GetInt32(0),
                        Username = reader.GetString(1),
                        Email = reader.GetString(2),
                        Token = reader.GetString(3),
                        ExpiresAt = reader.GetDateTime(4)
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Validation successful for user: {user_token.Username}");

                    // TODO: Cache User:

                    return users[0];
                }
                else
                {
                    Console.WriteLine($"\n\n** Validation failed for user: {user_token.Username}");
                    return new User { Id = 0 };
                }
            }
            catch
            {
                Console.WriteLine($"\n\n** Validation failed - Connection failed");
                return new User { Id = 0 };
            }

        }



        // Add/Register Account Method
        public async Task<int> AddUser(User user)
        {
            int user_exists = await CheckUsernameOrEmailExist(user.Username, user.Email);

            if (user_exists == 1)
            {
                Console.WriteLine($"\n\n** User already exists: {user.Username}");
                return -1;
            }

            try
            {
                const string sql = @"
            INSERT INTO users (username, email, pass_hash, role_id, activeted, birth_date)
            VALUES (@Username, @Email, @PassHash, @RoleId, @Activated, @BirthDate);";

                user.Password = DEncript.EncryptString(user.Password);
                var parameters = new[]
                {
                    new MySqlParameter("@Username", user.Username),
                    new MySqlParameter("@Email", user.Email),
                    new MySqlParameter("@PassHash", user.Password),
                    new MySqlParameter("@RoleId", user.RoleId),
                    new MySqlParameter("@Activated", '0'),
                    new MySqlParameter("@BirthDate", user.BirthDate.Date)
                };

                return await ExecuteNonQueryAsync(sql, parameters);
            }
            catch (Exception ex)
            {
                // Print the FULL error to the console to see the MySQL message
                Console.WriteLine("DATABASE ERROR: " + ex.ToString());
                return 0;
            }
        }


        // Check Username or Email Exist Method
        public async Task<int> CheckUsernameOrEmailExist(string username, string email)
        {
            /*
             * Exists: return 1 else return 0
             */

            // Try Redis first
            string cacheKey = $"user_{username}";

            User user = await GetCachedItemAsync<User>(cacheKey);
            if (user != null)
            {
                Console.WriteLine($"\tCache HIT for key: {cacheKey}");
                return 1;
            }
            else
            {
                Console.WriteLine($"\tCache MISS for key: {cacheKey}");
            }

            // go to DB
            try
            {
                string query = @"
        SELECT user_id
        FROM users
        WHERE username = @user OR email = @email;";

                // Create the parameters safely
                var parameters = new[]
                {
                    new MySqlParameter("@user", username),
                    new MySqlParameter("@email", email),
                };

                var users = await GetDataAsync<User>(
                    query,
                    reader => new User
                    {
                        Id = reader.GetInt32(0)
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Fond user: {username}");

                    return 1;
                }
                else
                {
                    Console.WriteLine($"\n\n** Did not Find user: {username}");
                    return 0;
                }
            }
            catch
            {
                Console.WriteLine($"\n\n** Find User by Username failed - Connection failed");
                return -1;
            }

        }


        // Activate User Account Method
        public async Task<bool> ActivateUser(string username)
        {
            try
            {
                string query = @"
        UPDATE users SET activeted = '1' WHERE (username = @userName);";

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@userName", username)
            };

                var users = await GetDataAsync<User>(
                    query,
                    reader => new User
                    {
                        Id = reader.GetInt32(0),
                        Activated = reader.GetInt32(1)
                    },
                    parameters // Pass parameters
                );

                return true;
                //Console.WriteLine($"Data from Update: {users[0]}");

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Account Activated successful for user: {username}");
                    return true;
                }
                else
                {
                    Console.WriteLine($"\n\n** Account Activating failed for user: {username}");
                    return false;
                }
            }
            catch
            {
                Console.WriteLine($"\n\n** Account Activating failed - Connection failed");
                return false;
            }

        }



        // GET User By Username Email Method
        public async Task<User> GetUserByUsernameOrEmail(string user_name_mail)
        {
            // Try Redis first
            string cacheKey = $"user_{user_name_mail}";

            User user = await GetCachedItemAsync<User>(cacheKey);
            if (user != null)
            {
                return user; // Cache HIT: Return data from Redis
            }
            else
            {
                Console.WriteLine($"\tCache MISS for key: {cacheKey}");
            }

            // go to DB
            try
            {
                string query = @"
        SELECT user_id, username, email
        FROM users
        WHERE username = @user OR email = @user;";

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@user", user_name_mail)
            };

                var users = await GetDataAsync<User>(
                    query,
                    reader => new User
                    {
                        Id = reader.GetInt32(0),
                        Username = reader.GetString(2),
                        Email = reader.GetString(2),
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Login successful for user: {user_name_mail}");

                    // TODO: Cache User:

                    return users[0];
                }
                else
                {
                    Console.WriteLine($"\n\n** Login failed for user: {user_name_mail}");
                    return new User { Id = 0 };
                }
            }
            catch
            {
                Console.WriteLine($"\n\n** Login failed - Connection failed");
                return new User { Id = 0 };
            }
        }



    }
}
