using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;


        public UserController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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


        // ** CRUD Users **


        // Fetch all users
        [HttpGet("users")]
        [Authorize(Roles = "Admin")] // Recommended: Only let admins see this
        public async Task<IActionResult> GetAllUsers()
        {
            var users = await _dbServices.GetAllAppUsers(); // Assume this returns List<AppUser> (limited info no pass, token, etc.)
            return Ok(users);
        }

        // Update a user
        [HttpPut("users/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] AppUser updatedData)
        {
            var existingUser = await _dbServices.GetUserById(id);
            if (existingUser.Id == 0) return NotFound();

            existingUser.Username = updatedData.Username;
            existingUser.Email = updatedData.Email;
            existingUser.Role = updatedData.Role;
            existingUser.Activated = updatedData.Activated;
            existingUser.BirthDate = updatedData.BirthDate;

            // update password if provided
            if (!string.IsNullOrWhiteSpace(updatedData.NewPasswordHash))
            {
                existingUser.Password = DEncript.EncryptString(updatedData.NewPasswordHash);
            }

            // validate isDeleted
            if (updatedData.IsDeleted == 0 || updatedData.IsDeleted == 1)
            {
                existingUser.IsDeleted = updatedData.IsDeleted;
            }
            else // TODO: TEST!!! and Remove this else after testing
            {
                return BadRequest(new { message = "IsDeleted must be either 0 or 1." });
            }

            bool status = await _dbServices.UpdateUser(existingUser);
            if (!status)
            {
                return StatusCode(500, new { message = "Failed to update user." });
            }
            return Ok(new { message = "User updated successfully" });
        }

        [HttpDelete("deleteusers/{id}")] // UnTested!! TODO: TEST!!!
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var existingUser = await _dbServices.GetUserById(id);
            if (existingUser.Id == 0) return NotFound();

            // Soft delete by setting IsDeleted to 1
            existingUser.IsDeleted = 1;

            bool status = await _dbServices.UpdateUser(existingUser);
            if (!status)
            {
                return StatusCode(500, new { message = "Failed to DELETE user." });
            }
            return Ok(new { message = "User DELETED Successfully" });
        }

        // Fetch User Profile
        [HttpGet("users/{username}")]
        [Authorize] // Admin only or Username = requested Username
        public async Task<IActionResult> GetUsersProfile(string username)
        {
            // Security Check: Is the requester an Admin OR the owner of the profile?
            var currentUserName = User.Identity?.Name;
            bool isAdmin = User.IsInRole("Admin");

            if (currentUserName != username && !isAdmin)
            {
                return Forbid(); // Return 403 if they try to peek at someone else's profile
            }

            // Fetch the Raw User from DB
            var userInDb = await _dbServices.GetUserByUsernameOrEmail(username);
            if (userInDb == null) return NotFound("User not found.");

            // Map AppUser class for the Frontend
            var profile = new AppUser
            {
                Id = userInDb.Id,
                Username = userInDb.Username,
                Email = userInDb.Email,
                Role = userInDb.Role,

                BirthDate = userInDb.BirthDate,

                Activated = userInDb.Activated
            };

            return Ok(profile);
        }


        [HttpPost("change-password")]
        [Authorize]
        public async Task<IActionResult> ChangePassword([FromBody] AppUser user)
        {

            var currentUsername = User.Identity?.Name;

            var existingUser = await _dbServices.GetUserByUsernameOrEmail(currentUsername);
            if (existingUser.Id == 0) return NotFound();

            if (!string.IsNullOrWhiteSpace(user.NewPasswordHash))
            {
                existingUser.Password = DEncript.EncryptString(user.NewPasswordHash);
            }

            bool status = await _dbServices.UpdateUser(existingUser);
            if (!status)
            {
                return StatusCode(500, new { message = "Failed to recover user Password." });
            }
            return Ok(new { message = "User Recoverd Password successfully" });
        }








        // the end ^_^
    }
}
