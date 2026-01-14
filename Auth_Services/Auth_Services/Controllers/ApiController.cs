// Controller_API.cs

using Auth_Services.ModelRequests;
using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;

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


        [HttpGet("test_generic")]
        public async Task GetAllUsers()
        {
            await _dbServices.getAllUsers();
        }


        // Lognin Endpoint
        [HttpPost("login")]
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

            if (user.Id != 0 && user.Activated == 1)
            {
                // Generate JWT Token
                string token = _tokenService.GenerateToken(loginData.Username);
                user.Token = token;
                user.CreatedAt = new DateTime(DateTime.UtcNow.Ticks - (DateTime.UtcNow.Ticks % TimeSpan.TicksPerSecond), DateTimeKind.Utc);
                user.ExpiresAt = user.ExpiresAt = user.CreatedAt.Value.AddHours(2);

                // save token to database
                try
                {
                    await _dbServices.AddLoginEntry(user, "PC-Testing", "User IP");
                }
                catch (Exception)
                {

                    return StatusCode(500, new { Message = "Error saving token to database." });
                }

                return Ok(new
                {
                    Message = "Login successful!",
                    Username = loginData.Username,
                    Token = token
                });
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

        // Lognin Endpoint
        [Authorize]
        [HttpGet("verify")]
        public IActionResult VerifyToken()
        {
            // If the code gets here, the token is 100% valid!
            // The middleware already did the heavy lifting.

            var username = User.Identity?.Name;

            Console.WriteLine($"[VERIFY] User '{username}' is authorized.");
            return Ok(new { status = "Success", message = "User is authorized" });
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

        // public async Task<int> AddUser(User user)
        [HttpPost("register")]
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

        [HttpGet("activate")]
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





    }
}
