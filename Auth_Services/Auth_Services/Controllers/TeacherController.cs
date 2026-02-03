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


        // Additional Teacher-Module-Turma

        [HttpPost("assign-teacher-to-module")]
        [AllowAnonymous]
        public async Task<IActionResult> AssignTeacher([FromBody] AssignTeacherToTurmaModule assignment)
        {
            if (assignment.TurmaId <= 0 || assignment.ModuleId <= 0 || assignment.TeacherId <= 0)
            {
                return BadRequest("All IDs (Turma, Module, and Teacher) must be valid.");
            }

            try
            {
                bool success = await _dbServices.AssignTeacherToModule(assignment);

                if (!success)
                {
                    return BadRequest("Assignment failed. Ensure the user exists and has the Teacher role.");
                }

                return Ok(new { message = "Teacher assigned to the module within the turma successfully." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // turma - List module-teacher (time userd / time total)
        [HttpGet("turma/{turmaId}/modules-details")]
        [AllowAnonymous]
        public async Task<IActionResult> GetTurmaModules(int turmaId)
        {
            if (turmaId <= 0) return BadRequest("Invalid Turma ID.");

            try
            {
                List<TurmaModuleDetails> details = await _dbServices.GetModulesByTurma(turmaId);
                return Ok(details);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        [HttpGet("turma-module-details")]
        [AllowAnonymous]
        public async Task<IActionResult> GetSpecificDetails([FromQuery] int turmaId, [FromQuery] int moduleId)
        {
            if (turmaId <= 0 || moduleId <= 0)
                return BadRequest("Invalid Turma or Module ID.");

            try
            {
                var details = await _dbServices.GetSpecificTurmaModule(turmaId, moduleId);

                if (details == null)
                    return NotFound("No assignment found for this specific module and turma.");

                return Ok(details);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // turma - modules (duratio + index order)
        [HttpGet("turma/{turmaId}/curriculum-plan")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCurriculumPlan(int turmaId)
        {
            if (turmaId <= 0) return BadRequest("Invalid Turma ID.");

            try
            {
                List<TurmaCourseModulePlaned> plan = await _dbServices.GetTurmaModulePlan(turmaId);
                return Ok(plan);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }

        // techer that teach THIS module
        [HttpGet("module/{moduleId}/teachers")]
        [AllowAnonymous]
        public async Task<IActionResult> GetModuleTeachers(int moduleId)
        {
            if (moduleId <= 0) return BadRequest("Invalid Module ID.");

            try
            {
                List<TeacherModuleAssignment> teachers = await _dbServices.GetTeachersByModule(moduleId);

                // Return an empty list if no teachers are qualified for this module
                return Ok(teachers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Internal server error: {ex.Message}");
            }
        }



    } // End of TeacherController class
}
