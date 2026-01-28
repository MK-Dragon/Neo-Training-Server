using Auth_Services.DTOs;
using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class CourseModuleController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public CourseModuleController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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





        [HttpPost("add-modules-batch")]
        [AllowAnonymous]
        public async Task<IActionResult> AddModulesBatch([FromBody] List<ModuleToCourse> modulesList)
        {
            if (modulesList == null || modulesList.Count == 0)
            {
                return BadRequest("The list of modules cannot be empty.");
            }

            try
            {
                bool success = await _dbServices.AddModulesToCourseBatch(modulesList);

                if (success)
                {
                    return Ok(new { message = $"{modulesList.Count} modules processed successfully." });
                }

                return StatusCode(500, "Failed to process module batch.");
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPatch("update-module-order")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateModuleOrder([FromBody] ModuleToCourse data)
        {
            if (data == null) return BadRequest("Invalid data.");

            try
            {
                bool success = await _dbServices.UpdateModuleOrder(data);

                if (!success)
                {
                    return NotFound(new { message = "Relationship not found. Ensure the module is assigned to this course." });
                }

                return Ok(new { message = "Module order updated successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpPatch("delete-module-from-course/{courseId}/{moduleId}")]
        [AllowAnonymous]
        public async Task<IActionResult> DeleteModuleFromCourse(int courseId, int moduleId)
        {
            try
            {
                bool success = await _dbServices.DeleteModuleFromCourse(courseId, moduleId);

                if (!success)
                {
                    return NotFound(new { message = "Relationship not found or already deleted." });
                }

                return Ok(new { message = "Module removed from course (soft delete)." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }







    } // The End
}
