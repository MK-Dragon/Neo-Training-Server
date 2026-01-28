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




        // ** Turmas & Enrollments **

        public async Task<List<TurmaDTO>> GetAllTurmas()
        {
            try
            {
                // Joining tables to get the course name
                const string query = @"
            SELECT t.turma_id, t.turma_name, t.course_id, c.nome_curso 
            FROM turmas t
            INNER JOIN courses c ON t.course_id = c.id_cursos
            WHERE c.isDeleted = 0;";

                var turmas = await GetDataAsync<TurmaDTO>(
                    query,
                    reader => new TurmaDTO
                    {
                        TurmaId = reader.GetInt32(0),
                        TurmaName = reader.GetString(1),
                        CourseId = reader.GetInt32(2),
                        CourseName = reader.GetString(3)
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

        public async Task<int> AddTurma(NewTurma turma)
        {
            Console.WriteLine($"Creating Turma: {turma.TurmaName} for Course ID: {turma.CourseId}");

            try
            {
                // SQL targets turma_name and course_id per your schema
                const string sql = @"
            INSERT INTO turmas (turma_name, course_id) 
            VALUES (@name, @courseId);";

                var parameters = new[]
                {
            new MySqlParameter("@name", turma.TurmaName),
            new MySqlParameter("@courseId", turma.CourseId)
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
                course_id = @courseId 
            WHERE turma_id = @id;";

                var parameters = new[]
                {
            new MySqlParameter("@name", turma.TurmaName),
            new MySqlParameter("@courseId", turma.CourseId),
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

        // Student In Turma
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




        // ** Enrollments **

        public async Task<string> EnrollStudent(NewEnrollment enrollment)
        {
            try
            {
                // This query does three things:
                // 1. Checks if the user has role_id = 3 (Student)
                // 2. Tries to insert the enrollment
                // 3. If they were previously deleted, it reactivates them (ON DUPLICATE KEY)
                const string sql = @"
            INSERT INTO enrollments (student_id, turma_id, enrollment_date, isDeleted)
            SELECT u.user_id, @turmaId, CURDATE(), 0
            FROM users u
            WHERE u.user_id = @studentId AND u.role_id = 3 AND u.isDeleted = 0
            ON DUPLICATE KEY UPDATE isDeleted = 0, enrollment_date = CURDATE();";

                var parameters = new[]
                {
            new MySqlParameter("@studentId", enrollment.StudentId),
            new MySqlParameter("@turmaId", enrollment.TurmaId)
        };

                int result = await ExecuteNonQueryAsync(sql, parameters);

                if (result > 0) return "Success";
                return "InvalidRole"; // Either not a student or user doesn't exist
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





    } // the end
}
