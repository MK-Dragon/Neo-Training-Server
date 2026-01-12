// Controller_API.cs

using Auth_Services.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Auth_Services.Services;
using Microsoft.AspNetCore.Http.HttpResults;

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
        public async Task<IActionResult> AuthenticateUser([FromBody] LoginRequest loginData)
        {
            // Basic Validation
            if (loginData == null || string.IsNullOrEmpty(loginData.Username) || string.IsNullOrEmpty(loginData.Password))
            {
                // Return HTTP 400 Bad Request if the payload is incomplete
                return BadRequest("Username and password are required.");
            }

            User user = await _dbServices.LoginUser(loginData);

            if (user.Id != 0)
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
            else
            {
                // Return HTTP 401 Unauthorized
                return Unauthorized(new { Message = "Invalid credentials." });
            }
        }

    }
}
