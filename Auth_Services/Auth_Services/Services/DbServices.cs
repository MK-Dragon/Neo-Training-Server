// DbServices.cs

using Auth_Services.ModelRequests;
using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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

        Users:
            User by ID: "user_{userId}"
            User by Username: "user_{username}"
            User by E-Mail: "user_{email}"
            All Users: "all_users"

        Roles:
            all_roles
         */


        // Shared Queries
        private const string GET_USER_QUERY = @"
        SELECT 
            u.user_id, 
            u.username, 
            u.email, 
            u.role_id, 
            r.title,
            u.pass_hash
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id"; // add WHERE clauses as needed


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


        public async Task InvalidateUserCacheAsync(User user)
        {
            // Invalidate Cache for this user and All Users list
            await InvalidateCacheKeyAsync($"user_{user.Username}");
            await InvalidateCacheKeyAsync($"user_{user.Email}");
            await InvalidateCacheKeyAsync($"user_{user.Id}"); 
            await InvalidateCacheKeyAsync($"all_users");
            await InvalidateCacheKeyAsync($"all_app_users"); 
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





        // Get all Users (full info)
        public async Task<List<User>> GetAllUsers() // testing method
        {
            // Try Redis first
            string cacheKey = $"all_users";

            List<User> user = await GetCachedItemAsync<List<User>>(cacheKey);
            if (user != null)
            {
                Console.WriteLine($"\tCache HIT for key: {cacheKey}");
                return user;
            }
            else
            {
                Console.WriteLine($"\tCache MISS for key: {cacheKey}");
            }

            // go to DB
            try
            {
                var users = await GetDataAsync<User>(
                    //"SELECT user_id, username, email, role_id FROM users",
                    GET_USER_QUERY,
                    reader => new User
                    {
                        Id = reader.GetInt32(0),
                        Username = reader.GetString(1),
                        Email = reader.GetString(2),
                        RoleId = reader.GetInt32(3),
                        Role = reader.GetString(4),
                    }
                );

                // Update Cache
                if (users.Count != 0)
                {
                    await SetCachedItemAsync(cacheKey, users, DefaultCacheExpiration);
                    Console.WriteLine($"\tCaching for key: {cacheKey}");
                }
                return users;
            }
            catch
            {
                Console.WriteLine($"\n\n** Get All Users failed - Connection failed");
                return new List<User>();
            }

        }

        // Get all APP Users (limited info)
        public async Task<List<AppUser>> GetAllAppUsers() // testing method
        {
            // Try Redis first
            string cacheKey = $"all_app_users";

            List<AppUser> user = await GetCachedItemAsync<List<AppUser>>(cacheKey);
            if (user != null)
            {
                Console.WriteLine($"\tCache HIT for key: {cacheKey}");
                return user;
            }
            else
            {
                Console.WriteLine($"\tCache MISS for key: {cacheKey}");
            }

            // go to DB
            try
            {
                var users = await GetDataAsync<AppUser>(
                    //"SELECT user_id, username, email, role_id FROM users",
                    GET_USER_QUERY,
                    reader => new AppUser
                    {
                        Id = reader.GetInt32(0),
                        Username = reader.GetString(1),
                        Email = reader.GetString(2),
                        //RoleId = reader.GetInt32(3),
                        Role = reader.GetString(4),
                    }
                );

                // Update Cache
                if (users.Count != 0)
                {
                    await SetCachedItemAsync(cacheKey, users, DefaultCacheExpiration);
                    Console.WriteLine($"\tCaching for key: {cacheKey}");
                }
                return users;
            }
            catch
            {
                Console.WriteLine($"\n\n** Get All Users failed - Connection failed");
                return new List<AppUser>();
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
                        Username = user_login.Username
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
                    new MySqlParameter("@Activated", '1'),
                    new MySqlParameter("@BirthDate", user.BirthDate.Date)
                    //new MySqlParameter("@provider", user.Provider)
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
                string query = $@"
        {GET_USER_QUERY}
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
                        Username = reader.GetString(1),
                        Email = reader.GetString(2),
                        RoleId = reader.GetInt32(3),
                        Role = reader.GetString(4),
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


        // GET User By Id Method
        public async Task<User> GetUserById(int user_id)
        {
            // Try Redis first
            string cacheKey = $"user_{user_id}";

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
                string query = @$"
        {GET_USER_QUERY}
        WHERE user_id = @user;";

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@user", user_id)
            };

                var users = await GetDataAsync<User>(
                    query,
                    reader => new User
                    {
                        Id = reader.GetInt32(0),
                        Username = reader.GetString(1),
                        Email = reader.GetString(2),
                        Role = reader.GetString(4),
                        Password = reader.GetString(5),
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Login successful for user: {user_id}");

                    // TODO: Cache User:

                    return users[0];
                }
                else
                {
                    Console.WriteLine($"\n\n** Login failed for user: {user_id}");
                    return new User { Id = 0 };
                }
            }
            catch
            {
                Console.WriteLine($"\n\n** Login failed - Connection failed");
                return new User { Id = 0 };
            }
        }


        // GET Role IDs Method
        public async Task<Dictionary<int, string>> GetRoleIdTitle()
        {
            string cacheKey = "all_roles";

            // 1. Try Redis Cache
            var cachedRoles = await GetCachedItemAsync<Dictionary<int, string>>(cacheKey);
            if (cachedRoles != null)
            {
                return cachedRoles;
            }

            Console.WriteLine($"\tCache MISS for key: {cacheKey}");

            // 2. Prepare the dictionary to hold results from DB
            var roleDictionary = new Dictionary<int, string>();

            try
            {
                string query = "SELECT role_id, title FROM user_roles;";

                // We use a generic list/helper to execute the query
                // and fill our dictionary inside the reader loop
                await GetDataAsync<object>(
                    query,
                    reader => {
                        int id = reader.GetInt32(0);
                        string title = reader.GetString(1);
                        roleDictionary[id] = title;
                        return null; // We don't actually need the list return
                    }
                );

                if (roleDictionary.Count > 0)
                {
                    // 3. Save to Redis before returning (e.g., for 24 hours)
                    await SetCachedItemAsync(cacheKey, roleDictionary, TimeSpan.FromHours(24));
                    return roleDictionary;
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching roles: {ex.Message}");
            }

            return new Dictionary<int, string>(); // Return empty instead of null to prevent crashes
        }


        // ** Crud Methods **


        // Update User Method
        public async Task<bool> UpdateUser(User user) // invalidate ALL cache for this user
        {
            Console.WriteLine($"Edit User");
            Console.WriteLine($"> User: {user.Username}");
            Console.WriteLine($"> RoleID: {user.RoleId}");
            Console.WriteLine($"> Role: {user.Role}");
            Console.WriteLine($"> Email: {user.Email}");

            Dictionary<int, string> roles = await GetRoleIdTitle();

            // Validate and Get Role if Exists
            try
            {
                user.RoleId = roles.FirstOrDefault(x => x.Value == user.Role).Key;
            }
            catch (Exception ex)
            { 
                Console.WriteLine("Update failed: invalid Role " + ex.Message);
                return false;
            }

            try
            {
                
                string query = @"
        UPDATE users SET username = @userName, role_id = @roleId, pass_hash = @pass, email = @eMail WHERE (user_id = @userId);";

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@userName", user.Username), // for debug
                new MySqlParameter("@roleId", user.RoleId),
                new MySqlParameter("@pass", user.Password),
                new MySqlParameter("@eMail", user.Email), // for debug
                new MySqlParameter("@userId", user.Id) // for debug
            };

                int result = await ExecuteNonQueryAsync(query, parameters);

                if (result == 0)
                {
                    Console.WriteLine("Update failed: No user found with that ID/Username.");
                    return false;
                }

                // invalidate ALL cache for this user
                await InvalidateUserCacheAsync(user);

                Console.WriteLine($"User {user.Username} updated! (result: {result})");
                return true;
            }
            catch
            {
                Console.WriteLine($"\n\n** Update User failed - Connection failed");
                return false;
            }

        }

        // DELETE User Method
        public async Task<bool> DeleteUser(User user) // invalidate ALL cache for this user
        {
            Console.WriteLine($"DEELETE User");
            Console.WriteLine($"> User: {user.Username}");
            Console.WriteLine($"> RoleID: {user.RoleId}");
            Console.WriteLine($"> Role: {user.Role}");
            Console.WriteLine($"> Email: {user.Email}");

            try
            {

                string query = @"
        DELETE FROM users 
        WHERE user_id = @userId;";

                // Create the parameters safely
                var parameters = new[]
                {
                    new MySqlParameter("@userId", user.Id) // for debug
                };

                int result = await ExecuteNonQueryAsync(query, parameters);

                if (result == 0)
                {
                    Console.WriteLine("DELETE failed: No user found with that ID.");
                    return false;
                }

                // invalidate ALL cache for this user
                await InvalidateUserCacheAsync(user);

                Console.WriteLine($"User {user.Username} DELETED! (result: {result})");
                return true;
            }
            catch
            {
                Console.WriteLine($"\n\n** DELETE User failed - Connection failed");
                return false;
            }

        }




    }
}
