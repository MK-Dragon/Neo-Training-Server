using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TeacherController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public TeacherController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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

        [HttpGet("teachers-list")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTeachersList()
        {
            try
            {
                var teachers = await _dbServices.GetAllTeachers();
                return Ok(teachers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("assign-module")]
        [AllowAnonymous] // Adjust based on your Auth needs
        public async Task<IActionResult> AssignModule([FromBody] FormadorModule association)
        {
            if (association.FormadorId <= 0 || association.ModuleId <= 0)
            {
                return BadRequest("Invalid Teacher or Module ID.");
            }

            try
            {
                bool success = await _dbServices.AssignModuleToTeacher(association);

                if (!success)
                {
                    return BadRequest("Could not assign module. Verify if the user is a Teacher.");
                }

                return Ok(new { message = "Teacher successfully associated with the module." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("teacher/{formadorId}/modules")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTeacherModules(int formadorId)
        {
            if (formadorId <= 0) return BadRequest("Invalid Teacher ID.");

            try
            {
                var modules = await _dbServices.GetModulesByTeacher(formadorId); // List<Module>

                if (modules == null || modules.Count == 0)
                {
                    return Ok(new List<Module>()); // Return empty list instead of 404
                }

                return Ok(modules);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPatch("remove-module")]
        [AllowAnonymous]
        public async Task<IActionResult> RemoveModule([FromBody] FormadorModule association)
        {
            if (association.FormadorId <= 0 || association.ModuleId <= 0)
            {
                return BadRequest("Invalid Teacher or Module ID.");
            }

            try
            {
                bool success = await _dbServices.RemoveModuleFromTeacher(association);

                if (!success)
                {
                    return NotFound(new { message = "Association not found or already removed." });
                }

                return Ok(new { message = "Module association removed successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


    } // End of TeacherController class
}
