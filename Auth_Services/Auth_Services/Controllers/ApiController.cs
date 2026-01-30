// Controller_API.cs

using Auth_Services.DTOs;
using Auth_Services.ModelRequests;
using Auth_Services.Models;
using Auth_Services.Services;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
//using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using System.Security.Cryptography.Xml;
using static Pipelines.Sockets.Unofficial.Threading.MutexSlim;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ApiController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;


        public ApiController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
        {
            _dbServices = new DbServices(
                // MySQL
                connectionSettings.IpDb,
                connectionSettings.PortDb,
                "mydb",
                connectionSettings.UserDb,
                connectionSettings.PassDb,
                // Redis
                connectionSettings.IpRedis,
                connectionSettings.PortRedis
                );

            _tokenService = tokenService;
            _httpContextAccessor = httpContextAccessor;
        }



        // ** Login / Logout Related Endpoints **


        [HttpPost("login")] // checks User&Password then "waits" for 2FA
        [AllowAnonymous]
        public async Task<IActionResult> AuthenticateUser([FromBody] LoginRequest loginData)
        {
            // Basic Validation
            if (loginData == null || string.IsNullOrEmpty(loginData.Username) || string.IsNullOrEmpty(loginData.Password))
            {
                // Return HTTP 400 Bad Request if the payload is incomplete
                return BadRequest("Username and password are required.");
            }

            User user = await _dbServices.LoginUser(loginData);

            //Console.WriteLine($"Username: {loginData.Username} == {user.Username}");
            //Console.WriteLine($"{loginData.Password} == {user.Password}");
            //Console.WriteLine($"isDeleted? {user.IsDeleted}");
            //Console.WriteLine($"User ID? {user.Id}");
            //onsole.WriteLine($"Active? {user.Activated}");

            if (user.Id != 0 && user.Activated == 1 && user.IsDeleted != 1) // user exists, is activated and not deleted! ^_^ ?? 
            {
                // Generate a unique ID for this login attempt
                string requestId = Guid.NewGuid().ToString();
                // Store in Redis or DB: Key = requestId, Value = "pending" (expires in 5 mins)
                await _dbServices.SetCachedItemAsync($"2fa_{requestId}", $"pending|{loginData.Username}", TimeSpan.FromMinutes(1)); // TODO: 1min for testing, change to 5min for production

                // Create and send 2FA token
                //string tfaToken = TFA_Services.Generate2FAToken(loginData.Username, user.Role);
                string tfaToken = TFA_Services.Generate2FAToken(loginData.Username);
                string tfaLink = $"http://localhost:5173/verify-2fa?request={requestId}&code={tfaToken}";
                // send 2FA code via email
                MailServices mailServices = new MailServices();
                await mailServices.SendMail(user.Email, "Your 2FA Code", $"Hello {user.Username},\n\nYour 2FA verification code is: {tfaLink}\n\nThis code is valid for 5 minutes.");

                return Ok(new { requires2FA = true, requestId = requestId, username = user.Username, role = user.Role });
            }
            else if (user.Id != 0 && user.IsDeleted == 1)
            {
                return StatusCode(403, new { message = "Account not active. Please contect the administration." });
            }
            else if (user.Id != 0 && user.Activated == 0)
            {
                return StatusCode(403, new { message = "Account not activated. Please check your email to complete registration." });
            }
            else
            {
                // Return HTTP 401 Unauthorized
                return Unauthorized(new { Message = "Invalid credentials." });
            }
        }

        [HttpGet("verify-2fa")] // verifies 2FA code from email link
        public async Task<IActionResult> Verify2FA(string request, string code)
        {
            Console.WriteLine($"2FA Verify - Request: {request} | Code: {code}");

            // ... Decrypt code and check timestamp ...
            string username = "";
            //string role = "";
            try
            {
                username = TFA_Services.Validate2FAToken(code);
                /*string[] parts = TFA_Services.Validate2FAToken(code);

                if (parts.Length >= 2) {
                    username = parts[0];
                    role = parts[1];
                }
                else
                {
                    return BadRequest(new { message = "Invalid 2FA code format." });
                }*/

            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Invalid or expired 2FA code. {ex.Message}" });
            }

            // If valid, update the status in Redis
            //await _dbServices.SetCachedItemAsync($"2fa_{request}", $"approved|{username}|{role}", TimeSpan.FromMinutes(1));
            await _dbServices.SetCachedItemAsync($"2fa_{request}", $"approved|{username}", TimeSpan.FromMinutes(1));
            Console.WriteLine($"2FA aproved for User {username}!");
            //Console.WriteLine($"2FA aproved for User {username}! Role {role}");

            return Ok(new { message = "Verified! You can now close this tab and return to your PC." });
        }

        [HttpGet("check-2fa-status/{requestId}")] // checks if 2FA was approved
        public async Task<IActionResult> CheckStatus(string requestId)
        {
            string cachedValue = await _dbServices.GetCachedItemAsync<string>($"2fa_{requestId}");

            // Check if the string starts with "approved|"
            if (!string.IsNullOrEmpty(cachedValue) && cachedValue.StartsWith("approved|"))
            {
                // Extract username: "approved|john_doe|Admin" -> "john_doe"
                string username = cachedValue.Split('|')[1];
                //string roleName = cachedValue.Split('|')[2];

                //Console.WriteLine($"2FA Status Check - Approved for User: {username} with Role: {roleName} (Token)");
                Console.WriteLine($"2FA Status Check - Approved for User: {username} - (Token)");

                User user = await _dbServices.GetUserByUsernameOrEmail(username);
                string roleName = user.RoleId switch
                {
                    1 => "Admin",
                    2 => "Teacher",
                    _ => "Student"
                };
                Console.WriteLine($"2FA Status Check - Approved for User: {user.Username} with Role: {roleName} (DB)");


                // 1. Generate JWT Token
                string token = _tokenService.GenerateToken(username, roleName);

                // 2. Get Platform (User-Agent) and IP Address
                string platform = Request.Headers["User-Agent"].ToString();
                string userIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

                // 3. Prepare User object for Login Entry
                User userEntry = new User
                {
                    Username = username,
                    Token = token,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddHours(2)
                };

                try
                {
                    // 4. Save to database audit/login table
                    await _dbServices.AddLoginEntry(userEntry, platform, userIp);

                    // 5. IMPORTANT: Delete the cache item so it can't be used again
                    await _dbServices.InvalidateCacheKeyAsync($"2fa_{requestId}");
                }
                catch (Exception ex)
                {
                    return StatusCode(500, new { Message = "Error saving login audit." });
                }

                return Ok(new { verified = true, token = token });
            }

            return Ok(new { verified = false });
        }


        [Authorize]
        [HttpGet("verify")] // Token Verification Endpoint
        public async Task<IActionResult> VerifyToken()
        {
            // If the code gets here, the token is 100% valid!
            // The middleware already did the heavy lifting.

            var username = User.Identity?.Name;
            var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value;

            User user = await _dbServices.GetUserByUsernameOrEmail(username ?? ""); // get user id because... plan B

            Console.WriteLine($"[VERIFY] User '{username}' is authorized.");
            return Ok(new { status = "Success", message = "User is authorized", username=username, role=role , id=user.Id});
        }

        [Authorize]
        [HttpPost("logout")]
        public IActionResult Logout()
        {
            // In a stateless JWT setup, the server doesn't "deactivate" the token 
            // unless you maintain a blacklist in the database. 

            // For now, we simply return Ok to tell the frontend it's clear to redirect.
            return Ok(new { message = "Logged out successfully" });
        }

        [HttpPost("register")] // add new user
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            // 1. Validation for required fields
            if (request == null ||
                string.IsNullOrEmpty(request.Username) ||
                string.IsNullOrEmpty(request.Password) ||
                string.IsNullOrEmpty(request.Email) ||
                request.BirthDate == default ||
                string.IsNullOrEmpty(request.Role))
            {
                return BadRequest("All fields are required.");
            }

            // 2. Updated Role Validation (allowing 'admin')
            var validRoles = new[] { "admin", "teacher", "student" };
            if (!validRoles.Contains(request.Role.ToLower()))
            {
                return BadRequest("Role must be 'admin', 'teacher', or 'student'.");
            }

            // 3. Mapping string roles to your specific IDs
            // Admin = 1, Teacher = 2, Student = 3
            int mappedRoleId = request.Role.ToLower() switch
            {
                "admin" => 1,
                "teacher" => 2,
                "student" => 3,
                _ => 3 // Fallback to student
            };

            var newUser = new User
            {
                Username = request.Username,
                Email = request.Email,
                BirthDate = request.BirthDate.Date, // Use .Date to match your MySQL DATE column
                RoleId = mappedRoleId,
                Password = request.Password, // Pass the raw password for hashing in the service
                Provider = "Local",
                Activated = 1 // Assuming you want them active by default
            };

            var success = await _dbServices.AddUser(newUser);

            if (success == 0) return BadRequest(new { message = "Registration failed." });
            else if (success == -1) return Conflict(new { message = "Username or Email already exists." });

            // Successful registration

            // get user ID

            // send mail
            string encryptedId = DEncript.EncryptString(newUser.Username);
            string activationLink = $"http://localhost:5173/activate?code={Uri.EscapeDataString(encryptedId)}";

            MailServices mailServices = new MailServices();
            await mailServices.SendMail(newUser.Email, "Welcome to Neo Training Server", $"Hello {newUser.Username}, your account has been created successfully.\nNo folow this Link to activate your account: {activationLink}");
            return Ok(new { message = "Registration successful" });
        }

        [HttpGet("activate")] // activate account for new user 
        [AllowAnonymous]
        public async Task<IActionResult> ActivateAccount([FromQuery] string code)
        {
            try
            {
                // 1. Decrypt the code to get the User ID
                string username = DEncript.DecryptString(code);

                Console.WriteLine($"Username: {username} - Code: {code}");

                // 2. Update the database
                bool success = await _dbServices.ActivateUser(username);

                if (success)
                {
                    return Ok(new { message = "Account activated successfully!" });
                }
                return BadRequest(new { message = "Invalid or expired activation link." });
            }
            catch
            {
                return BadRequest(new { message = "Activation failed. The link may be corrupted." });
            }
        }


        [HttpPost("google-login")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleLogin([FromBody] string googleToken)
        {
            Console.WriteLine($"DEBUG: Login -> Google:");
            try
            {
                //Console.WriteLine($"> DEBUG: Enter TRY:");

                // 1. Get Client ID from Env
                string googleId = Environment.GetEnvironmentVariable("VITE_GOOGLE_CLIENT_ID");

                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new List<string>() { googleId }
                };
                //Console.WriteLine($"> DEBUG: Google ID from Env is: {googleId}");
                //Console.WriteLine($"> DEBUG: Settings?? is: {settings}");

                // This verifies that the token is real, not expired, and meant for your app
                var payload = await GoogleJsonWebSignature.ValidateAsync(googleToken, settings);

                // 2. Check if user exists (Check Email first as it's the unique anchor)
                var user = await _dbServices.GetUserByUsernameOrEmail(payload.Email);

                if (user.Id == 0)
                {
                    // NEW: Ensure username is unique (using email as fallback)
                    string uniqueUsername = payload.Email.Split('@')[0]; // "john.doe@gmail.com" -> "john.doe"

                    //Console.WriteLine($"> DEBUG: Check Username: [{uniqueUsername}]");
                    //Console.WriteLine($"> DEBUG: Check E-Mail: [{payload.Email}]");

                    user = new User
                    {
                        Username = uniqueUsername,
                        Email = payload.Email,
                        RoleId = 3,
                        Provider = "Google",
                        Activated = 1 // Google users are pre-verified
                    };

                    // Note: If your AddUser returns the new User object, use that
                    await _dbServices.AddUser(user);

                    // Re-fetch to get the ID if necessary
                    user = await _dbServices.GetUserByUsernameOrEmail(payload.Email);
                    //Console.WriteLine($"> DEBUG: Check New User ID: [{user.Id}]");
                    if (user.Id == 0)
                    {
                        Console.WriteLine("Error creating user from Google login. (User WAS NOT SAVED!!");
                        return BadRequest(new { message = "Google login failed during user creation." });
                    }
                }

                // 3. Generate LOCAL JWT
                string localToken = _tokenService.GenerateToken(user.Username, user.Role);
                //string localToken = _tokenService.GenerateToken(user.Username, user.Role);

                // 4. Audit Log
                string platform = Request.Headers["User-Agent"].ToString();
                string userIp = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";

                Console.WriteLine($"> DEBUG: Check Username: [{user.Username}]");
                Console.WriteLine($"> DEBUG: Plataform: [{platform}]");
                Console.WriteLine($"> DEBUG: User IP: [{userIp}]");

                // Create the entry object (?? realy needed ?? C# takes care of this autoMagicly)
                user.Token = localToken;
                user.CreatedAt = DateTime.UtcNow;
                user.ExpiresAt = DateTime.UtcNow.AddHours(2);

                user.Provider = "Google";
                await _dbServices.AddLoginEntry(user, platform, userIp);

                //Console.WriteLine($"> DEBUG: Token e Returned!");
                return Ok(new { token = localToken, username = user.Username, role = user.Role });
                //return Ok(new { token = localToken });
            }
            catch (Exception ex)
            {
                // Log the actual exception for debugging, but return generic error to user
                Console.WriteLine($"Google Auth Error: {ex.Message}");
                return BadRequest(new { message = "Google authentication failed. Please try again." });
            }
        }


        // Password recovery:

        [HttpPost("forgot-password")]
        // Change [FromBody] string email to [FromBody] AppUser data
        public async Task<IActionResult> ForgotPassword([FromBody] AppUser data)
        {
            // Access the email via the object property
            string email = data.Email;

            if (string.IsNullOrEmpty(email)) return BadRequest("Email is required.");

            Console.WriteLine($"Password reset requested for email: {email}");

            var userInDb = await _dbServices.GetUserByUsernameOrEmail(email);

            // Check if ID is 0 or null depending on your DB service return
            if (userInDb == null || userInDb.Id == 0)
                return Ok("If an account exists with that email, a reset link has been sent.");

            string resetToken = Guid.NewGuid().ToString();
            string resetLink = $"http://localhost:5173/ResetPassword?token={resetToken}&email={userInDb.Email}";

            MailServices mailServices = new MailServices();
            await mailServices.SendMail(userInDb.Email, "Neo Training Server - Password Reset",
                $"Hello {userInDb.Username},\n\nPlease click the link below to reset your password:\n{resetLink}");

            return Ok("Reset link sent.");
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            var existingUser = await _dbServices.GetUserByUsernameOrEmail(request.Email);
            if (existingUser == null) return BadRequest("Invalid request.");

            // TODO: Verify the token matches what you stored in the DB/Cache for this user

            // 1. Update and Encrypt the new password
            existingUser.Password = DEncript.EncryptString(request.NewPassword);
            bool status = await _dbServices.UpdateUser(existingUser);

            return status ? Ok("Password updated successfully.") : StatusCode(500, "Error updating password.");
        }



        [AllowAnonymous]
        [HttpPost("invalidate-user-cache")]
        public async Task<IActionResult> InvalidateAllUserCache()
        {
            // Used for Debug! REMOVE BEFORE DEPLOY!!

            List<User> all_users = await _dbServices.GetAllUsers();
            foreach (User user in all_users)
            {
                await _dbServices.InvalidateUserCacheAsync(user);
            }
            
            return Ok(new { message = "Cache Cleared!" });
        }



    }
}
