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
    public class ModuleController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public ModuleController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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


        // ** CRUD Modules **


        [HttpGet("allmodules")]
        [AllowAnonymous]
        public async Task<IActionResult> GetModuleByName()
        {
            var modules = await _dbServices.GetAllModules();
            return Ok(modules);
        }

        [HttpGet("module")]
        [AllowAnonymous]
        public async Task<IActionResult> GetModuleByName(string module_name)
        {
            try
            {
                var module = await _dbServices.GetModuleByName(module_name); // Module
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

        [HttpGet("get-module-id/{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetModuleById(int id)
        {
            try
            {
                var module = await _dbServices.GetModuleById(id); // Module

                if (module == null)
                {
                    return NotFound(new { message = $"Module with ID {id} not found." });
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
            if (existingModule.Id != 0)
            {
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

        [HttpPut("update-module")]
        [AllowAnonymous]
        public async Task<IActionResult> UpdateModule([FromBody] ModuleUpdate module)
        {
            if (module == null || module.ModuleId <= 0)
            {
                return BadRequest("Invalid module data or ID.");
            }

            try
            {
                bool success = await _dbServices.UpdateModule(module);

                if (!success)
                {
                    return NotFound(new { message = "Module not found." });
                }

                return Ok(new { message = "Module updated successfully." });
            }
            catch (Exception ex)
            {
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



    } // The End
}
