// DbServices.cs

using MySqlConnector;
using Auth_Services.ModelRequests;
using Auth_Services.Models;
using StackExchange.Redis;
using System;
using System.Data;
using System.Runtime.CompilerServices;
using System.Text.Json;
using System.Threading.Tasks;
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


        public DbServices(String server, int port, String db, String user, String pass, string redisIp, int redisPort)
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
                //CacheStats = new CacheCounter(true);
            }
            catch (Exception ex)
            {
                // Handle or log the error if Redis connection fails
                Console.WriteLine($"Failed to connect to Redis: {ex.Message}");
                // You might want to make caching optional if the connection fails
                //CacheStats = new CacheCounter(false);
            }
        }

        // Test Method
        public async Task ReadDb() // Prof of Concept
        {
            // not in use
            var builder = new MySqlConnectionStringBuilder
            {
                Server = this.ServerIP,
                Port = (uint)this.Port,
                Database = this.DB,
                UserID = this.User,
                Password = this.Pass,
                SslMode = MySqlSslMode.Required,
            };

            using (var conn = new MySqlConnection(builder.ConnectionString))
            {
                Console.WriteLine("Opening connection");
                await conn.OpenAsync();

                using (var command = conn.CreateCommand())
                {
                    command.CommandText = "SELECT * FROM users;";

                    using (var reader = await command.ExecuteReaderAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            Console.WriteLine(string.Format(
                                "Reading from table=({0}, {1})",
                                reader.GetInt32(0),
                                reader.GetString(1)
                                ));
                        }
                    }
                }

                Console.WriteLine("Closing connection");
            }

            Console.WriteLine("Read DB - Press RETURN to exit");
        }



        /*



        // --- Helper Methods for Redis ---

        // Retrieves a cached item from Redis.
        private async Task<T> GetCachedItemAsync<T>(string key) where T : class
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
        private async Task SetCachedItemAsync<T>(string key, T item, TimeSpan? expiry = null)
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
        private async Task InvalidateCacheKeyAsync(string key)
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



        // Login Method

        public async Task<bool> ValidateLogin(LoginRequest user)
        {
            // Define the SQL query 
            const string sqlQuery = "SELECT COUNT(*) FROM users WHERE Username = @username AND Password = @password;";

            Console.WriteLine("** Opening connection - ValidateLogin **");
            bool loginOk = false;

            try
            {
                await using (var conn = new MySqlConnection(Builder.ConnectionString))
                {
                    await conn.OpenAsync();

                    await using (var command = conn.CreateCommand())
                    {
                        command.CommandText = sqlQuery;

                        // Add parameters to prevent SQL Injection
                        command.Parameters.AddWithValue("@username", user.Username);
                        command.Parameters.AddWithValue("@password", DEncript.EncryptString(user.Password));

                        // ExecuteScalarAsync is best for retrieving a single value (like COUNT)
                        // It returns the first column of the first row (or null if no rows)
                        var result = await command.ExecuteScalarAsync();

                        // Check the result. If a matching row was found, COUNT(*) will be 1.
                        // We use pattern matching (C# 9+) for clean type and null check
                        if (result is long count && count > 0)
                        {
                            loginOk = true;
                            Console.WriteLine($"\tLogin successful for user: {user.Username}");
                        }
                        else
                        {
                            Console.WriteLine($"\tLogin failed for user: {user.Username}. No matching record found.");
                        }
                    }
                    Console.WriteLine("** Closing connection **");
                }
                return loginOk;
            }
            catch (Exception ex)
            {
                // 6. Log the exception details for debugging, but don't expose them to the user.
                Console.WriteLine($"\tAn error occurred during login validation: {ex.Message}");

                // In case of any database error, treat it as a failed login attempt.
                return false;
            }
        }

        public async Task<bool> ValidateToken(string username, string token)
        {
            Console.WriteLine("** Opening connection - ValidateToken **");
            try
            { 
                User user = await GetUserByUsername(username);

                if (user == null)
                {
                    Console.WriteLine("\tUser not found.");
                    return false;
                }

                if (user.Token != token)
                {
                    Console.WriteLine("\tToken mismatch.");
                    return false;
                }
                if (user.ExpiresAt == null || user.ExpiresAt < DateTime.UtcNow)
                {
                    Console.WriteLine("\tToken expired.");
                    return false;
                }

                return true;
            }
            catch (Exception)
            {
                Console.WriteLine("\tError?!.");
                return false;
            }
        }

        public async Task<bool> InvalidateToken(User user) // logout
        {
            Console.WriteLine("** Opening connection - InvalidateToken **");
            try
            {
                user.Token = null;
                user.ExpiresAt = DateTime.UtcNow;
                await UpdateUserToken(user);

                try
                {
                    string cacheKey = $"user_${user.Username}";
                    await InvalidateCacheKeyAsync(cacheKey);
                    Console.WriteLine($"\tInvalidated cache for key: {cacheKey}");
                }
                catch (Exception)
                {
                    // Ignore cache invalidation errors
                }

                    return true;
            }
            catch (Exception)
            {
                return false;
            }
        }
        
        */


    }
}
