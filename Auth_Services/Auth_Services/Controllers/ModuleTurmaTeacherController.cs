using Auth_Services.DTOs;
using Auth_Services.Models;
using Auth_Services.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Auth_Services.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ModuleTurmaTeacherController : ControllerBase
    {
        private readonly DbServices _dbServices;
        private readonly TokenService _tokenService;
        private readonly IHttpContextAccessor _httpContextAccessor;
        public ModuleTurmaTeacherController(TokenService tokenService, IHttpContextAccessor httpContextAccessor, ConnectionSettings connectionSettings)  // Settings INJECTED HERE
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

        // Modules in a Turma that are not completed, ordered by order_index
        [HttpGet("turma/{turmaId}/tier/{tierIndex}")]
        public async Task<IActionResult> GetModulesByTier(int turmaId, int tierIndex)
        {
            if (turmaId <= 0) return BadRequest("Invalid Turma ID.");

            try
            {
                var modules = await _dbServices.GetIncompleteModulesByTier(turmaId, tierIndex);

                if (modules == null || modules.Count == 0)
                {
                    return Ok(new
                    {
                        message = $"No incomplete modules found for Tier {tierIndex}.",
                        data = new List<TurmaModuleDetails>()
                    });
                }

                return Ok(modules);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // All incomplete modules in a Turma by index order (tiar system) and completeness
        [HttpGet("turma/{turmaId}/all-incomplete-modules")]
        public async Task<IActionResult> GetAllIncomplete(int turmaId)
        {
            if (turmaId <= 0) return BadRequest("Invalid Turma ID.");

            try
            {
                var modules = await _dbServices.GetAllIncompleteModules(turmaId);

                if (modules == null || modules.Count == 0)
                {
                    return Ok(new { message = "All modules for this turma are 100% completed." });
                }

                return Ok(modules); // List<TurmaModuleDetails>
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // All ongoing modules in a Turma (not completed yet)
        [HttpGet("turma/{turmaId}/ongoing-modules")]
        public async Task<IActionResult> GetOngoing(int turmaId)
        {
            if (turmaId <= 0) return BadRequest("Invalid Turma ID.");

            try
            {
                // Return type: Task<List<TurmaModuleDetails>>
                var modules = await _dbServices.GetOngoingModules(turmaId);

                if (modules == null || modules.Count == 0)
                {
                    return Ok(new { message = "No ongoing modules found for this turma." });
                }

                return Ok(modules);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

        // Get available teacher for time piriod
        [HttpGet("suggest-teacher-module")]
        public async Task<IActionResult> GetSuggestions([FromQuery] TeacherModuleSuggestionRequest request)
        {
            // Basic validation
            if (request.TurmaId <= 0) return BadRequest("Turma ID is required.");
            if (request.EndTime < request.StartTime) return BadRequest("End time cannot be before start time.");

            try
            {
                // Return type: Task<List<AvailableTeacherModule>>
                var results = await _dbServices.GetAvailableTeachersAndModules(request);

                if (results == null || results.Count == 0)
                {
                    return Ok(new
                    {
                        message = "No available teachers found for the modules of this turma in this timeframe.",
                        data = new List<AvailableTeacherModule>()
                    });
                }

                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = ex.Message });
            }
        }

    } // the end
}
