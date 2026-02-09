// DbServices.cs

using Auth_Services.DTOs;
using Auth_Services.ModelRequests;
using Auth_Services.Models;
using Auth_Services.Services;
using Google.Apis.Util;
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
            User Profile by Username: "user_profile_{username}"
            All Users: "all_users"

        Roles:
            all_roles

        Courses:
            all_couses

        Modules:
            all_modules
            $"module_{module_name}"
         */



        // Shared Queries

        // User Query Template

        private const string GET_USER_QUERY = @"
        SELECT 
            u.user_id, 
            u.username, 
            u.email, 
            u.role_id, 
            r.title,
            u.isDeleted,
            u.pass_hash,
            u.activeted
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id"; // add WHERE clauses as needed

        private const string GET_USER_PROFILE_QUERY = @"
        SELECT 
            u.user_id, 
            u.username, 
            u.email, 
            r.title
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id"; // TODO: Add course and additional profile fields as needed

        // Course Query Template

        private const string GET_COURSES_QUERY = @"
        SELECT 
            id_cursos, 
            nome_curso, 
            duration, 
            level
        FROM courses"; // TODO: Add course and additional profile fields as needed


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
                //Console.WriteLine("Redis connection established successfully.");
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


        // Auto Invalidate Multiple Cache Keys:

        public async Task InvalidateUserCacheAsync(User user)
        {
            // Invalidate Cache for this user and All Users list
            await InvalidateCacheKeyAsync($"user_{user.Username}");
            await InvalidateCacheKeyAsync($"user_{user.Email}");
            await InvalidateCacheKeyAsync($"user_{user.Id}");

            await InvalidateCacheKeyAsync($"user_profile_{user.Username}");

            await InvalidateCacheKeyAsync($"all_users");
            await InvalidateCacheKeyAsync($"all_app_users"); // profile (no pass or tokens)
        }


        public async Task InvalidateModulesCacheAsync(Module module)
        {
            // Invalidate Cache for this user and All Users list
            await InvalidateCacheKeyAsync($"module_{module.Name}");
            await InvalidateCacheKeyAsync($"module_{module.Id}");

            await InvalidateCacheKeyAsync($"all_modules");
        }

        public async Task InvalidateCousesCacheAsync(Course course)
        {
            // Invalidate Cache for this user and All Users list
            //await InvalidateCacheKeyAsync($"module_{module.Name}");
            //await InvalidateCacheKeyAsync($"module_{module.Id}");

            await InvalidateCacheKeyAsync($"all_couses");
        }

        // Helper method to keep the mapping DRY (Don't Repeat Yourself) TODO: refector the rest of the db reads later
        private Sala MapSala(MySqlDataReader reader)
        {
            return new Sala
            {
                Id = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
                Nome = reader.IsDBNull(1) ? "" : reader.GetString(1),
                TemPcs = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                TemOficina = reader.IsDBNull(3) ? 0 : reader.GetInt32(3),
                IsDeleted = reader.IsDBNull(4) ? 0 : reader.GetInt32(4)
            };
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
                        IsDeleted = reader.GetInt32(5),
                        Password = reader.GetString(6),
                        Activated = reader.GetInt32(7),
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
                        IsDeleted = reader.GetInt32(5),
                        //Password = reader.GetString(6),
                        Activated = reader.GetInt32(7),
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

        public async Task<AppUser> GetAppUserByUsernameOrEmail(string user_name_mail)
        {
            // Try Redis first
            string cacheKey = $"user_profile_{user_name_mail}";

            AppUser user = await GetCachedItemAsync<AppUser>(cacheKey);
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
        WHERE u.username = @user OR u.email = @user;";

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@user", user_name_mail)
            };

                var users = await GetDataAsync<AppUser>(
                    query,
                    reader => new AppUser
                    {
                        Id = reader.GetInt32(0),
                        Username = reader.GetString(1),
                        Email = reader.GetString(2),
                        //RoleId = reader.GetInt32(3),
                        Role = reader.GetString(4),
                        IsDeleted = reader.GetInt32(5),
                        //Password = reader.GetString(6),
                        Activated = reader.GetInt32(7),
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Login successful for user: {user_name_mail}");

                    // Cache User:
                    await SetCachedItemAsync(cacheKey, users[0], DefaultCacheExpiration);

                    return users[0];
                }
                else
                {
                    Console.WriteLine($"\n\n** Login failed for user: {user_name_mail}");
                    return new AppUser { Id = 0 };
                }
            }
            catch
            {
                Console.WriteLine($"\n\n** Login failed - Connection failed");
                return new AppUser { Id = 0 };
            }
        }



        // Login Method
        public async Task<User> LoginUser(LoginRequest user_login)
        {
            user_login.Password = DEncript.EncryptString(user_login.Password);

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
                Console.WriteLine($"Login find User: {user_login.Username}");

                string query = $@"
        {GET_USER_QUERY} WHERE u.username = @user AND u.pass_hash = @pass;";

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
                        Username = reader.GetString(1),
                        Email = reader.GetString(2),
                        RoleId = reader.GetInt32(3),
                        Role = reader.GetString(4),
                        IsDeleted = reader.GetInt32(5),
                        Password = reader.GetString(6),
                        Activated = reader.GetInt32(7),
                    },
                    parameters // Pass parameters
                );
                //Console.WriteLine($"User fond: {users[0].Id}");

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Login successful for user: {user_login.Username}");

                    // Cache User:
                    await SetCachedItemAsync(cacheKey, users[0], DefaultCacheExpiration);

                    return users[0];
                }
                else
                {
                    Console.WriteLine($"\n\n** Login failed for user: {user_login.Username}");
                    return new User { Id = 0 };
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n\n** Login failed - Connection failed - ex: {ex}");
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

                    // Cache User:
                    await SetCachedItemAsync(cacheKey, users[0], DefaultCacheExpiration);

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
                        IsDeleted = reader.GetInt32(5),
                        Password = reader.GetString(6),
                        Activated = reader.GetInt32(7),
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Login successful for user: {user_name_mail}");

                    // Cache User:
                    await SetCachedItemAsync(cacheKey, users[0], DefaultCacheExpiration);

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
                        RoleId = reader.GetInt32(3),
                        Role = reader.GetString(4),
                        IsDeleted = reader.GetInt32(5),
                        Password = reader.GetString(6),
                        Activated = reader.GetInt32(7),
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Login successful for user: {user_id}");

                    // Cache User:
                    await SetCachedItemAsync(cacheKey, users[0], DefaultCacheExpiration);

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

            // Validate Delete/Undelete User:
            if (user.IsDeleted != 0 && user.IsDeleted != 1)
            {
                Console.WriteLine("Update failed: invalid IsDeleted value");
                return false;
            }

            try
            {
                
                string query = @"
        UPDATE users SET
            username = @userName,
            email = @eMail,
            role_id = @roleId,
            pass_hash = @pass,
            isDeleted = @isDeleted
        WHERE (user_id = @userId);";

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@userName", user.Username),
                new MySqlParameter("@roleId", user.RoleId),
                new MySqlParameter("@pass", user.Password),
                new MySqlParameter("@eMail", user.Email), 
                new MySqlParameter("@userId", user.Id), 
                new MySqlParameter("@isDeleted", user.IsDeleted) 
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


        // GET User Profile By Username Method (rip ??)
        public async Task<UserProfile> GetUserProfileByUsername(string username)
        {
            // Try Redis first
            string cacheKey = $"user_profile_{username}";

            UserProfile user = await GetCachedItemAsync<UserProfile>(cacheKey);
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
        {GET_USER_PROFILE_QUERY}
        WHERE username = @user;";

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@user", username)
            };

                var users = await GetDataAsync<UserProfile>(
                    query,
                    reader => new UserProfile
                    {
                        Id = reader.GetInt32(0),
                        Username = reader.GetString(1),
                        Email = reader.GetString(2),
                        Role = reader.GetString(3),
                        // TODO: add date of birth
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (users.Count > 0)
                {
                    Console.WriteLine($"\n\n** Login successful for user: {username}");

                    // Cache User:
                    await SetCachedItemAsync(cacheKey, users[0], DefaultCacheExpiration);

                    return users[0];
                }
                else
                {
                    Console.WriteLine($"\n\n** Login failed for user: {username}");
                    return new UserProfile { Id = 0 };
                }
            }
            catch
            {
                Console.WriteLine($"\n\n** Login failed - Connection failed");
                return new UserProfile { Id = 0 };
            }
        }



        // ** User Profiles **

        // Student
        public async Task<StudentProfileDTO> GetStudentProfile(int userId)
        {
            try
            {
                const string query = @"
            SELECT 
                u.username AS Username,
                u.email AS Email,
                u.birth_date AS BirthDate,
                t.turma_id AS TurmaId,
                t.turma_name AS TurmaName,
                t.date_start AS StartDate,
                t.date_end AS EndDate,
                c.nome_curso AS CourseName,
                c.duration AS Duration,
                c.level AS Level
            FROM users u
            LEFT JOIN enrollments e ON u.user_id = e.student_id AND e.isDeleted = 0
            LEFT JOIN turmas t ON e.turma_id = t.turma_id AND t.isDeleted = 0
            LEFT JOIN courses c ON t.course_id = c.id_cursos
            WHERE u.user_id = @userId 
              AND u.isDeleted = 0
            ORDER BY t.date_start DESC
            LIMIT 1;";

                var parameters = new[] { new MySqlParameter("@userId", userId) };

                var results = await GetDataAsync<StudentProfileDTO>(query, reader => new StudentProfileDTO
                {
                    Username = reader["Username"].ToString(),
                    Email = reader["Email"].ToString(),
                    BirthDate = reader["BirthDate"] != DBNull.Value ? Convert.ToDateTime(reader["BirthDate"]) : null,
                    TurmaId = reader["TurmaId"] != DBNull.Value ? Convert.ToInt32(reader["TurmaId"]) : null,
                    TurmaName = reader["TurmaName"]?.ToString(),
                    StartDate = reader["StartDate"] != DBNull.Value ? Convert.ToDateTime(reader["StartDate"]) : null,
                    EndDate = reader["EndDate"] != DBNull.Value ? Convert.ToDateTime(reader["EndDate"]) : null,
                    CourseName = reader["CourseName"]?.ToString(),
                    Duration = reader["Duration"] != DBNull.Value ? Convert.ToInt32(reader["Duration"]) : 0,
                    Level = reader["Level"]?.ToString()
                }, parameters);

                return results.FirstOrDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching student profile: {ex.Message}");
                return null;
            }
        }

        // Teacher
        public async Task<TeacherProfileDTO> GetTeacherProfile(int userId)
        {
            try
            {
                const string query = @"
            SELECT 
                u.username AS Username,
                u.email AS Email,
                u.birth_date AS BirthDate,
                (SELECT COUNT(*) 
                 FROM schedules s 
                 WHERE s.formador_id = u.user_id 
                 AND s.date_time <= NOW()) AS ClassesTaughtCount
            FROM users u
            INNER JOIN user_roles r ON u.role_id = r.role_id
            WHERE u.user_id = @userId 
              AND r.title = 'teacher' 
              AND u.isDeleted = 0;";

                var parameters = new[] { new MySqlParameter("@userId", userId) };

                var results = await GetDataAsync<TeacherProfileDTO>(query, reader => new TeacherProfileDTO
                {
                    Username = reader["Username"].ToString(),
                    Email = reader["Email"].ToString(),
                    BirthDate = reader["BirthDate"] != DBNull.Value ? Convert.ToDateTime(reader["BirthDate"]) : null,
                    ClassesTaughtCount = Convert.ToInt32(reader["ClassesTaughtCount"])
                }, parameters);

                return results.FirstOrDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching teacher profile: {ex.Message}");
                return null;
            }
        }




        // ** Modules **


        // GET Module By Name Method
        public async Task<Module> GetModuleByName(string module_name)
        {
            // Try Redis first
            string cacheKey = $"module_{module_name}";

            Module module = await GetCachedItemAsync<Module>(cacheKey);
            if (module != null)
            {
                return module; // Cache HIT: Return data from Redis
            }
            else
            {
                Console.WriteLine($"\tCache MISS for key: {cacheKey}");
            }

            // go to DB
            try
            {
                string query = $@"
        SELECT * FROM modules
        WHERE name = @module;";

                // Create the parameters safely
                var parameters = new[]
                {
                new MySqlParameter("@module", module_name)
            };

                var modules = await GetDataAsync<Module>(
                    query,
                    reader => new Module
                    {
                        Id = reader.GetInt32(0),
                        Name = reader.GetString(1),
                        DurationInHours = reader.GetInt32(2),
                        isDeleted = reader.GetInt32(3),
                    },
                    parameters // Pass parameters
                );

                // Process results...
                if (modules.Count > 0)
                {
                    Console.WriteLine($"\n\n** Module Found: {module_name}");

                    // Cache Module:
                    await SetCachedItemAsync(cacheKey, modules[0], DefaultCacheExpiration);

                    return modules[0];
                }
                else
                {
                    Console.WriteLine($"\n\n** Failed to find Module: {module_name}");
                    return new Module { Id = 0 };
                }
            }
            catch
            {
                Console.WriteLine($"\n\n** Failed to find Module - Connection failed");
                return new Module { Id = 0 };
            }
        }

        // GET Module By Name Method
        public async Task<List<Module>> GetAllModules()
        {
            // Try Redis first
            string cacheKey = $"all_module";

            List<Module> modules = await GetCachedItemAsync<List<Module>>(cacheKey);
            if (modules != null)
            {
                return modules; // Cache HIT: Return data from Redis
            }
            else
            {
                Console.WriteLine($"\tCache MISS for key: {cacheKey}");
            }

            // go to DB
            try
            {
                string query = $@"
        SELECT * FROM modules;";

                // Create the parameters safely

                var module = await GetDataAsync<Module>(
                    query,
                    reader => new Module
                    {
                        Id = reader.GetInt32(0),
                        Name = reader.GetString(1),
                        DurationInHours = reader.GetInt32(2),
                        isDeleted = reader.GetInt32(3),
                    }
                );

                // Process results...
                if (module.Count != 0)
                {
                    // Cache Module:
                    await SetCachedItemAsync(cacheKey, modules, DefaultCacheExpiration);
                    Console.WriteLine($"\tCaching for key: {cacheKey}");
                }
                return module;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n\n** Failed to Gell All Modules - Connection failed {ex}");
                return new List<Module>();
            }
        }

        public async Task<Module> GetModuleById(int moduleId) // TODO: TEST THIS
        {
            const string query = @"
        SELECT module_id, name, duration_h, isDeleted 
        FROM modules 
        WHERE module_id = @id AND isDeleted = 0;";

            var parameters = new[] { new MySqlParameter("@id", moduleId) };

            try
            {
                var result = await GetDataAsync<Module>(
                    query,
                    reader => new Module
                    {
                        Id = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
                        Name = reader.IsDBNull(1) ? "Unnamed" : reader.GetString(1),
                        DurationInHours = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                        isDeleted = reader.IsDBNull(3) ? 0 : reader.GetInt32(3)
                    },
                    parameters
                );

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching module by ID: {ex.Message}");
                return null;
            }
        }

        // Add Module Method
        public async Task<int> AddModule(NewModule newModule)
        {
            try
            {
                const string sql = @"
            INSERT INTO modules (name, duration_h, isDeleted)
            VALUES (@name, @duration, @isDeleted);";

                var parameters = new[]
                {
                    new MySqlParameter("@name", newModule.Name),
                    new MySqlParameter("@duration", newModule.DurationInHours),
                    new MySqlParameter("@isDeleted", "0"),
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

        public async Task<bool> UpdateModule(ModuleUpdate module)
        {
            Console.WriteLine($"Updating Module ID: {module.ModuleId}");

            try
            {
                const string query = @"
            UPDATE modules 
            SET name = @name, 
                duration_h = @duration, 
                isDeleted = @isDeleted 
            WHERE module_id = @id;";

                var parameters = new[]
                {
            new MySqlParameter("@name", module.Name),
            new MySqlParameter("@duration", module.DurationH),
            new MySqlParameter("@isDeleted", module.IsDeleted),
            new MySqlParameter("@id", module.ModuleId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);

                // Returns true if the module existed and was updated
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating module: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> DeleteModule(int moduleId)
        {
            Console.WriteLine($"Marking Module ID {moduleId} as Deleted");

            try
            {
                // SQL remains an UPDATE because it is a soft-delete
                const string query = @"UPDATE modules SET isDeleted = 1 WHERE module_id = @moduleId;";

                var parameters = new[]
                {
            new MySqlParameter("@moduleId", moduleId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);

                if (result == 0)
                {
                    Console.WriteLine($"Delete failed: No module found with ID {moduleId}.");
                    return false;
                }

                // Important: If you cache modules by ID, clear it here
                // await InvalidateModuleCacheAsync(moduleId);

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n\n** DeleteModule failed - Connection or SQL error: {ex.Message}");
                return false;
            }
        }





        // ** Courses **

        // Get all Courses (full info)
        public async Task<List<Course>> GetAllCourses() // testing method (???)
        {
            // ??
            return new List<Course>();
        }

        public async Task<Course> GetCourseWithModules(int courseId)
        {
            string query = @"
        SELECT 
            m.module_id, m.name, m.duration_h, m.isDeleted,
            c.id_cursos, c.nome_curso, c.duration, c.level, c.isDeleted
        FROM courses c
        INNER JOIN course_modules cm ON c.id_cursos = cm.course_id
        INNER JOIN modules m ON cm.module_id = m.module_id
        WHERE c.id_cursos = @courseId AND cm.isDeleted = 0;";

            var parameters = new[] { new MySqlParameter("@courseId", courseId) };

            try
            {
                // Fetching rows and mapping to a temporary Tuple
                var results = await GetDataAsync<(Module Mod, Course Crse)>(
                    query,
                    reader => (
                        new Module
                        {
                            // Column indexes: 0=module_id, 1=name, 2=duration_h, 3=isDeleted
                            Id = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
                            Name = reader.IsDBNull(1) ? "Unnamed" : reader.GetString(1),
                            DurationInHours = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                            isDeleted = reader.IsDBNull(3) ? 0 : reader.GetInt32(3)
                        },
                        new Course
                        {
                            // Column indexes: 4=id_cursos, 5=nome_curso, 6=duration, 7=level, 8=isDeleted
                            Id = reader.IsDBNull(4) ? 0 : reader.GetInt32(4),
                            Name = reader.IsDBNull(5) ? "Unnamed" : reader.GetString(5),
                            durationInHours = reader.IsDBNull(6) ? 0 : reader.GetInt32(6),
                            Level = reader.IsDBNull(7) ? "" : reader.GetString(7),
                            IsDeleted = reader.IsDBNull(8) ? 0 : reader.GetInt32(8)
                        }
                    ),
                    parameters
                );

                if (results == null || results.Count == 0) return null;

                // Take course details from the first row found
                var finalCourse = results[0].Crse;

                // Populate the Modules list from all rows
                finalCourse.Modules = results.Select(r => r.Mod).ToList();

                return finalCourse;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error in GetCourseWithModules: {ex.Message}");
                return new Course { Id = 0 };
            }
        }

        public async Task<List<Course>> GetAllCoursesSummary()
        {
            // Selecting specific columns from the 'courses' table
            string query = "SELECT id_cursos, nome_curso, duration, level, isDeleted FROM courses WHERE isDeleted = 0;";

            try
            {
                var courses = await GetDataAsync<Course>(
                    query,
                    reader => new Course
                    {
                        // Mapping using the specific column names from your SQL script
                        Id = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
                        Name = reader.IsDBNull(1) ? "Unnamed Course" : reader.GetString(1),
                        durationInHours = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                        Level = reader.IsDBNull(3) ? "N/A" : reader.GetString(3),
                        IsDeleted = reader.IsDBNull(4) ? 0 : reader.GetInt32(4)
                        // Modules list remains initialized as empty by the class constructor
                    }
                );

                return courses ?? new List<Course>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n\n** Error fetching course list: {ex.Message}");
                return new List<Course>();
            }
        }

        public async Task<int> AddCourse(NewCourse course)
        {
            try
            {
                // We force isDeleted to 0 directly in the query
                const string sql = @"
            INSERT INTO courses (nome_curso, duration, level, isDeleted) 
            VALUES (@name, @duration, @level, 0);";

                var parameters = new[]
                {
            new MySqlParameter("@name", course.Name),
            new MySqlParameter("@duration", course.DurationInHours),
            new MySqlParameter("@level", course.Level)
        };

                return await ExecuteNonQueryAsync(sql, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine("DATABASE ERROR: " + ex.Message);
                return 0;
            }
        }

        public async Task<bool> UpdateCourse(Course course)
        {
            Console.WriteLine($"Editing Course ID: {course.Id} ({course.Name})");

            try
            {
                // SQL targets id_cursos as the primary key
                const string query = @"
            UPDATE courses 
            SET nome_curso = @name, 
                duration = @duration, 
                level = @level,
                isDeleted = @isDeleted
            WHERE id_cursos = @id;";

                var parameters = new[]
                {
            new MySqlParameter("@name", course.Name),
            new MySqlParameter("@duration", course.durationInHours),
            new MySqlParameter("@level", course.Level),
            new MySqlParameter("@isDeleted", course.IsDeleted),
            new MySqlParameter("@id", course.Id)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);

                if (result == 0)
                {
                    Console.WriteLine("Update failed: No course found with that ID.");
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n\n** Update Course failed - Error: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> DeleteCourse(int courseId)
        {
            Console.WriteLine($"Soft-deleting Course ID: {courseId}");

            try
            {
                // 1. Soft delete the course itself
                const string courseQuery = "UPDATE courses SET isDeleted = 1 WHERE id_cursos = @id;";

                // 2. Soft delete all module links for this course in the junction table
                const string modulesQuery = "UPDATE course_modules SET isDeleted = 1 WHERE course_id = @id;";

                var parameters = new[] { new MySqlParameter("@id", courseId) };

                // Execute both (you could wrap these in a transaction for extra safety)
                await ExecuteNonQueryAsync(modulesQuery, parameters);
                int result = await ExecuteNonQueryAsync(courseQuery, parameters);

                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting course: {ex.Message}");
                return false;
            }
        }

        // * Courses Starting in 60 days! GetUpcomingCourses
        public async Task<List<CoursesStarting>> GetUpcomingCourses()
        {
            const string query = @"
        SELECT 
            t.turma_id AS TurmaId,
            c.id_cursos AS CourseId, 
            c.nome_curso AS CourseName, 
            c.duration AS durationInHours, 
            c.level AS Level, 
            t.date_start AS DateStart
        FROM courses c
        INNER JOIN turmas t ON c.id_cursos = t.course_id
        WHERE c.isDeleted = 0 
          AND t.isDeleted = 0 
          AND t.date_start BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 60 DAY)
        ORDER BY t.date_start ASC;";

            return await GetDataAsync<CoursesStarting>(query, reader => new CoursesStarting
            {
                TurmaId = Convert.ToInt32(reader["TurmaId"]),
                CourseId = Convert.ToInt32(reader["CourseId"]),
                CourseName = reader["CourseName"].ToString(),
                durationInHours = Convert.ToInt32(reader["durationInHours"]),
                Level = reader["Level"] != DBNull.Value ? reader["Level"].ToString() : null,
                DateStart = reader["DateStart"] != DBNull.Value ? Convert.ToDateTime(reader["DateStart"]) : (DateTime?)null
            });
        }





        // ** Course Modules **

        // Add Modules to Course in Batch
        public async Task<bool> AddModulesToCourseBatch(List<ModuleToCourse> modulesList)
        {
            if (modulesList == null || modulesList.Count == 0) return false;

            try
            {
                // Using the exact column names from your SQL script
                // We use ON DUPLICATE KEY UPDATE in case the relationship already exists but needs a new order
                const string sql = @"
            INSERT INTO course_modules (course_id, module_id, order_index, isDeleted) 
            VALUES (@courseId, @moduleId, @orderIndex, 0)
            ON DUPLICATE KEY UPDATE order_index = @orderIndex, isDeleted = 0;";

                foreach (var item in modulesList)
                {
                    var parameters = new[]
                    {
                new MySqlParameter("@courseId", item.CourseId),
                new MySqlParameter("@moduleId", item.ModuleId),
                new MySqlParameter("@orderIndex", item.OrderIndex)
            };

                    await ExecuteNonQueryAsync(sql, parameters);
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine("DATABASE ERROR (AddModulesToCourseBatch): " + ex.Message);
                return false;
            }
        }

        // Update or Add the relationship with an Order Index
        public async Task<bool> UpdateModuleOrder(ModuleToCourse data)
        {
            Console.WriteLine($"Updating Course {data.CourseId}, Module {data.ModuleId} to Index {data.OrderIndex}");

            try
            {
                // Targeting the composite key from your schema
                const string query = @"
            UPDATE course_modules 
            SET order_index = @orderIndex 
            WHERE course_id = @courseId AND module_id = @moduleId;";

                var parameters = new[]
                {
            new MySqlParameter("@orderIndex", data.OrderIndex),
            new MySqlParameter("@courseId", data.CourseId),
            new MySqlParameter("@moduleId", data.ModuleId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);

                // If result is 0, it means that specific module isn't linked to that course
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating module order: {ex.Message}");
                return false;
            }
        }

        // Soft delete a specific module from a specific course
        public async Task<bool> DeleteModuleFromCourse(int courseId, int moduleId)
        {
            Console.WriteLine($"Soft-deleting Module {moduleId} from Course {courseId}");

            try
            {
                // Targeting the composite key from your schema
                const string query = @"
            UPDATE course_modules 
            SET isDeleted = 1 
            WHERE course_id = @courseId AND module_id = @moduleId;";

                var parameters = new[]
                {
            new MySqlParameter("@courseId", courseId),
            new MySqlParameter("@moduleId", moduleId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);

                // Returns true if a row was actually updated
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error soft-deleting module-course relationship: {ex.Message}");
                return false;
            }
        }

        public async Task<List<CourseModulePlan>> GetModulesByCourseId(int courseId)
        {
            try
            {
                const string query = @"
            SELECT 
                m.module_id, 
                m.name AS module_name, 
                m.duration_h, 
                cm.order_index
            FROM course_modules cm
            INNER JOIN modules m ON cm.module_id = m.module_id
            WHERE cm.course_id = @courseId 
              AND cm.isDeleted = 0 
              AND m.isDeleted = 0
            ORDER BY cm.order_index ASC;";

                var parameters = new[] { new MySqlParameter("@courseId", courseId) };

                return await GetDataAsync<CourseModulePlan>(query, reader => new CourseModulePlan
                {
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    DurationH = reader.GetInt32("duration_h"),
                    OrderIndex = reader.GetInt32("order_index")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching modules for course {courseId}: {ex.Message}");
                return new List<CourseModulePlan>();
            }
        }




        // ** Turmas **

        public async Task<List<TurmaDTO>> GetAllActiveTurmas() // TODO: check Date today < date end
        {
            try
            {
                // Joining tables to get the course name
                const string query = @"
            SELECT t.turma_id, t.turma_name, t.course_id, c.nome_curso, t.isDeleted, t.date_start, t.date_end
            FROM turmas t
            INNER JOIN courses c ON t.course_id = c.id_cursos
            WHERE t.isDeleted = 0 
              AND c.isDeleted = 0
              AND (t.date_end IS NULL OR t.date_end >= CURDATE());";

                var turmas = await GetDataAsync<TurmaDTO>(
                    query,
                    reader => new TurmaDTO
                    {
                        TurmaId = reader.GetInt32(0),
                        TurmaName = reader.GetString(1),
                        CourseId = reader.GetInt32(2),
                        CourseName = reader.GetString(3),
                        isDeleted = reader.GetInt32(4),
                        DateStart = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                        DateEnd = reader.IsDBNull(6) ? null : reader.GetDateTime(6)
                    }
                );

                return turmas ?? new List<TurmaDTO>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching turmas: {ex.Message}");
                return new List<TurmaDTO>();
            }
        }

        public async Task<List<TurmaDTO>> GetAllTurmas()
        {
            try
            {
                // Joining tables to get the course name
                const string query = @"
        SELECT t.turma_id, t.turma_name, t.course_id, c.nome_curso, t.isDeleted, t.date_start, t.date_end
        FROM turmas t
        INNER JOIN courses c ON t.course_id = c.id_cursos;";

                var turmas = await GetDataAsync<TurmaDTO>(
                    query,
                    reader => new TurmaDTO
                    {
                        TurmaId = reader.GetInt32(0),
                        TurmaName = reader.GetString(1),
                        CourseId = reader.GetInt32(2),
                        CourseName = reader.GetString(3),
                        isDeleted = reader.GetInt32(4),
                        DateStart = reader.IsDBNull(5) ? null : reader.GetDateTime(5),
                        DateEnd = reader.IsDBNull(6) ? null : reader.GetDateTime(6)
                    }
                );

                return turmas ?? new List<TurmaDTO>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching turmas: {ex.Message}");
                return new List<TurmaDTO>();
            }
        }

        public async Task<TurmaDTO?> GetTurmaById(int turmaId)
        {
            try
            {
                const string query = @"
            SELECT 
                t.turma_id, 
                t.turma_name, 
                t.course_id, 
                c.nome_curso AS CourseName, 
                t.isDeleted, 
                t.date_start AS DateStart, 
                t.date_end AS DateEnd
            FROM turmas t
            INNER JOIN courses c ON t.course_id = c.id_cursos
            WHERE t.turma_id = @turmaId;";

                var parameters = new[]
                {
            new MySqlParameter("@turmaId", turmaId)
        };

                var result = await GetDataAsync<TurmaDTO>(query, reader => new TurmaDTO
                {
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    CourseId = reader.GetInt32("course_id"),
                    CourseName = reader.GetString("CourseName"),
                    isDeleted = reader.GetInt32("isDeleted"),
                    DateStart = reader.IsDBNull(reader.GetOrdinal("DateStart")) ? (DateTime?)null : reader.GetDateTime("DateStart"),
                    DateEnd = reader.IsDBNull(reader.GetOrdinal("DateEnd")) ? (DateTime?)null : reader.GetDateTime("DateEnd")
                }, parameters);

                return result.FirstOrDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching turma {turmaId}: {ex.Message}");
                return null;
            }
        }

        public async Task<int> AddTurma(NewTurma turma)
        {
            Console.WriteLine($"Creating Turma: {turma.TurmaName} for Course ID: {turma.CourseId}");

            try
            {
                // SQL targets turma_name and course_id per your schema
                const string sql = @"
        INSERT INTO turmas (turma_name, course_id, date_start, date_end) 
        VALUES (@name, @courseId, @start, @end);";

                var parameters = new[]
                {
                    new MySqlParameter("@name", turma.TurmaName),
                    new MySqlParameter("@courseId", turma.CourseId),
                    new MySqlParameter("@start", (object)turma.DateStart ?? DBNull.Value),
                    new MySqlParameter("@end", (object)turma.DateEnd ?? DBNull.Value)
                };

                // ExecuteNonQueryAsync returns the number of rows affected
                return await ExecuteNonQueryAsync(sql, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine("DATABASE ERROR (AddTurma): " + ex.Message);
                return 0;
            }
        }

        public async Task<bool> UpdateTurma(UpdateTurma turma)
        {
            Console.WriteLine($"Updating Turma ID {turma.TurmaId} to Name: {turma.TurmaName}");

            try
            {
                const string query = @"
            UPDATE turmas 
            SET turma_name = @name, 
                course_id = @courseId,
                date_start = @start,
                date_end = @end
            WHERE turma_id = @id;";

                var parameters = new[]
                {
                    new MySqlParameter("@name", turma.TurmaName),
                    new MySqlParameter("@courseId", turma.CourseId),
                    new MySqlParameter("@start", (object)turma.DateStart ?? DBNull.Value),
                    new MySqlParameter("@end", (object)turma.DateEnd ?? DBNull.Value),
                    new MySqlParameter("@id", turma.TurmaId)
                };

                int result = await ExecuteNonQueryAsync(query, parameters);

                // Returns true if the record was found and updated
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"UpdateTurma failed - Error: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> DeleteTurma(int turmaId)
        {
            Console.WriteLine($"Soft-deleting Turma ID: {turmaId}");

            try
            {
                // 1. Mark the Turma as deleted
                const string turmaQuery = "UPDATE turmas SET isDeleted = 1 WHERE turma_id = @id;";

                // 2. Mark all enrollments for this specific Turma as deleted
                const string enrollmentsQuery = "UPDATE enrollments SET isDeleted = 1 WHERE turma_id = @id;";

                var parameters = new[] { new MySqlParameter("@id", turmaId) };

                // Execute both to ensure data consistency
                await ExecuteNonQueryAsync(enrollmentsQuery, parameters);
                int result = await ExecuteNonQueryAsync(turmaQuery, parameters);

                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting turma: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> RecoverTurma(int turmaId)
        {
            Console.WriteLine($"Restoring Turma ID: {turmaId}");

            try
            {
                // Targets the isDeleted column we added to the turmas table
                const string query = "UPDATE turmas SET isDeleted = 0 WHERE turma_id = @id;";

                var parameters = new[]
                {
            new MySqlParameter("@id", turmaId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);

                // Returns true if the Turma was found and the status was updated
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error recovering turma: {ex.Message}");
                return false;
            }
        }



        // ** Turmas & Enrollments **

        public async Task<List<StudentInTurmaDTO>> GetStudentsByTurma(int turmaId)
        {
            try
            {
                const string query = @"
            SELECT 
                u.user_id, 
                u.username, 
                u.email, 
                u.birth_date, 
                u.isDeleted AS UserIsDeleted, 
                e.isDeleted AS EnrollmentIsDeleted
            FROM users u
            INNER JOIN enrollments e ON u.user_id = e.student_id
            WHERE e.turma_id = @turmaId;";

                var parameters = new[] { new MySqlParameter("@turmaId", turmaId) };

                return await GetDataAsync<StudentInTurmaDTO>(query, reader => new StudentInTurmaDTO
                {
                    UserId = reader.GetInt32("user_id"),
                    Username = reader.GetString("username"),
                    Email = reader.GetString("email"),
                    BirthDate = reader.IsDBNull(reader.GetOrdinal("birth_date")) ? null : reader.GetDateTime("birth_date"),
                    UserIsDeleted = reader.GetInt32("UserIsDeleted"),
                    EnrollmentIsDeleted = reader.GetInt32("EnrollmentIsDeleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching students for turma {turmaId}: {ex.Message}");
                return new List<StudentInTurmaDTO>();
            }
        }

        public async Task<List<AvailableStudentDTO>> GetUnenrolledStudents()
        {
            try
            {
                // We look for users who don't have an enrollment record with isDeleted = 0
                const string query = @"
            SELECT u.user_id, u.username, u.email, u.birth_date
            FROM users u
            LEFT JOIN enrollments e ON u.user_id = e.student_id AND e.isDeleted = 0
            WHERE u.role_id = 3 
              AND u.isDeleted = 0 
              AND e.id_enrollment IS NULL;";

                return await GetDataAsync<AvailableStudentDTO>(query, reader => new AvailableStudentDTO
                {
                    UserId = reader.GetInt32(0),
                    Username = reader.GetString(1),
                    Email = reader.GetString(2),
                    BirthDate = reader.IsDBNull(3) ? null : reader.GetDateTime(3)
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching unenrolled students: {ex.Message}");
                return new List<AvailableStudentDTO>();
            }
        }



        // ** Enrollments **

        public async Task<string> EnrollStudent(NewEnrollment enrollment)
        {
            try
            {
                // 1. First, check if the Turma has already ended
                const string checkSql = "SELECT date_end FROM turmas WHERE turma_id = @id;";
                var checkParams = new[] { new MySqlParameter("@id", enrollment.TurmaId) };

                var turmaData = await GetDataAsync<DateTime?>(checkSql,
                    reader => reader.IsDBNull(0) ? null : reader.GetDateTime(0),
                    checkParams);

                if (turmaData.Count > 0 && turmaData[0].HasValue && turmaData[0].Value < DateTime.Now)
                {
                    return "TurmaEnded"; // Business logic block
                }

                // 2. Proceed with enrollment if valid
                const string sql = @"
            INSERT INTO enrollments (student_id, turma_id, enrollment_date, isDeleted)
            SELECT u.user_id, @turmaId, CURDATE(), 0
            FROM users u
            WHERE u.user_id = @studentId AND u.role_id = 3 AND u.isDeleted = 0
            ON DUPLICATE KEY UPDATE isDeleted = 0, enrollment_date = CURDATE();";

                var parameters = new[] {
            new MySqlParameter("@studentId", enrollment.StudentId),
            new MySqlParameter("@turmaId", enrollment.TurmaId)
        };

                int result = await ExecuteNonQueryAsync(sql, parameters);
                return result > 0 ? "Success" : "InvalidRole";
            }
            catch (Exception ex)
            {
                Console.WriteLine("Enrollment Error: " + ex.Message);
                return "Error";
            }
        }

        public async Task<bool> DeleteEnrollment(int studentId, int turmaId)
        {
            Console.WriteLine($"Soft-deleting Enrollment: Student {studentId} from Turma {turmaId}");

            try
            {
                // Using the exact column names from your schema
                const string query = @"
            UPDATE enrollments 
            SET isDeleted = 1 
            WHERE student_id = @studentId AND turma_id = @turmaId;";

                var parameters = new[]
                {
            new MySqlParameter("@studentId", studentId),
            new MySqlParameter("@turmaId", turmaId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);

                // Returns true if a row was actually found and updated
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting enrollment: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> UpdateStudentTurma(UpdateEnrollment data)
        {
            Console.WriteLine($"Moving Student {data.StudentId} from Turma {data.OldTurmaId} to {data.NewTurmaId}");

            try
            {
                // SQL targets the specific enrollment relationship
                const string query = @"
            UPDATE enrollments 
            SET turma_name = @newTurmaId, 
                enrollment_date = CURDATE(),
                isDeleted = 0
            WHERE student_id = @studentId AND turma_id = @oldTurmaId;";

                var parameters = new[]
                {
            new MySqlParameter("@studentId", data.StudentId),
            new MySqlParameter("@oldTurmaId", data.OldTurmaId),
            new MySqlParameter("@newTurmaId", data.NewTurmaId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);
                return result > 0;
            }
            catch (MySqlException ex) when (ex.Number == 1062) // Duplicate entry error
            {
                Console.WriteLine("Student is already enrolled in the target Turma.");
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating enrollment: {ex.Message}");
                return false;
            }
        }

        // * turmas ready to recive students
        public async Task<List<TurmaToEnrollStudents>> GetTurmaToEnrollStudents()
        {
            try
            {
                const string query = @"
            SELECT 
                t.turma_id AS Id,
                t.turma_name AS Name,
                t.date_start AS StartDate,
                t.date_end AS EndDate,
                c.id_cursos AS CourseId,
                c.nome_curso AS CourseName,
                COUNT(e.id_enrollment) AS StudentCount
            FROM turmas t
            INNER JOIN courses c ON t.course_id = c.id_cursos
            LEFT JOIN enrollments e ON t.turma_id = e.turma_id AND e.isDeleted = 0
            WHERE t.isDeleted = 0
              AND t.date_start >= DATE_SUB(NOW(), INTERVAL 40 DAY)
              AND t.date_end > DATE_ADD(NOW(), INTERVAL 60 DAY)
            GROUP BY t.turma_id, c.id_cursos
            ORDER BY t.date_start ASC;";

                return await GetDataAsync<TurmaToEnrollStudents>(query, reader => new TurmaToEnrollStudents
                {
                    TurmaId = Convert.ToInt32(reader["Id"]),
                    TurmaName = reader["Name"].ToString(),
                    StartDate = reader["StartDate"] != DBNull.Value ? Convert.ToDateTime(reader["StartDate"]) : null,
                    EndDate = reader["EndDate"] != DBNull.Value ? Convert.ToDateTime(reader["EndDate"]) : null,
                    CourseId = Convert.ToInt32(reader["CourseId"]),
                    CourseName = reader["CourseName"].ToString(),
                    StudentCount = Convert.ToInt32(reader["StudentCount"])
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching Turma report: {ex.Message}");
                return new List<TurmaToEnrollStudents>();
            }
        }




        // ** Salas **

        // Add Sala Method
        public async Task<int> AddSala(NewSala sala)
        {
            try
            {
                const string sql = @"
            INSERT INTO salas (sala_nome, tem_pcs, tem_oficina, isDeleted) 
            VALUES (@Nome, @TemPcs, @TemOficina, 0);";

                var parameters = new[]
                {
                    new MySqlParameter("@Nome", sala.Nome),
                    new MySqlParameter("@TemPcs", sala.TemPcs),
                    new MySqlParameter("@TemOficina", sala.TemOficina)
                };

                return await ExecuteNonQueryAsync(sql, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine("DATABASE ERROR: " + ex.Message);
                return 0;
            }
        }

        // Get all Salas Method
        public async Task<List<Sala>> GetAllSalas()
        {
            // We only want rooms that haven't been soft-deleted
            const string query = "SELECT sala_id, sala_nome, tem_pcs, tem_oficina, isDeleted FROM salas WHERE isDeleted = 0;";

            try
            {
                var salas = await GetDataAsync<Sala>(
                    query,
                    reader => new Sala
                    {
                        Id = reader.IsDBNull(0) ? 0 : reader.GetInt32(0),
                        Nome = reader.IsDBNull(1) ? "Unnamed Room" : reader.GetString(1),
                        TemPcs = reader.IsDBNull(2) ? 0 : reader.GetInt32(2),
                        TemOficina = reader.IsDBNull(3) ? 0 : reader.GetInt32(3),
                        IsDeleted = reader.IsDBNull(4) ? 0 : reader.GetInt32(4)
                    }
                );

                return salas ?? new List<Sala>();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n\n** Error fetching salas: {ex.Message}");
                return new List<Sala>();
            }
        }

        // get sala:
        // Get Sala by ID
        public async Task<Sala> GetSalaById(int salaId)
        {
            const string query = "SELECT sala_id, sala_nome, tem_pcs, tem_oficina, isDeleted FROM salas WHERE sala_id = @id AND isDeleted = 0;";
            var parameters = new[] { new MySqlParameter("@id", salaId) };

            var result = await GetDataAsync<Sala>(query, MapSala, parameters);
            return result.FirstOrDefault();
        }

        // Get Sala by Name
        public async Task<Sala> GetSalaByName(string name)
        {
            const string query = "SELECT sala_id, sala_nome, tem_pcs, tem_oficina, isDeleted FROM salas WHERE sala_nome = @name AND isDeleted = 0 LIMIT 1;";
            var parameters = new[] { new MySqlParameter("@name", name) };

            var result = await GetDataAsync<Sala>(query, MapSala, parameters);
            return result.FirstOrDefault();
        }

        // update sala:
        public async Task<bool> UpdateSala(Sala sala)
        {
            Console.WriteLine($"Editing Sala ID: {sala.Id}");

            try
            {
                // Using the column names from your schema: sala_nome, tem_pcs, tem_oficina
                const string query = @"
            UPDATE salas 
            SET sala_nome = @nome, 
                tem_pcs = @pcs, 
                tem_oficina = @oficina,
                isDeleted = @deleted
            WHERE sala_id = @id;";

                var parameters = new[]
                {
            new MySqlParameter("@nome", sala.Nome),
            new MySqlParameter("@pcs", sala.TemPcs),
            new MySqlParameter("@oficina", sala.TemOficina),
            new MySqlParameter("@deleted", sala.IsDeleted),
            new MySqlParameter("@id", sala.Id)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);

                if (result == 0)
                {
                    Console.WriteLine("Update failed: No sala found with that ID.");
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n\n** Update Sala failed - Error: {ex.Message}");
                return false;
            }
        }

        // Soft Delete Sala
        public async Task<bool> DeleteSala(int salaId)
        {
            Console.WriteLine($"Marking Sala ID {salaId} as Deleted");

            try
            {
                // SQL update for soft-delete
                const string query = @"UPDATE salas SET isDeleted = 1 WHERE sala_id = @salaId;";

                var parameters = new[]
                {
            new MySqlParameter("@salaId", salaId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);

                if (result == 0)
                {
                    Console.WriteLine($"Delete failed: No sala found with ID {salaId}.");
                    return false;
                }

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"\n\n** DeleteSala failed - Error: {ex.Message}");
                return false;
            }
        }

        // Salas Available [time frame]
        public async Task<List<Sala>> GetAvailableSalas(DateTime start, DateTime end)
        {
            try
            {
                // We select rooms from 'salas'
                // WHERE there is NO record in 'schedules' that overlaps with [start, end]
                const string query = @"
            SELECT s.sala_id, s.sala_nome, s.tem_pcs, s.tem_oficina, s.isDeleted
            FROM salas s
            WHERE s.isDeleted = 0
              AND NOT EXISTS (
                  SELECT 1 
                  FROM schedules sch 
                  WHERE sch.sala_id = s.sala_id 
                    AND sch.date_time >= @start 
                    AND sch.date_time <= @end
              )
            ORDER BY s.sala_nome ASC;";

                var parameters = new[]
                {
            new MySqlParameter("@start", start),
            new MySqlParameter("@end", end)
        };

                return await GetDataAsync<Sala>(query, reader => new Sala
                {
                    Id = reader.GetInt32("sala_id"),
                    Nome = reader.GetString("sala_nome"),
                    TemPcs = reader.GetInt32("tem_pcs"),
                    TemOficina = reader.GetInt32("tem_oficina"),
                    IsDeleted = reader.GetInt32("isDeleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching available rooms: {ex.Message}");
                return new List<Sala>();
            }
        }


        // ** Teacher Availability **

        public async Task<bool> AddTeacherAvailability(TeacherAvailability availability)
        {
            try
            {
                // This query:
                // 1. Tries to insert the availability if the user is a Teacher
                // 2. If the record (teacher + time) already exists, it updates disponivel to 1
                const string query = @"
            INSERT INTO disponibilidades (formador_id, disponivel, data_hora)
            SELECT u.user_id, @disponivel, @dataHora
            FROM users u
            WHERE u.user_id = @formadorId AND u.role_id = 2 AND u.isDeleted = 0
            ON DUPLICATE KEY UPDATE disponivel = 1;";

                var parameters = new[]
                {
            new MySqlParameter("@formadorId", availability.FormadorId),
            new MySqlParameter("@disponivel", availability.Disponivel),
            new MySqlParameter("@dataHora", availability.DataHora)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error adding/updating availability: {ex.Message}");
                return false;
            }
        }

        public async Task<string> ReplicateAvailabilityForWeek(ReplicateAvailabilityRequest request)
        {
            try
            {
                // 1. Get the template slots for that specific day
                const string getTemplateQuery = @"
            SELECT data_hora, disponivel 
            FROM disponibilidades 
            WHERE formador_id = @formadorId 
              AND DATE(data_hora) = DATE(@templateDate);";

                var templateParams = new[] {
            new MySqlParameter("@formadorId", request.FormadorId),
            new MySqlParameter("@templateDate", request.TemplateDate)
        };

                var templateSlots = await GetDataAsync<TeacherAvailability>(getTemplateQuery, reader => new TeacherAvailability
                {
                    DataHora = reader.GetDateTime("data_hora"),
                    Disponivel = reader.GetInt32("disponivel")
                }, templateParams);

                if (templateSlots.Count == 0) return "No availability found for the template day.";

                // 2. Identify the Start of the Week (Monday)
                DateTime startOfWeek = request.TemplateDate.AddDays(-(int)request.TemplateDate.DayOfWeek + (int)DayOfWeek.Monday);

                // 3. Prepare the Bulk Insert
                // We will loop through Monday (0) to Friday (4)
                foreach (int dayOffset in Enumerable.Range(0, 5))
                {
                    DateTime targetDay = startOfWeek.AddDays(dayOffset);

                    // Skip the template day itself to avoid duplicate key errors
                    if (targetDay.Date == request.TemplateDate.Date) continue;

                    foreach (var slot in templateSlots)
                    {
                        // Reconstruct the date with the same time as the template
                        DateTime newTime = targetDay.Date.Add(slot.DataHora.TimeOfDay);

                        const string insertQuery = @"
                    INSERT INTO disponibilidades (formador_id, disponivel, data_hora)
                    VALUES (@formadorId, @disponivel, @dataHora)
                    ON DUPLICATE KEY UPDATE disponivel = @disponivel;";

                        var insertParams = new[] {
                    new MySqlParameter("@formadorId", request.FormadorId),
                    new MySqlParameter("@disponivel", slot.Disponivel),
                    new MySqlParameter("@dataHora", newTime)
                };

                        await ExecuteNonQueryAsync(insertQuery, insertParams);
                    }
                }

                return "Success";
            }
            catch (Exception ex)
            {
                return $"Error replicating: {ex.Message}";
            }
        }

        public async Task<bool> UpdateAvailability(UpdateAvailability availability)
        {
            // Note: We use FormadorId and DataHora to find the specific row
            Console.WriteLine($"Updating availability for Teacher {availability.FormadorId} at {availability.DataHora}");

            try
            {
                const string query = @"
            UPDATE disponibilidades 
            SET disponivel = @disponivel
            WHERE formador_id = @formadorId 
              AND data_hora = @dataHora;";

                var parameters = new[]
                {
                    new MySqlParameter("@disponivel", availability.Disponivel),
                    new MySqlParameter("@formadorId", availability.FormadorId),
                    new MySqlParameter("@dataHora", availability.DataHora)
                };

                int result = await ExecuteNonQueryAsync(query, parameters);

                // Returns true if the record existed and was updated
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating availability: {ex.Message}");
                return false;
            }
        }

        public async Task<List<TeacherAvailability>> GetTeacherAvailability(AvailabilityFilter filter)
        {
            try
            {
                // Query filters by formador_id and a time range on the data_hora column
                const string query = @"
            SELECT dispo_id, formador_id, disponivel, data_hora 
            FROM disponibilidades 
            WHERE formador_id = @formadorId 
              AND data_hora >= @start 
              AND data_hora <= @end
            ORDER BY data_hora ASC;";

                var parameters = new[]
                {
                    new MySqlParameter("@formadorId", filter.FormadorId),
                    new MySqlParameter("@start", filter.StartTime),
                    new MySqlParameter("@end", filter.EndTime)
                };

                return await GetDataAsync<TeacherAvailability>(query, reader => new TeacherAvailability
                {
                    FormadorId = reader.GetInt32("formador_id"),
                    Disponivel = reader.GetInt32("disponivel"),
                    DataHora = reader.GetDateTime("data_hora")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching teacher availability: {ex.Message}");
                return new List<TeacherAvailability>();
            }
        }



        // Teachers Teache Modules

        public async Task<List<UserSimple>> GetAllTeachers()
        {
            try
            {
                // Role 2 = Teacher, isDeleted 0 = Active
                const string query = @"
            SELECT user_id, username 
            FROM users 
            WHERE role_id = 2 
              AND isDeleted = 0 
            ORDER BY username ASC;";

                return await GetDataAsync<UserSimple>(query, reader => new UserSimple
                {
                    UserId = reader.GetInt32("user_id"),
                    Username = reader.GetString("username")
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching teachers: {ex.Message}");
                return new List<UserSimple>();
            }
        }

        public async Task<bool> AssignModuleToTeacher(FormadorModule association)
        {
            try
            {
                // We only allow assignment if the user actually has the teacher role (role_id = 2)
                const string query = @"
            INSERT INTO formador_teaches_module (formador_id, module_id, isDeleted)
            SELECT u.user_id, @moduleId, 0
            FROM users u
            WHERE u.user_id = @formadorId AND u.role_id = 2
            ON DUPLICATE KEY UPDATE isDeleted = 0;";

                var parameters = new[]
                {
            new MySqlParameter("@formadorId", association.FormadorId),
            new MySqlParameter("@moduleId", association.ModuleId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error assigning module to teacher: {ex.Message}");
                return false;
            }
        }

        public async Task<List<Module>> GetModulesByTeacher(int formadorId)
        {
            try
            {
                const string query = @"
            SELECT m.module_id, m.name, m.duration_h, m.isDeleted
            FROM modules m
            INNER JOIN formador_teaches_module ftm ON m.module_id = ftm.module_id
            WHERE ftm.formador_id = @formadorId
              AND m.isDeleted = 0
              AND ftm.isDeleted = 0;";

                var parameters = new[]
                {
            new MySqlParameter("@formadorId", formadorId)
        };

                return await GetDataAsync<Module>(query, reader => new Module
                {
                    Id = reader.GetInt32("module_id"),
                    Name = reader.GetString("name"),
                    DurationInHours = reader.GetInt32("duration_h"),
                    isDeleted = reader.GetInt32("isDeleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching teacher modules: {ex.Message}");
                return new List<Module>();
            }
        }

        public async Task<bool> RemoveModuleFromTeacher(FormadorModule association)
        {
            try
            {
                // We update the soft-delete flag instead of removing the row
                const string query = @"
            UPDATE formador_teaches_module 
            SET isDeleted = 1 
            WHERE formador_id = @formadorId AND module_id = @moduleId;";

                var parameters = new[]
                {
            new MySqlParameter("@formadorId", association.FormadorId),
            new MySqlParameter("@moduleId", association.ModuleId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error removing module association: {ex.Message}");
                return false;
            }
        }

        public async Task<List<TeacherModuleAssignment>> GetTeachersToTeacheModule(int moduleId)
        {
            try
            {
                const string query = @"
            SELECT 
                u.user_id AS UserId, 
                u.username AS Username
            FROM users u
            INNER JOIN formador_teaches_module ftm ON u.user_id = ftm.formador_id
            INNER JOIN user_roles ur ON u.role_id = ur.role_id
            WHERE ftm.module_id = @moduleId
              AND ftm.isDeleted = 0
              AND u.isDeleted = 0
              AND ur.title = 'Teacher'
            ORDER BY u.username ASC;";

                var parameters = new[]
                {
            new MySqlParameter("@moduleId", moduleId)
        };

                return await GetDataAsync<TeacherModuleAssignment>(query, reader => new TeacherModuleAssignment
                {
                    UserId = reader.GetInt32("UserId"),
                    Username = reader.GetString("Username")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching teachers for module {moduleId}: {ex.Message}");
                return new List<TeacherModuleAssignment>();
            }
        }



        // ** Teacher to Turma Module **

        public async Task<bool> AssignTeacherToModule(AssignTeacherToTurmaModule assignment)
        {
            try
            {
                // We ensure the teacher exists and has the correct role (2 = Teacher)
                // while performing the upsert on turma_modules
                const string query = @"
            INSERT INTO turma_modules (turma_id, module_id, teacher_id, num_hours_completed, isCompleted)
            SELECT @turmaId, @moduleId, u.user_id, 0, 0
            FROM users u
            WHERE u.user_id = @teacherId AND u.role_id = 2
            ON DUPLICATE KEY UPDATE teacher_id = @teacherId;";

                var parameters = new[]
                {
            new MySqlParameter("@turmaId", assignment.TurmaId),
            new MySqlParameter("@moduleId", assignment.ModuleId),
            new MySqlParameter("@teacherId", assignment.TeacherId)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error assigning teacher to turma module: {ex.Message}");
                return false;
            }
        }

        public async Task<List<TurmaModuleDetails>> GetModulesByTurma(int turmaId)
        {
            try
            {
                const string query = @"
            SELECT 
                t.turma_id, 
                t.turma_name, 
                m.module_id, 
                m.name AS module_name, 
                u.user_id AS teacher_id, 
                u.username AS teacher_name, 
                tm.num_hours_completed, 
                m.duration_h AS total_duration, 
                tm.isCompleted
            FROM turma_modules tm
            INNER JOIN turmas t ON tm.turma_id = t.turma_id
            INNER JOIN modules m ON tm.module_id = m.module_id
            INNER JOIN users u ON tm.teacher_id = u.user_id
            WHERE tm.turma_id = @turmaId;";

                var parameters = new[] { new MySqlParameter("@turmaId", turmaId) };

                return await GetDataAsync<TurmaModuleDetails>(query, reader => new TurmaModuleDetails
                {
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    HoursCompleted = reader.GetInt32("num_hours_completed"),
                    TotalDuration = reader.GetInt32("total_duration"),
                    IsCompleted = reader.GetInt32("isCompleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching modules for turma {turmaId}: {ex.Message}");
                return new List<TurmaModuleDetails>();
            }
        }

        public async Task<TurmaModuleDetails> GetSpecificTurmaModule(int turmaId, int moduleId)
        {
            try
            {
                const string query = @"
            SELECT 
                t.turma_id, 
                t.turma_name, 
                m.module_id, 
                m.name AS module_name, 
                u.user_id AS teacher_id, 
                u.username AS teacher_name, 
                tm.num_hours_completed, 
                m.duration_h AS total_duration, 
                tm.isCompleted
            FROM turma_modules tm
            INNER JOIN turmas t ON tm.turma_id = t.turma_id
            INNER JOIN modules m ON tm.module_id = m.module_id
            INNER JOIN users u ON tm.teacher_id = u.user_id
            WHERE tm.turma_id = @turmaId AND tm.module_id = @moduleId;";

                var parameters = new[]
                {
            new MySqlParameter("@turmaId", turmaId),
            new MySqlParameter("@moduleId", moduleId)
        };

                var results = await GetDataAsync<TurmaModuleDetails>(query, reader => new TurmaModuleDetails
                {
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    HoursCompleted = reader.GetInt32("num_hours_completed"),
                    TotalDuration = reader.GetInt32("total_duration"),
                    IsCompleted = reader.GetInt32("isCompleted")
                }, parameters);

                return results.FirstOrDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching module {moduleId} for turma {turmaId}: {ex.Message}");
                return null;
            }
        }

        public async Task<List<TurmaCourseModulePlaned>> GetTurmaModulePlan(int turmaId)
        {
            try
            {
                const string query = @"
            SELECT 
                t.turma_id, 
                t.turma_name, 
                m.module_id, 
                m.name AS module_name, 
                m.duration_h, 
                cm.order_index,
                m.isDeleted AS module_deleted
            FROM mydb.turmas t
            JOIN mydb.courses c ON t.course_id = c.id_cursos
            JOIN mydb.course_modules cm ON c.id_cursos = cm.course_id
            JOIN mydb.modules m ON cm.module_id = m.module_id
            WHERE t.turma_id = @turmaId 
              AND m.isDeleted = 0
              AND cm.isDeleted = 0
            ORDER BY cm.order_index ASC;";

                var parameters = new[] { new MySqlParameter("@turmaId", turmaId) };

                return await GetDataAsync<TurmaCourseModulePlaned>(query, reader => new TurmaCourseModulePlaned
                {
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    DurationH = reader.GetInt32("duration_h"),
                    OrderIndex = reader.GetInt32("order_index"),
                    IsModuleDeleted = reader.GetInt32("module_deleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching module plan for turma {turmaId}: {ex.Message}");
                return new List<TurmaCourseModulePlaned>();
            }
        }

        public async Task<List<TeacherModuleAssignment>> GetTeachersByModule(int moduleId)
        {
            try
            {
                const string query = @"
            SELECT 
                u.user_id, 
                u.username
            FROM formador_teaches_module ftm
            INNER JOIN users u ON ftm.formador_id = u.user_id
            WHERE ftm.module_id = @moduleId 
              AND ftm.isDeleted = 0 
              AND u.isDeleted = 0
            ORDER BY u.username ASC;";

                var parameters = new[] { new MySqlParameter("@moduleId", moduleId) };

                return await GetDataAsync<TeacherModuleAssignment>(query, reader => new TeacherModuleAssignment
                {
                    UserId = reader.GetInt32("user_id"),
                    Username = reader.GetString("username")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching teachers for module {moduleId}: {ex.Message}");
                return new List<TeacherModuleAssignment>();
            }
        }

        public async Task<List<TeacherAssignment>> GetAssignmentsByTeacher(int teacherId)
        {
            try
            {
                const string query = @"
            SELECT 
                tm.turma_id, 
                t.turma_name, 
                tm.module_id, 
                m.name AS module_name, 
                tm.num_hours_completed, 
                m.duration_h AS total_duration, 
                tm.isCompleted
            FROM turma_modules tm
            INNER JOIN turmas t ON tm.turma_id = t.turma_id
            INNER JOIN modules m ON tm.module_id = m.module_id
            WHERE tm.teacher_id = @teacherId 
              AND t.isDeleted = 0 
              AND m.isDeleted = 0;";

                var parameters = new[]
                {
            new MySqlParameter("@teacherId", teacherId)
        };

                return await GetDataAsync<TeacherAssignment>(query, reader => new TeacherAssignment
                {
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    HoursCompleted = reader.GetInt32("num_hours_completed"),
                    TotalDuration = reader.GetInt32("total_duration"),
                    IsCompleted = reader.GetInt32("isCompleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching assignments for teacher {teacherId}: {ex.Message}");
                return new List<TeacherAssignment>();
            }
        }

        // increment hours
        public async Task<string> IncrementModuleHour(int turmaId, int moduleId)
        {
            try
            {
                // 1. We join with the modules table to get the 'duration_h' limit
                // 2. We increment 'num_hours_completed' ONLY if it's currently less than 'duration_h'
                // 3. We update 'isCompleted' to 1 if the new value reaches the limit
                const string query = @"
            UPDATE turma_modules tm
            INNER JOIN modules m ON tm.module_id = m.module_id
            SET tm.num_hours_completed = tm.num_hours_completed + 1,
                tm.isCompleted = CASE 
                    WHEN (tm.num_hours_completed + 1) >= m.duration_h THEN 1 
                    ELSE 0 
                END
            WHERE tm.turma_id = @turmaId 
              AND tm.module_id = @moduleId
              AND tm.num_hours_completed < m.duration_h;";

                var parameters = new[]
                {
            new MySqlParameter("@turmaId", turmaId),
            new MySqlParameter("@moduleId", moduleId)
        };

                int rowsAffected = await ExecuteNonQueryAsync(query, parameters);

                if (rowsAffected > 0)
                {
                    return "Success";
                }
                else
                {
                    // If no rows were updated, it's either because IDs are wrong 
                    // or the module is already at max hours.
                    return "Cannot increment. Module may already be completed or does not exist.";
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error incrementing class hour: {ex.Message}");
                return $"Database error: {ex.Message}";
            }
        }



        // ** Student Grade **

        public async Task<List<StudentGradeDetail>> GetGradesByTurma(int turmaId)
        {
            try
            {
                const string query = @"
            SELECT 
                u.user_id AS student_id, 
                u.username AS student_name, 
                m.module_id, 
                m.name AS module_name, 
                sg.grade
            FROM enrollments e
            INNER JOIN users u ON e.student_id = u.user_id
            INNER JOIN turmas t ON e.turma_id = t.turma_id
            INNER JOIN course_modules cm ON t.course_id = cm.course_id
            INNER JOIN modules m ON cm.module_id = m.module_id
            LEFT JOIN student_grades sg ON e.id_enrollment = sg.id_enrollment 
                                        AND m.module_id = sg.module_id
            WHERE e.turma_id = @turmaId 
              AND e.isDeleted = 0 
              AND u.isDeleted = 0
            ORDER BY u.username ASC, cm.order_index ASC;";

                var parameters = new[] { new MySqlParameter("@turmaId", turmaId) };

                return await GetDataAsync<StudentGradeDetail>(query, reader => new StudentGradeDetail
                {
                    StudentId = reader.GetInt32("student_id"),
                    StudentName = reader.GetString("student_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    Grade = reader.IsDBNull(reader.GetOrdinal("grade")) ? (int?)null : reader.GetInt32("grade")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching grades for turma {turmaId}: {ex.Message}");
                return new List<StudentGradeDetail>();
            }
        }

        // Student Grade for all Modules
        public async Task<List<StudentReportCard>> GetStudentGradesInTurma(int studentId, int turmaId)
        {
            try
            {
                const string query = @"
            SELECT 
                m.module_id, 
                m.name AS module_name, 
                sg.grade,
                tm.isCompleted
            FROM enrollments e
            INNER JOIN turmas t ON e.turma_id = t.turma_id
            INNER JOIN course_modules cm ON t.course_id = cm.course_id
            INNER JOIN modules m ON cm.module_id = m.module_id
            LEFT JOIN student_grades sg ON e.id_enrollment = sg.id_enrollment 
                                        AND m.module_id = sg.module_id
            LEFT JOIN turma_modules tm ON t.turma_id = tm.turma_id 
                                       AND m.module_id = tm.module_id
            WHERE e.student_id = @studentId 
              AND e.turma_id = @turmaId
              AND e.isDeleted = 0
            ORDER BY cm.order_index ASC;";

                var parameters = new[]
                {
            new MySqlParameter("@studentId", studentId),
            new MySqlParameter("@turmaId", turmaId)
        };

                return await GetDataAsync<StudentReportCard>(query, reader => new StudentReportCard
                {
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    Grade = reader.IsDBNull(reader.GetOrdinal("grade")) ? (int?)null : reader.GetInt32("grade"),
                    IsCompleted = reader.IsDBNull(reader.GetOrdinal("isCompleted")) ? 0 : reader.GetInt32("isCompleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching student grades: {ex.Message}");
                return new List<StudentReportCard>();
            }
        }

        public async Task<List<ModuleGradeEntry>> GetGradesForTurmaModule(int turmaId, int moduleId)
        {
            try
            {
                const string query = @"
            SELECT 
                u.user_id AS student_id, 
                u.username AS student_name, 
                sg.grade,
                e.id_enrollment
            FROM enrollments e
            INNER JOIN users u ON e.student_id = u.user_id
            LEFT JOIN student_grades sg ON e.id_enrollment = sg.id_enrollment 
                                        AND sg.module_id = @moduleId
            WHERE e.turma_id = @turmaId 
              AND e.isDeleted = 0 
              AND u.isDeleted = 0
            ORDER BY u.username ASC;";

                var parameters = new[]
                {
            new MySqlParameter("@turmaId", turmaId),
            new MySqlParameter("@moduleId", moduleId)
        };

                return await GetDataAsync<ModuleGradeEntry>(query, reader => new ModuleGradeEntry
                {
                    StudentId = reader.GetInt32("student_id"),
                    StudentName = reader.GetString("student_name"),
                    Grade = reader.IsDBNull(reader.GetOrdinal("grade")) ? (int?)null : reader.GetInt32("grade"),
                    EnrollmentId = reader.GetInt32("id_enrollment")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching module grades: {ex.Message}");
                return new List<ModuleGradeEntry>();
            }
        }

        // update
        public async Task<bool> UpsertStudentGrade(GradeSubmission submission)
        {
            try
            {
                // 1. We find the enrollment ID for the student/turma pair
                // 2. We insert the grade, or update it if the pair (enrollment, module) exists
                const string query = @"
            INSERT INTO student_grades (id_enrollment, module_id, grade)
            SELECT e.id_enrollment, @moduleId, @grade
            FROM enrollments e
            WHERE e.student_id = @studentId AND e.turma_id = @turmaId AND e.isDeleted = 0
            ON DUPLICATE KEY UPDATE grade = @grade;";

                var parameters = new[]
                {
            new MySqlParameter("@studentId", submission.StudentId),
            new MySqlParameter("@turmaId", submission.TurmaId),
            new MySqlParameter("@moduleId", submission.ModuleId),
            new MySqlParameter("@grade", submission.Grade)
        };

                int result = await ExecuteNonQueryAsync(query, parameters);
                return result > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error updating grade: {ex.Message}");
                return false;
            }
        }



        // ** Student **
        public async Task<List<TurmaDTO>> GetStudentEnrolledTurmas(int studentId)
        {
            try
            {
                const string query = @"
            SELECT 
                t.turma_id, 
                t.turma_name, 
                t.course_id, 
                c.nome_curso AS CourseName, 
                t.isDeleted, 
                t.date_start AS DateStart, 
                t.date_end AS DateEnd
            FROM enrollments e
            INNER JOIN turmas t ON e.turma_id = t.turma_id
            INNER JOIN courses c ON t.course_id = c.id_cursos
            WHERE e.student_id = @studentId 
              AND e.isDeleted = 0 
              AND t.isDeleted = 0
            ORDER BY t.date_start DESC;";

                var parameters = new[]
                {
            new MySqlParameter("@studentId", studentId)
        };

                return await GetDataAsync<TurmaDTO>(query, reader => new TurmaDTO
                {
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    CourseId = reader.GetInt32("course_id"),
                    CourseName = reader.GetString("CourseName"),
                    isDeleted = reader.GetInt32("isDeleted"),
                    DateStart = reader.IsDBNull(reader.GetOrdinal("DateStart")) ? (DateTime?)null : reader.GetDateTime("DateStart"),
                    DateEnd = reader.IsDBNull(reader.GetOrdinal("DateEnd")) ? (DateTime?)null : reader.GetDateTime("DateEnd")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching turmas for student {studentId}: {ex.Message}");
                return new List<TurmaDTO>();
            }
        }



        // ** Shedule **
        // Create Schedule with ALL THE RULES!
        public async Task<string> CreateSchedule(ScheduleRequest request)
        {
            // 1. Business Logic: Time constraint
            if (request.DateTime.Hour < 8)
            {
                return "Schedules cannot be set between 00:00 and 08:00.";
            }

            try
            {
                // 2. CHECK TEACHER AVAILABILITY (Permission check)
                // We check if a record exists for this teacher at this time where disponivel = 1
                const string availabilityQuery = @"
            SELECT COUNT(*) as total 
            FROM disponibilidades 
            WHERE formador_id = @formadorId 
              AND data_hora = @dateTime 
              AND disponivel = 1;";

                var availabilityParams = new[] {
            new MySqlParameter("@formadorId", request.FormadorId),
            new MySqlParameter("@dateTime", request.DateTime)
        };

                var availabilityResults = await GetDataAsync<int>(availabilityQuery,
                    reader => reader.GetInt32("total"),
                    availabilityParams);

                if (availabilityResults.Count == 0 || availabilityResults[0] == 0)
                {
                    return "The teacher is not marked as available for this specific date and time.";
                }

                // 3. COMPREHENSIVE CONFLICT CHECK (Occupied check)
                const string conflictQuery = @"
            SELECT 
                CASE 
                    WHEN sala_id = @salaId THEN 'room'
                    WHEN formador_id = @formadorId THEN 'teacher'
                    WHEN turma_id = @turmaId THEN 'turma'
                END AS conflict_type
            FROM schedules 
            WHERE date_time = @dateTime
              AND (sala_id = @salaId OR formador_id = @formadorId OR turma_id = @turmaId)
            LIMIT 1;";

                var conflictParams = new[] {
            new MySqlParameter("@salaId", request.SalaId),
            new MySqlParameter("@formadorId", request.FormadorId),
            new MySqlParameter("@turmaId", request.TurmaId),
            new MySqlParameter("@dateTime", request.DateTime)
        };

                var conflicts = await GetDataAsync<string>(conflictQuery,
                    reader => reader.GetString("conflict_type"),
                    conflictParams);

                if (conflicts.Count > 0)
                {
                    return conflicts[0] switch
                    {
                        "room" => "The selected room is already occupied at this time.",
                        "teacher" => "The teacher is already teaching another class at this time.",
                        "turma" => "This turma already has a scheduled module at this time.",
                        _ => "Schedule conflict detected."
                    };
                }

                // 4. INSERT ENTRY
                const string insertQuery = @"
            INSERT INTO schedules (turma_id, module_id, formador_id, sala_id, date_time)
            VALUES (@turmaId, @moduleId, @formadorId, @salaId, @dateTime);";

                var insertParams = new[] {
            new MySqlParameter("@turmaId", request.TurmaId),
            new MySqlParameter("@moduleId", request.ModuleId),
            new MySqlParameter("@formadorId", request.FormadorId),
            new MySqlParameter("@salaId", request.SalaId),
            new MySqlParameter("@dateTime", request.DateTime)
        };

                int result = await ExecuteNonQueryAsync(insertQuery, insertParams);
                return result > 0 ? "Success" : "Error performing insert.";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Scheduling Error: {ex.Message}");
                return $"Database error: {ex.Message}";
            }
        }

        public async Task<string> CreateBulkSchedule(BulkScheduleRequest request)
        {
            // 1. Logic Check: Business Hours
            if (request.StartTime.Hour < 8 || request.EndTime.Hour > 23)
                return "Schedules must be between 08:00 and 23:00.";

            if (request.EndTime < request.StartTime)
                return "End time cannot be before start time.";

            // Use a transaction to ensure all-or-nothing
            using var connection = new MySqlConnection(Builder.ConnectionString);
            await connection.OpenAsync();
            using var transaction = await connection.BeginTransactionAsync();

            try
            {
                // Calculate the hours to insert (e.g., 9 to 11 = 9:00, 10:00, 11:00)
                int hoursToSchedule = (int)(request.EndTime - request.StartTime).TotalHours;

                for (int i = 0; i <= hoursToSchedule; i++)
                {
                    DateTime currentSlot = request.StartTime.AddHours(i);

                    // A. CHECK TEACHER AVAILABILITY
                    const string availQuery = "SELECT COUNT(*) FROM disponibilidades WHERE formador_id = @fId AND data_hora = @dt AND disponivel = 1;";
                    var availCmd = new MySqlCommand(availQuery, connection, transaction);
                    availCmd.Parameters.AddWithValue("@fId", request.FormadorId);
                    availCmd.Parameters.AddWithValue("@dt", currentSlot);

                    var isAvailable = Convert.ToInt32(await availCmd.ExecuteScalarAsync()) > 0;
                    if (!isAvailable)
                    {
                        await transaction.RollbackAsync();
                        return $"Teacher is not available at {currentSlot:HH:mm}.";
                    }

                    // B. CHECK CONFLICTS
                    const string conflictQuery = @"
                SELECT COUNT(*) FROM schedules 
                WHERE date_time = @dt AND (sala_id = @sId OR formador_id = @fId OR turma_id = @tId);";
                    var conflictCmd = new MySqlCommand(conflictQuery, connection, transaction);
                    conflictCmd.Parameters.AddWithValue("@dt", currentSlot);
                    conflictCmd.Parameters.AddWithValue("@sId", request.SalaId);
                    conflictCmd.Parameters.AddWithValue("@fId", request.FormadorId);
                    conflictCmd.Parameters.AddWithValue("@tId", request.TurmaId);

                    if (Convert.ToInt32(await conflictCmd.ExecuteScalarAsync()) > 0)
                    {
                        await transaction.RollbackAsync();
                        return $"Conflict detected at {currentSlot:HH:mm}. Range cancelled.";
                    }

                    // C. INSERT ENTRY
                    const string insertQuery = @"
                INSERT INTO schedules (turma_id, module_id, formador_id, sala_id, date_time)
                VALUES (@tId, @mId, @fId, @sId, @dt);";
                    var insertCmd = new MySqlCommand(insertQuery, connection, transaction);
                    insertCmd.Parameters.AddWithValue("@tId", request.TurmaId);
                    insertCmd.Parameters.AddWithValue("@mId", request.ModuleId);
                    insertCmd.Parameters.AddWithValue("@fId", request.FormadorId);
                    insertCmd.Parameters.AddWithValue("@sId", request.SalaId);
                    insertCmd.Parameters.AddWithValue("@dt", currentSlot);

                    await insertCmd.ExecuteNonQueryAsync();
                }

                await transaction.CommitAsync();
                return "Success";
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return $"Transaction failed: {ex.Message}";
            }
        }

        // Read Time Frame
        public async Task<List<ScheduleDetailsDTO>> GetSchedulesByTimeRange(DateTime start, DateTime end)
        {
            try
            {
                const string query = @"
            SELECT 
                s.schedule_id, 
                s.turma_id,
                t.turma_name, 
                s.module_id,
                m.name AS module_name, 
                s.formador_id AS teacher_id,
                u.username AS teacher_name, 
                s.sala_id,
                sl.sala_nome, 
                s.date_time
            FROM schedules s
            INNER JOIN turmas t ON s.turma_id = t.turma_id
            INNER JOIN modules m ON s.module_id = m.module_id
            INNER JOIN users u ON s.formador_id = u.user_id
            INNER JOIN salas sl ON s.sala_id = sl.sala_id
            WHERE s.date_time >= @start AND s.date_time <= @end
            ORDER BY s.date_time ASC;";

                var parameters = new[] {
            new MySqlParameter("@start", start),
            new MySqlParameter("@end", end)
        };

                return await GetDataAsync<ScheduleDetailsDTO>(query, reader => new ScheduleDetailsDTO
                {
                    ScheduleId = reader.GetInt32("schedule_id"),
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    SalaId = reader.GetInt32("sala_id"),
                    SalaNome = reader.GetString("sala_nome"),
                    DateTime = reader.GetDateTime("date_time")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching schedules: {ex.Message}");
                return new List<ScheduleDetailsDTO>();
            }
        }

        // Read Time Frame With Filters!
        public async Task<List<ScheduleDetailsDTO>> GetSchedulesAdvanced(
    DateTime start,
    DateTime end,
    int? turmaId = null,
    int? teacherId = null,
    int? moduleId = null,
    int? salaId = null)
        {
            try
            {
                const string query = @"
            SELECT 
                s.schedule_id, 
                s.turma_id,
                t.turma_name, 
                s.module_id,
                m.name AS module_name, 
                s.formador_id AS teacher_id,
                u.username AS teacher_name, 
                s.sala_id,
                sl.sala_nome, 
                s.date_time
            FROM schedules s
            INNER JOIN turmas t ON s.turma_id = t.turma_id
            INNER JOIN modules m ON s.module_id = m.module_id
            INNER JOIN users u ON s.formador_id = u.user_id
            INNER JOIN salas sl ON s.sala_id = sl.sala_id
            WHERE (s.date_time >= @start AND s.date_time <= @end)
              AND (@turmaId IS NULL OR s.turma_id = @turmaId)
              AND (@teacherId IS NULL OR s.formador_id = @teacherId)
              AND (@moduleId IS NULL OR s.module_id = @moduleId)
              AND (@salaId IS NULL OR s.sala_id = @salaId)
            ORDER BY s.date_time ASC;";

                var parameters = new[] {
            new MySqlParameter("@start", start),
            new MySqlParameter("@end", end),
            new MySqlParameter("@turmaId", (object)turmaId ?? DBNull.Value),
            new MySqlParameter("@teacherId", (object)teacherId ?? DBNull.Value),
            new MySqlParameter("@moduleId", (object)moduleId ?? DBNull.Value),
            new MySqlParameter("@salaId", (object)salaId ?? DBNull.Value)
        };

                return await GetDataAsync<ScheduleDetailsDTO>(query, reader => new ScheduleDetailsDTO
                {
                    ScheduleId = reader.GetInt32("schedule_id"),
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    SalaId = reader.GetInt32("sala_id"),
                    SalaNome = reader.GetString("sala_nome"),
                    DateTime = reader.GetDateTime("date_time")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Advanced search error: {ex.Message}");
                return new List<ScheduleDetailsDTO>();
            }
        }

        // Get SINGLE Schedule Entry
        public async Task<ScheduleDetailsDTO> GetScheduleDetails(int turmaId, DateTime dateTime)
        {
            try
            {
                const string query = @"
            SELECT 
                s.schedule_id,
                s.turma_id,
                t.turma_name,
                s.module_id,
                m.name AS module_name,
                s.formador_id AS teacher_id,
                u.username AS teacher_name,
                s.sala_id,
                sl.sala_nome,
                s.date_time
            FROM schedules s
            INNER JOIN turmas t ON s.turma_id = t.turma_id
            INNER JOIN modules m ON s.module_id = m.module_id
            INNER JOIN users u ON s.formador_id = u.user_id
            INNER JOIN salas sl ON s.sala_id = sl.sala_id
            WHERE s.turma_id = @turmaId 
              AND s.date_time = @dateTime 
            LIMIT 1;";

                var parameters = new[] {
            new MySqlParameter("@turmaId", turmaId),
            new MySqlParameter("@dateTime", dateTime)
        };

                var results = await GetDataAsync<ScheduleDetailsDTO>(query, reader => new ScheduleDetailsDTO
                {
                    ScheduleId = reader.GetInt32("schedule_id"),
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    SalaId = reader.GetInt32("sala_id"),
                    SalaNome = reader.GetString("sala_nome"),
                    DateTime = reader.GetDateTime("date_time")
                }, parameters);

                return results.FirstOrDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error retrieving schedule details: {ex.Message}");
                return null;
            }
        }

        // Update
        public async Task<string> UpdateSchedule(ScheduleDetailsDTO request)
        {
            // 1. Business Logic: Time constraint
            if (request.DateTime.Hour < 8)
            {
                return "Schedules cannot be set between 00:00 and 08:00.";
            }

            try
            {
                // 2. Check Teacher Availability (Permission check)
                const string availabilityQuery = @"
            SELECT COUNT(*) as total 
            FROM disponibilidades 
            WHERE formador_id = @formadorId AND data_hora = @dateTime AND disponivel = 1;";

                var availabilityParams = new[] {
            new MySqlParameter("@formadorId", request.TeacherId),
            new MySqlParameter("@dateTime", request.DateTime)
        };

                var availabilityResults = await GetDataAsync<int>(availabilityQuery, reader => reader.GetInt32("total"), availabilityParams);
                if (availabilityResults.Count == 0 || availabilityResults[0] == 0)
                {
                    return "The teacher is not marked as available for this specific date and time.";
                }

                // 3. Comprehensive Conflict Check (Ignoring the CURRENT schedule_id)
                const string conflictQuery = @"
            SELECT 
                CASE 
                    WHEN sala_id = @salaId THEN 'room'
                    WHEN formador_id = @formadorId THEN 'teacher'
                    WHEN turma_id = @turmaId THEN 'turma'
                END AS conflict_type
            FROM schedules 
            WHERE date_time = @dateTime 
              AND schedule_id != @scheduleId
              AND (sala_id = @salaId OR formador_id = @formadorId OR turma_id = @turmaId)
            LIMIT 1;";

                var conflictParams = new[] {
            new MySqlParameter("@salaId", request.SalaId),
            new MySqlParameter("@formadorId", request.TeacherId),
            new MySqlParameter("@turmaId", request.TurmaId),
            new MySqlParameter("@dateTime", request.DateTime),
            new MySqlParameter("@scheduleId", request.ScheduleId)
        };

                var conflicts = await GetDataAsync<string>(conflictQuery, reader => reader.GetString("conflict_type"), conflictParams);

                if (conflicts.Count > 0)
                {
                    return conflicts[0] switch
                    {
                        "room" => "The selected room is occupied by another class at this time.",
                        "teacher" => "The teacher is assigned to another class at this time.",
                        "turma" => "This turma already has a module scheduled at this time.",
                        _ => "Schedule conflict detected."
                    };
                }

                // 4. Update the Entry
                const string updateQuery = @"
            UPDATE schedules 
            SET turma_id = @turmaId, 
                module_id = @moduleId, 
                formador_id = @formadorId, 
                sala_id = @salaId, 
                date_time = @dateTime
            WHERE schedule_id = @scheduleId;";

                var updateParams = new[] {
            new MySqlParameter("@turmaId", request.TurmaId),
            new MySqlParameter("@moduleId", request.ModuleId),
            new MySqlParameter("@formadorId", request.TeacherId),
            new MySqlParameter("@salaId", request.SalaId),
            new MySqlParameter("@dateTime", request.DateTime),
            new MySqlParameter("@scheduleId", request.ScheduleId)
        };

                int result = await ExecuteNonQueryAsync(updateQuery, updateParams);
                return result > 0 ? "Success" : "Schedule entry not found.";
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Update Error: {ex.Message}");
                return $"Database error: {ex.Message}";
            }
        }

        // Delete Delete
        public async Task<bool> DeleteSchedule(int scheduleId)
        {
            try
            {
                const string query = "DELETE FROM schedules WHERE schedule_id = @scheduleId;";

                var parameters = new[]
                {
            new MySqlParameter("@scheduleId", scheduleId)
        };

                int rowsAffected = await ExecuteNonQueryAsync(query, parameters);

                // Returns true if a row was actually deleted
                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error deleting schedule {scheduleId}: {ex.Message}");
                return false;
            }
        }

        // * GET Teacher Schedule!
        public async Task<List<TeacherScheduleDetailDTO>> GetTeacherScheduleByRange(int teacherId, DateTime start, DateTime end)
        {
            try
            {
                const string query = @"
    SELECT 
        s.date_time,
        t.turma_id,
        t.turma_name,
        m.module_id,
        m.name AS module_name,
        m.duration_h AS TotalDuration,
        COALESCE(tm.num_hours_completed, 0) AS HoursCompleted, -- Handle NULLs from Left Join
        sl.sala_id,
        sl.sala_nome,
        sl.tem_pcs,
        sl.tem_oficina
    FROM schedules s
    INNER JOIN turmas t ON s.turma_id = t.turma_id
    INNER JOIN modules m ON s.module_id = m.module_id
    INNER JOIN salas sl ON s.sala_id = sl.sala_id
    -- Change to LEFT JOIN to prevent missing records from hiding the schedule
    LEFT JOIN turma_modules tm ON s.turma_id = tm.turma_id AND s.module_id = tm.module_id
    WHERE s.formador_id = @teacherId 
      AND s.date_time >= @start 
      AND s.date_time <= @end
    ORDER BY s.date_time ASC;";

                var parameters = new[] {
            new MySqlParameter("@teacherId", teacherId),
            new MySqlParameter("@start", start),
            new MySqlParameter("@end", end)
        };

                return await GetDataAsync<TeacherScheduleDetailDTO>(query, reader => new TeacherScheduleDetailDTO
                {
                    DateTime = reader.GetDateTime("date_time"),
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TotalDuration = reader.GetInt32("TotalDuration"),
                    // Use GetOrdinal to handle potential nulls safely if not using COALESCE
                    HoursCompleted = reader.IsDBNull(reader.GetOrdinal("HoursCompleted")) ? 0 : reader.GetInt32("HoursCompleted"),
                    SalaId = reader.GetInt32("sala_id"),
                    SalaNome = reader.GetString("sala_nome"),
                    HasPc = reader.GetInt32("tem_pcs"),
                    HasOficina = reader.GetInt32("tem_oficina")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching teacher schedule: {ex.Message}");
                return new List<TeacherScheduleDetailDTO>();
            }
        }

        // * GET Turma Schedule!
        public async Task<List<TurmaScheduleDetailDTO>> GetTurmaScheduleByRange(int turmaId, DateTime start, DateTime end)
        {
            try
            {
                const string query = @"
            SELECT 
                s.date_time,
                m.module_id,
                m.name AS module_name,
                u.user_id AS teacher_id,
                u.username AS teacher_name,
                sl.sala_id,
                sl.sala_nome
            FROM schedules s
            INNER JOIN modules m ON s.module_id = m.module_id
            INNER JOIN users u ON s.formador_id = u.user_id
            INNER JOIN salas sl ON s.sala_id = sl.sala_id
            WHERE s.turma_id = @turmaId 
              AND s.date_time >= @start 
              AND s.date_time <= @end
            ORDER BY s.date_time ASC;";

                var parameters = new[] {
            new MySqlParameter("@turmaId", turmaId),
            new MySqlParameter("@start", start),
            new MySqlParameter("@end", end)
        };

                return await GetDataAsync<TurmaScheduleDetailDTO>(query, reader => new TurmaScheduleDetailDTO
                {
                    DateTime = reader.GetDateTime("date_time"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    SalaId = reader.GetInt32("sala_id"),
                    SalaNome = reader.GetString("sala_nome")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching turma schedule: {ex.Message}");
                return new List<TurmaScheduleDetailDTO>();
            }
        }

        // * GET Student Schedule!
        public async Task<List<TurmaScheduleDetailDTO>> GetStudentSchedule(int studentId, DateTime start, DateTime end)
        {
            try
            {
                const string query = @"
            SELECT 
                s.date_time,
                m.module_id,
                m.name AS module_name,
                u_teacher.user_id AS teacher_id,
                u_teacher.username AS teacher_name,
                sl.sala_id,
                sl.sala_nome
            FROM users u_student
            INNER JOIN user_roles ur ON u_student.role_id = ur.role_id
            INNER JOIN schedules s ON u_student.turma_id = s.turma_id
            INNER JOIN modules m ON s.module_id = m.module_id
            INNER JOIN users u_teacher ON s.formador_id = u_teacher.user_id
            INNER JOIN salas sl ON s.sala_id = sl.sala_id
            WHERE u_student.user_id = @studentId 
              AND ur.title = 'Student'
              AND u_student.isDeleted = 0
              AND s.date_time >= @start 
              AND s.date_time <= @end
            ORDER BY s.date_time ASC;";

                var parameters = new[] {
            new MySqlParameter("@studentId", studentId),
            new MySqlParameter("@start", start),
            new MySqlParameter("@end", end)
        };

                return await GetDataAsync<TurmaScheduleDetailDTO>(query, reader => new TurmaScheduleDetailDTO
                {
                    DateTime = reader.GetDateTime("date_time"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    SalaId = reader.GetInt32("sala_id"),
                    SalaNome = reader.GetString("sala_nome")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching student schedule: {ex.Message}");
                return new List<TurmaScheduleDetailDTO>();
            }
        }



        // ** Additional Teacher-Module-Turma **

        // Modules not completed by a turma order by order_index (for the next modules to be completed)
        public async Task<List<TurmaModuleDetails>> GetIncompleteModulesByTier(int turmaId, int tierIndex)
        {
            try
            {
                const string query = @"
            SELECT 
                tm.turma_id,
                t.turma_name,
                tm.module_id,
                m.name AS module_name,
                tm.teacher_id,
                u.username AS teacher_name,
                tm.num_hours_completed AS HoursCompleted,
                m.duration_h AS TotalDuration,
                tm.isCompleted
            FROM turma_modules tm
            INNER JOIN turmas t ON tm.turma_id = t.turma_id
            INNER JOIN modules m ON tm.module_id = m.module_id
            INNER JOIN users u ON tm.teacher_id = u.user_id
            INNER JOIN course_modules cm ON t.course_id = cm.course_id AND tm.module_id = cm.module_id
            WHERE tm.turma_id = @turmaId
              AND cm.order_index = @tierIndex
              AND tm.isCompleted = 0
              AND tm.num_hours_completed < m.duration_h
            ORDER BY m.name ASC;"; // Sorted alphabetically within the tier

                var parameters = new[]
                {
            new MySqlParameter("@turmaId", turmaId),
            new MySqlParameter("@tierIndex", tierIndex)
        };

                return await GetDataAsync<TurmaModuleDetails>(query, reader => new TurmaModuleDetails
                {
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    HoursCompleted = reader.GetInt32("HoursCompleted"),
                    TotalDuration = reader.GetInt32("TotalDuration"),
                    IsCompleted = reader.GetInt32("isCompleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching modules for tier {tierIndex}: {ex.Message}");
                return new List<TurmaModuleDetails>();
            }
        }

        // All modules not completed by a turma by index order and completion status
        public async Task<List<TurmaModuleDetails>> GetAllIncompleteModules(int turmaId)
        {
            try
            {
                const string query = @"
            SELECT 
                tm.turma_id,
                t.turma_name,
                tm.module_id,
                m.name AS module_name,
                tm.teacher_id,
                u.username AS teacher_name,
                tm.num_hours_completed AS HoursCompleted,
                m.duration_h AS TotalDuration,
                tm.isCompleted,
                cm.order_index
            FROM turma_modules tm
            INNER JOIN turmas t ON tm.turma_id = t.turma_id
            INNER JOIN modules m ON tm.module_id = m.module_id
            INNER JOIN users u ON tm.teacher_id = u.user_id
            INNER JOIN course_modules cm ON t.course_id = cm.course_id AND tm.module_id = cm.module_id
            WHERE tm.turma_id = @turmaId
              AND tm.isCompleted = 0
              AND tm.num_hours_completed < m.duration_h
            ORDER BY cm.order_index ASC, tm.num_hours_completed DESC;";

                var parameters = new[]
                {
            new MySqlParameter("@turmaId", turmaId)
        };

                return await GetDataAsync<TurmaModuleDetails>(query, reader => new TurmaModuleDetails
                {
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    HoursCompleted = reader.GetInt32("HoursCompleted"),
                    TotalDuration = reader.GetInt32("TotalDuration"),
                    IsCompleted = reader.GetInt32("isCompleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching all incomplete modules: {ex.Message}");
                return new List<TurmaModuleDetails>();
            }
        }

        public async Task<List<TurmaModuleDetails>> GetOngoingModules(int turmaId)
        {
            try
            {
                const string query = @"
            SELECT 
                tm.turma_id,
                t.turma_name,
                tm.module_id,
                m.name AS module_name,
                tm.teacher_id,
                u.username AS teacher_name,
                tm.num_hours_completed AS HoursCompleted,
                m.duration_h AS TotalDuration,
                tm.isCompleted
            FROM turma_modules tm
            INNER JOIN turmas t ON tm.turma_id = t.turma_id
            INNER JOIN modules m ON tm.module_id = m.module_id
            INNER JOIN users u ON tm.teacher_id = u.user_id
            INNER JOIN course_modules cm ON t.course_id = cm.course_id AND tm.module_id = cm.module_id
            WHERE tm.turma_id = @turmaId
              AND tm.isCompleted = 0
              AND tm.num_hours_completed > 0
              AND tm.num_hours_completed < m.duration_h
            ORDER BY cm.order_index ASC, tm.num_hours_completed DESC;";

                var parameters = new[]
                {
            new MySqlParameter("@turmaId", turmaId)
        };

                return await GetDataAsync<TurmaModuleDetails>(query, reader => new TurmaModuleDetails
                {
                    TurmaId = reader.GetInt32("turma_id"),
                    TurmaName = reader.GetString("turma_name"),
                    ModuleId = reader.GetInt32("module_id"),
                    ModuleName = reader.GetString("module_name"),
                    TeacherId = reader.GetInt32("teacher_id"),
                    TeacherName = reader.GetString("teacher_name"),
                    HoursCompleted = reader.GetInt32("HoursCompleted"),
                    TotalDuration = reader.GetInt32("TotalDuration"),
                    IsCompleted = reader.GetInt32("isCompleted")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching ongoing modules: {ex.Message}");
                return new List<TurmaModuleDetails>();
            }
        }

        // teacher - module available for time frame
        public async Task<List<AvailableTeacherModule>> GetAvailableTeachersAndModules(TeacherModuleSuggestionRequest request)
        {
            try
            {
                const string query = @"
    SELECT 
        u.user_id AS TeacherId,
        u.username AS TeacherName,
        m.module_id AS ModuleId,
        m.name AS ModuleName,
        cm.order_index AS OrderIndex,
        tm.num_hours_completed AS HoursCompleted,
        m.duration_h AS TotalDuration
    FROM turma_modules tm
    INNER JOIN modules m ON tm.module_id = m.module_id
    INNER JOIN turmas t ON tm.turma_id = t.turma_id
    INNER JOIN users u ON tm.teacher_id = u.user_id 
    INNER JOIN course_modules cm ON t.course_id = cm.course_id AND m.module_id = cm.module_id
    WHERE tm.turma_id = @turmaId
      AND tm.isCompleted = 0
      AND u.isDeleted = 0
      -- 1. FIXED: Check if the teacher is available for EVERY hour in the range
      AND (
          SELECT COUNT(*) 
          FROM disponibilidades d 
          WHERE d.formador_id = u.user_id 
            AND d.data_hora >= @start 
            AND d.data_hora <= @end 
            AND d.disponivel = 1
      ) = (TIMESTAMPDIFF(HOUR, @start, @end) + 1)
      
      -- 2. FIXED: Ensure NO conflicts exist anywhere in the range
      AND NOT EXISTS (
          SELECT 1 FROM schedules s 
          WHERE s.formador_id = u.user_id 
            AND s.date_time >= @start 
            AND s.date_time <= @end
      )
    ORDER BY cm.order_index ASC;";

                var parameters = new[] {
            new MySqlParameter("@turmaId", request.TurmaId),
            new MySqlParameter("@start", request.StartTime),
            new MySqlParameter("@end", request.EndTime)
        };

                return await GetDataAsync<AvailableTeacherModule>(query, reader => new AvailableTeacherModule
                {
                    TeacherId = reader.GetInt32("TeacherId"),
                    TeacherName = reader.GetString("TeacherName"),
                    ModuleId = reader.GetInt32("ModuleId"),
                    ModuleName = reader.GetString("ModuleName"),
                    OrderIndex = reader.GetInt32("OrderIndex"),
                    HoursCompleted = reader.GetInt32("HoursCompleted"),
                    TotalDuration = reader.GetInt32("TotalDuration")
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching suggestions: {ex.Message}");
                return new List<AvailableTeacherModule>();
            }
        }

        // * Update ALL Turma-Module Hours Completed!
        public async Task<string> UpdateProgressToPresent()
        {
            try
            {
                // This query recalculates completed hours based ONLY on classes in the past
                const string query = @"
            UPDATE turma_modules tm
            SET tm.num_hours_completed = (
                SELECT COUNT(*) 
                FROM schedules s 
                WHERE s.turma_id = tm.turma_id 
                  AND s.module_id = tm.module_id
                  AND s.date_time <= NOW()
            );";

                int affectedRows = await ExecuteNonQueryAsync(query);
                return $"Success: Updated {affectedRows} module records based on completed classes.";
            }
            catch (Exception ex)
            {
                return $"Error: {ex.Message}";
            }
        }


        // ** Download | Upload **

        // Upload Profile Image
        public async Task<int> SaveFileToDb(string fileName, byte[] fileData)
        {
            try
            {
                const string query = @"
            INSERT INTO files (file_name, file_type, file_size_bytes, file_data, uploaded_at, isDeleted)
            VALUES (@name, @type, @size, @data, NOW(), 0);
            SELECT LAST_INSERT_ID();";

                var parameters = new[] {
            new MySqlParameter("@name", fileName),
            new MySqlParameter("@type", Path.GetExtension(fileName)),
            new MySqlParameter("@size", fileData.Length),
            new MySqlParameter("@data", fileData) // MySqlConnector handles the byte array automatically
        };

                var results = await GetDataAsync<int>(query, reader => Convert.ToInt32(reader[0]), parameters);
                return results.FirstOrDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"DB Save Error: {ex.Message}");
                return 0;
            }
        }

        // Link uploaded image to user profile
        public async Task<bool> LinkImageToUser(int userId, int fileId)
        {
            try
            {
                const string query = @"
            UPDATE users 
            SET profile_image = @fileId 
            WHERE user_id = @userId;";

                var parameters = new[] {
            new MySqlParameter("@fileId", fileId),
            new MySqlParameter("@userId", userId)
        };

                int rowsAffected = await ExecuteNonQueryAsync(query, parameters);
                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error linking image: {ex.Message}");
                return false;
            }
        }

        // Get File from DB
        public async Task<byte[]> GetFileBytes(int fileId)
        {
            const string query = "SELECT file_data FROM files WHERE file_id = @fileId";
            var parameters = new[] { new MySqlParameter("@fileId", fileId) };

            // This fetches the LONGBLOB as a byte array
            var results = await GetDataAsync<byte[]>(query, reader => (byte[])reader["file_data"], parameters);

            return results.FirstOrDefault();
        }

        // Get user profile image
        public async Task<(byte[] Data, string Type)> GetUserImageByUserId(int userId)
        {
            try
            {
                // Join users and files to get the data linked to a specific user
                const string query = @"
            SELECT f.file_data, f.file_type 
            FROM files f
            INNER JOIN users u ON u.profile_image = f.file_id
            WHERE u.user_id = @userId AND f.isDeleted = 0;";

                var parameters = new[] { new MySqlParameter("@userId", userId) };

                // We return a Tuple containing the bytes and the extension
                var results = await GetDataAsync<(byte[] Data, string Type)>(query, reader => (
                    (byte[])reader["file_data"],
                    reader["file_type"].ToString()
                ), parameters);

                return results.FirstOrDefault();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching user image: {ex.Message}");
                return (null, null);
            }
        }




        // ** Pre Enrollment **

        // Pre Enroll Student
        public async Task<bool> PreEnrollStudent(int userId, int turmaId)
        {
            try
            {
                const string query = @"
            INSERT INTO pre_enrollment (student_id, turma_id)
            SELECT u.user_id, @turmaId
            FROM users u
            INNER JOIN user_roles r ON u.role_id = r.role_id
            WHERE u.user_id = @userId 
              AND r.title = 'student' 
              AND u.isDeleted = 0 
              AND u.activeted = 1
            LIMIT 1;";

                var parameters = new[] {
            new MySqlParameter("@userId", userId),
            new MySqlParameter("@turmaId", turmaId)
        };

                int rowsAffected = await ExecuteNonQueryAsync(query, parameters);
                return rowsAffected > 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Pre-enrollment error: {ex.Message}");
                return false;
            }
        }

        // Get Pending Studnets ^_^
        public async Task<List<PendingEnrollmentDTO>> GetPendingEnrollments()
        {
            try
            {
                const string query = @"
            SELECT 
                p.pre_enroll_id AS PreEnrollId,
                u.user_id AS StudentId,
                u.username AS StudentName,
                u.email AS StudentEmail,
                t.turma_id AS TurmaId,
                t.turma_name AS TurmaName,
                c.nome_curso AS CourseName,
                t.date_start AS StartDate
            FROM pre_enrollment p
            INNER JOIN users u ON p.student_id = u.user_id
            INNER JOIN turmas t ON p.turma_id = t.turma_id
            INNER JOIN courses c ON t.course_id = c.id_cursos
            WHERE p.isDeleted = 0 
              AND u.isDeleted = 0
            ORDER BY t.date_start ASC;";

                return await GetDataAsync<PendingEnrollmentDTO>(query, reader => new PendingEnrollmentDTO
                {
                    PreEnrollId = Convert.ToInt32(reader["PreEnrollId"]),
                    StudentId = Convert.ToInt32(reader["StudentId"]),
                    StudentName = reader["StudentName"].ToString(),
                    StudentEmail = reader["StudentEmail"].ToString(),
                    TurmaId = Convert.ToInt32(reader["TurmaId"]),
                    TurmaName = reader["TurmaName"].ToString(),
                    CourseName = reader["CourseName"].ToString(),
                    StartDate = reader["StartDate"] != DBNull.Value ? Convert.ToDateTime(reader["StartDate"]) : (DateTime?)null
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching pending enrollments: {ex.Message}");
                return new List<PendingEnrollmentDTO>();
            }
        }

        // clean up pre-enrollments for a student
        public async Task<bool> ClearUserPreEnrollments(int userId)
        {
            try
            {
                // We set isDeleted = 1 for all entries belonging to this student
                const string query = @"
            UPDATE pre_enrollment 
            SET isDeleted = 1 
            WHERE student_id = @userId AND isDeleted = 0;";

                var parameters = new[] {
            new MySqlParameter("@userId", userId)
        };

                int rowsAffected = await ExecuteNonQueryAsync(query, parameters);

                // We return true if at least one record was cleaned up
                return rowsAffected >= 0;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error cleaning up pre-enrollments: {ex.Message}");
                return false;
            }
        }



        // ** Statistics **

        // Teacher History
        public async Task<List<TeacherModuleHistoryDTO>> GetTeacherModuleHistory(int teacherId)
        {
            try
            {
                const string query = @"
            SELECT 
                m.module_id AS ModuleId,
                m.name AS ModuleName,
                c.id_cursos AS CourseId,
                c.nome_curso AS CourseName,
                COUNT(s.schedule_id) AS HoursTaught
            FROM schedules s
            INNER JOIN modules m ON s.module_id = m.module_id
            INNER JOIN turmas t ON s.turma_id = t.turma_id
            INNER JOIN courses c ON t.course_id = c.id_cursos
            WHERE s.formador_id = @teacherId 
              AND s.date_time <= NOW()
            GROUP BY m.module_id, c.id_cursos
            ORDER BY HoursTaught DESC;";

                var parameters = new[] { new MySqlParameter("@teacherId", teacherId) };

                return await GetDataAsync<TeacherModuleHistoryDTO>(query, reader => new TeacherModuleHistoryDTO
                {
                    ModuleId = Convert.ToInt32(reader["ModuleId"]),
                    ModuleName = reader["ModuleName"].ToString(),
                    CourseId = Convert.ToInt32(reader["CourseId"]),
                    CourseName = reader["CourseName"].ToString(),
                    HoursTaught = Convert.ToInt32(reader["HoursTaught"])
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching teacher module history: {ex.Message}");
                return new List<TeacherModuleHistoryDTO>();
            }
        }

        // Courses & Modules
        public async Task<List<CourseWorkloadDTO>> GetTotalHoursTaughtPerCourse()
        {
            try
            {
                const string query = @"
            SELECT 
                c.id_cursos AS CourseId,
                c.nome_curso AS CourseName,
                COUNT(s.schedule_id) AS TotalHoursTaught
            FROM courses c
            LEFT JOIN turmas t ON c.id_cursos = t.course_id
            LEFT JOIN schedules s ON t.turma_id = s.turma_id AND s.date_time <= NOW()
            WHERE c.isDeleted = 0
            GROUP BY c.id_cursos, c.nome_curso
            ORDER BY TotalHoursTaught DESC;";

                return await GetDataAsync<CourseWorkloadDTO>(query, reader => new CourseWorkloadDTO
                {
                    CourseId = Convert.ToInt32(reader["CourseId"]),
                    CourseName = reader["CourseName"].ToString(),
                    TotalHoursTaught = Convert.ToInt32(reader["TotalHoursTaught"])
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching course workload: {ex.Message}");
                return new List<CourseWorkloadDTO>();
            }
        }


        // Total de formandos a frequentar cursos no atual momento;
        public async Task<OngoingStatsDTO> GetOngoingStats_CoursesStudents()
        {
            try
            {
                const string query = @"
            SELECT 
                COUNT(DISTINCT t.turma_id) AS TotalOngoingCourses,
                COUNT(DISTINCT e.student_id) AS TotalActiveStudents
            FROM turmas t
            LEFT JOIN enrollments e ON t.turma_id = e.turma_id AND e.isDeleted = 0
            WHERE t.isDeleted = 0 
              AND NOW() BETWEEN t.date_start AND t.date_end;";

                var results = await GetDataAsync<OngoingStatsDTO>(query, reader => new OngoingStatsDTO
                {
                    TotalOngoingCourses = Convert.ToInt32(reader["TotalOngoingCourses"]),
                    TotalActiveStudents = Convert.ToInt32(reader["TotalActiveStudents"])
                });

                return results.FirstOrDefault() ?? new OngoingStatsDTO();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching ongoing stats: {ex.Message}");
                return new OngoingStatsDTO();
            }
        }

        // Top 10 de formadores com maior nº de horas lecionadas.
        public async Task<List<TeacherRankingDTO>> GetTopTeachers()
        {
            try
            {
                const string query = @"
            SELECT 
                u.user_id AS TeacherId,
                u.username AS Name,
                u.email AS Email,
                COUNT(s.schedule_id) AS TotalClassesTaught
            FROM users u
            INNER JOIN user_roles r ON u.role_id = r.role_id
            INNER JOIN schedules s ON u.user_id = s.formador_id
            WHERE r.title = 'Teacher' 
              AND u.isDeleted = 0 
              AND s.date_time <= NOW()
            GROUP BY u.user_id, u.username, u.email
            ORDER BY TotalClassesTaught DESC
            LIMIT 10;";

                return await GetDataAsync<TeacherRankingDTO>(query, reader => new TeacherRankingDTO
                {
                    TeacherId = Convert.ToInt32(reader["TeacherId"]),
                    Name = reader["Name"].ToString(),
                    Email = reader["Email"].ToString(),
                    TotalClassesTaught = Convert.ToInt32(reader["TotalClassesTaught"])
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching top teachers: {ex.Message}");
                return new List<TeacherRankingDTO>();
            }
        }

        // Nº de cursos por área (Informática, Robótica, Electrónica, etc);
        public async Task<List<AreaCourseCountDTO>> GetCourseCountByArea()
        {
            try
            {
                const string query = @"
            SELECT 
                a.id_area AS AreaId,
                a.area AS AreaName,
                COUNT(c.id_cursos) AS CourseCount
            FROM area_curso a
            LEFT JOIN courses c ON a.id_area = c.id_area AND c.isDeleted = 0
            GROUP BY a.id_area, a.area
            ORDER BY CourseCount DESC;";

                return await GetDataAsync<AreaCourseCountDTO>(query, reader => new AreaCourseCountDTO
                {
                    AreaId = Convert.ToInt32(reader["AreaId"]),
                    AreaName = reader["AreaName"].ToString(),
                    CourseCount = Convert.ToInt32(reader["CourseCount"])
                });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching area course counts: {ex.Message}");
                return new List<AreaCourseCountDTO>();
            }
        }

        // i. Total de cursos terminados & ii. Total de cursos a decorrer;
        public async Task<CoursesStatusSummaryDTO> GetTurmaStatusSummary()
        {
            try
            {
                const string query = @"
            SELECT 
                SUM(CASE WHEN date_end < NOW() THEN 1 ELSE 0 END) AS FinishedTurmas,
                SUM(CASE WHEN (date_end >= NOW() OR date_end IS NULL) THEN 1 ELSE 0 END) AS OngoingTurmas
            FROM turmas
            WHERE isDeleted = 0;";

                var results = await GetDataAsync<CoursesStatusSummaryDTO>(query, reader => new CoursesStatusSummaryDTO
                {
                    FinishedTurmas = reader["FinishedTurmas"] != DBNull.Value ? Convert.ToInt32(reader["FinishedTurmas"]) : 0,
                    OngoingTurmas = reader["OngoingTurmas"] != DBNull.Value ? Convert.ToInt32(reader["OngoingTurmas"]) : 0
                });

                return results.FirstOrDefault() ?? new CoursesStatusSummaryDTO();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error fetching turma status summary: {ex.Message}");
                return new CoursesStatusSummaryDTO();
            }
        }


        // Teacher CV Modules
        public async Task<List<Module>> GetModulesTaughtByTeacher(int teacherId)
        {
            try
            {
                const string query = @"
            SELECT DISTINCT
                m.module_id AS Id,
                m.name AS Name,
                m.duration_h AS DurationInHours,
                m.isDeleted AS isDeleted
            FROM modules m
            INNER JOIN schedules s ON m.module_id = s.module_id
            WHERE s.formador_id = @teacherId 
              AND s.date_time <= NOW()
              AND m.isDeleted = 0;";

                var parameters = new[] {
            new MySqlParameter("@teacherId", teacherId)
        };

                return await GetDataAsync<Module>(query, reader => new Module
                {
                    Id = Convert.ToInt32(reader["Id"]),
                    Name = reader["Name"].ToString(),
                    DurationInHours = Convert.ToInt32(reader["DurationInHours"]),
                    isDeleted = Convert.ToInt32(reader["isDeleted"])
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error retrieving teacher modules: {ex.Message}");
                return new List<Module>();
            }
        }

        // Teacher CV Courses
        public async Task<List<CourseBasicDTO>> GetCoursesTaughtByTeacher(int teacherId)
        {
            try
            {
                const string query = @"
            SELECT DISTINCT
                c.id_cursos AS Id,
                c.nome_curso AS Name
            FROM courses c
            INNER JOIN turmas t ON c.id_cursos = t.course_id
            INNER JOIN schedules s ON t.turma_id = s.turma_id
            WHERE s.formador_id = @teacherId 
              AND s.date_time <= NOW()
              AND c.isDeleted = 0;";

                var parameters = new[] {
            new MySqlParameter("@teacherId", teacherId)
        };

                return await GetDataAsync<CourseBasicDTO>(query, reader => new CourseBasicDTO
                {
                    CourseId = Convert.ToInt32(reader["Id"]),
                    CourseName = reader["Name"].ToString()
                }, parameters);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error retrieving teacher's courses: {ex.Message}");
                return new List<CourseBasicDTO>();
            }
        }




    } // the end
}
