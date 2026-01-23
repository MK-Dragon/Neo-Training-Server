using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;

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

        [HttpGet("allmodules")]
        [AllowAnonymous]
        public async Task<IActionResult> GetModuleByName()
        {
            var users = await _dbServices.GetAllModules(); // Assume this returns List<AppUser> (limited info no pass, token, etc.)
            return Ok(users);
        }

        [HttpGet("module")]
        [AllowAnonymous]
        public async Task<IActionResult> GetModuleByName(string module_name)
        {
            try
            {
                var module = await _dbServices.GetModuleByName(module_name); // Assume this returns List<AppUser> (limited info no pass, token, etc.)
                if (module.Id == 0)
                {
                    return NotFound("Module not found.");
                }
                return Ok(module);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPost("addmodule")]
        [AllowAnonymous]
        public async Task<IActionResult> AddModule([FromQuery] NewModule new_module)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(new_module.Name) || new_module.DurationInHours < 0)
            {
                return BadRequest("Invalid module data.");
            }

            // check if module already exists
            var existingModule = await _dbServices.GetModuleByName(new_module.Name);
            if (existingModule.Id != 0) {
                return Conflict("Module with the same name already exists.");
            }

            try
            {
                // Additional validation or processing can be done here
                var result = await _dbServices.AddModule(new_module);
                if (result <= 0)
                {
                    return StatusCode(500, "Failed to add module.");
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }

            //var users = await _dbServices.GetAllModules(); // Assume this returns List<AppUser> (limited info no pass, token, etc.)
            return Ok(new { message = "Module added successfully" });
        }


        [HttpGet("course-id")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCourseById(int course_id)
        {
            try
            {
                var course = await _dbServices.GetCourseWithModules(course_id); // Assume this returns List<AppUser> (limited info no pass, token, etc.)
                if (course.Id == 0)
                {
                    return NotFound("Course not found.");
                }
                return Ok(course);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("all-courses-summary")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAllCoursesSummary()
        {
            try
            {
                // Call the service method that returns List<Course> without Modules
                var courses = await _dbServices.GetAllCoursesSummary();

                if (courses == null || courses.Count == 0)
                {
                    // Return 200 with empty list or 204 No Content
                    return Ok(new List<Course>());
                }

                return Ok(courses);
            }
            catch (Exception ex)
            {
                // Log the error for debugging
                Console.WriteLine($"Error in GetAllCoursesSummary endpoint: {ex.Message}");
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpDelete("delete-module/{moduleId}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteModule(int moduleId)
        {
            try
            {
                bool isDeleted = await _dbServices.DeleteModule(moduleId);

                if (!isDeleted)
                {
                    // Returns 404 if the ID doesn't exist or is already deleted
                    return NotFound(new { message = $"Module with ID {moduleId} not found." });
                }

                // Returns 200 OK
                return Ok(new { message = "Module status updated to deleted." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }


        


    } // End of CursesController class
}
