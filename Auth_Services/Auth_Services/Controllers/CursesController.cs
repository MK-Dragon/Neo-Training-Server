using Auth_Services.Services;
using Auth_Services.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CursesController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public CursesController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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

        // ** CRUD Curses **


        [HttpGet("curses")]
        [Authorize(Roles = "Admin")] // Recommended: Only let admins see this
        public async Task<IActionResult> GetAllCurses()
        {
            var users = await _dbServices.GetAllAppUsers(); // Assume this returns List<AppUser> (limited info no pass, token, etc.)
            return Ok(users);
        }












    } // End of CursesController class
}
